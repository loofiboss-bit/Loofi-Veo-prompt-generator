/**
 * Diff Service
 * Provides text comparison and diff visualization for prompts
 * v1.3.0 - Workflow Integration
 */

import { logger } from './loggerService';
import type { HistoryEntry, PromptMetadata } from './historyService';

export interface DiffResult {
  original: string;
  modified: string;
  changes: DiffChange[];
  summary: DiffSummary;
}

export interface DiffChange {
  type: 'add' | 'remove' | 'modify' | 'unchanged';
  originalLine?: number;
  modifiedLine?: number;
  content: string;
  originalContent?: string;
}

export interface DiffSummary {
  additions: number;
  deletions: number;
  modifications: number;
  unchanged: number;
  similarity: number; // 0-100 percentage
}

export interface StructuredDiff {
  prompt: DiffResult;
  metadata: MetadataDiff;
  tags: TagDiff;
}

export interface MetadataDiff {
  style?: { old: string; new: string };
  camera?: { old: string; new: string };
  scene?: { old: string; new: string };
  character?: { old: string; new: string };
  audio?: { old: string; new: string };
  duration?: { old: number; new: number };
  aspectRatio?: { old: string; new: string };
  model?: { old: string; new: string };
}

export interface TagDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
}

class DiffService {
  /**
   * Compare two text strings and return diff
   */
  compareText(original: string, modified: string): DiffResult {
    try {
      const originalLines = original.split('\n');
      const modifiedLines = modified.split('\n');

      const changes = this.computeDiff(originalLines, modifiedLines);
      const summary = this.computeSummary(changes, original, modified);

      return {
        original,
        modified,
        changes,
        summary,
      };
    } catch (error) {
      logger.error('Failed to compare text', error);
      throw error;
    }
  }

  /**
   * Compare two history entries with structured diff
   */
  compareEntries(entry1: HistoryEntry, entry2: HistoryEntry): StructuredDiff {
    try {
      const promptDiff = this.compareText(entry1.prompt, entry2.prompt);
      const metadataDiff = this.compareMetadata(entry1.metadata, entry2.metadata);
      const tagDiff = this.compareTags(entry1.tags, entry2.tags);

      return {
        prompt: promptDiff,
        metadata: metadataDiff,
        tags: tagDiff,
      };
    } catch (error) {
      logger.error('Failed to compare entries', error);
      throw error;
    }
  }

  /**
   * Compare metadata objects
   */
  private compareMetadata(original: PromptMetadata, modified: PromptMetadata): MetadataDiff {
    const diff: MetadataDiff = {};
    const diffRecord = diff as Record<string, { old: unknown; new: unknown }>;

    const keys = new Set([...Object.keys(original), ...Object.keys(modified)]);

    for (const key of keys) {
      const oldValue = original[key as keyof PromptMetadata];
      const newValue = modified[key as keyof PromptMetadata];

      if (oldValue !== newValue) {
        diffRecord[key] = {
          old: oldValue,
          new: newValue,
        };
      }
    }

    return diff;
  }

  /**
   * Compare tag arrays
   */
  private compareTags(original: string[], modified: string[]): TagDiff {
    const originalSet = new Set(original);
    const modifiedSet = new Set(modified);

    const added = modified.filter((tag) => !originalSet.has(tag));
    const removed = original.filter((tag) => !modifiedSet.has(tag));
    const unchanged = original.filter((tag) => modifiedSet.has(tag));

    return { added, removed, unchanged };
  }

  /**
   * Compute line-by-line diff using LCS algorithm
   */
  private computeDiff(originalLines: string[], modifiedLines: string[]): DiffChange[] {
    const lcs = this.longestCommonSubsequence(originalLines, modifiedLines);
    const changes: DiffChange[] = [];

    let i = 0; // Original index
    let j = 0; // Modified index
    let lcsIndex = 0;

    while (i < originalLines.length || j < modifiedLines.length) {
      if (lcsIndex < lcs.length && originalLines[i] === lcs[lcsIndex]) {
        // Unchanged line
        changes.push({
          type: 'unchanged',
          originalLine: i,
          modifiedLine: j,
          content: originalLines[i],
        });
        i++;
        j++;
        lcsIndex++;
      } else if (
        i < originalLines.length &&
        j < modifiedLines.length &&
        originalLines[i] !== modifiedLines[j]
      ) {
        // Modified line
        changes.push({
          type: 'modify',
          originalLine: i,
          modifiedLine: j,
          content: modifiedLines[j],
          originalContent: originalLines[i],
        });
        i++;
        j++;
      } else if (i < originalLines.length) {
        // Removed line
        changes.push({
          type: 'remove',
          originalLine: i,
          content: originalLines[i],
        });
        i++;
      } else {
        // Added line
        changes.push({
          type: 'add',
          modifiedLine: j,
          content: modifiedLines[j],
        });
        j++;
      }
    }

    return changes;
  }

  /**
   * Longest Common Subsequence algorithm
   */
  private longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Build LCS table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Reconstruct LCS
    const lcs: string[] = [];
    let i = m;
    let j = n;

    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  /**
   * Compute diff summary statistics
   */
  private computeSummary(changes: DiffChange[], original: string, modified: string): DiffSummary {
    const additions = changes.filter((c) => c.type === 'add').length;
    const deletions = changes.filter((c) => c.type === 'remove').length;
    const modifications = changes.filter((c) => c.type === 'modify').length;
    const unchanged = changes.filter((c) => c.type === 'unchanged').length;

    // Calculate similarity using Levenshtein distance
    const similarity = this.calculateSimilarity(original, modified);

    return {
      additions,
      deletions,
      modifications,
      unchanged,
      similarity,
    };
  }

  /**
   * Calculate text similarity percentage (0-100)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) return 100;

    const similarity = ((maxLength - distance) / maxLength) * 100;
    return Math.round(similarity * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // Deletion
          dp[i][j - 1] + 1, // Insertion
          dp[i - 1][j - 1] + cost, // Substitution
        );
      }
    }

    return dp[m][n];
  }

  /**
   * Generate unified diff format (like git diff)
   */
  generateUnifiedDiff(original: string, modified: string, context: number = 3): string {
    const diff = this.compareText(original, modified);
    const lines: string[] = [];

    lines.push('--- Original');
    lines.push('+++ Modified');

    let i = 0;
    while (i < diff.changes.length) {
      const change = diff.changes[i];

      if (change.type !== 'unchanged') {
        // Find hunk boundaries
        const hunkStart = Math.max(0, i - context);
        let hunkEnd = i;

        // Extend hunk to include all consecutive changes
        while (
          hunkEnd < diff.changes.length &&
          (diff.changes[hunkEnd].type !== 'unchanged' || hunkEnd - i < context)
        ) {
          hunkEnd++;
        }

        hunkEnd = Math.min(diff.changes.length, hunkEnd + context);

        // Generate hunk header
        const originalStart = diff.changes[hunkStart].originalLine || 0;
        const modifiedStart = diff.changes[hunkStart].modifiedLine || 0;
        const originalCount = hunkEnd - hunkStart;
        const modifiedCount = hunkEnd - hunkStart;

        lines.push(
          `@@ -${originalStart + 1},${originalCount} +${modifiedStart + 1},${modifiedCount} @@`,
        );

        // Generate hunk content
        for (let j = hunkStart; j < hunkEnd; j++) {
          const c = diff.changes[j];
          switch (c.type) {
            case 'add':
              lines.push(`+${c.content}`);
              break;
            case 'remove':
              lines.push(`-${c.content}`);
              break;
            case 'modify':
              lines.push(`-${c.originalContent}`);
              lines.push(`+${c.content}`);
              break;
            case 'unchanged':
              lines.push(` ${c.content}`);
              break;
          }
        }

        i = hunkEnd;
      } else {
        i++;
      }
    }

    return lines.join('\n');
  }

  /**
   * Apply diff to restore original or modified version
   */
  applyDiff(base: string, diff: DiffResult, direction: 'forward' | 'backward'): string {
    return direction === 'forward' ? diff.modified : diff.original;
  }
}

export const diffService = new DiffService();
