/**
 * ComfyUI Integration Types (v13.0.0)
 *
 * Types for connecting to local ComfyUI instances, querying hardware/system stats,
 * and dispatching local video generation workflows (SVD, HunyuanVideo, CogVideoX, AnimateDiff).
 */

export interface ComfyUiNode {
  inputs: Record<string, unknown>;
  class_type: string;
  _meta?: { title?: string };
}

export type ComfyUiPromptGraph = Record<string, ComfyUiNode>;

export interface ComfyUiDevice {
  name: string;
  type: string;
  vram_total: number;
  vram_free: number;
  torch_vram_total?: number;
  torch_vram_free?: number;
}

export interface ComfyUiSystemStats {
  system: {
    os: string;
    python_version: string;
    embedded_python?: boolean;
  };
  devices: ComfyUiDevice[];
}

export interface ComfyUiPromptResponse {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, unknown>;
}

export interface ComfyUiMediaOutput {
  filename: string;
  subfolder: string;
  type: string;
  url?: string;
}

export interface ComfyUiHistoryItem {
  prompt: [number, string, ComfyUiPromptGraph, Record<string, unknown>, string[]];
  outputs: Record<
    string,
    {
      images?: ComfyUiMediaOutput[];
      gifs?: ComfyUiMediaOutput[];
      videos?: ComfyUiMediaOutput[];
    }
  >;
  status: {
    status_str: 'success' | 'error';
    completed: boolean;
    messages: unknown[];
  };
}

export type ComfyUiHistoryResponse = Record<string, ComfyUiHistoryItem>;

export interface ComfyUiExecutionProgress {
  promptId: string;
  node: string | null;
  step: number;
  maxSteps: number;
  percentage: number;
}

export type ComfyUiWorkflowPreset =
  | 'stable-video-diffusion'
  | 'hunyuan-video'
  | 'cogvideox'
  | 'animatediff'
  | 'custom';

export interface ComfyUiWorkflowOptions {
  positivePrompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  frames?: number;
  fps?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  preset?: ComfyUiWorkflowPreset;
  inputImageBase64?: string;
}
