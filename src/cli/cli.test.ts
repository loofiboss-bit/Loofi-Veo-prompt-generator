/**
 * CLI Unit Tests
 *
 * Tests for the CLI module: API key resolution, output formatting,
 * generate command, and export command.
 *
 * @vitest-environment node
 * @since v1.8.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveApiKey } from './utils/apiKey';
import { formatResult } from './utils/output';
import type { CLIResult, OutputFormat } from './types';

// ---------------------------------------------------------------------------
// Module Mocks (must be before any imports that use these modules)
// ---------------------------------------------------------------------------

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// API Key Resolution
// ---------------------------------------------------------------------------

describe('resolveApiKey', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns flag value when provided', () => {
    expect(resolveApiKey('flag-key')).toBe('flag-key');
  });

  it('returns VEO_API_KEY env var when no flag', () => {
    process.env.VEO_API_KEY = 'env-veo-key';
    expect(resolveApiKey()).toBe('env-veo-key');
  });

  it('returns GEMINI_API_KEY env var as fallback', () => {
    delete process.env.VEO_API_KEY;
    process.env.GEMINI_API_KEY = 'env-gemini-key';
    expect(resolveApiKey()).toBe('env-gemini-key');
  });

  it('prefers VEO_API_KEY over GEMINI_API_KEY', () => {
    process.env.VEO_API_KEY = 'veo-key';
    process.env.GEMINI_API_KEY = 'gemini-key';
    expect(resolveApiKey()).toBe('veo-key');
  });

  it('prefers flag value over env vars', () => {
    process.env.VEO_API_KEY = 'env-key';
    expect(resolveApiKey('flag-key')).toBe('flag-key');
  });

  it('throws when no key is available', () => {
    delete process.env.VEO_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(() => resolveApiKey()).toThrow('No API key provided');
  });
});

// ---------------------------------------------------------------------------
// Output Formatting
// ---------------------------------------------------------------------------

describe('formatResult', () => {
  const successResult: CLIResult = {
    success: true,
    prompt: 'A drone shot over misty mountains at dawn',
    timestamp: '2025-01-01T00:00:00.000Z',
    profileId: 'flow-veo-cinematic',
  };

  const errorResult: CLIResult = {
    success: false,
    error: 'No API key',
    timestamp: '2025-01-01T00:00:00.000Z',
  };

  const resultWithChunks: CLIResult = {
    success: true,
    prompt: 'A cinematic scene',
    timestamp: '2025-01-01T00:00:00.000Z',
    groundingChunks: [{ web: { uri: 'https://example.com', title: 'Example' } }],
  };

  describe('JSON format', () => {
    it('formats success result as JSON', () => {
      const output = formatResult(successResult, 'json');
      const parsed = JSON.parse(output);
      expect(parsed.success).toBe(true);
      expect(parsed.prompt).toBe(successResult.prompt);
      expect(parsed.profileId).toBe('flow-veo-cinematic');
    });

    it('formats error result as JSON', () => {
      const output = formatResult(errorResult, 'json');
      const parsed = JSON.parse(output);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('No API key');
    });
  });

  describe('TXT format', () => {
    it('returns prompt text only on success', () => {
      const output = formatResult(successResult, 'txt');
      expect(output).toBe(successResult.prompt);
    });

    it('returns error message on failure', () => {
      const output = formatResult(errorResult, 'txt');
      expect(output).toContain('Error:');
      expect(output).toContain('No API key');
    });
  });

  describe('Markdown format', () => {
    it('includes header on success', () => {
      const output = formatResult(successResult, 'markdown');
      expect(output).toContain('# Generated Prompt');
      expect(output).toContain(successResult.prompt!);
    });

    it('includes profile info when present', () => {
      const output = formatResult(successResult, 'markdown');
      expect(output).toContain('veo-cinematic');
    });

    it('includes grounding sources', () => {
      const output = formatResult(resultWithChunks, 'markdown');
      expect(output).toContain('## Sources');
      expect(output).toContain('https://example.com');
      expect(output).toContain('Example');
    });

    it('returns error header on failure', () => {
      const output = formatResult(errorResult, 'markdown');
      expect(output).toContain('# Error');
      expect(output).toContain('No API key');
    });
  });

  it('handles unknown format as text', () => {
    const output = formatResult(successResult, 'unknown' as OutputFormat);
    expect(output).toBe(successResult.prompt);
  });
});

// ---------------------------------------------------------------------------
// Generate Command
// ---------------------------------------------------------------------------

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: vi.fn().mockResolvedValue({
        text: 'A refined cinematic prompt from Gemini',
        candidates: [{ groundingMetadata: { groundingChunks: [] } }],
      }),
    };
  },
}));

describe('executeGenerate', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    process.exitCode = undefined;
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('generates prompt in offline mode', async () => {
    const { executeGenerate } = await import('./commands/generate');

    await executeGenerate({
      idea: 'Ocean waves crashing',
      targetModel: 'flow-veo',
      format: 'txt',
      offline: true,
      verbose: false,
    });

    expect(stdoutSpy).toHaveBeenCalled();
    const output = (stdoutSpy.mock.calls[0]?.[0] as string) ?? '';
    expect(output).toContain('Ocean waves crashing');
    expect(process.exitCode).toBeUndefined();
  });

  it('includes style overrides in offline prompt', async () => {
    const { executeGenerate } = await import('./commands/generate');

    await executeGenerate({
      idea: 'Sunset',
      targetModel: 'flow-veo',
      format: 'txt',
      offline: true,
      verbose: false,
      artStyle: 'cinematic',
      cameraMovement: 'tracking',
    });

    const output = (stdoutSpy.mock.calls[0]?.[0] as string) ?? '';
    expect(output).toContain('Sunset');
    expect(output).toContain('cinematic');
    expect(output).toContain('tracking');
  });

  it('outputs JSON format in offline mode', async () => {
    const { executeGenerate } = await import('./commands/generate');

    await executeGenerate({
      idea: 'Mountain scene',
      targetModel: 'flow-veo',
      format: 'json',
      offline: true,
      verbose: false,
    });

    const output = (stdoutSpy.mock.calls[0]?.[0] as string) ?? '';
    const parsed = JSON.parse(output);
    expect(parsed.success).toBe(true);
    expect(parsed.prompt).toContain('Mountain scene');
  });

  it('outputs markdown format in offline mode', async () => {
    const { executeGenerate } = await import('./commands/generate');

    await executeGenerate({
      idea: 'Forest path',
      targetModel: 'flow-veo',
      format: 'markdown',
      offline: true,
      verbose: false,
    });

    const output = (stdoutSpy.mock.calls[0]?.[0] as string) ?? '';
    expect(output).toContain('# Generated Prompt');
    expect(output).toContain('Forest path');
  });

  it('applies profile defaults in offline mode', async () => {
    const { executeGenerate } = await import('./commands/generate');

    await executeGenerate({
      idea: 'Abstract colors',
      targetModel: 'flow-veo',
      profile: 'flow-veo-cinematic',
      format: 'json',
      offline: true,
      verbose: false,
    });

    const output = (stdoutSpy.mock.calls[0]?.[0] as string) ?? '';
    const parsed = JSON.parse(output);
    expect(parsed.profileId).toBe('flow-veo-cinematic');
    expect(parsed.success).toBe(true);
  });

  it('errors on unknown profile', async () => {
    const { executeGenerate } = await import('./commands/generate');

    await executeGenerate({
      idea: 'Test',
      targetModel: 'flow-veo',
      profile: 'nonexistent-profile',
      format: 'txt',
      offline: true,
      verbose: false,
    });

    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown profile'));
  });

  it('errors when online mode has no API key', async () => {
    const { executeGenerate } = await import('./commands/generate');
    const originalEnv = { ...process.env };
    delete process.env.VEO_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await executeGenerate({
      idea: 'Test',
      targetModel: 'flow-veo',
      format: 'txt',
      offline: false,
      verbose: false,
    });

    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('No API key'));

    process.env = { ...originalEnv };
  });

  it('generates via API when key is provided', async () => {
    // GoogleGenAI is already mocked at the top level with a class mock
    const { executeGenerate } = await import('./commands/generate');

    await executeGenerate({
      idea: 'Drone shot',
      targetModel: 'flow-veo',
      format: 'txt',
      offline: false,
      verbose: false,
      apiKey: 'test-api-key',
    });

    // The mock returns text, so stdout should be called and no error
    expect(process.exitCode).toBeUndefined();
    const output = (stdoutSpy.mock.calls[0]?.[0] as string) ?? '';
    expect(output.length).toBeGreaterThan(0);
  });

  it('logs verbose messages to stderr', async () => {
    const { executeGenerate } = await import('./commands/generate');

    await executeGenerate({
      idea: 'Verbose test',
      targetModel: 'flow-veo',
      format: 'txt',
      offline: true,
      verbose: true,
    });

    const stderrOutput = stderrSpy.mock.calls.map((c: unknown[]) => c[0]).join('');
    expect(stderrOutput).toContain('[veo]');
    expect(stderrOutput).toContain('Offline mode');
  });
});

// ---------------------------------------------------------------------------
// Export Command
// ---------------------------------------------------------------------------

describe('executeExport', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    process.exitCode = undefined;
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('converts JSON file to markdown', async () => {
    const fs = await import('node:fs');
    const readMock = vi.mocked(fs.readFileSync);
    readMock.mockReturnValueOnce(
      JSON.stringify({
        success: true,
        prompt: 'A beautiful sunset',
        timestamp: '2025-01-01T00:00:00.000Z',
      }),
    );

    const { executeExport } = await import('./commands/export');

    await executeExport({
      input: 'test.json',
      format: 'markdown',
      verbose: false,
    });

    const output = (stdoutSpy.mock.calls[0]?.[0] as string) ?? '';
    expect(output).toContain('# Generated Prompt');
    expect(output).toContain('A beautiful sunset');
  });

  it('converts plain text file to JSON', async () => {
    const fs = await import('node:fs');
    const readMock = vi.mocked(fs.readFileSync);
    readMock.mockReturnValueOnce('A simple prompt text');

    const { executeExport } = await import('./commands/export');

    await executeExport({
      input: 'test.txt',
      format: 'json',
      verbose: false,
    });

    const output = (stdoutSpy.mock.calls[0]?.[0] as string) ?? '';
    const parsed = JSON.parse(output);
    expect(parsed.success).toBe(true);
    expect(parsed.prompt).toBe('A simple prompt text');
  });

  it('handles file read errors', async () => {
    const fs = await import('node:fs');
    const readMock = vi.mocked(fs.readFileSync);
    readMock.mockImplementationOnce(() => {
      throw new Error('File not found');
    });

    const { executeExport } = await import('./commands/export');

    await executeExport({
      input: 'nonexistent.json',
      format: 'json',
      verbose: false,
    });

    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('File not found'));
  });

  it('reads from stdin fd when input is not provided', async () => {
    const fs = await import('node:fs');
    const readMock = vi.mocked(fs.readFileSync);
    readMock.mockReturnValueOnce('Prompt from stdin');

    const { executeExport } = await import('./commands/export');

    await executeExport({
      format: 'txt',
      verbose: false,
    });

    expect(readMock).toHaveBeenCalledWith(0, 'utf-8');
    const output = (stdoutSpy.mock.calls[0]?.[0] as string) ?? '';
    expect(output).toContain('Prompt from stdin');
  });
});

// ---------------------------------------------------------------------------
// CLI Type Validation (via types.ts imports)
// ---------------------------------------------------------------------------

describe('CLI types', () => {
  it('OutputFormat type covers expected values', () => {
    const formats: OutputFormat[] = ['json', 'txt', 'markdown'];
    expect(formats).toHaveLength(3);
  });
});
