/**
 * AI Model Pricing Constants
 * Real Google API pricing for cost estimation.
 * Prices are approximate and based on publicly available Google AI pricing.
 *
 * @module pricing
 * @since v2.5.0
 * @see https://ai.google.dev/pricing
 */

import type { ModelPricing } from '@core/types';
import { MODEL_CATALOG, getModel } from '@core/models/catalog';

// ---------------------------------------------------------------------------
// Pricing Table
// ---------------------------------------------------------------------------

/**
 * Model pricing definitions.
 * Prices in USD. Updated as of Q1 2026.
 *
 * Notes:
 * - Gemini prompt generation uses text token pricing
 * - Veo video generation uses per-second pricing
 * - Prices may change — update this file when Google updates pricing
 */
const toLegacyPricing = (modelId: string): ModelPricing | undefined => {
  const model = getModel(modelId);
  if (!model) return undefined;
  const videoPrices = model.pricing.videoPerSecondUsd;
  return {
    modelId: model.id,
    displayName: model.displayName,
    inputTokenCostPer1M: model.pricing.inputTokenPerMillionUsd,
    outputTokenCostPer1M: model.pricing.outputTokenPerMillionUsd,
    imageCostPerGeneration: model.pricing.imagePerGenerationUsd,
    videoCostPerSecond: videoPrices?.['720p'],
    videoCostPerSecondByResolution: videoPrices,
    currency: 'USD',
  };
};

/** Compatibility view derived exclusively from the canonical v8 catalog. */
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get pricing for a model, returns undefined if model is not in the pricing table */
export function getModelPricing(modelId: string): ModelPricing | undefined {
  return MODEL_PRICING[modelId];
}

/** Estimate cost for a text generation call (prompt → text) */
export function estimateTextCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 0;

  const inputCost = pricing.inputTokenCostPer1M
    ? (inputTokens / 1_000_000) * pricing.inputTokenCostPer1M
    : 0;
  const outputCost = pricing.outputTokenCostPer1M
    ? (outputTokens / 1_000_000) * pricing.outputTokenCostPer1M
    : 0;

  return inputCost + outputCost;
}

/** Estimate cost for a video generation call */
export function estimateVideoCost(
  modelId: string,
  durationSeconds: number,
  resolution: '720p' | '1080p' | '4k' = '720p',
): number {
  const pricing = MODEL_PRICING[modelId];
  const pricePerSecond =
    pricing?.videoCostPerSecondByResolution?.[resolution] ?? pricing?.videoCostPerSecond;
  if (!pricePerSecond) return 0;
  return durationSeconds * pricePerSecond;
}

/** Estimate cost for an image generation call */
export function estimateImageCost(modelId: string): number {
  const pricing = MODEL_PRICING[modelId];
  return pricing?.imageCostPerGeneration ?? 0;
}

/**
 * Rough estimate of token count from a string.
 * Uses the ~4 chars per token heuristic. Not accurate but sufficient for estimates.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Default estimated output tokens per use case
// ---------------------------------------------------------------------------

/** Typical output token counts for different operations */
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

/** Default video duration in seconds for cost estimation */
export const DEFAULT_VIDEO_DURATION_SECONDS = 8;
