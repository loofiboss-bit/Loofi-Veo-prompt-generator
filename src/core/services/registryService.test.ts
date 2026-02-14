import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registryService } from './registryService';
import type { RegistryIndex, RegistryEntry } from '@core/types/registry';

// Mock idb-keyval
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
  keys: vi.fn(() => Promise.resolve([...mockStore.keys()])),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Silence console
beforeEach(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
  mockStore.clear();
  mockFetch.mockReset();
  // Reset internal cached index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (registryService as any).cachedIndex = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Test Fixtures ──────────────────────────────────────────────────

function createEntry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin for unit testing',
    author: 'Test Author',
    license: 'MIT',
    homepage: 'https://example.com',
    repository: 'https://github.com/test/test-plugin',
    downloadUrl: 'https://plugins.veo-studio.dev/test-plugin-1.0.0.zip',
    checksum: 'abc123',
    engineVersion: '>=1.9.0',
    permissions: ['ui:studio'],
    size: 50000,
    downloads: 100,
    rating: 4.5,
    ratingCount: 10,
    publishedAt: 1700000000000,
    updatedAt: 1710000000000,
    tags: ['studio', 'test'],
    category: 'studio',
    ...overrides,
  };
}

function createIndex(entries: RegistryEntry[] = [createEntry()]): RegistryIndex {
  return {
    version: '1.0.0',
    updatedAt: Date.now(),
    entries,
  };
}

function mockSuccessfulFetch(index: RegistryIndex = createIndex()) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(index),
    headers: new Headers({ etag: '"test-etag"' }),
  });
}

function mockFailedFetch(status = 500) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Internal Server Error',
  });
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('RegistryService', () => {
  // ─── Configuration ──────────────────────────────────────────────

  describe('configure', () => {
    it('should update configuration', () => {
      registryService.configure({ baseUrl: 'https://custom.registry.dev' });
      const config = registryService.getConfig();
      expect(config.baseUrl).toBe('https://custom.registry.dev');
    });

    it('should merge partial config without wiping other fields', () => {
      const original = registryService.getConfig();
      registryService.configure({ timeout: 5000 });
      const updated = registryService.getConfig();
      expect(updated.timeout).toBe(5000);
      expect(updated.cacheTtlMs).toBe(original.cacheTtlMs);
    });
  });

  // ─── Fetch & Cache ────────────────────────────────────────────────

  describe('fetchIndex', () => {
    it('should fetch and cache the registry index', async () => {
      const index = createIndex();
      mockSuccessfulFetch(index);

      const result = await registryService.fetchIndex();
      expect(result).not.toBeNull();
      expect(result?.entries).toHaveLength(1);
      expect(result?.version).toBe('1.0.0');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return cached data on subsequent calls within TTL', async () => {
      const index = createIndex();
      mockSuccessfulFetch(index);

      await registryService.fetchIndex();
      const result = await registryService.fetchIndex();

      expect(result).not.toBeNull();
      // Should only fetch once — second call uses cache
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should force-refresh when force=true', async () => {
      mockSuccessfulFetch(createIndex());
      await registryService.fetchIndex();

      mockSuccessfulFetch(createIndex([createEntry({ name: 'Updated' })]));
      const result = await registryService.fetchIndex(true);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result?.entries[0].name).toBe('Updated');
    });

    it('should fall back to stale cache on fetch failure', async () => {
      // First: successful fetch, populates cache
      mockSuccessfulFetch(createIndex());
      await registryService.fetchIndex();

      // Clear in-memory cache to force re-check
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (registryService as any).cachedIndex = null;

      // Force-fetch with failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Set cache to appear stale
      registryService.configure({ cacheTtlMs: 0 });

      const result = await registryService.fetchIndex(true);
      // Should return the stale cached data
      expect(result).not.toBeNull();
      expect(result?.entries).toHaveLength(1);

      // Restore TTL
      registryService.configure({ cacheTtlMs: 30 * 60 * 1000 });
    });

    it('should return null when fetch fails with no cache', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await registryService.fetchIndex();
      expect(result).toBeNull();
    });

    it('should return null for invalid response structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ invalid: true }),
        headers: new Headers(),
      });

      const result = await registryService.fetchIndex(true);
      expect(result).toBeNull();
    });

    it('should return null for non-OK HTTP status', async () => {
      mockFailedFetch(404);

      const result = await registryService.fetchIndex();
      expect(result).toBeNull();
    });
  });

  describe('isStale', () => {
    it('should return true when no cachedAt', () => {
      expect(registryService.isStale(undefined)).toBe(true);
    });

    it('should return false for recent timestamp', () => {
      expect(registryService.isStale(Date.now())).toBe(false);
    });

    it('should return true for old timestamp', () => {
      const oldTime = Date.now() - 60 * 60 * 1000; // 1 hour ago
      expect(registryService.isStale(oldTime)).toBe(true);
    });
  });

  // ─── Search & Query ───────────────────────────────────────────────

  describe('search', () => {
    const entries: RegistryEntry[] = [
      createEntry({
        id: 'audio-tools',
        name: 'Audio Tools',
        description: 'Audio processing plugin',
        author: 'Alice',
        category: 'studio',
        tags: ['audio', 'studio'],
        downloads: 500,
        rating: 4.8,
        updatedAt: 1710000000000,
      }),
      createEntry({
        id: 'video-effects',
        name: 'Video Effects',
        description: 'Visual effects toolkit',
        author: 'Bob',
        category: 'studio',
        tags: ['video', 'effects'],
        downloads: 200,
        rating: 4.2,
        updatedAt: 1720000000000,
      }),
      createEntry({
        id: 'markdown-export',
        name: 'Markdown Export',
        description: 'Export prompts as markdown',
        author: 'Alice',
        category: 'export',
        tags: ['export', 'markdown'],
        downloads: 1000,
        rating: 4.9,
        updatedAt: 1700000000000,
      }),
    ];

    beforeEach(async () => {
      mockSuccessfulFetch(createIndex(entries));
      await registryService.fetchIndex();
    });

    it('should return all entries with no filters', async () => {
      const result = await registryService.search();
      expect(result.total).toBe(3);
    });

    it('should filter by query (name)', async () => {
      const result = await registryService.search({ query: 'audio' });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe('audio-tools');
    });

    it('should filter by query (description)', async () => {
      const result = await registryService.search({ query: 'visual' });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe('video-effects');
    });

    it('should filter by query (tags)', async () => {
      const result = await registryService.search({ query: 'markdown' });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe('markdown-export');
    });

    it('should filter by category', async () => {
      const result = await registryService.search({ category: 'export' });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe('markdown-export');
    });

    it('should filter by author', async () => {
      const result = await registryService.search({ author: 'alice' });
      expect(result.total).toBe(2);
    });

    it('should filter by tag', async () => {
      const result = await registryService.search({ tag: 'effects' });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe('video-effects');
    });

    it('should sort by downloads descending', async () => {
      const result = await registryService.search({ sortBy: 'downloads', order: 'desc' });
      expect(result.entries[0].id).toBe('markdown-export');
      expect(result.entries[2].id).toBe('video-effects');
    });

    it('should sort by name ascending', async () => {
      const result = await registryService.search({ sortBy: 'name', order: 'asc' });
      expect(result.entries[0].name).toBe('Audio Tools');
      expect(result.entries[2].name).toBe('Video Effects');
    });

    it('should paginate results', async () => {
      const page1 = await registryService.search({ limit: 2, page: 1 });
      expect(page1.entries).toHaveLength(2);
      expect(page1.total).toBe(3);
      expect(page1.hasMore).toBe(true);

      const page2 = await registryService.search({ limit: 2, page: 2 });
      expect(page2.entries).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
    });

    it('should combine filters', async () => {
      const result = await registryService.search({ category: 'studio', author: 'bob' });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe('video-effects');
    });

    it('should return empty result when no matches', async () => {
      const result = await registryService.search({ query: 'nonexistent' });
      expect(result.total).toBe(0);
      expect(result.entries).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getEntry', () => {
    it('should find an entry by ID', async () => {
      mockSuccessfulFetch(createIndex());
      await registryService.fetchIndex();

      const entry = await registryService.getEntry('test-plugin');
      expect(entry).not.toBeNull();
      expect(entry?.name).toBe('Test Plugin');
    });

    it('should return null for unknown ID', async () => {
      mockSuccessfulFetch(createIndex());
      await registryService.fetchIndex();

      const entry = await registryService.getEntry('unknown');
      expect(entry).toBeNull();
    });
  });

  describe('getCategories', () => {
    it('should return unique sorted categories', async () => {
      mockSuccessfulFetch(
        createIndex([
          createEntry({ id: 'a', category: 'studio' }),
          createEntry({ id: 'b', category: 'export' }),
          createEntry({ id: 'c', category: 'studio' }),
        ]),
      );
      await registryService.fetchIndex();

      const categories = await registryService.getCategories();
      expect(categories).toEqual(['export', 'studio']);
    });
  });

  describe('getTags', () => {
    it('should return unique sorted tags', async () => {
      mockSuccessfulFetch(
        createIndex([
          createEntry({ id: 'a', tags: ['video', 'studio'] }),
          createEntry({ id: 'b', tags: ['audio', 'studio'] }),
        ]),
      );
      await registryService.fetchIndex();

      const tags = await registryService.getTags();
      expect(tags).toEqual(['audio', 'studio', 'video']);
    });
  });

  describe('getEntryCount', () => {
    it('should return 0 when not fetched', () => {
      expect(registryService.getEntryCount()).toBe(0);
    });

    it('should return count after fetch', async () => {
      mockSuccessfulFetch(createIndex([createEntry({ id: 'a' }), createEntry({ id: 'b' })]));
      await registryService.fetchIndex();

      expect(registryService.getEntryCount()).toBe(2);
    });
  });

  // ─── Cache Management ─────────────────────────────────────────────

  describe('clearCache', () => {
    it('should clear the cached index', async () => {
      mockSuccessfulFetch(createIndex());
      await registryService.fetchIndex();

      expect(registryService.getEntryCount()).toBe(1);

      await registryService.clearCache();
      expect(registryService.getEntryCount()).toBe(0);
    });
  });
});
