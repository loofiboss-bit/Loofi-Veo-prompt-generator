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
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // ── Gemini Text Models (used for prompt generation) ──────────────────
  'gemini-3.1-pro-preview': {
    modelId: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro',
    inputTokenCostPer1M: 1.25,
    outputTokenCostPer1M: 10.0,
    currency: 'USD',
  },
  'gemini-3-pro-preview': {
    modelId: 'gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro (Legacy)',
    inputTokenCostPer1M: 1.25,
    outputTokenCostPer1M: 10.0,
    currency: 'USD',
  },
  'gemini-2.5-pro-preview-05-06': {
    modelId: 'gemini-2.5-pro-preview-05-06',
    displayName: 'Gemini 2.5 Pro',
    inputTokenCostPer1M: 1.25,
    outputTokenCostPer1M: 10.0,
    currency: 'USD',
  },
  'gemini-2.5-flash-preview-05-20': {
    modelId: 'gemini-2.5-flash-preview-05-20',
    displayName: 'Gemini 2.5 Flash',
    inputTokenCostPer1M: 0.15,
    outputTokenCostPer1M: 0.6,
    currency: 'USD',
  },
  'gemini-2.0-flash': {
    modelId: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    inputTokenCostPer1M: 0.1,
    outputTokenCostPer1M: 0.4,
    currency: 'USD',
  },

  // ── Veo Video Generation Models ──────────────────────────────────────
  'veo-3.1-generate-preview': {
    modelId: 'veo-3.1-generate-preview',
    displayName: 'Veo 3.1 (Quality)',
    videoCostPerSecond: 0.35,
    currency: 'USD',
  },
  'veo-3.1-fast-generate-preview': {
    modelId: 'veo-3.1-fast-generate-preview',
    displayName: 'Veo 3.1 Fast',
    videoCostPerSecond: 0.1,
    currency: 'USD',
  },

  // ── Imagen (Image Generation) ────────────────────────────────────────
  'imagen-3.0-generate-002': {
    modelId: 'imagen-3.0-generate-002',
    displayName: 'Imagen 3',
    imageCostPerGeneration: 0.03,
    currency: 'USD',
  },
};

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
export function estimateVideoCost(modelId: string, durationSeconds: number): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing?.videoCostPerSecond) return 0;
  return durationSeconds * pricing.videoCostPerSecond;
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
export const DEFAULT_VIDEO_DURATION_SECONDS = 5;
