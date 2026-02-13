import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval before importing the service
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
  clear: vi.fn(() => {
    mockStore.clear();
    return Promise.resolve();
  }),
}));

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { historyService } from './historyService';
import type { PromptState } from '@core/types';

const mockParams = {} as PromptState;
const mockMetadata = { style: 'cinematic', camera: 'wide' };

describe('historyService', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('should add a history entry', async () => {
    const entry = await historyService.addEntry(
      'A test prompt',
      mockParams,
      mockMetadata,
      'project-1',
      ['tag1', 'tag2'],
    );

    expect(entry).toBeDefined();
    expect(entry.id).toBeDefined();
    expect(entry.prompt).toBe('A test prompt');
    expect(entry.projectId).toBe('project-1');
    expect(entry.tags).toEqual(['tag1', 'tag2']);
    expect(entry.favorite).toBe(false);
  });

  it('should retrieve an entry by ID', async () => {
    const entry = await historyService.addEntry('Get by ID test', mockParams, mockMetadata);
    const retrieved = await historyService.getEntry(entry.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.prompt).toBe('Get by ID test');
  });

  it('should return null for non-existent entry', async () => {
    const result = await historyService.getEntry('non-existent-id');
    expect(result).toBeNull();
  });

  it('should get all entries sorted by newest first', async () => {
    await historyService.addEntry('Entry 1', mockParams, mockMetadata);
    // Ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));
    await historyService.addEntry('Entry 2', mockParams, mockMetadata);

    const entries = await historyService.getEntries();
    expect(entries.length).toBe(2);
    expect(entries[0].prompt).toBe('Entry 2'); // Newest first
    expect(entries[1].prompt).toBe('Entry 1');
  });

  it('should filter by projectId', async () => {
    await historyService.addEntry('P1 entry', mockParams, mockMetadata, 'p1');
    await historyService.addEntry('P2 entry', mockParams, mockMetadata, 'p2');

    const filtered = await historyService.getEntries({ projectId: 'p1' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].prompt).toBe('P1 entry');
  });

  it('should filter by favorite', async () => {
    const entry = await historyService.addEntry('Fav test', mockParams, mockMetadata);
    await historyService.toggleFavorite(entry.id);

    const favorites = await historyService.getEntries({ favorite: true });
    expect(favorites.length).toBe(1);
    expect(favorites[0].favorite).toBe(true);
  });

  it('should filter by search query', async () => {
    await historyService.addEntry('Sunset over mountains', mockParams, mockMetadata);
    await historyService.addEntry('City at night', mockParams, mockMetadata);

    const results = await historyService.getEntries({ searchQuery: 'sunset' });
    expect(results.length).toBe(1);
    expect(results[0].prompt).toContain('Sunset');
  });

  it('should toggle favorite status', async () => {
    const entry = await historyService.addEntry('Toggle test', mockParams, mockMetadata);
    expect(entry.favorite).toBe(false);

    const toggled = await historyService.toggleFavorite(entry.id);
    expect(toggled).toBe(true);

    // Verify the entry is now favorited
    const updated = await historyService.getEntry(entry.id);
    expect(updated!.favorite).toBe(true);

    // Toggle back
    await historyService.toggleFavorite(entry.id);
    const toggledBack = await historyService.getEntry(entry.id);
    expect(toggledBack!.favorite).toBe(false);
  });

  it('should delete an entry', async () => {
    const entry = await historyService.addEntry('Delete test', mockParams, mockMetadata);
    await historyService.deleteEntry(entry.id);

    const result = await historyService.getEntry(entry.id);
    expect(result).toBeNull();
  });

  it('should clear all history', async () => {
    await historyService.addEntry('Entry A', mockParams, mockMetadata);
    await historyService.addEntry('Entry B', mockParams, mockMetadata);

    await historyService.clearHistory();

    const entries = await historyService.getEntries();
    expect(entries.length).toBe(0);
  });
});
