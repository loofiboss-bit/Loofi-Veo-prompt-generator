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
  supportedResolutions?: readonly ('720p' | '1080p' | '4k')[];
}

export interface ModelCatalogEntry {
  id: string;
  displayName: string;
  provider: ModelProvider;
  providerModelId: string;
  lifecycle: ModelLifecycleStatus;
  replacementModelId?: string;
  capabilities: ModelCapabilities;
  pricing: ModelPrice;
}

const EFFECTIVE_DATE = '2026-07-11';

export const MODEL_CATALOG: readonly ModelCatalogEntry[] = [
  {
    id: 'gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
    provider: 'gemini-api',
    providerModelId: 'gemini-3.5-flash',
    lifecycle: 'stable',
    capabilities: {
      operations: ['plan', 'review'],
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text'],
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
    lifecycle: 'preview',
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
    lifecycle: 'stable',
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
    lifecycle: 'preview',
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
    lifecycle: 'preview',
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
    lifecycle: 'preview',
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
    lifecycle: 'preview',
    capabilities: { operations: ['tts'], inputModalities: ['text'], outputModalities: ['audio'] },
    pricing: { effectiveDate: EFFECTIVE_DATE },
  },
  {
    id: 'gemini-omni-flash',
    displayName: 'Gemini Omni Flash',
    provider: 'gemini-api',
    providerModelId: 'gemini-omni-flash-preview',
    lifecycle: 'preview',
    capabilities: {
      operations: ['video', 'video-edit'],
      inputModalities: ['text', 'image', 'video'],
      outputModalities: ['video'],
      supportsInteraction: true,
    },
    pricing: { effectiveDate: EFFECTIVE_DATE },
  },
  {
    id: 'veo-3.1-quality',
    displayName: 'Veo 3.1 Quality',
    provider: 'gemini-api',
    providerModelId: 'veo-3.1-generate-preview',
    lifecycle: 'preview',
    capabilities: {
      operations: ['video'],
      inputModalities: ['text', 'image'],
      outputModalities: ['video'],
      supportsReferenceImages: true,
      supportsFirstLastFrame: true,
      supportsExtension: true,
      supportsSeed: true,
      supportedResolutions: ['720p', '1080p', '4k'],
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
    lifecycle: 'preview',
    capabilities: {
      operations: ['video'],
      inputModalities: ['text', 'image'],
      outputModalities: ['video'],
      supportsReferenceImages: true,
      supportsFirstLastFrame: true,
      supportsExtension: true,
      supportsSeed: true,
      supportedResolutions: ['720p', '1080p', '4k'],
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
    lifecycle: 'preview',
    capabilities: {
      operations: ['video'],
      inputModalities: ['text', 'image'],
      outputModalities: ['video'],
      supportsSeed: true,
      supportedResolutions: ['720p', '1080p'],
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
export const resolveProviderModelId = (modelId: string): string =>
  getModel(modelId)?.providerModelId ?? modelId;

export const isShutdownModel = (modelId: string): boolean =>
  getModel(modelId)?.lifecycle === 'shut-down';

export const LEGACY_MODEL_REPLACEMENTS: Readonly<Record<string, string>> = {
  'gemini-3-pro-preview': 'gemini-3.5-flash',
  'gemini-2.0-flash': 'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview': 'gemini-3.1-pro',
  'veo-3.1-generate-preview': 'veo-3.1-quality',
  'veo-3.1-fast-generate-preview': 'veo-3.1-fast',
};
