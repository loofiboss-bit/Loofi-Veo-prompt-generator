/**
 * useHistoryStore Tests
 * Tests for prompt history Zustand store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HistoryEntry, HistoryFilter, HistoryStats } from '@core/services/historyService';
import type { PromptState } from '@core/types';

// Mock historyService using vi.hoisted
const mockHistoryEntries: HistoryEntry[] = [
  {
    id: 'entry-1',
    timestamp: Date.now(),
    version: '1.0',
    prompt: 'Test prompt 1',
    params: {} as import('@core/types').PromptState,
    metadata: {},
    favorite: false,
    projectId: 'default',
    tags: ['test'],
  },
  {
    id: 'entry-2',
    timestamp: Date.now() - 10000,
    version: '1.0',
    prompt: 'Test prompt 2',
    params: {} as import('@core/types').PromptState,
    metadata: {},
    favorite: true,
    projectId: 'default',
    tags: ['test', 'favorite'],
  },
];

const mockHistoryStats: HistoryStats = {
  totalEntries: 2,
  favoriteCount: 1,
  projectCount: 1,
  mostUsedTags: [{ tag: 'test', count: 2 }],
};

const mockHistoryService = vi.hoisted(() => ({
  getEntries: vi.fn(async () => mockHistoryEntries),
  getStats: vi.fn(async () => mockHistoryStats),
  addEntry: vi.fn(
    async (
      prompt: string,
      params: Record<string, unknown>,
      _metadata?: Record<string, unknown>,
      _projectId?: string,
      _tags?: string[],
    ) => ({
      id: 'new-entry',
      timestamp: Date.now(),
      version: '1.0',
      prompt,
      params,
      metadata: _metadata || {},
      projectId: _projectId,
      tags: _tags || [],
      favorite: false,
    }),
  ),
  updateEntry: vi.fn(async () => true),
  deleteEntry: vi.fn(async () => true),
  deleteEntries: vi.fn(async (ids: string[]) => ids.length),
  toggleFavorite: vi.fn(async () => true),
  addTags: vi.fn(async () => true),
  removeTags: vi.fn(async () => true),
  exportHistory: vi.fn(async () => '{"entries":[]}'),
  clearHistory: vi.fn(async () => 2),
}));

vi.mock('@core/services/historyService', () => ({
  historyService: mockHistoryService,
}));

vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { useHistoryStore } from './useHistoryStore';

describe('useHistoryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useHistoryStore.setState({
      entries: [],
      stats: null,
      isLoading: false,
      error: null,
      filter: {},
    });
    mockHistoryService.getEntries.mockResolvedValue(mockHistoryEntries);
    mockHistoryService.getStats.mockResolvedValue(mockHistoryStats);
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useHistoryStore.getState();
      expect(state.entries).toEqual([]);
      expect(state.stats).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.filter).toEqual({});
    });
  });

  describe('initialize', () => {
    it('should load entries and stats', async () => {
      await useHistoryStore.getState().initialize();

      const state = useHistoryStore.getState();
      expect(state.entries).toEqual(mockHistoryEntries);
      expect(state.stats).toEqual(mockHistoryStats);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle initialization errors', async () => {
      mockHistoryService.getEntries.mockRejectedValueOnce(new Error('Failed to load'));

      await useHistoryStore.getState().initialize();

      const state = useHistoryStore.getState();
      expect(state.error).toBe('Failed to initialize history');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('addEntry', () => {
    it('should add an entry successfully', async () => {
      const entryData = {
        prompt: 'New prompt',
        params: { model: 'gpt-4' } as unknown as PromptState,
        metadata: {},
        tags: ['new'],
        favorite: false,
        projectId: 'default',
      };

      const result = await useHistoryStore.getState().addEntry(entryData);

      expect(result).toBeTruthy();
      expect(result?.prompt).toBe('New prompt');
      expect(mockHistoryService.addEntry).toHaveBeenCalledWith(
        'New prompt',
        { model: 'gpt-4' },
        {},
        'default',
        ['new'],
      );
    });

    it('should refresh entries and stats after adding', async () => {
      const entryData = {
        prompt: 'New prompt',
        params: {} as PromptState,
        metadata: {},
        tags: [],
        favorite: false,
        projectId: 'default',
      };

      await useHistoryStore.getState().addEntry(entryData);

      expect(mockHistoryService.getEntries).toHaveBeenCalled();
      expect(mockHistoryService.getStats).toHaveBeenCalled();
    });

    it('should handle add entry errors', async () => {
      mockHistoryService.addEntry.mockRejectedValueOnce(new Error('Add failed'));

      const result = await useHistoryStore.getState().addEntry({
        prompt: 'Test',
        params: {} as PromptState,
        metadata: {},
        tags: [],
        favorite: false,
        projectId: 'default',
      });

      expect(result).toBeNull();
      expect(useHistoryStore.getState().error).toBe('Failed to add entry');
    });
  });

  describe('getEntries', () => {
    it('should load entries with filter', async () => {
      const filter: HistoryFilter = { favorite: true };

      await useHistoryStore.getState().getEntries(filter);

      expect(mockHistoryService.getEntries).toHaveBeenCalledWith(filter);
      expect(useHistoryStore.getState().entries).toEqual(mockHistoryEntries);
      expect(useHistoryStore.getState().filter).toEqual(filter);
    });

    it('should use current filter if none provided', async () => {
      useHistoryStore.setState({ filter: { tags: ['test'] } });

      await useHistoryStore.getState().getEntries();

      expect(mockHistoryService.getEntries).toHaveBeenCalledWith({ tags: ['test'] });
    });

    it('should handle get entries errors', async () => {
      mockHistoryService.getEntries.mockRejectedValueOnce(new Error('Load failed'));

      await useHistoryStore.getState().getEntries();

      expect(useHistoryStore.getState().error).toBe('Failed to load entries');
    });
  });

  describe('updateEntry', () => {
    it('should update an entry successfully', async () => {
      const result = await useHistoryStore.getState().updateEntry('entry-1', {
        prompt: 'Updated prompt',
      });

      expect(result).toBe(true);
      expect(mockHistoryService.updateEntry).toHaveBeenCalledWith('entry-1', {
        prompt: 'Updated prompt',
      });
    });

    it('should refresh entries after updating', async () => {
      await useHistoryStore.getState().updateEntry('entry-1', { favorite: true });

      expect(mockHistoryService.getEntries).toHaveBeenCalled();
    });

    it('should handle update failures', async () => {
      mockHistoryService.updateEntry.mockResolvedValueOnce(false);

      const result = await useHistoryStore.getState().updateEntry('entry-1', {});

      expect(result).toBe(false);
      expect(useHistoryStore.getState().error).toBe('Failed to update entry');
    });

    it('should handle update errors', async () => {
      mockHistoryService.updateEntry.mockRejectedValueOnce(new Error('Update failed'));

      const result = await useHistoryStore.getState().updateEntry('entry-1', {});

      expect(result).toBe(false);
      expect(useHistoryStore.getState().error).toBe('Failed to update entry');
    });
  });

  describe('deleteEntry', () => {
    it('should delete an entry successfully', async () => {
      const result = await useHistoryStore.getState().deleteEntry('entry-1');

      expect(result).toBe(true);
      expect(mockHistoryService.deleteEntry).toHaveBeenCalledWith('entry-1');
    });

    it('should refresh entries and stats after deleting', async () => {
      await useHistoryStore.getState().deleteEntry('entry-1');

      expect(mockHistoryService.getEntries).toHaveBeenCalled();
      expect(mockHistoryService.getStats).toHaveBeenCalled();
    });

    it('should handle delete failures', async () => {
      mockHistoryService.deleteEntry.mockResolvedValueOnce(false);

      const result = await useHistoryStore.getState().deleteEntry('entry-1');

      expect(result).toBe(false);
      expect(useHistoryStore.getState().error).toBe('Failed to delete entry');
    });
  });

  describe('deleteEntries', () => {
    it('should delete multiple entries', async () => {
      const deleted = await useHistoryStore.getState().deleteEntries(['entry-1', 'entry-2']);

      expect(deleted).toBe(2);
      expect(mockHistoryService.deleteEntries).toHaveBeenCalledWith(['entry-1', 'entry-2']);
    });

    it('should refresh after bulk delete', async () => {
      await useHistoryStore.getState().deleteEntries(['entry-1']);

      expect(mockHistoryService.getEntries).toHaveBeenCalled();
      expect(mockHistoryService.getStats).toHaveBeenCalled();
    });

    it('should handle bulk delete errors', async () => {
      mockHistoryService.deleteEntries.mockRejectedValueOnce(new Error('Delete failed'));

      const deleted = await useHistoryStore.getState().deleteEntries(['entry-1']);

      expect(deleted).toBe(0);
      expect(useHistoryStore.getState().error).toBe('Failed to delete entries');
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite status', async () => {
      const result = await useHistoryStore.getState().toggleFavorite('entry-1');

      expect(result).toBe(true);
      expect(mockHistoryService.toggleFavorite).toHaveBeenCalledWith('entry-1');
    });

    it('should refresh entries and stats after toggling', async () => {
      await useHistoryStore.getState().toggleFavorite('entry-1');

      expect(mockHistoryService.getEntries).toHaveBeenCalled();
      expect(mockHistoryService.getStats).toHaveBeenCalled();
    });

    it('should handle toggle errors', async () => {
      mockHistoryService.toggleFavorite.mockRejectedValueOnce(new Error('Toggle failed'));

      const result = await useHistoryStore.getState().toggleFavorite('entry-1');

      expect(result).toBe(false);
    });
  });

  describe('tags management', () => {
    it('should add tags to entry', async () => {
      const result = await useHistoryStore.getState().addTags('entry-1', ['new-tag']);

      expect(result).toBe(true);
      expect(mockHistoryService.addTags).toHaveBeenCalledWith('entry-1', ['new-tag']);
    });

    it('should refresh entries after adding tags', async () => {
      await useHistoryStore.getState().addTags('entry-1', ['tag']);

      expect(mockHistoryService.getEntries).toHaveBeenCalled();
    });

    it('should remove tags from entry', async () => {
      const result = await useHistoryStore.getState().removeTags('entry-1', ['old-tag']);

      expect(result).toBe(true);
      expect(mockHistoryService.removeTags).toHaveBeenCalledWith('entry-1', ['old-tag']);
    });

    it('should handle tag operation errors', async () => {
      mockHistoryService.addTags.mockRejectedValueOnce(new Error('Tag failed'));

      const result = await useHistoryStore.getState().addTags('entry-1', ['tag']);

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should load stats', async () => {
      await useHistoryStore.getState().getStats();

      expect(mockHistoryService.getStats).toHaveBeenCalled();
      expect(useHistoryStore.getState().stats).toEqual(mockHistoryStats);
    });

    it('should load stats for specific project', async () => {
      await useHistoryStore.getState().getStats('project-1');

      expect(mockHistoryService.getStats).toHaveBeenCalledWith('project-1');
    });

    it('should handle stats errors gracefully', async () => {
      mockHistoryService.getStats.mockRejectedValueOnce(new Error('Stats failed'));

      await useHistoryStore.getState().getStats();

      // Should not throw, error is logged but not set in state
      expect(useHistoryStore.getState().stats).toBeNull();
    });
  });

  describe('exportHistory', () => {
    it('should export history with filter', async () => {
      const result = await useHistoryStore.getState().exportHistory('json', { favorite: true });

      expect(result).toBe('{"entries":[]}');
      expect(mockHistoryService.exportHistory).toHaveBeenCalledWith('json', { favorite: true });
    });

    it('should use current filter if none provided', async () => {
      useHistoryStore.setState({ filter: { tags: ['export'] } });

      await useHistoryStore.getState().exportHistory('csv');

      expect(mockHistoryService.exportHistory).toHaveBeenCalledWith('csv', { tags: ['export'] });
    });

    it('should handle export errors', async () => {
      mockHistoryService.exportHistory.mockRejectedValueOnce(new Error('Export failed'));

      const result = await useHistoryStore.getState().exportHistory('json');

      expect(result).toBeNull();
      expect(useHistoryStore.getState().error).toBe('Failed to export history');
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', async () => {
      const deleted = await useHistoryStore.getState().clearHistory();

      expect(deleted).toBe(2);
      expect(mockHistoryService.clearHistory).toHaveBeenCalledWith(undefined);
    });

    it('should clear history for specific project', async () => {
      await useHistoryStore.getState().clearHistory('project-1');

      expect(mockHistoryService.clearHistory).toHaveBeenCalledWith('project-1');
    });

    it('should refresh after clearing', async () => {
      await useHistoryStore.getState().clearHistory();

      expect(mockHistoryService.getEntries).toHaveBeenCalled();
      expect(mockHistoryService.getStats).toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      mockHistoryService.clearHistory.mockRejectedValueOnce(new Error('Clear failed'));

      const deleted = await useHistoryStore.getState().clearHistory();

      expect(deleted).toBe(0);
      expect(useHistoryStore.getState().error).toBe('Failed to clear history');
    });
  });

  describe('filter management', () => {
    it('should set filter and reload entries', async () => {
      useHistoryStore.getState().setFilter({ favorite: true });

      await vi.waitFor(() => {
        expect(mockHistoryService.getEntries).toHaveBeenCalledWith({ favorite: true });
      });

      expect(useHistoryStore.getState().filter).toEqual({ favorite: true });
    });

    it('should merge filter updates', async () => {
      useHistoryStore.setState({ filter: { tags: ['test'] } });

      useHistoryStore.getState().setFilter({ favorite: true });

      await vi.waitFor(() => {
        expect(useHistoryStore.getState().filter).toEqual({ tags: ['test'], favorite: true });
      });
    });

    it('should reset filter to empty', async () => {
      useHistoryStore.setState({ filter: { favorite: true, tags: ['test'] } });

      useHistoryStore.getState().resetFilter();

      await vi.waitFor(() => {
        expect(mockHistoryService.getEntries).toHaveBeenCalledWith({});
      });

      expect(useHistoryStore.getState().filter).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle empty entries array', async () => {
      mockHistoryService.getEntries.mockResolvedValueOnce([]);

      await useHistoryStore.getState().getEntries();

      expect(useHistoryStore.getState().entries).toEqual([]);
    });

    it('should handle null stats', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockHistoryService.getStats.mockResolvedValueOnce(null as any);

      await useHistoryStore.getState().initialize();

      expect(useHistoryStore.getState().stats).toBeNull();
    });

    it('should handle concurrent operations', async () => {
      const promise1 = useHistoryStore.getState().addEntry({
        prompt: 'Test 1',
        params: {} as PromptState,
        metadata: {},
        tags: [],
        favorite: false,
        projectId: 'default',
      });
      const promise2 = useHistoryStore.getState().addEntry({
        prompt: 'Test 2',
        params: {} as PromptState,
        metadata: {},
        tags: [],
        favorite: false,
        projectId: 'default',
      });

      const results = await Promise.all([promise1, promise2]);

      expect(results[0]).toBeTruthy();
      expect(results[1]).toBeTruthy();
    });

    it('should handle service methods returning unexpected values', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockHistoryService.addEntry.mockResolvedValueOnce(null as any);

      const result = await useHistoryStore.getState().addEntry({
        prompt: 'Test',
        params: {} as PromptState,
        metadata: {},
        tags: [],
        favorite: false,
        projectId: 'default',
      });

      expect(result).toBeNull();
    });
  });
});
