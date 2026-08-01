/**
 * Compatibility helpers derived from the canonical v9 model catalog.
 * Unknown or incomplete prices throw instead of being interpreted as free.
 *
 * @see https://ai.google.dev/gemini-api/docs/pricing
 */

import type { ImageResolution } from '@core/models/catalog';
import { MODEL_CATALOG, getModel } from '@core/models/catalog';
import { estimateMaximumModelCost, requireUsableCostEstimate } from '@core/models/cost';
import type { ModelPricing } from '@core/types';

const toLegacyPricing = (modelId: string): ModelPricing | undefined => {
  const model = getModel(modelId);
  if (!model || model.pricing.status !== 'priced') return undefined;
  const firstTier = model.pricing.tokenTiers?.[0];
  const videoPrices = model.pricing.videoPerSecondByResolutionUsd;
  const defaultImageResolution = model.capabilities.supportedImageResolutions?.includes('1k')
    ? '1k'
    : model.capabilities.supportedImageResolutions?.[0];
  return {
    modelId: model.id,
    displayName: model.displayName,
    inputTokenCostPer1M: firstTier?.inputPerMillionUsd?.text,
    outputTokenCostPer1M: firstTier?.outputPerMillionUsd?.text,
    imageCostPerGeneration: defaultImageResolution
      ? model.pricing.imagePerGenerationByResolutionUsd?.[defaultImageResolution]
      : undefined,
    imageCostPerGenerationByResolution: model.pricing.imagePerGenerationByResolutionUsd,
    videoCostPerSecond: videoPrices?.['720p'],
    videoCostPerSecondByResolution: videoPrices,
    currency: model.pricing.source.currency,
    sourceUrl: model.pricing.source.sourceUrl,
    verifiedDate: model.pricing.source.verifiedDate,
  };
};

/** Compatibility view derived exclusively from the canonical catalog. */
export const MODEL_PRICING: Record<string, ModelPricing> = Object.fromEntries(
  MODEL_CATALOG.flatMap((model) => {
    const pricing = toLegacyPricing(model.id);
    return pricing
      ? [
          [model.id, pricing],
          [model.providerModelId, pricing],
        ]
      : [];
  }),
);

export function getModelPricing(modelId: string): ModelPricing | undefined {
  return MODEL_PRICING[modelId] ?? toLegacyPricing(modelId);
}

const requireModel = (modelId: string) => {
  const model = getModel(modelId);
  if (!model) throw new Error(`No catalog entry exists for ${modelId}; paid execution is blocked.`);
  return model;
};

export function estimateTextCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  return requireUsableCostEstimate(
    estimateMaximumModelCost(requireModel(modelId), {
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
    }),
  );
}

export function estimateVideoCost(
  modelId: string,
  durationSeconds: number,
  resolution: '720p' | '1080p' | '4k' = '720p',
  estimatedInputTokens?: number,
): number {
  return requireUsableCostEstimate(
    estimateMaximumModelCost(requireModel(modelId), {
      videoDurationSeconds: durationSeconds,
      videoResolution: resolution,
      estimatedInputTokens,
    }),
  );
}

export function estimateImageCost(
  modelId: string,
  inputTokens: number,
  resolution: ImageResolution = '1k',
): number {
  return requireUsableCostEstimate(
    estimateMaximumModelCost(requireModel(modelId), {
      estimatedInputTokens: inputTokens,
      imageCount: 1,
      imageResolution: resolution,
    }),
  );
}

/** Rough upper-bound planning heuristic: approximately four characters per token. */
export function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export const TYPICAL_OUTPUT_TOKENS: Record<string, number> = {
  'prompt-generation': 300,
  'prompt-variation': 250,
  'prompt-brainstorm': 500,
  'prompt-refinement': 300,
  'image-analysis': 400,
  'video-analysis': 600,
  'audio-transcription': 800,
  'production-chat': 400,
  'color-grading': 200,
  'script-breakdown': 600,
};

export const DEFAULT_VIDEO_DURATION_SECONDS = 8;
