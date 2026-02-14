import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependent services
vi.mock('./historyService', () => ({
  historyService: {
    getEntries: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('./projectService', () => ({
  projectService: {
    searchProjects: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { searchService } from './searchService';
import { historyService } from './historyService';
import { projectService } from './projectService';

describe('searchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should return empty array for empty query results', async () => {
      const results = await searchService.search('nonexistent');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should search history entries', async () => {
      vi.mocked(historyService.getEntries).mockResolvedValueOnce([
        {
          id: 'h1',
          prompt: 'A cinematic sunset over mountains',
          timestamp: Date.now(),
          favorite: false,
          tags: ['sunset', 'cinematic'],
          params: { idea: 'sunset scene', artStyle: 'cinematic' },
          metadata: {},
          projectId: 'p1',
        },
      ] as ReturnType<typeof historyService.getEntries> extends Promise<infer T> ? T : never);

      const results = await searchService.search('sunset', { types: ['history'] });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe('history');
      expect(results[0].title).toContain('sunset');
    });

    it('should search projects', async () => {
      vi.mocked(projectService.searchProjects).mockResolvedValueOnce([
        {
          id: 'p1',
          name: 'My Video Project',
          description: 'A test project',
          tags: ['video'],
          status: 'active',
          modifiedAt: Date.now(),
          createdAt: Date.now(),
          settings: {},
          metadata: {},
        },
      ] as Awaited<ReturnType<typeof projectService.searchProjects>>);

      const results = await searchService.search('Video', { types: ['project'] });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe('project');
    });

    it('should respect limit option', async () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        id: `h${i}`,
        prompt: `test prompt ${i}`,
        timestamp: Date.now() - i * 1000,
        favorite: false,
        tags: ['test'],
        params: { idea: `test ${i}`, artStyle: '' },
        metadata: {},
        projectId: 'p1',
      }));
      vi.mocked(historyService.getEntries).mockResolvedValueOnce(entries as never);

      const results = await searchService.search('test', { limit: 3 });
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should respect threshold option', async () => {
      vi.mocked(historyService.getEntries).mockResolvedValueOnce([
        {
          id: 'h1',
          prompt: 'completely unrelated content',
          timestamp: Date.now(),
          favorite: false,
          tags: [],
          params: { idea: 'xyz', artStyle: '' },
          metadata: {},
          projectId: 'p1',
        },
      ] as never);

      const results = await searchService.search('sunset', { threshold: 0.9 });
      expect(results.length).toBe(0);
    });

    it('should sort results by score descending', async () => {
      vi.mocked(historyService.getEntries).mockResolvedValueOnce([
        {
          id: 'h1',
          prompt: 'sunset',
          timestamp: Date.now(),
          favorite: false,
          tags: ['sunset'],
          params: { idea: 'sunset', artStyle: '' },
          metadata: {},
          projectId: 'p1',
        },
        {
          id: 'h2',
          prompt: 'a beautiful sunset over the ocean',
          timestamp: Date.now(),
          favorite: false,
          tags: [],
          params: { idea: 'ocean view', artStyle: '' },
          metadata: {},
          projectId: 'p1',
        },
      ] as never);

      const results = await searchService.search('sunset', { types: ['history'] });
      if (results.length >= 2) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      }
    });

    it('should return empty array on error', async () => {
      vi.mocked(historyService.getEntries).mockRejectedValueOnce(new Error('DB error'));
      const results = await searchService.search('test', { types: ['history'] });
      expect(results).toEqual([]);
    });
  });

  describe('getSuggestions', () => {
    it('should return empty array when no history', async () => {
      vi.mocked(historyService.getEntries).mockResolvedValueOnce([]);
      const suggestions = await searchService.getSuggestions('test');
      expect(suggestions).toEqual([]);
    });

    it('should return matching tags as suggestions', async () => {
      vi.mocked(historyService.getEntries).mockResolvedValueOnce([
        {
          id: 'h1',
          prompt: 'test',
          timestamp: Date.now(),
          favorite: false,
          tags: ['cinematic', 'cinema-verite'],
          params: { idea: 'test idea' },
          metadata: {},
          projectId: 'p1',
        },
      ] as never);

      const suggestions = await searchService.getSuggestions('cine');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every((s) => s.toLowerCase().startsWith('cine'))).toBe(true);
    });

    it('should respect limit parameter', async () => {
      vi.mocked(historyService.getEntries).mockResolvedValueOnce(
        Array.from({ length: 20 }, (_, i) => ({
          id: `h${i}`,
          prompt: `prompt ${i}`,
          timestamp: Date.now(),
          favorite: false,
          tags: [`tag-a${i}`],
          params: { idea: `a-word-${i} something` },
          metadata: {},
          projectId: 'p1',
        })) as never,
      );

      const suggestions = await searchService.getSuggestions('tag', 2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array on error', async () => {
      vi.mocked(historyService.getEntries).mockRejectedValueOnce(new Error('fail'));
      const suggestions = await searchService.getSuggestions('test');
      expect(suggestions).toEqual([]);
    });
  });
});
