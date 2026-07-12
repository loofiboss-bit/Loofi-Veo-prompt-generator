/**
 * Canonical v8 model registry.
 *
 * Provider adapters and UI must use these entries instead of maintaining
 * independent model IDs, lifecycle data, capability flags, or price tables.
 */
export type ModelLifecycleStatus = 'stable' | 'preview' | 'deprecated' | 'shut-down';
export type ModelProvider = 'gemini-api' | 'vertex-ai' | 'ollama';
export type ModelOperation = 'plan' | 'review' | 'image' | 'video' | 'tts' | 'video-edit';
export type CostMode = 'smart' | 'quality' | 'fast' | 'economy' | 'manual';
export type ModelApiSurface = 'google-ai-v1beta' | 'vertex-ai-v1' | 'ollama-v1';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
export type VideoResolution = '720p' | '1080p' | '4k';

export interface ProviderModelBinding {
  provider: ModelProvider;
  apiSurface: ModelApiSurface;
  modelId: string;
  regions?: readonly string[];
}

export interface ModelPrice {
  effectiveDate: string;
  inputTokenPerMillionUsd?: number;
  outputTokenPerMillionUsd?: number;
  imagePerGenerationUsd?: number;
  videoPerSecondUsd?: Partial<Record<'720p' | '1080p' | '4k', number>>;
}

export interface ModelCapabilities {
  operations: readonly ModelOperation[];
  inputModalities: readonly ('text' | 'image' | 'audio' | 'video')[];
  outputModalities: readonly ('text' | 'image' | 'audio' | 'video')[];
  supportsReferenceImages?: boolean;
  supportsFirstLastFrame?: boolean;
  supportsExtension?: boolean;
  supportsSeed?: boolean;
  supportsInteraction?: boolean;
  supportedDurationsSeconds?: readonly number[];
  supportedAspectRatios?: readonly AspectRatio[];
  supportedResolutions?: readonly VideoResolution[];
  maximumReferenceImages?: number;
  supportsAudioOutput?: boolean;
  supportsVideoEditing?: boolean;
}

export interface ModelCatalogEntry {
  id: string;
  displayName: string;
  /** Default provider binding; retained for compatibility with existing callers. */
  provider: ModelProvider;
  providerModelId: string;
  apiSurface: ModelApiSurface;
  providerBindings: readonly ProviderModelBinding[];
  lifecycle: ModelLifecycleStatus;
  replacementModelId?: string;
  sunsetDate?: string;
  minimumSdkVersion: string;
  regionRestrictions: readonly string[];
  capabilities: ModelCapabilities;
  pricing: ModelPrice;
}

const EFFECTIVE_DATE = '2026-07-11';
const GOOGLE_REGIONS = ['global', 'us-central1', 'europe-west4'] as const;
const TEXT_CONSTRAINTS = {} as const;
const VIDEO_ASPECTS = ['16:9', '9:16'] as const;

const googleBindings = (
  geminiModelId: string,
  vertexModelId: string = geminiModelId,
): readonly ProviderModelBinding[] => [
  { provider: 'gemini-api', apiSurface: 'google-ai-v1beta', modelId: geminiModelId },
  {
    provider: 'vertex-ai',
    apiSurface: 'vertex-ai-v1',
    modelId: vertexModelId,
    regions: GOOGLE_REGIONS,
  },
];

export const MODEL_CATALOG: readonly ModelCatalogEntry[] = [
  {
    id: 'gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
    provider: 'gemini-api',
    providerModelId: 'gemini-3.5-flash',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3.5-flash'),
    lifecycle: 'stable',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['plan', 'review'],
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text'],
      ...TEXT_CONSTRAINTS,
    },
    pricing: {
      effectiveDate: EFFECTIVE_DATE,
      inputTokenPerMillionUsd: 0.5,
      outputTokenPerMillionUsd: 3,
    },
  },
  {
    id: 'gemini-3.1-pro',
    displayName: 'Gemini 3.1 Pro',
    provider: 'gemini-api',
    providerModelId: 'gemini-3.1-pro-preview',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3.1-pro-preview', 'gemini-3.1-pro'),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['plan', 'review'],
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text'],
    },
    pricing: {
      effectiveDate: EFFECTIVE_DATE,
      inputTokenPerMillionUsd: 1.25,
      outputTokenPerMillionUsd: 10,
    },
  },
  {
    id: 'gemini-3.1-flash-lite',
    displayName: 'Gemini 3.1 Flash-Lite',
    provider: 'gemini-api',
    providerModelId: 'gemini-3.1-flash-lite',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3.1-flash-lite'),
    lifecycle: 'stable',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['plan', 'review'],
      inputModalities: ['text', 'image'],
      outputModalities: ['text'],
    },
    pricing: {
      effectiveDate: EFFECTIVE_DATE,
      inputTokenPerMillionUsd: 0.1,
      outputTokenPerMillionUsd: 0.4,
    },
  },
  {
    id: 'nano-banana-2',
    displayName: 'Nano Banana 2',
    provider: 'gemini-api',
    providerModelId: 'gemini-3.1-flash-image',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3.1-flash-image'),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['image'],
      inputModalities: ['text', 'image'],
      outputModalities: ['image'],
    },
    pricing: { effectiveDate: EFFECTIVE_DATE, imagePerGenerationUsd: 0.04 },
  },
  {
    id: 'nano-banana-2-lite',
    displayName: 'Nano Banana 2 Lite',
    provider: 'gemini-api',
    providerModelId: 'gemini-3.1-flash-lite-image',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3.1-flash-lite-image'),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['image'],
      inputModalities: ['text', 'image'],
      outputModalities: ['image'],
    },
    pricing: { effectiveDate: EFFECTIVE_DATE, imagePerGenerationUsd: 0.02 },
  },
  {
    id: 'nano-banana-pro',
    displayName: 'Nano Banana Pro',
    provider: 'gemini-api',
    providerModelId: 'gemini-3-pro-image',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3-pro-image'),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['image'],
      inputModalities: ['text', 'image'],
      outputModalities: ['image'],
    },
    pricing: { effectiveDate: EFFECTIVE_DATE, imagePerGenerationUsd: 0.08 },
  },
  {
    id: 'gemini-3.1-flash-tts',
    displayName: 'Gemini 3.1 Flash TTS',
    provider: 'gemini-api',
    providerModelId: 'gemini-3.1-flash-tts-preview',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3.1-flash-tts-preview'),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['tts'],
      inputModalities: ['text'],
      outputModalities: ['audio'],
      supportsAudioOutput: true,
    },
    pricing: { effectiveDate: EFFECTIVE_DATE },
  },
  {
    id: 'gemini-omni-flash',
    displayName: 'Gemini Omni Flash',
    provider: 'gemini-api',
    providerModelId: 'gemini-omni-flash-preview',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-omni-flash-preview'),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['video', 'video-edit'],
      inputModalities: ['text', 'image', 'video'],
      outputModalities: ['video'],
      supportsInteraction: true,
      supportsVideoEditing: true,
      supportedAspectRatios: VIDEO_ASPECTS,
    },
    pricing: { effectiveDate: EFFECTIVE_DATE },
  },
  {
    id: 'veo-3.1-quality',
    displayName: 'Veo 3.1 Quality',
    provider: 'gemini-api',
    providerModelId: 'veo-3.1-generate-preview',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('veo-3.1-generate-preview', 'veo-3.1-generate-001'),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['video'],
      inputModalities: ['text', 'image'],
      outputModalities: ['video'],
      supportsReferenceImages: true,
      supportsFirstLastFrame: true,
      supportsExtension: true,
      supportsSeed: true,
      supportedDurationsSeconds: [4, 6, 8],
      supportedAspectRatios: VIDEO_ASPECTS,
      supportedResolutions: ['720p', '1080p', '4k'],
      maximumReferenceImages: 3,
      supportsAudioOutput: true,
    },
    pricing: {
      effectiveDate: EFFECTIVE_DATE,
      videoPerSecondUsd: { '720p': 0.4, '1080p': 0.4, '4k': 0.6 },
    },
  },
  {
    id: 'veo-3.1-fast',
    displayName: 'Veo 3.1 Fast',
    provider: 'gemini-api',
    providerModelId: 'veo-3.1-fast-generate-preview',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('veo-3.1-fast-generate-preview', 'veo-3.1-fast-generate-001'),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['video'],
      inputModalities: ['text', 'image'],
      outputModalities: ['video'],
      supportsReferenceImages: true,
      supportsFirstLastFrame: true,
      supportsExtension: true,
      supportsSeed: true,
      supportedDurationsSeconds: [4, 6, 8],
      supportedAspectRatios: VIDEO_ASPECTS,
      supportedResolutions: ['720p', '1080p', '4k'],
      maximumReferenceImages: 3,
      supportsAudioOutput: true,
    },
    pricing: {
      effectiveDate: EFFECTIVE_DATE,
      videoPerSecondUsd: { '720p': 0.1, '1080p': 0.12, '4k': 0.3 },
    },
  },
  {
    id: 'veo-3.1-lite',
    displayName: 'Veo 3.1 Lite',
    provider: 'gemini-api',
    providerModelId: 'veo-3.1-lite-generate-preview',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('veo-3.1-lite-generate-preview', 'veo-3.1-lite-generate-001'),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['video'],
      inputModalities: ['text', 'image'],
      outputModalities: ['video'],
      supportsSeed: true,
      supportedDurationsSeconds: [4, 6, 8],
      supportedAspectRatios: VIDEO_ASPECTS,
      supportedResolutions: ['720p', '1080p'],
      maximumReferenceImages: 0,
      supportsAudioOutput: true,
    },
    pricing: { effectiveDate: EFFECTIVE_DATE, videoPerSecondUsd: { '720p': 0.06, '1080p': 0.08 } },
  },
] as const;

export const getModel = (modelId: string): ModelCatalogEntry | undefined =>
  MODEL_CATALOG.find((entry) => entry.id === modelId || entry.providerModelId === modelId);

/** Resolve either a canonical or provider ID to the canonical registry ID. */
export const resolveCanonicalModelId = (modelId: string): string =>
  getModel(modelId)?.id ?? modelId;

/** Resolve a canonical or legacy provider ID at the provider boundary. */
export const resolveProviderModelId = (modelId: string, provider?: ModelProvider): string => {
  const model = getModel(modelId);
  if (!model) return modelId;
  return provider
    ? (model.providerBindings.find((binding) => binding.provider === provider)?.modelId ??
        model.providerModelId)
    : model.providerModelId;
};

export const getProviderBinding = (
  modelId: string,
  provider: ModelProvider,
): ProviderModelBinding | undefined =>
  getModel(modelId)?.providerBindings.find((binding) => binding.provider === provider);

export const isShutdownModel = (modelId: string): boolean =>
  getModel(modelId)?.lifecycle === 'shut-down';

export const LEGACY_MODEL_REPLACEMENTS: Readonly<Record<string, string>> = {
  'gemini-3-pro-preview': 'gemini-3.5-flash',
  'gemini-2.0-flash': 'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview': 'gemini-3.1-pro',
  'veo-3.1-generate-preview': 'veo-3.1-quality',
  'veo-3.1-fast-generate-preview': 'veo-3.1-fast',
};
