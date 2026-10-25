/// <reference lib="webworker" />

import { env, pipeline } from '@huggingface/transformers';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import wasmFactoryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';

const MODEL_ID = 'onnx-community/whisper-base';
const MODEL_REVISION = '1846881b6b3a3024392c1eea3ad983695bc23925';

type Language = 'auto' | 'en' | 'sv' | 'es' | 'fr' | 'ja' | 'ar';
type Transcriber = Awaited<ReturnType<typeof createTranscriber>>;

interface AsrMessage {
  type: 'TRANSCRIBE';
  requestId: string;
  pcm: ArrayBuffer;
  language: Language;
}

interface WordChunk {
  text: string;
  timestamp: [number | null, number | null];
}

interface AsrOutput {
  text: string;
  chunks?: WordChunk[];
}

let transcriber: Transcriber | null = null;

interface MutableOnnxWasmOptions {
  wasmPaths?: { wasm: string; mjs: string };
  numThreads?: number;
  proxy?: boolean;
}

async function createTranscriber() {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = 'loofi-asr://models/';
  env.useFS = false;
  env.useFSCache = false;
  env.useBrowserCache = false;
  env.useCustomCache = false;
  const wasmOptions = (env.backends.onnx.wasm ?? {}) as unknown as MutableOnnxWasmOptions;
  Object.assign(env.backends.onnx, { wasm: wasmOptions });
  Object.assign(wasmOptions, {
    wasmPaths: { wasm: wasmUrl, mjs: wasmFactoryUrl },
    numThreads: Math.max(1, Math.min(4, navigator.hardwareConcurrency || 2)),
    proxy: false,
  });
  return pipeline('automatic-speech-recognition', MODEL_ID, {
    revision: MODEL_REVISION,
    dtype: 'q8',
    local_files_only: true,
  });
}

function languageName(language: Language): string | undefined {
  if (language === 'auto') return undefined;
  return {
    en: 'english',
    sv: 'swedish',
    es: 'spanish',
    fr: 'french',
    ja: 'japanese',
    ar: 'arabic',
  }[language];
}

self.onmessage = async (event: MessageEvent<AsrMessage>) => {
  const message = event.data;
  if (!message || message.type !== 'TRANSCRIBE') return;
  const { requestId } = message;
  try {
    self.postMessage({ type: 'STATUS', requestId, status: 'loading-model' });
    transcriber ??= await createTranscriber();
    self.postMessage({ type: 'STATUS', requestId, status: 'transcribing' });
    const output = (await transcriber(new Float32Array(message.pcm), {
      task: 'transcribe',
      language: languageName(message.language),
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
    })) as AsrOutput;
    self.postMessage({
      type: 'RESULT',
      requestId,
      text: output.text,
      chunks: output.chunks ?? [],
      modelId: MODEL_ID,
      modelRevision: MODEL_REVISION,
      language: message.language,
    });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};
