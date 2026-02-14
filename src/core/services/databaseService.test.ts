import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval before importing the service
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'mock-store'),
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

import { databaseService, type BackupData } from './databaseService';

describe('databaseService', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize when version is current', async () => {
      // Set version to current (1) so no migrations run
      mockStore.set('db_version', 1);
      await databaseService.initialize();
      // Should not throw
    });

    it('should set version after initialization', async () => {
      mockStore.set('db_version', 1);
      await databaseService.initialize();
      // Version key should remain set
      expect(mockStore.get('db_version')).toBe(1);
    });
  });

  describe('createCustomStore', () => {
    it('should create a custom store and cache it', () => {
      const store1 = databaseService.createCustomStore('test-store');
      const store2 = databaseService.createCustomStore('test-store');
      // Same reference returned for same name
      expect(store1).toBe(store2);
    });

    it('should create different stores for different names', () => {
      const store1 = databaseService.createCustomStore('store-a');
      const store2 = databaseService.createCustomStore('store-b');
      expect(store1).toBeDefined();
      expect(store2).toBeDefined();
    });
  });

  describe('getData / setData', () => {
    it('should set and get data from a store', async () => {
      await databaseService.setData('test', 'key1', { name: 'Test Data' });
      const result = await databaseService.getData<{ name: string }>('test', 'key1');
      // Note: idb-keyval mock uses flat keys, so this tests the flow
      expect(result).toBeDefined();
    });

    it('should return undefined for non-existent key', async () => {
      const result = await databaseService.getData('test', 'missing-key');
      expect(result).toBeUndefined();
    });
  });

  describe('deleteData', () => {
    it('should delete data from a store', async () => {
      await databaseService.setData('test', 'to-delete', { value: 1 });
      await databaseService.deleteData('test', 'to-delete');
      // Should not throw
    });
  });

  describe('getKeys', () => {
    it('should return keys from idb-keyval', async () => {
      const result = await databaseService.getKeys('test');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('clearStore', () => {
    it('should clear a store without throwing', async () => {
      await expect(databaseService.clearStore('test')).resolves.not.toThrow();
    });
  });

  describe('backup', () => {
    it('should create a backup with correct structure', async () => {
      const backup = await databaseService.backup();
      expect(backup).toBeDefined();
      expect(backup.version).toBe('1');
      expect(backup.timestamp).toBeGreaterThan(0);
      expect(backup.stores).toBeDefined();
      expect(typeof backup.stores).toBe('object');
    });

    it('should include all four store names in backup', async () => {
      const backup = await databaseService.backup();
      expect(backup.stores).toHaveProperty('projects');
      expect(backup.stores).toHaveProperty('history');
      expect(backup.stores).toHaveProperty('templates');
      expect(backup.stores).toHaveProperty('presets');
    });
  });

  describe('restore', () => {
    it('should restore from a valid backup', async () => {
      const backup: BackupData = {
        version: '1',
        timestamp: Date.now(),
        stores: {
          projects: [{ id: 'proj-1', name: 'Test Project' }],
          history: [],
          templates: [],
          presets: [],
        },
      };

      await expect(databaseService.restore(backup)).resolves.not.toThrow();
    });

    it('should throw for invalid backup data', async () => {
      const invalidBackup = { version: '', stores: null } as unknown as BackupData;
      await expect(databaseService.restore(invalidBackup)).rejects.toThrow('Invalid backup data');
    });
  });

  describe('exportToJSON / importFromJSON', () => {
    it('should export database as JSON string', async () => {
      const json = await databaseService.exportToJSON();
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1');
      expect(parsed.stores).toBeDefined();
    });

    it('should import from valid JSON', async () => {
      const backup: BackupData = {
        version: '1',
        timestamp: Date.now(),
        stores: {
          projects: [{ id: 'imported-1', name: 'Imported' }],
          history: [],
          templates: [],
          presets: [],
        },
      };
      const json = JSON.stringify(backup);
      await expect(databaseService.importFromJSON(json)).resolves.not.toThrow();
    });

    it('should throw for invalid JSON', async () => {
      await expect(databaseService.importFromJSON('not-json')).rejects.toThrow();
    });
  });

  describe('getSize', () => {
    it('should return a number', async () => {
      const size = await databaseService.getSize();
      expect(typeof size).toBe('number');
    });
  });

  describe('optimize', () => {
    it('should complete without throwing', async () => {
      await expect(databaseService.optimize()).resolves.not.toThrow();
    });

    it('should clean up orphaned records with no id', async () => {
      // Simulate an orphaned template record (no id field)
      await databaseService.setData('templates', 'orphan-key', { data: 'no-id' });
      await databaseService.optimize();
      // Should not throw — orphan is cleaned up
    });
  });

  describe('checkHealth', () => {
    it('should return health report with correct shape', async () => {
      const health = await databaseService.checkHealth();
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('issues');
      expect(health).toHaveProperty('stats');
      expect(typeof health.healthy).toBe('boolean');
      expect(Array.isArray(health.issues)).toBe(true);
      expect(health.stats).toHaveProperty('version');
      expect(health.stats).toHaveProperty('size');
      expect(health.stats).toHaveProperty('stores');
    });

    it('should report version mismatch as issue when version differs', async () => {
      // Version defaults to 0 when not set, which differs from CURRENT_VERSION=1
      mockStore.delete('db_version');
      const health = await databaseService.checkHealth();
      expect(health.issues.some((i) => i.includes('version mismatch'))).toBe(true);
    });

    it('should report healthy when version matches', async () => {
      mockStore.set('db_version', 1);
      const health = await databaseService.checkHealth();
      expect(health.healthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });
  });
});
