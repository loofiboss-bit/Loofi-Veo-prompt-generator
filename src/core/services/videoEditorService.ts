import {
  VideoFilters,
  ClipTransition,
  CropConfig,
  TextOverlay,
  ColorGradeParams,
  MotionConfig,
} from '@core/types';
import { ExportProfile } from '../config/exportProfiles';

type FFmpegInstance = import('@ffmpeg/ffmpeg').FFmpeg;
type FetchFileFn = typeof import('@ffmpeg/util').fetchFile;

let ffmpeg: FFmpegInstance | null = null;
let _fetchFile: FetchFileFn | null = null;

const getFetchFile = async (): Promise<FetchFileFn> => {
  if (!_fetchFile) {
    const mod = await import('@ffmpeg/util');
    _fetchFile = mod.fetchFile;
  }
  return _fetchFile;
};

// Keep loadFFmpeg for utility functions (like simple proxy gen) that are fast enough for main thread
const loadFFmpeg = async (): Promise<FFmpegInstance> => {
  if (ffmpeg) {
    return ffmpeg;
  }
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');
  ffmpeg = new FFmpeg();
  ffmpeg.on('log', ({ message }) => console.debug('FFmpeg:', message));
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  return ffmpeg;
};

export const generateProxy = async (sourceUrl: string): Promise<string> => {
  const instance = await loadFFmpeg();
  const fetchFile = await getFetchFile();
  const inputName = `input_${Date.now()}.mp4`;
  const outputName = `proxy_${Date.now()}.mp4`;
  try {
    const data = await fetchFile(sourceUrl);
    await instance.writeFile(inputName, data);
    await instance.exec([
      '-i',
      inputName,
      '-vf',
      'scale=-2:480',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-b:v',
      '500k',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      outputName,
    ]);
    const outData = await instance.readFile(outputName);
    const blob = new Blob([outData as unknown as BlobPart], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Proxy generation failed', error);
    return sourceUrl;
  } finally {
    try {
      await instance.deleteFile(inputName);
    } catch {}
    try {
      await instance.deleteFile(outputName);
    } catch {}
  }
};

/**
 * Main Export Function: Offloads to Service Worker
 */
export const stitchVideos = async (
  clips: {
    videoUrl: string;
    audioUrl?: string;
    audioVolume?: number;
    dialogueText?: string;
    transition?: ClipTransition;
    overlays?: TextOverlay[];
    colorGrade?: ColorGradeParams;
    motionConfig?: MotionConfig;
    isImage?: boolean;
    duration?: number;
    titleConfig?: {
      text: string;
      background: string;
      color: string;
      fontSize: number;
    };
  }[],
  outputName: string = 'intermediate.mp4',
  onProgress?: (msg: string) => void,
  filters?: VideoFilters,
  cropConfig?: CropConfig,
  backgroundMusicUrl?: string | null,
  audioSettings?: {
    volumes: { dialogue: number; music: number };
    autoDuck: boolean;
  },
): Promise<string> => {
  // Check if SW is active
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    throw new Error('Service Worker not active. Please refresh or check browser settings.');
  }

  // 1. Serialize Assets (Fetch Blobs -> ArrayBuffers)
  if (onProgress) onProgress('Preparing assets for background render...');

  const serializedClips = await Promise.all(
    clips.map(async (clip) => {
      let videoData: ArrayBuffer | null = null;
      let audioData: ArrayBuffer | null = null;

      // Fetch Video/Image Data
      if (clip.videoUrl) {
        const res = await fetch(clip.videoUrl);
        videoData = await res.arrayBuffer();
      }

      // Fetch Audio Data
      if (clip.audioUrl) {
        const res = await fetch(clip.audioUrl);
        audioData = await res.arrayBuffer();
      }

      return {
        ...clip,
        videoData,
        audioData,
        isTitle: !!clip.titleConfig,
      };
    }),
  );

  // Serialize Background Music
  let bgMusicData: ArrayBuffer | null = null;
  if (backgroundMusicUrl) {
    const res = await fetch(backgroundMusicUrl);
    bgMusicData = await res.arrayBuffer();
  }

  // 2. Dispatch to Service Worker
  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    // Listen for SW responses — named handler so we can remove it on completion
    const handler = (event: MessageEvent) => {
      const { type, payload, progress, status } = event.data;

      if (type === 'RENDER_PROGRESS') {
        if (onProgress) onProgress(`${status} (${Math.round(progress)}%)`);
      } else if (type === 'RENDER_COMPLETE') {
        navigator.serviceWorker.removeEventListener('message', handler);
        const blob = payload as Blob;
        const url = URL.createObjectURL(blob);
        resolve(url);
      } else if (type === 'RENDER_ERROR') {
        navigator.serviceWorker.removeEventListener('message', handler);
        reject(new Error(payload));
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);

    // Send Job
    navigator.serviceWorker.controller?.postMessage(
      {
        type: 'RENDER_JOB',
        payload: {
          clips: serializedClips,
          outputName,
          filters,
          cropConfig,
          backgroundMusic: bgMusicData,
          audioSettings,
        },
      },
      [messageChannel.port2],
    ); // Transferable if needed
  });
};

// ... (Keep existing simple renderers like audio visualizer locally or move them too if desired)
// For now, keeping renderAudioVisualizer local as it's often used for quick previews.

export const renderTitleCard = async (
  text: string,
  duration: number = 3,
  styles: { background: string; color: string; fontSize: number },
  onProgress?: (msg: string) => void,
): Promise<string> => {
  // Basic local render for preview speed
  const instance = await loadFFmpeg();
  try {
    await instance.readFile('font.ttf');
  } catch {
    const fontUrl = 'https://cdn.jsdelivr.net/gh/webfontkit/roboto/src/hinted/Roboto-Regular.ttf';
    const fontData = await (await getFetchFile())(fontUrl);
    await instance.writeFile('font.ttf', fontData);
  }

  const outputName = `title_${Date.now()}.mp4`;
  const bgColor = styles.background.replace('#', '0x');
  const safeTextColor = `0x${styles.color.replace('#', '')}FF`;
  const safeText = text.replace(/'/g, "\\'").replace(/:/g, '\\:');

  const cmd = [
    '-f',
    'lavfi',
    '-i',
    `color=c=${bgColor}:s=1920x1080:d=${duration}`,
    '-vf',
    `drawtext=fontfile=font.ttf:text='${safeText}':fontcolor=${safeTextColor}:fontsize=${styles.fontSize}:x=(w-text_w)/2:y=(h-text_h)/2`,
    '-c:v',
    'libx264',
    '-t',
    `${duration}`,
    '-pix_fmt',
    'yuv420p',
    outputName,
  ];

  if (onProgress) onProgress('Rendering Title Card...');
  await instance.exec(cmd);
  const outData = await instance.readFile(outputName);
  const blob = new Blob([outData as unknown as BlobPart], { type: 'video/mp4' });
  try {
    await instance.deleteFile(outputName);
  } catch {}
  return URL.createObjectURL(blob);
};

export const renderAudioVisualizer = async (
  audioBlob: Blob,
  bgImage: Blob,
  style: 'line' | 'circle',
): Promise<Blob> => {
  const instance = await loadFFmpeg();
  const audioName = 'vis_input.wav';
  const imageName = 'vis_bg.png';
  const outputName = 'vis_output.mp4';
  await instance.writeFile(audioName, await (await getFetchFile())(audioBlob));
  await instance.writeFile(imageName, await (await getFetchFile())(bgImage));
  const fps = 15;
  const width = 1280;
  const height = 720;
  const cmd = [
    '-i',
    audioName,
    '-loop',
    '1',
    '-i',
    imageName,
    '-filter_complex',
    `[0:a]showwaves=s=${width}x${height}:mode=${style === 'circle' ? 'cline' : 'line'}:colors=cyan[v];[1:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}[bg];[bg][v]overlay=format=auto:shortest=1,format=yuv420p`,
    '-map',
    '0:a',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-r',
    String(fps),
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    outputName,
  ];
  await instance.exec(cmd);
  const outData = await instance.readFile(outputName);
  const blob = new Blob([outData as unknown as BlobPart], { type: 'video/mp4' });
  try {
    await instance.deleteFile(audioName);
  } catch {}
  try {
    await instance.deleteFile(imageName);
  } catch {}
  try {
    await instance.deleteFile(outputName);
  } catch {}
  return blob;
};

export const transcodeVideo = async (
  sourceUrl: string,
  profile: ExportProfile,
  onProgress?: (msg: string) => void,
): Promise<string> => {
  // Keep local for now for single file ops
  const instance = await loadFFmpeg();
  const inputName = 'input_transcode.mp4';
  const outputName = `output.${profile.container}`;
  if (onProgress) onProgress(`Preparing ${profile.label} export...`);
  const fetchFile = await getFetchFile();
  const data = await fetchFile(sourceUrl);
  await instance.writeFile(inputName, data);
  const cmd: string[] = ['-i', inputName];
  if (profile.container === 'gif') {
    if (onProgress) onProgress('Generating palette for GIF...');
    cmd.push(
      '-vf',
      'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
      '-f',
      'gif',
    );
  } else {
    cmd.push('-c:v', profile.videoCodec);
    if (profile.audioCodec) cmd.push('-c:a', profile.audioCodec);
    else cmd.push('-an');
    cmd.push(...profile.args);
  }
  cmd.push(outputName);
  if (onProgress) onProgress(`Encoding ${profile.label}...`);
  await instance.exec(cmd);
  const outData = await instance.readFile(outputName);
  try {
    await instance.deleteFile(inputName);
  } catch {}
  try {
    await instance.deleteFile(outputName);
  } catch {}
  return URL.createObjectURL(
    new Blob([outData as unknown as BlobPart], { type: profile.mimeType }),
  );
};
