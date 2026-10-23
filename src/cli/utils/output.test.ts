/**
 * CLI Output Utilities Unit Tests
 *
 * Tests output formatting functions, file/stdout writing, and logging utilities.
 *
 * @vitest-environment node
 * @since v1.8.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatResult, writeOutput, verboseLog, errorLog } from './output';
import type { CLIResult, OutputFormat } from '../types';
import * as fs from 'node:fs';

// Mock node:fs module
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

describe('src/cli/utils/output', () => {
  describe('formatResult', () => {
    const baseSuccessResult: CLIResult = {
      success: true,
      prompt: 'A cinematic sunset over ocean',
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    const baseErrorResult: CLIResult = {
      success: false,
      error: 'Failed to process prompt',
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    describe('JSON format', () => {
      it('formats successful result as indented JSON string', () => {
        const jsonOutput = formatResult(baseSuccessResult, 'json');
        expect(jsonOutput).toBe(JSON.stringify(baseSuccessResult, null, 2));
      });

      it('formats error result as indented JSON string', () => {
        const jsonOutput = formatResult(baseErrorResult, 'json');
        expect(jsonOutput).toBe(JSON.stringify(baseErrorResult, null, 2));
      });
    });

    describe('Text (txt) format', () => {
      it('returns prompt text for successful result', () => {
        const txtOutput = formatResult(baseSuccessResult, 'txt');
        expect(txtOutput).toBe('A cinematic sunset over ocean');
      });

      it('returns empty string when prompt is undefined on successful result', () => {
        const resultWithoutPrompt: CLIResult = {
          success: true,
          timestamp: '2025-01-01T00:00:00.000Z',
        };
        const txtOutput = formatResult(resultWithoutPrompt, 'txt');
        expect(txtOutput).toBe('');
      });

      it('returns error string for failed result', () => {
        const txtOutput = formatResult(baseErrorResult, 'txt');
        expect(txtOutput).toBe('Error: Failed to process prompt');
      });
    });

    describe('Markdown format', () => {
      it('returns formatted error markdown when success is false', () => {
        const mdOutput = formatResult(baseErrorResult, 'markdown');
        expect(mdOutput).toBe('# Error\n\nFailed to process prompt');
      });

      it('formats successful result with basic fields', () => {
        const mdOutput = formatResult(baseSuccessResult, 'markdown');
        expect(mdOutput).toContain('# Generated Prompt');
        expect(mdOutput).toContain('> Generated at 2025-01-01T00:00:00.000Z');
        expect(mdOutput).toContain('---');
        expect(mdOutput).toContain('A cinematic sunset over ocean');
        expect(mdOutput).not.toContain('> Profile:');
        expect(mdOutput).not.toContain('## Sources');
      });

      it('includes profile block when profileId is provided', () => {
        const resultWithProfile: CLIResult = {
          ...baseSuccessResult,
          profileId: 'flow-veo-cinematic',
        };
        const mdOutput = formatResult(resultWithProfile, 'markdown');
        expect(mdOutput).toContain('> Profile: `flow-veo-cinematic`');
      });

      it('handles groundingChunks with title and fallback uri', () => {
        const resultWithChunks: CLIResult = {
          ...baseSuccessResult,
          groundingChunks: [
            { web: { uri: 'https://example.com/doc1', title: 'Doc One' } },
            { web: { uri: 'https://example.com/doc2' } },
            {}, // chunk without web property
          ],
        };
        const mdOutput = formatResult(resultWithChunks, 'markdown');
        expect(mdOutput).toContain('## Sources');
        expect(mdOutput).toContain('- [Doc One](https://example.com/doc1)');
        expect(mdOutput).toContain('- [https://example.com/doc2](https://example.com/doc2)');
      });

      it('ignores empty groundingChunks array', () => {
        const resultWithEmptyChunks: CLIResult = {
          ...baseSuccessResult,
          groundingChunks: [],
        };
        const mdOutput = formatResult(resultWithEmptyChunks, 'markdown');
        expect(mdOutput).not.toContain('## Sources');
      });

      it('handles empty prompt in markdown format', () => {
        const resultWithoutPrompt: CLIResult = {
          success: true,
          timestamp: '2025-01-01T00:00:00.000Z',
        };
        const mdOutput = formatResult(resultWithoutPrompt, 'markdown');
        expect(mdOutput).toContain('# Generated Prompt');
      });
    });

    describe('Default / Unknown format fallback', () => {
      it('falls back to text formatting for unknown formats', () => {
        const output = formatResult(baseSuccessResult, 'xml' as OutputFormat);
        expect(output).toBe('A cinematic sunset over ocean');
      });
    });
  });

  describe('writeOutput', () => {
    let stdoutSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      vi.clearAllMocks();
    });

    afterEach(() => {
      stdoutSpy.mockRestore();
    });

    it('writes to stdout when no filePath is provided', () => {
      writeOutput('Hello World');
      expect(stdoutSpy).toHaveBeenCalledWith('Hello World\n');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('writes to file and creates directories when filePath is provided', () => {
      writeOutput('Hello File', '/tmp/output/test.txt');
      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/output', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith('/tmp/output/test.txt', 'Hello File', 'utf-8');
    });
  });

  describe('verboseLog', () => {
    let stderrSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      stderrSpy.mockRestore();
    });

    it('writes to stderr when verbose is true', () => {
      verboseLog('Processing step 1', true);
      expect(stderrSpy).toHaveBeenCalledWith('[veo] Processing step 1\n');
    });

    it('does not write to stderr when verbose is false', () => {
      verboseLog('Processing step 1', false);
      expect(stderrSpy).not.toHaveBeenCalled();
    });
  });

  describe('errorLog', () => {
    let stderrSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      stderrSpy.mockRestore();
    });

    it('writes formatted error message to stderr', () => {
      errorLog('Something went wrong');
      expect(stderrSpy).toHaveBeenCalledWith('Error: Something went wrong\n');
    });
  });
});
