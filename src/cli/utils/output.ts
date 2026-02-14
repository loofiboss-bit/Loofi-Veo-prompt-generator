/**
 * CLI Output Utilities
 *
 * Handles formatting CLI results and writing to stdout or files.
 * Supports JSON, plain text, and markdown formats.
 *
 * @module cli/utils/output
 * @since v1.8.0
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CLIResult, OutputFormat } from '../types';

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/** Format a CLIResult as JSON */
function formatJSON(result: CLIResult): string {
  return JSON.stringify(result, null, 2);
}

/** Format a CLIResult as plain text */
function formatText(result: CLIResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }
  return result.prompt ?? '';
}

/** Format a CLIResult as markdown */
function formatMarkdown(result: CLIResult): string {
  if (!result.success) {
    return `# Error\n\n${result.error}`;
  }

  const lines: string[] = ['# Generated Prompt', '', `> Generated at ${result.timestamp}`];

  if (result.profileId) {
    lines.push(`> Profile: \`${result.profileId}\``);
  }

  lines.push('', '---', '', result.prompt ?? '', '');

  if (result.groundingChunks && result.groundingChunks.length > 0) {
    lines.push('## Sources', '');
    for (const chunk of result.groundingChunks) {
      if (chunk.web) {
        lines.push(`- [${chunk.web.title ?? chunk.web.uri}](${chunk.web.uri})`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Format Router
// ---------------------------------------------------------------------------

/** Format a CLIResult to a string in the given format */
export function formatResult(result: CLIResult, format: OutputFormat): string {
  switch (format) {
    case 'json':
      return formatJSON(result);
    case 'txt':
      return formatText(result);
    case 'markdown':
      return formatMarkdown(result);
    default:
      return formatText(result);
  }
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

/**
 * Write formatted output to a file or stdout.
 * Creates parent directories automatically when writing to file.
 */
export function writeOutput(content: string, filePath?: string): void {
  if (filePath) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf-8');
  } else {
    process.stdout.write(content + '\n');
  }
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

/** Log a verbose message to stderr (never pollutes stdout pipe) */
export function verboseLog(message: string, verbose: boolean): void {
  if (verbose) {
    process.stderr.write(`[veo] ${message}\n`);
  }
}

/** Log an error to stderr */
export function errorLog(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}
