/**
 * ComfyUI Local GPU Video Service (v13.0.0)
 *
 * Local-first client for executing zero-cost, local GPU video generation
 * workflows against a local ComfyUI instance (http://127.0.0.1:8188).
 *
 * Supports:
 * - Real-time instance health and VRAM/system stat inspection.
 * - Deterministic workflow graph compilation (SVD, HunyuanVideo, CogVideoX, AnimateDiff).
 * - Execution queuing (/prompt), history tracking (/history), and output media URL extraction (/view).
 */

import type {
  ComfyUiPromptGraph,
  ComfyUiSystemStats,
  ComfyUiPromptResponse,
  ComfyUiHistoryResponse,
  ComfyUiHistoryItem,
  ComfyUiMediaOutput,
  ComfyUiWorkflowOptions,
} from '@core/types/comfyUi';

export const DEFAULT_COMFYUI_ENDPOINT = 'http://127.0.0.1:8188';

export const normalizeComfyUiEndpoint = (endpoint?: string): string => {
  const trimmed = (endpoint ?? '').trim();
  if (!trimmed) return DEFAULT_COMFYUI_ENDPOINT;
  return trimmed.replace(/\/+$/, '');
};

/**
 * Check if the local ComfyUI instance is online and query GPU/VRAM statistics.
 */
export const checkComfyUiHealth = async (
  endpoint?: string,
  timeoutMs: number = 3000,
): Promise<{ online: boolean; systemStats?: ComfyUiSystemStats; error?: string }> => {
  const base = normalizeComfyUiEndpoint(endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${base}/system_stats`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return { online: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = (await response.json()) as ComfyUiSystemStats;
    return { online: true, systemStats: data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return { online: false, error: message };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Deterministically construct an executable ComfyUI prompt node graph.
 */
export const buildComfyUiWorkflow = (options: ComfyUiWorkflowOptions): ComfyUiPromptGraph => {
  const {
    positivePrompt,
    negativePrompt = 'blurry, low quality, distorted, jitter, watermark',
    width = 1024,
    height = 576,
    frames = 25,
    steps = 20,
    cfg = 7.0,
    seed = Math.floor(Math.random() * 1000000000),
    preset = 'stable-video-diffusion',
  } = options;

  const checkpointName =
    preset === 'hunyuan-video'
      ? 'hunyuan_video_720p.safetensors'
      : preset === 'cogvideox'
        ? 'cogvideox_5b.safetensors'
        : 'svd_xt.safetensors';

  const graph: ComfyUiPromptGraph = {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: checkpointName,
      },
      _meta: { title: 'Load Checkpoint' },
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: positivePrompt,
        clip: ['1', 1],
      },
      _meta: { title: 'Positive Prompt' },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: negativePrompt,
        clip: ['1', 1],
      },
      _meta: { title: 'Negative Prompt' },
    },
    '4': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width,
        height,
        batch_size: frames,
      },
      _meta: { title: 'Empty Latent Video Frames' },
    },
    '5': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1.0,
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['4', 0],
      },
      _meta: { title: 'KSampler' },
    },
    '6': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['5', 0],
        vae: ['1', 2],
      },
      _meta: { title: 'VAE Decode' },
    },
    '7': {
      class_type: 'SaveAnimatedWEBP',
      inputs: {
        filename_prefix: 'LoofiStudio_Preview',
        fps: options.fps ?? 12,
        lossless: false,
        quality: 85,
        method: 'default',
        images: ['6', 0],
      },
      _meta: { title: 'Save Video Output' },
    },
  };

  return graph;
};

/**
 * Queue a prompt workflow execution to the local ComfyUI engine.
 */
export const queueComfyUiPrompt = async (
  graph: ComfyUiPromptGraph,
  endpoint?: string,
  clientId: string = 'loofi-creator-studio',
): Promise<ComfyUiPromptResponse> => {
  const base = normalizeComfyUiEndpoint(endpoint);

  const response = await fetch(`${base}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: graph, client_id: clientId }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ComfyUI queue failed (HTTP ${response.status}): ${errorBody}`);
  }

  return (await response.json()) as ComfyUiPromptResponse;
};

/**
 * Fetch execution history for a completed prompt task.
 */
export const fetchComfyUiHistory = async (
  promptId: string,
  endpoint?: string,
): Promise<ComfyUiHistoryItem | null> => {
  const base = normalizeComfyUiEndpoint(endpoint);

  const response = await fetch(`${base}/history/${promptId}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch ComfyUI history for ${promptId}: HTTP ${response.status}`);
  }

  const data = (await response.json()) as ComfyUiHistoryResponse;
  return data[promptId] ?? null;
};

/**
 * Extract media preview and download URLs from a ComfyUI history item.
 */
export const extractOutputMediaUrls = (
  historyItem: ComfyUiHistoryItem,
  endpoint?: string,
): ComfyUiMediaOutput[] => {
  const base = normalizeComfyUiEndpoint(endpoint);
  const results: ComfyUiMediaOutput[] = [];

  for (const nodeOutput of Object.values(historyItem.outputs)) {
    const files = [
      ...(nodeOutput.videos ?? []),
      ...(nodeOutput.gifs ?? []),
      ...(nodeOutput.images ?? []),
    ];

    for (const item of files) {
      const url = `${base}/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder || '')}&type=${encodeURIComponent(item.type || 'output')}`;
      results.push({
        ...item,
        url,
      });
    }
  }

  return results;
};

/**
 * Poll local ComfyUI task until completion or timeout.
 */
export const pollComfyUiExecution = async (
  promptId: string,
  options: {
    endpoint?: string;
    intervalMs?: number;
    maxAttempts?: number;
    onProgress?: (status: string) => void;
  } = {},
): Promise<ComfyUiMediaOutput[]> => {
  const { endpoint, intervalMs = 1500, maxAttempts = 60, onProgress } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    onProgress?.(`Checking execution status (attempt ${attempt}/${maxAttempts})...`);
    const historyItem = await fetchComfyUiHistory(promptId, endpoint);

    if (historyItem) {
      if (historyItem.status?.status_str === 'error') {
        throw new Error('ComfyUI execution failed in prompt graph.');
      }
      if (historyItem.status?.completed || Object.keys(historyItem.outputs).length > 0) {
        onProgress?.('Execution completed successfully!');
        return extractOutputMediaUrls(historyItem, endpoint);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`ComfyUI task ${promptId} timed out after ${maxAttempts} polling attempts.`);
};
