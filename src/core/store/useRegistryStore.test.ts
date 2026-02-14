import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRegistryStore } from './useRegistryStore';
import type { RegistryIndex, RegistryEntry } from '@core/types/registry';

// Mock loggerService
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock registryService
const mockRegistryService = {
  fetchIndex: vi.fn(),
  search: vi.fn(),
  getEntry: vi.fn(),
  getCategories: vi.fn().mockResolvedValue([]),
  getTags: vi.fn().mockResolvedValue([]),
  getLastFetched: vi.fn().mockResolvedValue(null),
  clearCache: vi.fn().mockResolvedValue(undefined),
};
vi.mock('@core/services/registryService', () => ({
  registryService: mockRegistryService,
}));

function createEntry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    downloadUrl: 'https://example.com/plugin.zip',
    checksum: 'abc123',
    engineVersion: '>=1.9.0',
    permissions: ['ui:studio'],
    size: 50000,
    downloads: 100,
    rating: 4.5,
    ratingCount: 10,
    publishedAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['test'],
    category: 'studio',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset store state
  useRegistryStore.setState({
    entries: [],
    searchResult: null,
    categories: [],
    tags: [],
    selectedEntry: null,
    isLoading: false,
    isFetching: false,
    error: null,
    lastFetched: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useRegistryStore', () => {
  // ─── Initialize ───────────────────────────────────────────────────

  describe('initialize', () => {
    it('should fetch index and metadata on init', async () => {
      const entries = [createEntry()];
      const index: RegistryIndex = { version: '1.0.0', updatedAt: Date.now(), entries };

      mockRegistryService.fetchIndex.mockResolvedValueOnce(index);
      mockRegistryService.getLastFetched.mockResolvedValueOnce(Date.now());
      mockRegistryService.getCategories.mockResolvedValueOnce(['studio']);
      mockRegistryService.getTags.mockResolvedValueOnce(['test']);

      await useRegistryStore.getState().initialize();

      const state = useRegistryStore.getState();
      expect(state.entries).toHaveLength(1);
      expect(state.categories).toContain('studio');
      expect(state.tags).toContain('test');
      expect(state.isLoading).toBe(false);
    });

    it('should set error on init failure', async () => {
      mockRegistryService.fetchIndex.mockRejectedValueOnce(new Error('Fetch failed'));

      await useRegistryStore.getState().initialize();

      expect(useRegistryStore.getState().error).toBe('Failed to initialize registry');
    });
  });

  // ─── Fetch Index ──────────────────────────────────────────────────

  describe('fetchIndex', () => {
    it('should update entries on successful fetch', async () => {
      const entries = [createEntry(), createEntry({ id: 'plugin-2', name: 'Plugin 2' })];
      const index: RegistryIndex = { version: '1.0.0', updatedAt: Date.now(), entries };

      mockRegistryService.fetchIndex.mockResolvedValueOnce(index);
      mockRegistryService.getLastFetched.mockResolvedValueOnce(Date.now());

      await useRegistryStore.getState().fetchIndex();

      expect(useRegistryStore.getState().entries).toHaveLength(2);
      expect(useRegistryStore.getState().isFetching).toBe(false);
    });

    it('should handle null index gracefully', async () => {
      mockRegistryService.fetchIndex.mockResolvedValueOnce(null);

      await useRegistryStore.getState().fetchIndex();

      expect(useRegistryStore.getState().entries).toHaveLength(0);
      expect(useRegistryStore.getState().isFetching).toBe(false);
    });
  });

  // ─── Search ───────────────────────────────────────────────────────

  describe('search', () => {
    it('should store search results', async () => {
      const searchResult = {
        entries: [createEntry()],
        total: 1,
        page: 1,
        hasMore: false,
      };
      mockRegistryService.search.mockResolvedValueOnce(searchResult);

      const result = await useRegistryStore.getState().search({ query: 'test' });

      expect(result.total).toBe(1);
      expect(useRegistryStore.getState().searchResult).toEqual(searchResult);
    });

    it('should return empty result on failure', async () => {
      mockRegistryService.search.mockRejectedValueOnce(new Error('Search failed'));

      const result = await useRegistryStore.getState().search({ query: 'fail' });

      expect(result.total).toBe(0);
      expect(result.entries).toHaveLength(0);
    });
  });

  // ─── Select Entry ─────────────────────────────────────────────────

  describe('selectEntry', () => {
    it('should set selected entry', () => {
      const entry = createEntry();
      useRegistryStore.getState().selectEntry(entry);
      expect(useRegistryStore.getState().selectedEntry).toEqual(entry);
    });

    it('should clear selected entry', () => {
      useRegistryStore.getState().selectEntry(createEntry());
      useRegistryStore.getState().selectEntry(null);
      expect(useRegistryStore.getState().selectedEntry).toBeNull();
    });
  });

  // ─── Clear Cache ──────────────────────────────────────────────────

  describe('clearCache', () => {
    it('should clear cache and reset state', async () => {
      useRegistryStore.setState({
        entries: [createEntry()],
        lastFetched: Date.now(),
      });

      await useRegistryStore.getState().clearCache();

      expect(useRegistryStore.getState().entries).toHaveLength(0);
      expect(useRegistryStore.getState().lastFetched).toBeNull();
      expect(mockRegistryService.clearCache).toHaveBeenCalled();
    });
  });
});
