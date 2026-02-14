/**
 * CLI Export Command
 *
 * Converts prompt data between formats (JSON, TXT, Markdown).
 * Reads from a file or stdin and writes to a file or stdout.
 *
 * @module cli/commands/export
 * @since v1.8.0
 */

import { readFileSync } from 'node:fs';
import { formatResult, writeOutput, verboseLog, errorLog } from '../utils/output';
import type { ExportOptions, CLIResult } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read input data from file or stdin.
 * Returns parsed JSON if possible, otherwise raw string.
 */
function readInput(filePath?: string): CLIResult {
  let raw: string;

  if (filePath) {
    raw = readFileSync(filePath, 'utf-8');
  } else {
    // Read from stdin (must be piped, not interactive)
    raw = readFileSync('/dev/stdin', 'utf-8');
  }

  // Try to parse as JSON (CLIResult format)
  try {
    const parsed = JSON.parse(raw) as CLIResult;
    if (parsed.prompt !== undefined) {
      return parsed;
    }
    // If it's JSON but not a CLIResult, wrap it
    return {
      success: true,
      prompt: raw,
      timestamp: new Date().toISOString(),
    };
  } catch {
    // Not JSON — treat as raw prompt text
    return {
      success: true,
      prompt: raw.trim(),
      timestamp: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

/**
 * Execute the export command.
 * Reads prompt data from input (file or stdin) and converts to the target format.
 */
export async function executeExport(opts: ExportOptions): Promise<void> {
  try {
    verboseLog(`Export format: ${opts.format}`, opts.verbose);

    if (opts.input) {
      verboseLog(`Reading from: ${opts.input}`, opts.verbose);
    } else {
      verboseLog('Reading from stdin', opts.verbose);
    }

    const result = readInput(opts.input);
    const formatted = formatResult(result, opts.format);
    writeOutput(formatted, opts.output);

    if (opts.output) {
      verboseLog(`Output written to: ${opts.output}`, opts.verbose);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errorLog(message);
    process.exitCode = 1;
  }
}
