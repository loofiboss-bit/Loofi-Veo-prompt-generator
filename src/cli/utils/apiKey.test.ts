/**
 * CLI API Key Resolution Unit Tests
 *
 * Tests for resolveApiKey in src/cli/utils/apiKey.ts covering:
 * - Priority order (CLI flag > VEO_API_KEY > GEMINI_API_KEY)
 * - Fallbacks when values are missing or empty strings
 * - Error thrown when no API key is provided from any source
 *
 * @vitest-environment node
 * @since v17.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveApiKey } from './apiKey';

describe('resolveApiKey', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns flag value when provided', () => {
    delete process.env.VEO_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(resolveApiKey('flag-key-123')).toBe('flag-key-123');
  });

  it('prefers CLI flag over VEO_API_KEY and GEMINI_API_KEY', () => {
    process.env.VEO_API_KEY = 'veo-env-key';
    process.env.GEMINI_API_KEY = 'gemini-env-key';
    expect(resolveApiKey('cli-flag-key')).toBe('cli-flag-key');
  });

  it('falls back to VEO_API_KEY when CLI flag is empty string or undefined', () => {
    process.env.VEO_API_KEY = 'veo-env-key';
    delete process.env.GEMINI_API_KEY;

    expect(resolveApiKey()).toBe('veo-env-key');
    expect(resolveApiKey('')).toBe('veo-env-key');
  });

  it('returns VEO_API_KEY when both VEO_API_KEY and GEMINI_API_KEY are present and no flag is given', () => {
    process.env.VEO_API_KEY = 'veo-env-key';
    process.env.GEMINI_API_KEY = 'gemini-env-key';

    expect(resolveApiKey()).toBe('veo-env-key');
  });

  it('falls back to GEMINI_API_KEY when VEO_API_KEY is not set', () => {
    delete process.env.VEO_API_KEY;
    process.env.GEMINI_API_KEY = 'gemini-env-key';

    expect(resolveApiKey()).toBe('gemini-env-key');
  });

  it('falls back to GEMINI_API_KEY when VEO_API_KEY is an empty string', () => {
    process.env.VEO_API_KEY = '';
    process.env.GEMINI_API_KEY = 'gemini-env-key';

    expect(resolveApiKey()).toBe('gemini-env-key');
  });

  it('throws descriptive error when no flag or environment variables are provided', () => {
    delete process.env.VEO_API_KEY;
    delete process.env.GEMINI_API_KEY;

    expect(() => resolveApiKey()).toThrow(
      'No API key provided. Use --api-key <key>, or set VEO_API_KEY or GEMINI_API_KEY environment variable.',
    );
  });

  it('throws descriptive error when flag and all env variables are empty strings', () => {
    process.env.VEO_API_KEY = '';
    process.env.GEMINI_API_KEY = '';

    expect(() => resolveApiKey('')).toThrow(
      'No API key provided. Use --api-key <key>, or set VEO_API_KEY or GEMINI_API_KEY environment variable.',
    );
  });
});
