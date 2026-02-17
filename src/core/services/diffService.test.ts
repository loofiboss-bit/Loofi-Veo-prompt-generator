import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./loggerService', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { diffService } from './diffService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('diffService', () => {
  describe('compareText', () => {
    it('should return no changes for identical strings', () => {
      const result = diffService.compareText('hello world', 'hello world');
      expect(result.original).toBe('hello world');
      expect(result.modified).toBe('hello world');
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('unchanged');
      expect(result.summary.similarity).toBe(100);
    });

    it('should detect additions', () => {
      const result = diffService.compareText('line1', 'line1\nline2');
      expect(result.summary.additions).toBeGreaterThanOrEqual(1);
      expect(result.changes.some((c) => c.type === 'add')).toBe(true);
    });

    it('should detect removals', () => {
      const result = diffService.compareText('line1\nline2', 'line1');
      expect(result.summary.deletions).toBeGreaterThanOrEqual(1);
      expect(result.changes.some((c) => c.type === 'remove')).toBe(true);
    });

    it('should detect modifications', () => {
      const result = diffService.compareText('hello world', 'hello earth');
      expect(result.changes.some((c) => c.type === 'modify')).toBe(true);
    });

    it('should handle empty strings', () => {
      const result = diffService.compareText('', '');
      expect(result.summary.similarity).toBe(100);
    });

    it('should handle empty original with non-empty modified', () => {
      const result = diffService.compareText('', 'new content');
      // Empty string splits to [''] which gets modified to 'new content'
      expect(result.changes.length).toBeGreaterThanOrEqual(1);
      expect(result.summary.similarity).toBeLessThan(100);
    });

    it('should handle multi-line diffs', () => {
      const original = 'line1\nline2\nline3\nline4';
      const modified = 'line1\nmodified2\nline3\nnew4\nline5';
      const result = diffService.compareText(original, modified);
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.summary.unchanged).toBeGreaterThanOrEqual(1);
    });

    it('should compute similarity between 0 and 100', () => {
      const result = diffService.compareText('abc', 'xyz');
      expect(result.summary.similarity).toBeGreaterThanOrEqual(0);
      expect(result.summary.similarity).toBeLessThanOrEqual(100);
    });
  });

  describe('compareEntries', () => {
    const baseEntry = {
      id: '1',
      timestamp: Date.now(),
      projectId: 'proj1',
      prompt: 'original prompt',
      params: {} as Record<string, unknown>,
      metadata: {
        style: 'cinematic',
        camera: 'wide',
        scene: 'outdoor',
      },
      tags: ['tag1', 'tag2'],
      favorite: false,
    };

    it('should produce structured diff for identical entries', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = diffService.compareEntries(baseEntry as any, baseEntry as any);
      expect(result.prompt.summary.similarity).toBe(100);
      expect(result.tags.added).toHaveLength(0);
      expect(result.tags.removed).toHaveLength(0);
      expect(result.tags.unchanged).toEqual(['tag1', 'tag2']);
    });

    it('should detect tag changes', () => {
      const modified = { ...baseEntry, id: '2', tags: ['tag2', 'tag3'] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = diffService.compareEntries(baseEntry as any, modified as any);
      expect(result.tags.added).toContain('tag3');
      expect(result.tags.removed).toContain('tag1');
      expect(result.tags.unchanged).toContain('tag2');
    });

    it('should detect metadata changes', () => {
      const modified = {
        ...baseEntry,
        id: '2',
        metadata: { ...baseEntry.metadata, style: 'abstract' },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = diffService.compareEntries(baseEntry as any, modified as any);
      expect(result.metadata.style).toEqual({ old: 'cinematic', new: 'abstract' });
    });

    it('should detect prompt text changes', () => {
      const modified = { ...baseEntry, id: '2', prompt: 'modified prompt' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = diffService.compareEntries(baseEntry as any, modified as any);
      expect(result.prompt.summary.similarity).toBeLessThan(100);
    });
  });

  describe('generateUnifiedDiff', () => {
    it('should generate unified diff format with header', () => {
      const result = diffService.generateUnifiedDiff('hello world', 'hello earth');
      expect(result).toContain('--- Original');
      expect(result).toContain('+++ Modified');
    });

    it('should show added lines with + prefix', () => {
      const result = diffService.generateUnifiedDiff('line1', 'line1\nline2');
      expect(result).toContain('+line2');
    });

    it('should show removed lines with - prefix', () => {
      const result = diffService.generateUnifiedDiff('line1\nline2', 'line1');
      expect(result).toContain('-line2');
    });

    it('should show context lines with space prefix', () => {
      const original = 'context1\nchanged\ncontext2';
      const modified = 'context1\nreplaced\ncontext2';
      const result = diffService.generateUnifiedDiff(original, modified);
      expect(result).toContain(' context1');
    });

    it('should handle identical text', () => {
      const result = diffService.generateUnifiedDiff('same text', 'same text');
      expect(result).toContain('--- Original');
      expect(result).toContain('+++ Modified');
      // No changes, so no hunk headers
      expect(result).not.toContain('@@');
    });

    it('should generate hunk headers with line numbers', () => {
      const result = diffService.generateUnifiedDiff('a\nb', 'a\nc');
      expect(result).toContain('@@');
    });
  });

  describe('applyDiff', () => {
    it('should return modified for forward direction', () => {
      const diff = diffService.compareText('original', 'modified');
      const result = diffService.applyDiff('original', diff, 'forward');
      expect(result).toBe('modified');
    });

    it('should return original for backward direction', () => {
      const diff = diffService.compareText('original', 'modified');
      const result = diffService.applyDiff('original', diff, 'backward');
      expect(result).toBe('original');
    });
  });
});
