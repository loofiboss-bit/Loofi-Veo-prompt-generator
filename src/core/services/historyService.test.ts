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

  describe('CSV Import', () => {
    const createCSV = (rows: string[]): string => {
      const headers = 'ID,Project ID,Timestamp,Date,Prompt,Tags,Favorite,Style,Camera,Model';
      return [headers, ...rows].join('\n');
    };

    // Happy Path Tests
    it('should import a single CSV entry', async () => {
      const csv = createCSV([
        'test-1,proj-1,1700000000000,2023-11-14T22:13:20.000Z,"A beautiful sunset","nature, landscape",Yes,cinematic,dolly,veo',
      ]);

      const count = await historyService.importHistory(csv, 'csv');

      expect(count).toBe(1);
      const entry = await historyService.getEntry('test-1');
      expect(entry).not.toBeNull();
      expect(entry!.prompt).toBe('A beautiful sunset');
      expect(entry!.projectId).toBe('proj-1');
      expect(entry!.timestamp).toBe(1700000000000);
      expect(entry!.tags).toEqual(['nature', 'landscape']);
      expect(entry!.favorite).toBe(true);
      expect(entry!.params.artStyle).toBe('cinematic');
      expect(entry!.params.cameraMovement).toBe('dolly');
      expect(entry!.params.model).toBe('veo');
    });

    it('should import multiple CSV entries', async () => {
      const csv = createCSV([
        'test-1,proj-1,1700000000000,2023-11-14T22:13:20.000Z,"A beautiful sunset","nature, landscape",Yes,cinematic,dolly,flow-veo',
        'test-2,proj-1,1700000001000,2023-11-14T22:13:21.000Z,"A cat playing",cat,No,anime,,veo-api',
        'test-3,proj-2,1700000002000,2023-11-14T22:13:22.000Z,"City at night","urban, lights",Yes,noir,static,',
      ]);

      const count = await historyService.importHistory(csv, 'csv');

      expect(count).toBe(3);
      const entries = await historyService.getEntries();
      expect(entries.length).toBe(3);
      expect(entries.map((e) => e.id).sort()).toEqual(['test-1', 'test-2', 'test-3']);
    });

    it('should correctly parse and store all CSV fields', async () => {
      const csv = createCSV([
        'custom-id,custom-proj,1699999999000,2023-11-14T22:13:19.000Z,"Test prompt","tag1, tag2, tag3",No,realistic,pan,gemini',
      ]);

      await historyService.importHistory(csv, 'csv');
      const entry = await historyService.getEntry('custom-id');

      expect(entry).not.toBeNull();
      expect(entry!.id).toBe('custom-id');
      expect(entry!.projectId).toBe('custom-proj');
      expect(entry!.timestamp).toBe(1699999999000);
      expect(entry!.prompt).toBe('Test prompt');
      expect(entry!.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(entry!.favorite).toBe(false);
      expect(entry!.params.artStyle).toBe('realistic');
      expect(entry!.params.cameraMovement).toBe('pan');
      expect(entry!.params.model).toBe('gemini');
      expect(entry!.metadata.style).toBe('realistic');
      expect(entry!.metadata.camera).toBe('pan');
      expect(entry!.metadata.model).toBe('gemini');
    });

    // CSV Parsing Edge Cases
    it('should handle quoted fields with commas', async () => {
      const csv = createCSV([
        'test-1,proj-1,1700000000000,2023-11-14T22:13:20.000Z,"A prompt with, commas, inside","tag1, tag2",No,,,',
      ]);

      const count = await historyService.importHistory(csv, 'csv');

      expect(count).toBe(1);
      const entry = await historyService.getEntry('test-1');
      expect(entry).not.toBeNull();
      expect(entry!.prompt).toBe('A prompt with, commas, inside');
      expect(entry!.tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle escaped quotes (double-quotes) in fields', async () => {
      const csv = createCSV([
        'test-1,proj-1,1700000000000,2023-11-14T22:13:20.000Z,"She said ""Hello"" to me",quote,No,,,',
      ]);

      const count = await historyService.importHistory(csv, 'csv');

      expect(count).toBe(1);
      const entry = await historyService.getEntry('test-1');
      expect(entry).not.toBeNull();
      expect(entry!.prompt).toBe('She said "Hello" to me');
    });

    it('should handle missing optional fields (empty values)', async () => {
      const csv = createCSV([
        'test-1,proj-1,1700000000000,2023-11-14T22:13:20.000Z,"Simple prompt",,No,,,',
      ]);

      const count = await historyService.importHistory(csv, 'csv');

      expect(count).toBe(1);
      const entry = await historyService.getEntry('test-1');
      expect(entry).not.toBeNull();
      expect(entry!.prompt).toBe('Simple prompt');
      expect(entry!.tags).toEqual([]);
      expect(entry!.params.artStyle).toBe('');
      expect(entry!.params.cameraMovement).toBe('');
      expect(entry!.params.model).toBe('');
    });

    it('should handle extra whitespace in CSV fields', async () => {
      const csv = createCSV([
        'test-1 , proj-1 , 1700000000000 , 2023-11-14T22:13:20.000Z , "Prompt with spaces" , " tag1 , tag2 " , No , style , camera , model ',
      ]);

      const count = await historyService.importHistory(csv, 'csv');

      expect(count).toBe(1);
      const entry = await historyService.getEntry('test-1 ');
      expect(entry).not.toBeNull();
      // Note: The service doesn't trim field values, so they are stored as-is
    });

    it('should parse tags correctly from comma-separated string', async () => {
      const csv = createCSV([
        'test-1,proj-1,1700000000000,2023-11-14T22:13:20.000Z,"Prompt","nature, landscape, sunset, beautiful",Yes,,,',
      ]);

      const count = await historyService.importHistory(csv, 'csv');

      expect(count).toBe(1);
      const entry = await historyService.getEntry('test-1');
      expect(entry).not.toBeNull();
      expect(entry!.tags).toEqual(['nature', 'landscape', 'sunset', 'beautiful']);
    });

    // Duplicate Handling Tests
    it('should skip duplicate entries by ID', async () => {
      // First import
      const csv1 = createCSV([
        'test-1,proj-1,1700000000000,2023-11-14T22:13:20.000Z,"Original prompt",tag1,No,,,',
      ]);
      const count1 = await historyService.importHistory(csv1, 'csv');
      expect(count1).toBe(1);

      // Try to import duplicate
      const csv2 = createCSV([
        'test-1,proj-1,1700000000000,2023-11-14T22:13:20.000Z,"Different prompt",tag2,Yes,,,',
      ]);
      const count2 = await historyService.importHistory(csv2, 'csv');
      expect(count2).toBe(0);

      // Original entry should be unchanged
      const entry = await historyService.getEntry('test-1');
      expect(entry).not.toBeNull();
      expect(entry!.prompt).toBe('Original prompt');
      expect(entry!.tags).toEqual(['tag1']);
      expect(entry!.favorite).toBe(false);
    });

    it('should import only new entries when some already exist', async () => {
      // First import
      const csv1 = createCSV([
        'test-1,proj-1,1700000000000,2023-11-14T22:13:20.000Z,"Entry 1",tag1,No,,,',
        'test-2,proj-1,1700000001000,2023-11-14T22:13:21.000Z,"Entry 2",tag2,No,,,',
      ]);
      await historyService.importHistory(csv1, 'csv');

      // Second import with one duplicate and two new entries
      const csv2 = createCSV([
        'test-2,proj-1,1700000001000,2023-11-14T22:13:21.000Z,"Entry 2 duplicate",tag2,No,,,',
        'test-3,proj-1,1700000002000,2023-11-14T22:13:22.000Z,"Entry 3",tag3,No,,,',
        'test-4,proj-1,1700000003000,2023-11-14T22:13:23.000Z,"Entry 4",tag4,No,,,',
      ]);
      const count = await historyService.importHistory(csv2, 'csv');

      expect(count).toBe(2); // Only test-3 and test-4 imported
      const entries = await historyService.getEntries();
      expect(entries.length).toBe(4); // Total of 4 unique entries
      expect(entries.map((e) => e.id).sort()).toEqual(['test-1', 'test-2', 'test-3', 'test-4']);
    });

    it('should detect duplicates correctly using full key', async () => {
      // Add an entry directly
      await historyService.addEntry('Manual entry', mockParams, mockMetadata);
      const manualEntries = await historyService.getEntries();
      const manualId = manualEntries[0].id;

      // Try to import with same ID
      const csv = createCSV([
        `${manualId},proj-1,1700000000000,2023-11-14T22:13:20.000Z,"CSV entry",tag,No,,,`,
        'new-id,proj-1,1700000001000,2023-11-14T22:13:21.000Z,"New entry",tag,No,,,',
      ]);
      const count = await historyService.importHistory(csv, 'csv');

      expect(count).toBe(1); // Only the new-id entry imported
      const entry = await historyService.getEntry(manualId);
      expect(entry!.prompt).toBe('Manual entry'); // Original unchanged
    });

    // Edge Cases
    it('should handle empty CSV string', async () => {
      const count = await historyService.importHistory('', 'csv');
      expect(count).toBe(0);
    });

    it('should handle header-only CSV (no data rows)', async () => {
      const csv = 'ID,Project ID,Timestamp,Date,Prompt,Tags,Favorite,Style,Camera,Model';
      const count = await historyService.importHistory(csv, 'csv');
      expect(count).toBe(0);
    });

    it('should skip rows with malformed timestamps', async () => {
      const csv = createCSV([
        'test-1,proj-1,not-a-number,2023-11-14T22:13:20.000Z,"Valid prompt",tag,No,,,',
        'test-2,proj-1,1700000000000,2023-11-14T22:13:20.000Z,"Valid prompt",tag,No,,,',
        'test-3,proj-1,invalid,2023-11-14T22:13:21.000Z,"Another valid prompt",tag,No,,,',
      ]);

      const count = await historyService.importHistory(csv, 'csv');

      expect(count).toBe(1); // Only test-2 should be imported
      const entry = await historyService.getEntry('test-2');
      expect(entry).not.toBeNull();
      expect(entry!.prompt).toBe('Valid prompt');

      const invalidEntry1 = await historyService.getEntry('test-1');
      const invalidEntry3 = await historyService.getEntry('test-3');
      expect(invalidEntry1).toBeNull();
      expect(invalidEntry3).toBeNull();
    });

    it('should skip rows with insufficient fields', async () => {
      const csv = createCSV([
        'test-1,proj-1,1700000000000', // Only 3 fields (needs at least 7)
        'test-2,proj-1,1700000000000,2023-11-14T22:13:20.000Z,"Valid prompt",tag,No,,,', // Valid
        'test-3,proj-1', // Only 2 fields
      ]);

      const count = await historyService.importHistory(csv, 'csv');

      expect(count).toBe(1); // Only test-2 imported
      const entry = await historyService.getEntry('test-2');
      expect(entry).not.toBeNull();

      const invalidEntry1 = await historyService.getEntry('test-1');
      const invalidEntry3 = await historyService.getEntry('test-3');
      expect(invalidEntry1).toBeNull();
      expect(invalidEntry3).toBeNull();
    });
  });
});
