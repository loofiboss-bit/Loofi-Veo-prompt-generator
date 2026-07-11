/**
 * Shared AI client factory and JSON utilities for all Gemini service modules.
 * @module core/services/gemini/aiClient
 */
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { getStoredApiKey, getStoredApiKeyAsync } from '../apiKeyService';
import { retryOperation, type RetryConfig } from '@core/utils/retry';
import { modelFallbackService } from '../modelFallbackService';
import { apiHealthMonitorService } from '../apiHealthMonitorService';
import {
  LEGACY_MODEL_REPLACEMENTS,
  resolveCanonicalModelId,
  resolveProviderModelId,
} from '@core/models/catalog';

/** Default model used for all prompt generation when no override is provided. */
export const DEFAULT_PROMPT_MODEL = 'gemini-3.5-flash';

/**
 * Resolve the prompt-generation model to use.
 * Checks the fallback service for circuit-breaker health; if the primary
 * model's circuit is open the next healthy model in the chain is returned.
 *
 * @param requestedModel - Explicit model override (e.g. from PromptState.model).
 *                         Falls back to DEFAULT_PROMPT_MODEL when omitted.
 * @returns The model ID to pass to the Gemini SDK.
 */
export const getPromptModel = (requestedModel?: string): string => {
  const requested =
    (requestedModel && LEGACY_MODEL_REPLACEMENTS[requestedModel]) ||
    requestedModel ||
    DEFAULT_PROMPT_MODEL;
  const canonicalModelId = resolveCanonicalModelId(requested);
  const result = modelFallbackService.selectModelForId(canonicalModelId);
  return resolveProviderModelId(result.modelId);
};

export const getAiClient = () => {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('No API key configured. Please set your Gemini API key in Settings.');
  }
  return new GoogleGenAI({ apiKey });
};

export const getAiClientAsync = async () => {
  const apiKey = await getStoredApiKeyAsync();
  if (!apiKey) {
    throw new Error('No API key configured. Please set your Gemini API key in Settings.');
  }
  return new GoogleGenAI({ apiKey });
};

// ---------------------------------------------------------------------------
// Resilient call wrapper (v2.5.0)
// ---------------------------------------------------------------------------

/** Options for a resilient API call (circuit breaker + health tracking) */
export interface ResilientCallOptions {
  /** Endpoint name for circuit breaker & health tracking (e.g. 'gemini-prompt') */
  endpoint: string;
  /** Model name being called (for fallback and cost tracking) */
  model?: string;
  /** Extra retry config overrides */
  retryConfig?: Partial<RetryConfig>;
}

/**
 * Wraps a Gemini generateContent call with:
 * 1. Circuit breaker integration (via enhanced retry)
 * 2. API health monitoring (latency + error tracking)
 * 3. Cost estimation recording
 *
 * Usage:
 * ```ts
 * const response = await resilientCall(
 *   () => ai.models.generateContent({ model, contents }),
 *   { endpoint: 'gemini-prompt', model: 'gemini-3.1-pro-preview' }
 * );
 * ```
 */
export const resilientCall = async (
  fn: () => Promise<GenerateContentResponse>,
  options: ResilientCallOptions,
): Promise<GenerateContentResponse> => {
  const { endpoint, retryConfig } = options;

  const completeRequest = apiHealthMonitorService.startRequest(endpoint);

  try {
    const response = await retryOperation<GenerateContentResponse>(fn, 3, 1000, {
      circuitBreakerEndpoint: endpoint,
      ...retryConfig,
    });

    // Record success
    completeRequest(true);

    return response;
  } catch (error) {
    // Record failure
    completeRequest(false);
    throw error;
  }
};

/** Strip markdown fences and extract the outermost JSON object/array from LLM output. */
export const cleanJson = (text: string | undefined): string => {
  if (!text) return '';
  const clean = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const objectStart = clean.indexOf('{');
  const arrayStart = clean.indexOf('[');

  const startCandidates = [objectStart, arrayStart].filter((index) => index !== -1);
  if (startCandidates.length === 0) {
    return clean;
  }

  const startIndex = Math.min(...startCandidates);
  const openChar = clean[startIndex];
  const closeChar = openChar === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < clean.length; i++) {
    const ch = clean[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === openChar) {
      depth += 1;
    } else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return clean.substring(startIndex, i + 1).trim();
      }
    }
  }

  return clean;
};
