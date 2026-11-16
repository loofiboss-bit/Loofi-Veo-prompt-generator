import type {
  PromptArtifactTarget,
  StudioExecutionMode,
  TargetModelProfile,
  UniversalVideoTarget,
  VideoPromptArtifactInput,
  VeoDuration,
  VeoGenerationMode,
  VeoGenerationRequest,
  VeoModelId,
  VeoCapabilityIssue,
} from '@core/types';
import {
  TARGET_MODEL_PROFILES,
  getTargetProfile,
  getProfileModes,
  getProfileDurations,
  getProfileAspectRatios,
} from '@core/services/modelTranspilerService';

export interface StudioCapability {
  handoff: 'manual' | 'approved-provider' | 'experimental';
  label: string;
  lifecycle: 'active' | 'retired' | 'legacy';
}

export interface StudioExecutionContract {
  executionMode: StudioExecutionMode;
  target: UniversalVideoTarget;
  profile: TargetModelProfile;
  requiresManualMediaIngestion: boolean;
}

/** UI labels and execution status are derived from the same source-backed profiles. */
export const STUDIO_CAPABILITIES: Record<PromptArtifactTarget, StudioCapability> = {
  ...Object.fromEntries(
    Object.entries(TARGET_MODEL_PROFILES).map(([target, item]) => [
      target,
      {
        handoff: item.handoff,
        label: item.displayName,
        lifecycle: item.lifecycle,
      },
    ]),
  ),
  suno: { handoff: 'manual', label: 'Suno', lifecycle: 'active' },
} as Record<PromptArtifactTarget, StudioCapability>;

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

/** Profile checks are shared by local guidance and provider handoff. Never change saved settings here. */
export function studioVideoRequestIssues(
  input: VideoPromptArtifactInput,
): Array<Omit<VeoCapabilityIssue, 'code'> & { code: string }> {
  const issues: Array<Omit<VeoCapabilityIssue, 'code'> & { code: string }> = [];
  let selected;
  try {
    selected = getTargetProfile(input.target, input.profileId);
  } catch (error) {
    return [
      {
        code: 'profile-unknown',
        field: 'modelId',
        message: error instanceof Error ? error.message : 'Unknown target profile.',
      },
    ];
  }
  if (selected.lifecycle === 'retired')
    return [
      {
        code: 'target-retired',
        field: 'modelId',
        message: `${selected.displayName} is retired. Choose an active target; existing prompt text remains available.`,
      },
    ];
  if (!getProfileModes(input).includes(input.mode))
    issues.push({
      code: 'mode-unsupported',
      field: 'mode',
      message: `${selected.displayName} does not support this mode.`,
    });
  if (!getProfileDurations(input).includes(input.durationSeconds))
    issues.push({
      code: 'duration-unsupported',
      field: 'durationSeconds',
      message: `${selected.displayName} supports these durations for this mode: ${getProfileDurations(input).join(', ')} seconds.`,
    });
  if (!getProfileAspectRatios(input).includes(input.aspectRatio))
    issues.push({
      code: 'aspect-ratio-unsupported',
      field: 'aspectRatio',
      message: `${selected.displayName} supports these aspect ratios: ${getProfileAspectRatios(input).join(', ')}.`,
    });
  return issues;
}

const mapPromptModeToProductionMode = (
  mode: VideoPromptArtifactInput['mode'],
): VeoGenerationMode => {
  switch (mode) {
    case 'image-to-video':
      return 'image-to-video';
    case 'first-last-frames':
      return 'interpolation';
    case 'ingredients':
      return 'reference-images';
    case 'extend':
      return 'extension';
    case 'text-to-video':
    default:
      return 'text-to-video';
  }
};

const normalizeDurationForProduction = (duration: number): VeoDuration => {
  if (duration <= 4) return 4;
  if (duration <= 6) return 6;
  return 8;
};

const resolveProductionModelId = (profile: TargetModelProfile): VeoModelId => {
  if (profile.profileId.includes('quality')) return 'veo-3.1-quality';
  if (profile.profileId.includes('lite')) return 'veo-3.1-lite';
  return 'veo-3.1-fast';
};

export function getStudioExecutionContract(
  input: Pick<VideoPromptArtifactInput, 'target' | 'profileId'>,
): StudioExecutionContract {
  const profile = getTargetProfile(input.target, input.profileId);
  if (profile.lifecycle === 'retired') {
    if (input.target === 'veo-api') {
      throw new Error(
        'Veo 3.1 Preview in Gemini API shut down on 2026-10-22. Choose an active target.',
      );
    }
    throw new Error(`${profile.displayName} is retired. Choose an active target.`);
  }
  const executionMode: StudioExecutionMode =
    input.target === 'omni-flash'
      ? 'gemini-omni'
      : input.target === 'flow-veo'
        ? 'vertex-veo-ga'
        : 'external-manual-slot';
  return {
    executionMode,
    target: input.target,
    profile,
    requiresManualMediaIngestion: executionMode === 'external-manual-slot',
  };
}

/** Converts an active Studio brief/variant into a production-run request contract. */
export function studioVideoRequest(input: VideoPromptArtifactInput): VeoGenerationRequest {
  const contract = getStudioExecutionContract(input);
  const issues = studioVideoRequestIssues(input);
  if (issues.length > 0) {
    throw new Error(issues[0].message);
  }
  const referenceAssetIds = [...(input.referenceAssetIds ?? [])];
  const rawAspect = input.aspectRatio;
  const aspectRatio: '16:9' | '9:16' = rawAspect === '9:16' ? '9:16' : '16:9';
  return {
    mode: mapPromptModeToProductionMode(input.mode),
    modelId: resolveProductionModelId(contract.profile),
    provider: contract.executionMode === 'vertex-veo-ga' ? 'vertex-ai' : 'gemini-api',
    target: input.target,
    profileId: contract.profile.profileId,
    executionMode: contract.executionMode,
    prompt: input.idea.trim() || contract.profile.displayName,
    ...(contract.profile.negativePolicy === 'unsupported'
      ? {}
      : { negativePrompt: input.negativePrompt }),
    aspectRatio,
    resolution: '720p',
    durationSeconds: normalizeDurationForProduction(input.durationSeconds),
    ...(input.firstFrameAssetId ? { firstFrameAssetId: input.firstFrameAssetId } : {}),
    ...(input.lastFrameAssetId ? { lastFrameAssetId: input.lastFrameAssetId } : {}),
    referenceAssetIds,
    ...(input.extensionArtifact ? { extensionArtifact: input.extensionArtifact } : {}),
  };
}

export function studioGenerationBlocker(input: VideoPromptArtifactInput): string | null {
  try {
    studioVideoRequest(input);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'This request is not supported.';
  }
}
