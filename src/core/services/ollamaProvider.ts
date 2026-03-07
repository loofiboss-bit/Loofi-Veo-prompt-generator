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

const OLLAMA_BASE_URL = _env(
  'VITE_OLLAMA_BASE_URL',
  'OLLAMA_BASE_URL',
  'http://localhost:11434/v1',
);

const OLLAMA_MODEL = _env('VITE_OLLAMA_MODEL', 'OLLAMA_MODEL', 'qwen2.5-coder:14b');

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

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
export async function generatePromptWithOllama(userInput: string): Promise<string> {
  const url = `${OLLAMA_BASE_URL}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: 'user', content: userInput }],
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Ollama request failed: ${res.status} ${res.statusText} — is Ollama running at ${OLLAMA_BASE_URL}?`,
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

// ---------------------------------------------------------------------------
// Exports (configuration introspection — useful for tests / diagnostics)
// ---------------------------------------------------------------------------

export { OLLAMA_BASE_URL, OLLAMA_MODEL };
