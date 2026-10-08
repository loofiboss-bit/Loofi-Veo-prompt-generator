import type {
  PromptArtifactTarget,
  VideoPromptArtifactInput,
  VeoGenerationRequest,
  VeoCapabilityIssue,
} from '@core/types';
import { getModel } from '@core/models/catalog';
import { veoGenerationService } from '@core/services/veoGenerationService';

export interface StudioCapability {
  handoff: 'manual' | 'approved-provider' | 'experimental';
  label: string;
}

export const STUDIO_CAPABILITIES: Record<PromptArtifactTarget, StudioCapability> = {
  'flow-veo': { handoff: 'manual', label: 'Google Flow / Veo' },
  'veo-api': { handoff: 'approved-provider', label: 'Veo API' },
  kling: { handoff: 'manual', label: 'Kling' },
  'runway-gen3': { handoff: 'manual', label: 'Runway' },
  sora: { handoff: 'manual', label: 'OpenAI Sora' },
  'luma-ray': { handoff: 'manual', label: 'Luma' },
  'wan-video': { handoff: 'manual', label: 'Wan 2.1' },
  'minimax-hailuo': { handoff: 'manual', label: 'Minimax / Hailuo' },
  suno: { handoff: 'manual', label: 'Suno' },
};

export const LAB_CAPABILITIES = [
  {
    id: 'comfy',
    label: 'ComfyUI',
    runnable: false,
    detail: 'Connection diagnostics only. Production rendering is not integrated.',
  },
  {
    id: 'live',
    label: 'Live Co-Director',
    runnable: false,
    detail: 'Live microphone, playback and active-document directing are not qualified.',
  },
  {
    id: 'lan',
    label: 'LAN collaboration',
    runnable: false,
    detail: 'Two-device sessions, concurrent editing and network privacy are not qualified.',
  },
  {
    id: 'spatial',
    label: '3D staging',
    runnable: true,
    detail: 'Experimental camera preview. GPU rendering and exported maps are not qualified.',
  },
  {
    id: 'foley',
    label: 'Foley pipeline',
    runnable: false,
    detail: 'Cue editing, durable audio and playback are not qualified.',
  },
  {
    id: 'fcpxml',
    label: 'FCPXML',
    runnable: false,
    detail: 'External editor import has not been qualified.',
  },
] as const;

function buildStudioVideoRequest(input: VideoPromptArtifactInput): VeoGenerationRequest {
  const modes = {
    'text-to-video': 'text-to-video',
    'image-to-video': 'image-to-video',
    'first-last-frames': 'interpolation',
    ingredients: 'reference-images',
    extend: 'extension',
  } as const;
  const request: VeoGenerationRequest = {
    mode: modes[input.mode],
    modelId: 'veo-3.1-fast',
    prompt: input.idea,
    negativePrompt: input.negativePrompt,
    aspectRatio: input.aspectRatio,
    resolution: '720p',
    durationSeconds: input.durationSeconds as 4 | 6 | 8,
    firstFrameAssetId: input.firstFrameAssetId,
    lastFrameAssetId: input.lastFrameAssetId,
    referenceAssetIds: input.referenceAssetIds ?? [],
    extensionSourceTakeId: input.extensionSourceTakeId,
    extensionArtifact: input.extensionArtifact,
  };
  return request;
}

/** Shared with guidance; executing a request still uses the provider's fail-closed validator. */
export function studioVideoRequestIssues(
  input: VideoPromptArtifactInput,
): Array<Omit<VeoCapabilityIssue, 'code'> & { code: string }> {
  if (input.target !== 'veo-api') return [];
  const request = buildStudioVideoRequest(input);
  const issues: Array<Omit<VeoCapabilityIssue, 'code'> & { code: string }> =
    veoGenerationService.validateRequest(request);
  if (
    !getModel(request.modelId)?.capabilities.supportedDurationsSeconds?.includes(
      input.durationSeconds,
    )
  ) {
    issues.unshift({
      code: 'duration-unsupported',
      field: 'durationSeconds',
      message: 'Veo API supports 4, 6 or 8 seconds.',
    });
  }
  return issues;
}

export function studioVideoRequest(input: VideoPromptArtifactInput): VeoGenerationRequest {
  if (input.target !== 'veo-api') throw new Error('This target uses a manual copy handoff.');
  const issues = studioVideoRequestIssues(input);
  if (issues.length) throw new Error(issues.map((issue) => issue.message).join(' '));
  return buildStudioVideoRequest(input);
}

export function studioGenerationBlocker(input: VideoPromptArtifactInput): string | null {
  try {
    studioVideoRequest(input);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'This request is not supported.';
  }
}
