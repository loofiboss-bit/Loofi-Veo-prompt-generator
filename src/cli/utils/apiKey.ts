/**
 * CLI API Key Resolution
 *
 * Resolves the Gemini API key from multiple sources in priority order:
 * 1. --api-key CLI flag
 * 2. VEO_API_KEY environment variable
 * 3. GEMINI_API_KEY environment variable (common alias)
 * 4. Error — no implicit fallback key in CLI mode
 *
 * @module cli/utils/apiKey
 * @since v1.8.0
 */

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the API key from available sources.
 * Unlike the browser app, CLI mode never falls back to a hardcoded default key.
 */
export function resolveApiKey(flagValue?: string): string {
  // 1. Explicit CLI flag
  if (flagValue) return flagValue;

  // 2. VEO_API_KEY env var
  if (process.env.VEO_API_KEY) return process.env.VEO_API_KEY;

  // 3. GEMINI_API_KEY env var (common)
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  // 4. No key found
  throw new Error(
    'No API key provided. Use --api-key <key>, or set VEO_API_KEY or GEMINI_API_KEY environment variable.',
  );
}
