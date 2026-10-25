import CreatorAsrWorker from '@infrastructure/workers/creatorAsr.worker?worker';
import type { Caption } from '@core/types';

export type CreatorAsrLanguage = 'auto' | 'en' | 'sv' | 'es' | 'fr' | 'ja' | 'ar';

export interface ClipAudioRequest {
  requestId: string;
  projectId: string;
  projectRevision: number;
  clipId: string;
  mediaId: string;
  mediaSha256: string;
  offsetSeconds: number;
  durationSeconds: number;
  language: CreatorAsrLanguage;
}

export interface CaptionProposal {
  request: ClipAudioRequest;
  modelId: string;
  modelRevision: string;
  segments: Caption[];
  transcript: string;
}

export interface CurrentClipAudioSourceState {
  projectId: string;
  projectRevision: number;
  clipId: string;
  mediaId: string;
  mediaSha256: string;
  offsetSeconds: number;
  durationSeconds: number;
}

export interface CreatorAsrModelInfo {
  manifest: {
    modelId: string;
    revision: string;
    totalBytes: number;
    files: Array<{ path: string; size: number }>;
    source: string;
  };
  status: {
    installed: boolean;
    state: 'not-installed' | 'ready' | 'corrupt';
    revision: string;
    totalBytes: number;
  };
}

export interface WhisperWordChunk {
  text: string;
  timestamp: [number | null, number | null];
}

interface AsrWorkerReply {
  type: 'STATUS' | 'RESULT' | 'ERROR';
  requestId: string;
  status?: 'loading-model' | 'transcribing';
  text?: string;
  chunks?: WhisperWordChunk[];
  modelId?: string;
  modelRevision?: string;
  language?: CreatorAsrLanguage;
  message?: string;
}

const MODEL_ID = 'onnx-community/whisper-base';
const MODEL_REVISION = '1846881b6b3a3024392c1eea3ad983695bc23925';

export const CREATOR_ASR_LANGUAGES: CreatorAsrLanguage[] = [
  'auto',
  'en',
  'sv',
  'es',
  'fr',
  'ja',
  'ar',
];

export function assertClipAudioRequestCurrent(
  request: ClipAudioRequest,
  current: CurrentClipAudioSourceState,
): void {
  if (
    request.projectId !== current.projectId ||
    request.projectRevision !== current.projectRevision ||
    request.clipId !== current.clipId ||
    request.mediaId !== current.mediaId ||
    request.mediaSha256 !== current.mediaSha256 ||
    request.offsetSeconds !== current.offsetSeconds ||
    request.durationSeconds !== current.durationSeconds
  )
    throw new Error('Speech transcription proposal is stale.');
}

export function groupWhisperWordChunks(
  chunks: WhisperWordChunk[],
  durationSeconds: number,
): Caption[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0)
    throw new Error('Transcription duration is invalid.');
  const words = chunks
    .map((chunk) => {
      const start = chunk.timestamp?.[0];
      const end = chunk.timestamp?.[1];
      const text = chunk.text?.trim();
      if (
        !text ||
        typeof start !== 'number' ||
        typeof end !== 'number' ||
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end <= start
      )
        return null;
      const boundedStart = Math.min(durationSeconds, start);
      const boundedEnd = Math.min(durationSeconds, end);
      return boundedEnd > boundedStart ? { text, start: boundedStart, end: boundedEnd } : null;
    })
    .filter((word): word is NonNullable<typeof word> => word !== null)
    .sort((a, b) => a.start - b.start);
  if (!words.length) throw new Error('Speech was not recognized with usable word timings.');

  const captions: Caption[] = [];
  let current: { text: string; start: number; end: number } | null = null;
  const flush = () => {
    if (!current) return;
    captions.push({
      id: crypto.randomUUID(),
      text: current.text.trim(),
      startTime: current.start,
      endTime: current.end,
      style: 'classic',
    });
    current = null;
  };

  for (const word of words) {
    const nextText = current
      ? `${current.text}${/^\p{P}/u.test(word.text) ? '' : ' '}${word.text}`
      : word.text;
    const sentenceEnd = current !== null && /[.!?…]$/.test(current.text.trim());
    const longPause = current !== null && word.start - current.end >= 0.65;
    const tooLong =
      current !== null &&
      (word.end - current.start > 4.2 || nextText.length > 52 || sentenceEnd || longPause);
    if (tooLong) flush();
    if (!current) current = { text: word.text, start: word.start, end: word.end };
    else {
      current.text = nextText;
      current.end = word.end;
    }
  }
  flush();
  return captions;
}

class CreatorAsrService {
  private static instance: CreatorAsrService;
  private activeInstallId: string | null = null;

  static getInstance(): CreatorAsrService {
    return (this.instance ??= new CreatorAsrService());
  }

  async getModelInfo(): Promise<CreatorAsrModelInfo> {
    if (!window.electron?.getCreatorAsrModelInfo)
      throw new Error('Local speech transcription requires the desktop app.');
    return window.electron.getCreatorAsrModelInfo();
  }

  async installModel(
    manifest: CreatorAsrModelInfo['manifest'],
    onProgress: (progress: {
      loadedBytes: number;
      totalBytes: number;
      file: string | null;
      status: 'downloading' | 'verifying' | 'ready';
    }) => void,
  ): Promise<CreatorAsrModelInfo['status']> {
    if (!window.electron?.installCreatorAsrModel || !window.electron.onCreatorAsrModelProgress)
      throw new Error('Local model installation is unavailable in this app.');
    if (manifest.modelId !== MODEL_ID || manifest.revision !== MODEL_REVISION)
      throw new Error('The installed speech model does not match the reviewed model revision.');
    const installId = crypto.randomUUID();
    this.activeInstallId = installId;
    const unsubscribe = window.electron.onCreatorAsrModelProgress((progress) => {
      if (progress.installId === installId)
        onProgress({
          loadedBytes: progress.loadedBytes,
          totalBytes: progress.totalBytes,
          file: progress.file,
          status: progress.status,
        });
    });
    try {
      const status = await window.electron.installCreatorAsrModel({
        installId,
        modelId: manifest.modelId,
        revision: manifest.revision,
        confirmedBytes: manifest.totalBytes,
        confirmed: true,
      });
      if (!status.installed) throw new Error('Speech model installation did not complete.');
      return status;
    } finally {
      unsubscribe();
      if (this.activeInstallId === installId) this.activeInstallId = null;
    }
  }

  async cancelInstall(): Promise<boolean> {
    if (!window.electron?.cancelCreatorAsrModelInstall) return false;
    if (!this.activeInstallId) return false;
    return window.electron.cancelCreatorAsrModelInstall(this.activeInstallId);
  }

  async removeModel(): Promise<void> {
    if (!window.electron?.removeCreatorAsrModel)
      throw new Error('Local model removal is unavailable in this app.');
    await window.electron.removeCreatorAsrModel();
  }

  async transcribe(
    pcm: ArrayBuffer,
    language: CreatorAsrLanguage,
    onStatus: (status: 'loading-model' | 'transcribing') => void,
  ): Promise<{ modelId: string; modelRevision: string; transcript: string; segments: Caption[] }> {
    if (pcm.byteLength < 4 || pcm.byteLength % 4 !== 0)
      throw new Error('The extracted local audio buffer is invalid.');
    // Transfer detaches the renderer's buffer, so retain its duration beforehand.
    const durationSeconds = pcm.byteLength / Float32Array.BYTES_PER_ELEMENT / 16000;
    const worker = new CreatorAsrWorker();
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        worker.onmessage = null;
        worker.onerror = null;
        worker.terminate();
      };
      worker.onerror = (event) => {
        cleanup();
        reject(new Error(event.message || 'Local transcription worker failed.'));
      };
      worker.onmessage = (event: MessageEvent<AsrWorkerReply>) => {
        const result = event.data;
        if (!result || result.requestId !== requestId) return;
        if (result.type === 'STATUS' && result.status) {
          onStatus(result.status);
          return;
        }
        if (result.type === 'ERROR') {
          cleanup();
          reject(new Error(result.message || 'Local speech transcription failed.'));
          return;
        }
        if (result.type === 'RESULT') {
          try {
            if (result.modelId !== MODEL_ID || result.modelRevision !== MODEL_REVISION)
              throw new Error('The speech model revision changed during transcription.');
            const segments = groupWhisperWordChunks(result.chunks ?? [], durationSeconds);
            cleanup();
            resolve({
              modelId: result.modelId,
              modelRevision: result.modelRevision,
              transcript: result.text ?? '',
              segments,
            });
          } catch (error) {
            cleanup();
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        }
      };
      worker.postMessage({ type: 'TRANSCRIBE', requestId, pcm, language }, [pcm]);
    });
  }
}

export const creatorAsrService = CreatorAsrService.getInstance();
