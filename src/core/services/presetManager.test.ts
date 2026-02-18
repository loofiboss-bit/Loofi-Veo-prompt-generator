/**
 * PresetManager Unit Tests
 * Tests for preset management operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval
let mockStore = new Map<string, unknown>();

const { mockGet, mockSet, mockDel, mockKeys } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
  mockDel: vi.fn(),
  mockKeys: vi.fn(),
}));

vi.mock('idb-keyval', () => ({
  get: mockGet,
  set: mockSet,
  del: mockDel,
  keys: mockKeys,
}));

// Mock loggerService
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from './loggerService';
import {
  getAllPresets,
  getPresetsByCategory,
  getPreset,
  savePreset,
  deletePreset,
  addToFavorites,
  removeFromFavorites,
  getFavoritePresets,
  trackRecentPreset,
  getRecentPresets,
  exportPresets,
  importPresets,
  createPreset,
  type Preset,
  type PresetCategory,
} from './presetManager';

describe('presetManager', () => {
  beforeEach(() => {
    mockStore = new Map<string, unknown>();
    mockGet.mockClear();
    mockSet.mockClear();
    mockDel.mockClear();
    mockKeys.mockClear();
    mockGet.mockImplementation((key: string) => Promise.resolve(mockStore.get(key)));
    mockSet.mockImplementation((key: string, value: unknown) => {
      mockStore.set(key, value);
      return Promise.resolve();
    });
    mockDel.mockImplementation((key: string) => {
      mockStore.delete(key);
      return Promise.resolve();
    });
    mockKeys.mockImplementation(() => Promise.resolve([...mockStore.keys()]));
    vi.clearAllMocks();
  });

  describe('getAllPresets', () => {
    it('should return built-in presets when no user presets exist', async () => {
      const presets = await getAllPresets();

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.every((p) => p.isBuiltIn)).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Loaded'));
    });

    it('should combine built-in and user presets', async () => {
      const userPreset: Preset = {
        id: 'user-preset-1',
        name: 'User Preset',
        description: 'Test',
        category: 'camera',
        params: { test: 'value' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockStore.set('presets-list', ['user-preset-1']);
      mockStore.set('preset-user-preset-1', userPreset);

      const presets = await getAllPresets();

      expect(presets.length).toBeGreaterThan(1);
      expect(presets.some((p) => p.id === 'user-preset-1')).toBe(true);
      expect(presets.some((p) => p.isBuiltIn)).toBe(true);
    });

    it('should sort presets by updatedAt descending', async () => {
      const now = Date.now();
      const older: Preset = {
        id: 'preset-1',
        name: 'Older',
        description: 'Test',
        category: 'camera',
        params: {},
        createdAt: now - 2000,
        updatedAt: now - 2000,
      };
      const newer: Preset = {
        id: 'preset-2',
        name: 'Newer',
        description: 'Test',
        category: 'camera',
        params: {},
        createdAt: now - 1000,
        updatedAt: now - 1000,
      };

      mockStore.set('presets-list', ['preset-1', 'preset-2']);
      mockStore.set('preset-preset-1', older);
      mockStore.set('preset-preset-2', newer);

      const presets = await getAllPresets();

      const userPresets = presets.filter((p) => !p.isBuiltIn);
      expect(userPresets[0].id).toBe('preset-2');
      expect(userPresets[1].id).toBe('preset-1');
    });

    it('should return only built-in presets on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Storage error'));

      const presets = await getAllPresets();

      expect(presets.every((p) => p.isBuiltIn)).toBe(true);
      expect(logger.error).toHaveBeenCalledWith('Failed to load presets', expect.any(Error));
    });
  });

  describe('getPresetsByCategory', () => {
    it('should filter presets by category', async () => {
      const presets = await getPresetsByCategory('camera');

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.every((p) => p.category === 'camera')).toBe(true);
    });

    it('should return camera presets even on storage error', async () => {
      // getAllPresets has fallback to built-in presets on error
      mockGet.mockRejectedValueOnce(new Error('Error'));

      const presets = await getPresetsByCategory('camera');

      // Should return built-in camera presets (via getAllPresets fallback)
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.every((p) => p.category === 'camera')).toBe(true);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getPreset', () => {
    it('should return built-in preset by ID', async () => {
      const preset = await getPreset('camera-cinematic');

      expect(preset).not.toBeNull();
      expect(preset?.name).toBe('Cinematic Camera');
      expect(preset?.isBuiltIn).toBe(true);
    });

    it('should return user preset by ID', async () => {
      const userPreset: Preset = {
        id: 'user-1',
        name: 'User Preset',
        description: 'Test',
        category: 'camera',
        params: { test: 'value' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockStore.set('preset-user-1', userPreset);

      const preset = await getPreset('user-1');

      expect(preset).toEqual(userPreset);
    });

    it('should return null for non-existent preset', async () => {
      const preset = await getPreset('non-existent');

      expect(preset).toBeNull();
    });

    it('should return null on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Error'));

      const preset = await getPreset('test');

      expect(preset).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('savePreset', () => {
    it('should save new preset with timestamps', async () => {
      const preset = {
        id: 'new-preset',
        name: 'New Preset',
        description: 'Test',
        category: 'camera' as PresetCategory,
        params: { test: 'value' },
      };

      const result = await savePreset(preset);

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockSet).toHaveBeenCalledWith('preset-new-preset', expect.objectContaining(preset));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Preset saved'));
    });

    it('should update preset list for new preset', async () => {
      const preset = {
        id: 'new-preset',
        name: 'New Preset',
        description: 'Test',
        category: 'camera' as PresetCategory,
        params: {},
      };

      await savePreset(preset);

      expect(mockSet).toHaveBeenCalledWith('presets-list', ['new-preset']);
    });

    it('should preserve createdAt for existing preset', async () => {
      const createdAt = Date.now() - 10000;
      const existing: Preset = {
        id: 'existing',
        name: 'Existing',
        description: 'Test',
        category: 'camera',
        params: {},
        createdAt,
        updatedAt: createdAt,
      };

      mockStore.set('preset-existing', existing);

      const updated = await savePreset({
        id: 'existing',
        name: 'Updated Name',
        description: 'Test',
        category: 'camera',
        params: {},
      });

      expect(updated.createdAt).toBe(createdAt);
      expect(updated.updatedAt).toBeGreaterThan(createdAt);
    });

    it('should throw on error', async () => {
      mockSet.mockRejectedValueOnce(new Error('Storage error'));

      const preset = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: 'camera' as PresetCategory,
        params: {},
      };

      await expect(savePreset(preset)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deletePreset', () => {
    it('should delete user preset', async () => {
      mockStore.set('presets-list', ['preset-1']);
      mockStore.set('preset-preset-1', { id: 'preset-1' });

      await deletePreset('preset-1');

      expect(mockDel).toHaveBeenCalledWith('preset-preset-1');
      expect(mockSet).toHaveBeenCalledWith('presets-list', []);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('deleted'));
    });

    it('should throw error when deleting built-in preset', async () => {
      await expect(deletePreset('camera-cinematic')).rejects.toThrow(
        'Cannot delete built-in preset',
      );
    });

    it('should remove from favorites when deleted', async () => {
      mockStore.set('presets-list', ['preset-1']);
      mockStore.set('preset-favorites', ['preset-1']);

      await deletePreset('preset-1');

      expect(mockSet).toHaveBeenCalledWith('preset-favorites', []);
    });

    it('should throw on error', async () => {
      mockDel.mockRejectedValueOnce(new Error('Delete error'));

      await expect(deletePreset('preset-1')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('addToFavorites', () => {
    it('should add preset to favorites', async () => {
      await addToFavorites('preset-1');

      expect(mockSet).toHaveBeenCalledWith('preset-favorites', ['preset-1']);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Added'));
    });

    it('should not duplicate favorites', async () => {
      mockStore.set('preset-favorites', ['preset-1']);

      await addToFavorites('preset-1');

      expect(mockSet).not.toHaveBeenCalledWith('preset-favorites', ['preset-1', 'preset-1']);
    });

    it('should throw on error', async () => {
      mockSet.mockRejectedValueOnce(new Error('Error'));

      await expect(addToFavorites('preset-1')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('removeFromFavorites', () => {
    it('should remove preset from favorites', async () => {
      mockStore.set('preset-favorites', ['preset-1', 'preset-2']);

      await removeFromFavorites('preset-1');

      expect(mockSet).toHaveBeenCalledWith('preset-favorites', ['preset-2']);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Removed'));
    });

    it('should throw on error', async () => {
      mockSet.mockRejectedValueOnce(new Error('Error'));

      await expect(removeFromFavorites('preset-1')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getFavoritePresets', () => {
    it('should return favorite presets', async () => {
      const preset: Preset = {
        id: 'preset-1',
        name: 'Preset 1',
        description: 'Test',
        category: 'camera',
        params: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockStore.set('preset-favorites', ['preset-1', 'camera-cinematic']);
      mockStore.set('preset-preset-1', preset);

      const favorites = await getFavoritePresets();

      expect(favorites.length).toBe(2);
      expect(favorites.some((p) => p.id === 'preset-1')).toBe(true);
      expect(favorites.some((p) => p.id === 'camera-cinematic')).toBe(true);
    });

    it('should skip missing presets', async () => {
      mockStore.set('preset-favorites', ['non-existent', 'camera-cinematic']);

      const favorites = await getFavoritePresets();

      expect(favorites.length).toBe(1);
      expect(favorites[0].id).toBe('camera-cinematic');
    });

    it('should return empty array on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Error'));

      const favorites = await getFavoritePresets();

      expect(favorites).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('trackRecentPreset', () => {
    it('should add preset to recent list', async () => {
      await trackRecentPreset('preset-1');

      expect(mockSet).toHaveBeenCalledWith('preset-recent', ['preset-1']);
    });

    it('should move existing preset to front', async () => {
      mockStore.set('preset-recent', ['preset-2', 'preset-1', 'preset-3']);

      await trackRecentPreset('preset-1');

      expect(mockSet).toHaveBeenCalledWith('preset-recent', ['preset-1', 'preset-2', 'preset-3']);
    });

    it('should limit recent list to 10 items', async () => {
      const recent = Array.from({ length: 10 }, (_, i) => `preset-${i}`);
      mockStore.set('preset-recent', recent);

      await trackRecentPreset('preset-new');

      expect(mockSet).toHaveBeenCalledWith('preset-recent', expect.arrayContaining(['preset-new']));

      const saved = mockSet.mock.calls.find((call) => call[0] === 'preset-recent')?.[1];
      expect((saved as string[]).length).toBe(10);
    });

    it('should not throw on error', async () => {
      mockSet.mockRejectedValueOnce(new Error('Error'));

      await expect(trackRecentPreset('preset-1')).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getRecentPresets', () => {
    it('should return recent presets in order', async () => {
      mockStore.set('preset-recent', ['camera-action', 'camera-cinematic']);

      const recent = await getRecentPresets();

      expect(recent.length).toBe(2);
      expect(recent[0].id).toBe('camera-action');
      expect(recent[1].id).toBe('camera-cinematic');
    });

    it('should return empty array on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Error'));

      const recent = await getRecentPresets();

      expect(recent).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('exportPresets', () => {
    it('should export user presets as JSON', async () => {
      const preset: Preset = {
        id: 'user-1',
        name: 'User Preset',
        description: 'Test',
        category: 'camera',
        params: { test: 'value' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockStore.set('presets-list', ['user-1']);
      mockStore.set('preset-user-1', preset);

      const exported = await exportPresets();
      const data = JSON.parse(exported);

      expect(data.version).toBe('1.2.0');
      expect(data.exportDate).toBeDefined();
      expect(data.presets).toHaveLength(1);
      expect(data.presets[0].id).toBe('user-1');
    });

    it('should exclude built-in presets from export', async () => {
      const exported = await exportPresets();
      const data = JSON.parse(exported);

      expect(data.presets.every((p: Preset) => !p.isBuiltIn)).toBe(true);
    });

    it('should export specific presets by ID', async () => {
      const preset1: Preset = {
        id: 'user-1',
        name: 'Preset 1',
        description: 'Test',
        category: 'camera',
        params: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const preset2: Preset = {
        id: 'user-2',
        name: 'Preset 2',
        description: 'Test',
        category: 'lighting',
        params: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockStore.set('preset-user-1', preset1);
      mockStore.set('preset-user-2', preset2);

      const exported = await exportPresets(['user-1']);
      const data = JSON.parse(exported);

      expect(data.presets).toHaveLength(1);
      expect(data.presets[0].id).toBe('user-1');
    });

    it('should handle errors gracefully', async () => {
      // exportPresets catches errors in getAllPresets which returns built-in presets
      // So even on error, it returns empty array successfully (built-ins are filtered out)
      mockGet.mockRejectedValueOnce(new Error('Error'));

      const result = await exportPresets();
      const data = JSON.parse(result);
      expect(data.presets).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('importPresets', () => {
    it('should import presets from JSON', async () => {
      const importData = {
        version: '1.2.0',
        exportDate: new Date().toISOString(),
        presets: [
          {
            id: 'old-id',
            name: 'Imported Preset',
            description: 'Test',
            category: 'camera',
            params: { test: 'value' },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      };

      const count = await importPresets(JSON.stringify(importData));

      expect(count).toBe(1);
      expect(mockSet).toHaveBeenCalledWith(
        expect.stringContaining('preset-imported-'),
        expect.objectContaining({
          name: 'Imported Preset',
          isBuiltIn: false,
        }),
      );
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Imported 1'));
    });

    it('should assign new IDs to imported presets', async () => {
      const importData = {
        presets: [
          {
            id: 'original-id',
            name: 'Test',
            description: 'Test',
            category: 'camera',
            params: {},
          },
        ],
      };

      await importPresets(JSON.stringify(importData));

      const savedCall = vi
        .mocked(mockSet)
        .mock.calls.find((call) => (call[0] as string).startsWith('preset-imported-'));
      const savedPreset = savedCall?.[1] as Preset;

      expect(savedPreset.id).not.toBe('original-id');
      expect(savedPreset.id).toContain('imported-');
    });

    it('should throw on invalid JSON format', async () => {
      await expect(importPresets('invalid json')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw on invalid data structure', async () => {
      await expect(importPresets(JSON.stringify({ invalid: 'data' }))).rejects.toThrow(
        'Invalid preset data format',
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('createPreset', () => {
    it('should create preset with required fields', () => {
      const preset = createPreset('Test Preset', 'Description', 'camera', { test: 'value' });

      expect(preset.id).toBeDefined();
      expect(preset.name).toBe('Test Preset');
      expect(preset.description).toBe('Description');
      expect(preset.category).toBe('camera');
      expect(preset.params).toEqual({ test: 'value' });
    });

    it('should include optional fields', () => {
      const preset = createPreset('Test', 'Desc', 'camera', {}, { icon: 'star', tags: ['tag1'] });

      expect(preset.icon).toBe('star');
      expect(preset.tags).toEqual(['tag1']);
    });

    it('should generate unique IDs', () => {
      const preset1 = createPreset('P1', 'D1', 'camera', {});
      const preset2 = createPreset('P2', 'D2', 'camera', {});

      expect(preset1.id).not.toBe(preset2.id);
    });
  });
});
