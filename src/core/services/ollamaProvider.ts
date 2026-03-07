/**
 * Ollama Local LLM Provider
 *
 * Calls a locally-running Ollama instance (or any OpenAI-compatible endpoint)
 * to generate / refine video prompts without sending data to a cloud API.
 *
 * Configuration (in priority order):
 *   1. VITE_OLLAMA_BASE_URL / VITE_OLLAMA_MODEL  — Vite browser builds
 *   2. OLLAMA_BASE_URL / OLLAMA_MODEL            — Node / CLI process.env
 *   3. Hard-coded defaults below
 *
 * @module core/services/ollamaProvider
 * @since v2.6.0
 */

import type { PromptState, VeoPromptResponse } from '@core/types';
import { buildGeminiPrompt } from './promptBuilder';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function _env(viteKey: string, nodeKey: string, fallback: string): string {
  // Vite injects import.meta.env at build time; guard against Node where it is absent.
  const viteEnv =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env[viteKey] as string | undefined)
      : undefined;
  if (viteEnv) return viteEnv;

  if (typeof process !== 'undefined' && process.env[nodeKey]) {
    return process.env[nodeKey] as string;
  }

  return fallback;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

function normalizeOllamaBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function getChatCompletionsBaseUrl(baseUrl: string): string {
  const normalized = normalizeOllamaBaseUrl(baseUrl);
  return normalized.endsWith('/v1') ? normalized : `${normalized}/v1`;
}

function getHealthCheckUrl(baseUrl: string): string {
  return normalizeOllamaBaseUrl(baseUrl).replace(/\/v1$/, '');
}

const OLLAMA_BASE_URL = normalizeOllamaBaseUrl(
  _env('VITE_OLLAMA_BASE_URL', 'OLLAMA_BASE_URL', 'http://localhost:11434'),
);

const OLLAMA_MODEL = _env('VITE_OLLAMA_MODEL', 'OLLAMA_MODEL', 'qwen2.5-coder:14b');

export function getDefaultOllamaConfig(): OllamaConfig {
  return {
    baseUrl: OLLAMA_BASE_URL,
    model: OLLAMA_MODEL,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export async function checkOllamaHealth(
  baseUrl: string = OLLAMA_BASE_URL,
): Promise<{ ok: boolean; message: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(getHealthCheckUrl(baseUrl), {
      method: 'GET',
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, message: `Unexpected status: ${res.status}` };
    }

    return { ok: true, message: 'Ollama is running' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return { ok: false, message };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate a refined video prompt using the local Ollama instance.
 *
 * Uses the OpenAI-compatible `/v1/chat/completions` endpoint that Ollama
 * exposes out of the box (since Ollama ≥ 0.1.24).
 *
 * @param userInput - The raw user idea / prompt text to send to the model.
 * @returns The model's response text.
 * @throws {Error} If the HTTP request fails or the response is malformed.
 */
export async function generatePromptWithOllama(
  userInput: string,
  config: Partial<OllamaConfig> = {},
): Promise<string> {
  const resolvedConfig = {
    ...getDefaultOllamaConfig(),
    ...config,
  };
  const normalizedBaseUrl = normalizeOllamaBaseUrl(resolvedConfig.baseUrl);
  const url = `${getChatCompletionsBaseUrl(normalizedBaseUrl)}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: resolvedConfig.model,
      messages: [{ role: 'user', content: userInput }],
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Ollama request failed: ${res.status} ${res.statusText} — is Ollama running at ${normalizedBaseUrl}?`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('Ollama response did not contain expected choices[0].message.content');
  }

  return text;
}

function buildOllamaInstruction(state: PromptState): string {
  const targetModel =
    state.targetModel === 'sora'
      ? 'OpenAI Sora'
      : state.targetModel === 'local'
        ? 'a local video generation model'
        : 'Google Veo';

  return [
    'You are an expert prompt engineer for AI video generation models.',
    `Create a polished cinematic prompt optimized for ${targetModel}.`,
    'Output only the final prompt text with no headings or explanations.',
    'If the input references unsupported cloud-only tools, ignore them and use the supplied details.',
  ].join(' ');
}

export async function generateVeoPromptWithOllama(
  state: PromptState,
  config: Partial<OllamaConfig> = {},
): Promise<VeoPromptResponse> {
  const constructedPrompt = buildGeminiPrompt(state);
  const prompt = await generatePromptWithOllama(
    `${buildOllamaInstruction(state)}\n\nUser Input Structure:\n${constructedPrompt}`,
    config,
  );

  return { prompt };
}

// ---------------------------------------------------------------------------
// Exports (configuration introspection — useful for tests / diagnostics)
// ---------------------------------------------------------------------------

export { OLLAMA_BASE_URL, OLLAMA_MODEL };
