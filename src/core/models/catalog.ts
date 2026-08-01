/**
 * Canonical v9 model registry.
 *
 * Provider adapters and UI must use these entries instead of maintaining
 * independent model IDs, lifecycle data, capability flags, or price tables.
 */
export type ModelLifecycleStatus = 'stable' | 'preview' | 'deprecated' | 'shut-down';
export type ModelProvider = 'gemini-api' | 'vertex-ai' | 'ollama';
export type ModelOperation = 'plan' | 'review' | 'image' | 'video' | 'tts' | 'music' | 'video-edit';
export type CostMode = 'smart' | 'quality' | 'fast' | 'economy' | 'manual';
export type ModelApiSurface =
  | 'google-ai-v1beta'
  | 'google-ai-interactions-v1beta'
  | 'vertex-ai-v1'
  | 'ollama-v1';
export type MediaModality = 'text' | 'image' | 'audio' | 'video';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
export type VideoResolution = '720p' | '1080p' | '4k';
export type ImageResolution = '0.5k' | '1k' | '2k' | '4k';
export type AudioFormat = 'mp3' | 'wav';
export type BillingMode =
  | 'input-tokens'
  | 'output-tokens'
  | 'cached-tokens'
  | 'generated-image'
  | 'video-seconds'
  | 'audio-output-tokens'
  | 'music-request'
  | 'flat-request';

export interface ProviderModelBinding {
  provider: ModelProvider;
  apiSurface: ModelApiSurface;
  modelId: string;
  regions?: readonly string[];
}

export interface PricingSource {
  catalogSource: string;
  sourceUrl: string;
  verifiedDate: string;
  effectiveDate: string;
  currency: 'USD';
}

export interface TokenPriceTier {
  /** Inclusive upper bound. Omit for the final tier. */
  maximumPromptTokens?: number;
  inputPerMillionUsd?: Partial<Record<MediaModality, number>>;
  outputPerMillionUsd?: Partial<Record<MediaModality, number>>;
  cachedInputPerMillionUsd?: Partial<Record<MediaModality, number>>;
}

export interface ModelPrice {
  status: 'priced' | 'unavailable';
  source: PricingSource;
  billingModes: readonly BillingMode[];
  tokenTiers?: readonly TokenPriceTier[];
  imagePerGenerationByResolutionUsd?: Partial<Record<ImageResolution, number>>;
  videoPerSecondByResolutionUsd?: Partial<Record<VideoResolution, number>>;
  videoOutputTokensPerSecondByResolution?: Partial<Record<VideoResolution, number>>;
  audioOutputTokensPerSecond?: number;
  flatRequestUsd?: number;
  assumptions: readonly string[];
  unavailableReason?: string;
}

export interface ModelCapabilities {
  operations: readonly ModelOperation[];
  inputModalities: readonly MediaModality[];
  outputModalities: readonly MediaModality[];
  supportsReferenceImages?: boolean;
  supportsFirstLastFrame?: boolean;
  supportsExtension?: boolean;
  supportsSeed?: boolean;
  supportsInteraction?: boolean;
  supportedDurationsSeconds?: readonly number[];
  supportedAspectRatios?: readonly AspectRatio[];
  supportedResolutions?: readonly VideoResolution[];
  supportedImageResolutions?: readonly ImageResolution[];
  maximumReferenceImages?: number;
  maximumInputImages?: number;
  supportedAudioFormats?: readonly AudioFormat[];
  fixedDurationSeconds?: number;
  supportsAudioOutput?: boolean;
  supportsVideoEditing?: boolean;
}

export interface ModelCatalogEntry {
  id: string;
  displayName: string;
  /** Default provider binding; retained for persisted v8 catalog snapshots. */
  provider: ModelProvider;
  providerModelId: string;
  apiSurface: ModelApiSurface;
  providerBindings: readonly ProviderModelBinding[];
  lifecycle: ModelLifecycleStatus;
  replacementModelId: string | null;
  sunsetDate: string | null;
  minimumSdkVersion: string;
  regionRestrictions: readonly string[];
  capabilities: ModelCapabilities;
  pricing: ModelPrice;
}

const VERIFIED_DATE = '2026-08-01';
const PRICING_URL = 'https://ai.google.dev/gemini-api/docs/pricing';
const GOOGLE_REGIONS = ['global', 'us-central1', 'europe-west4'] as const;
const VIDEO_ASPECTS = ['16:9', '9:16'] as const;

const priceSource = (effectiveDate = VERIFIED_DATE): PricingSource => ({
  catalogSource: 'Google Gemini Developer API pricing',
  sourceUrl: PRICING_URL,
  verifiedDate: VERIFIED_DATE,
  effectiveDate,
  currency: 'USD',
});

const tokenPricing = (
  tokenTiers: readonly TokenPriceTier[],
  assumptions: readonly string[],
): ModelPrice => ({
  status: 'priced',
  source: priceSource(),
  billingModes: ['input-tokens', 'output-tokens', 'cached-tokens'],
  tokenTiers,
  assumptions,
});

const googleBindings = (
  geminiModelId: string,
  vertexModelId: string = geminiModelId,
  apiSurface: ModelApiSurface = 'google-ai-v1beta',
): readonly ProviderModelBinding[] => [
  { provider: 'gemini-api', apiSurface, modelId: geminiModelId },
  {
    provider: 'vertex-ai',
    apiSurface: 'vertex-ai-v1',
    modelId: vertexModelId,
    regions: GOOGLE_REGIONS,
  },
];

type ModelCatalogDraft = Omit<ModelCatalogEntry, 'replacementModelId' | 'sunsetDate'> &
  Partial<Pick<ModelCatalogEntry, 'replacementModelId' | 'sunsetDate'>>;

const STANDARD_TEXT_ASSUMPTIONS = [
  'Uses paid-tier Standard pricing; Batch, Flex, Priority, grounding, and storage are excluded.',
  'Output-token ceilings must include thinking tokens where the provider bills them as output.',
] as const;

const MODEL_CATALOG_DRAFT: readonly ModelCatalogDraft[] = [
  {
    id: 'gemini-3.6-flash',
    displayName: 'Gemini 3.6 Flash',
    provider: 'gemini-api',
    providerModelId: 'gemini-3.6-flash',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3.6-flash'),
    lifecycle: 'stable',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['plan', 'review'],
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text'],
    },
    pricing: tokenPricing(
      [
        {
          inputPerMillionUsd: { text: 1.5, image: 1.5, audio: 1.5, video: 1.5 },
          outputPerMillionUsd: { text: 7.5 },
          cachedInputPerMillionUsd: { text: 0.15, image: 0.15, audio: 0.15, video: 0.15 },
        },
      ],
      STANDARD_TEXT_ASSUMPTIONS,
    ),
  },
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
    },
    pricing: tokenPricing(
      [
        {
          inputPerMillionUsd: { text: 1.5, image: 1.5, audio: 1.5, video: 1.5 },
          outputPerMillionUsd: { text: 9 },
          cachedInputPerMillionUsd: { text: 0.15, image: 0.15, audio: 0.15, video: 0.15 },
        },
      ],
      STANDARD_TEXT_ASSUMPTIONS,
    ),
  },
  {
    id: 'gemini-3.5-flash-lite',
    displayName: 'Gemini 3.5 Flash-Lite',
    provider: 'gemini-api',
    providerModelId: 'gemini-3.5-flash-lite',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3.5-flash-lite'),
    lifecycle: 'stable',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['plan', 'review'],
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text'],
    },
    pricing: tokenPricing(
      [
        {
          inputPerMillionUsd: { text: 0.3, image: 0.3, audio: 0.3, video: 0.3 },
          outputPerMillionUsd: { text: 2.5 },
          cachedInputPerMillionUsd: { text: 0.03, image: 0.03, audio: 0.03, video: 0.03 },
        },
      ],
      STANDARD_TEXT_ASSUMPTIONS,
    ),
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
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text'],
    },
    pricing: tokenPricing(
      [
        {
          inputPerMillionUsd: { text: 0.25, image: 0.25, video: 0.25, audio: 0.5 },
          outputPerMillionUsd: { text: 1.5 },
          cachedInputPerMillionUsd: { text: 0.025, image: 0.025, video: 0.025, audio: 0.05 },
        },
      ],
      STANDARD_TEXT_ASSUMPTIONS,
    ),
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
    pricing: tokenPricing(
      [
        {
          maximumPromptTokens: 200_000,
          inputPerMillionUsd: { text: 2, image: 2, audio: 2, video: 2 },
          outputPerMillionUsd: { text: 12 },
          cachedInputPerMillionUsd: { text: 0.2, image: 0.2, audio: 0.2, video: 0.2 },
        },
        {
          inputPerMillionUsd: { text: 4, image: 4, audio: 4, video: 4 },
          outputPerMillionUsd: { text: 18 },
          cachedInputPerMillionUsd: { text: 0.4, image: 0.4, audio: 0.4, video: 0.4 },
        },
      ],
      [
        ...STANDARD_TEXT_ASSUMPTIONS,
        'Prompts over 200,000 tokens use the higher Standard pricing tier.',
      ],
    ),
  },
  {
    id: 'nano-banana',
    displayName: 'Nano Banana',
    provider: 'gemini-api',
    providerModelId: 'gemini-2.5-flash-image',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-2.5-flash-image'),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['image'],
      inputModalities: ['text', 'image'],
      outputModalities: ['image'],
      supportedImageResolutions: ['1k'],
    },
    pricing: {
      status: 'priced',
      source: priceSource(),
      billingModes: ['input-tokens', 'generated-image'],
      tokenTiers: [{ inputPerMillionUsd: { text: 0.3, image: 0.3 } }],
      imagePerGenerationByResolutionUsd: { '1k': 0.039 },
      assumptions: [
        'Uses paid-tier Standard pricing and the documented up-to-1024x1024 image rate.',
      ],
    },
  },
  {
    id: 'nano-banana-2',
    displayName: 'Nano Banana 2',
    provider: 'gemini-api',
    providerModelId: 'gemini-3.1-flash-image',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3.1-flash-image'),
    lifecycle: 'stable',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['image'],
      inputModalities: ['text', 'image'],
      outputModalities: ['text', 'image'],
      supportedImageResolutions: ['0.5k', '1k', '2k', '4k'],
    },
    pricing: {
      status: 'priced',
      source: priceSource(),
      billingModes: ['input-tokens', 'output-tokens', 'generated-image'],
      tokenTiers: [
        {
          inputPerMillionUsd: { text: 0.5, image: 0.5 },
          outputPerMillionUsd: { text: 3 },
        },
      ],
      imagePerGenerationByResolutionUsd: {
        '0.5k': 0.045,
        '1k': 0.067,
        '2k': 0.101,
        '4k': 0.151,
      },
      assumptions: ['Uses paid-tier Standard pricing; Batch pricing is excluded.'],
    },
  },
  {
    id: 'nano-banana-2-lite',
    displayName: 'Nano Banana 2 Lite',
    provider: 'gemini-api',
    providerModelId: 'gemini-3.1-flash-lite-image',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3.1-flash-lite-image'),
    lifecycle: 'stable',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['image'],
      inputModalities: ['text', 'image', 'video'],
      outputModalities: ['text', 'image'],
      supportedImageResolutions: ['1k'],
    },
    pricing: {
      status: 'priced',
      source: priceSource(),
      billingModes: ['input-tokens', 'output-tokens', 'generated-image'],
      tokenTiers: [
        {
          inputPerMillionUsd: { text: 0.25, image: 0.25, video: 0.25 },
          outputPerMillionUsd: { text: 1.5 },
        },
      ],
      imagePerGenerationByResolutionUsd: { '1k': 0.0336 },
      assumptions: ['Only the documented 1K output price is executable.'],
    },
  },
  {
    id: 'nano-banana-pro',
    displayName: 'Nano Banana Pro',
    provider: 'gemini-api',
    providerModelId: 'gemini-3-pro-image',
    apiSurface: 'google-ai-v1beta',
    providerBindings: googleBindings('gemini-3-pro-image'),
    lifecycle: 'stable',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['image'],
      inputModalities: ['text', 'image'],
      outputModalities: ['text', 'image'],
      supportedImageResolutions: ['1k', '2k', '4k'],
    },
    pricing: {
      status: 'priced',
      source: priceSource(),
      billingModes: ['input-tokens', 'output-tokens', 'generated-image'],
      tokenTiers: [
        {
          inputPerMillionUsd: { text: 2, image: 2 },
          outputPerMillionUsd: { text: 12 },
        },
      ],
      imagePerGenerationByResolutionUsd: { '1k': 0.134, '2k': 0.134, '4k': 0.24 },
      assumptions: ['Uses paid-tier Standard pricing; input-image token charges are separate.'],
    },
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
    pricing: {
      status: 'priced',
      source: priceSource(),
      billingModes: ['input-tokens', 'audio-output-tokens'],
      tokenTiers: [
        {
          inputPerMillionUsd: { text: 1 },
          outputPerMillionUsd: { audio: 20 },
        },
      ],
      audioOutputTokensPerSecond: 25,
      assumptions: [
        'Uses paid-tier Standard pricing and the documented 25 output audio tokens per second.',
      ],
    },
  },
  {
    id: 'lyria-3-clip-preview',
    displayName: 'Lyria 3 Clip',
    provider: 'gemini-api',
    providerModelId: 'lyria-3-clip-preview',
    apiSurface: 'google-ai-interactions-v1beta',
    providerBindings: googleBindings(
      'lyria-3-clip-preview',
      'lyria-3-clip-preview',
      'google-ai-interactions-v1beta',
    ),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['music'],
      inputModalities: ['text', 'image'],
      outputModalities: ['text', 'audio'],
      supportsInteraction: true,
      supportsAudioOutput: true,
      maximumInputImages: 10,
      supportedAudioFormats: ['mp3'],
      fixedDurationSeconds: 30,
    },
    pricing: {
      status: 'priced',
      source: priceSource(),
      billingModes: ['music-request'],
      flatRequestUsd: 0.04,
      assumptions: ['One request produces one fixed 30-second MP3 clip.'],
    },
  },
  {
    id: 'lyria-3-pro-preview',
    displayName: 'Lyria 3 Pro',
    provider: 'gemini-api',
    providerModelId: 'lyria-3-pro-preview',
    apiSurface: 'google-ai-interactions-v1beta',
    providerBindings: googleBindings(
      'lyria-3-pro-preview',
      'lyria-3-pro-preview',
      'google-ai-interactions-v1beta',
    ),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['music'],
      inputModalities: ['text', 'image'],
      outputModalities: ['text', 'audio'],
      supportsInteraction: true,
      supportsAudioOutput: true,
      maximumInputImages: 10,
      supportedAudioFormats: ['mp3', 'wav'],
    },
    pricing: {
      status: 'priced',
      source: priceSource(),
      billingModes: ['music-request'],
      flatRequestUsd: 0.08,
      assumptions: [
        'One request produces one full-length song; requested duration is expressed in the prompt.',
      ],
    },
  },
  {
    id: 'gemini-omni-flash',
    displayName: 'Gemini Omni Flash',
    provider: 'gemini-api',
    providerModelId: 'gemini-omni-flash-preview',
    apiSurface: 'google-ai-interactions-v1beta',
    providerBindings: googleBindings(
      'gemini-omni-flash-preview',
      'gemini-omni-flash-preview',
      'google-ai-interactions-v1beta',
    ),
    lifecycle: 'preview',
    minimumSdkVersion: '2.0.0',
    regionRestrictions: [],
    capabilities: {
      operations: ['video', 'video-edit'],
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text', 'video'],
      supportsInteraction: true,
      supportsVideoEditing: true,
      supportedAspectRatios: VIDEO_ASPECTS,
      supportedResolutions: ['720p'],
    },
    pricing: {
      status: 'priced',
      source: priceSource(),
      billingModes: ['input-tokens', 'output-tokens', 'video-seconds'],
      tokenTiers: [
        {
          inputPerMillionUsd: { text: 1.5, image: 1.5, audio: 1.5, video: 1.5 },
          outputPerMillionUsd: { text: 9, video: 17.5 },
        },
      ],
      videoOutputTokensPerSecondByResolution: { '720p': 5_792 },
      assumptions: [
        'Video output is billed at 5,792 tokens per second for 720p.',
        'The resulting maximum is an upper bound because billing follows actual output tokens.',
      ],
    },
  },
  {
    id: 'veo-3.1-quality',
    displayName: 'Veo 3.1 Standard',
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
      outputModalities: ['video', 'audio'],
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
      status: 'priced',
      source: priceSource(),
      billingModes: ['video-seconds'],
      videoPerSecondByResolutionUsd: { '720p': 0.4, '1080p': 0.4, '4k': 0.6 },
      assumptions: ['Uses paid-tier Veo 3.1 Standard video-with-audio pricing.'],
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
      outputModalities: ['video', 'audio'],
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
      status: 'priced',
      source: priceSource(),
      billingModes: ['video-seconds'],
      videoPerSecondByResolutionUsd: { '720p': 0.1, '1080p': 0.12, '4k': 0.3 },
      assumptions: ['Uses paid-tier Veo 3.1 Fast video-with-audio pricing.'],
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
      outputModalities: ['video', 'audio'],
      supportsSeed: true,
      supportedDurationsSeconds: [4, 6, 8],
      supportedAspectRatios: VIDEO_ASPECTS,
      supportedResolutions: ['720p', '1080p'],
      maximumReferenceImages: 0,
      supportsAudioOutput: true,
    },
    pricing: {
      status: 'priced',
      source: priceSource(),
      billingModes: ['video-seconds'],
      videoPerSecondByResolutionUsd: { '720p': 0.05, '1080p': 0.08 },
      assumptions: ['Uses paid-tier Veo 3.1 Lite video-with-audio pricing; 4K is unsupported.'],
    },
  },
] as const;

/** Explicit nulls distinguish absent lifecycle announcements from incomplete data. */
export const MODEL_CATALOG: readonly ModelCatalogEntry[] = MODEL_CATALOG_DRAFT.map((entry) => ({
  replacementModelId: null,
  sunsetDate: null,
  ...entry,
}));

export const getModel = (modelId: string): ModelCatalogEntry | undefined =>
  MODEL_CATALOG.find(
    (entry) =>
      entry.id === modelId ||
      entry.providerModelId === modelId ||
      entry.providerBindings.some((binding) => binding.modelId === modelId),
  );

/** Resolve either a canonical or provider ID to the canonical registry ID. */
export const resolveCanonicalModelId = (modelId: string): string =>
  getModel(modelId)?.id ?? LEGACY_MODEL_REPLACEMENTS[modelId] ?? modelId;

/** Resolve a canonical or legacy provider ID at the provider boundary. */
export const resolveProviderModelId = (modelId: string, provider?: ModelProvider): string => {
  const canonicalId = LEGACY_MODEL_REPLACEMENTS[modelId] ?? modelId;
  const model = getModel(canonicalId);
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
  getModel(LEGACY_MODEL_REPLACEMENTS[modelId] ?? modelId)?.providerBindings.find(
    (binding) => binding.provider === provider,
  );

export const isShutdownModel = (modelId: string): boolean =>
  getModel(modelId)?.lifecycle === 'shut-down';

export const LEGACY_MODEL_REPLACEMENTS: Readonly<Record<string, string>> = {
  'gemini-3-pro-preview': 'gemini-3.5-flash',
  'gemini-2.0-flash': 'gemini-3.5-flash-lite',
  'gemini-2.0-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-3.1-pro-preview': 'gemini-3.1-pro',
  'veo-3.1-generate-preview': 'veo-3.1-quality',
  'veo-3.1-fast-generate-preview': 'veo-3.1-fast',
  'veo-3.1-lite-generate-preview': 'veo-3.1-lite',
};
