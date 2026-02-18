/**
 * Shared AI client factory and JSON utilities for all Gemini service modules.
 * @module core/services/gemini/aiClient
 */
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { getStoredApiKey } from '../apiKeyService';
import { retryOperation, type RetryConfig } from '@core/utils/retry';

export const getAiClient = () => {
  const apiKey = getStoredApiKey();
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
 *   { endpoint: 'gemini-prompt', model: 'gemini-3-pro-preview' }
 * );
 * ```
 */
export const resilientCall = async (
  fn: () => Promise<GenerateContentResponse>,
  options: ResilientCallOptions,
): Promise<GenerateContentResponse> => {
  const { endpoint, retryConfig } = options;

  // Lazy-import health monitor to avoid circular deps at module load
  const { apiHealthMonitorService } = await import('../apiHealthMonitorService');
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
  let clean = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
  // Try to find the start and end of the JSON object/array
  const startObj = clean.indexOf('{');
  const startArr = clean.indexOf('[');

  // Determine which comes first to decide if object or array
  let startIndex = -1;
  if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
    startIndex = startObj;
  } else {
    startIndex = startArr;
  }

  if (startIndex !== -1) {
    // Find corresponding closing brace
    const isObj = clean[startIndex] === '{';
    const endIndex = clean.lastIndexOf(isObj ? '}' : ']');
    if (endIndex !== -1) {
      clean = clean.substring(startIndex, endIndex + 1);
    }
  }

  return clean;
};
