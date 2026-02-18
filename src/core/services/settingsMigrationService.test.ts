/**
 * SettingsMigrationService Unit Tests
 * v3.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted() for ALL mock variables referenced in vi.mock() factories
const mockStore = vi.hoisted(() => new Map<string, unknown>());
const mockGet = vi.hoisted(() => vi.fn((key: string) => Promise.resolve(mockStore.get(key))));
const mockSet = vi.hoisted(() =>
  vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
);

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: mockGet,
  set: mockSet,
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

// Import after mocks
import { settingsMigrationService } from './settingsMigrationService';
import { logger } from './loggerService';

// Mock DOM APIs
const createMockDocument = () => {
  const documentElement = {
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
  };
  const bodyClassList = {
    contains: vi.fn(),
    remove: vi.fn(),
    add: vi.fn(),
  };
  return {
    documentElement: documentElement as unknown as HTMLHtmlElement,
    body: {
      classList: bodyClassList as unknown as DOMTokenList,
    } as unknown as HTMLBodyElement,
  };
};

// Mock localStorage
const createMockLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    }),
    store,
  };
};

describe('SettingsMigrationService', () => {
  let mockDocument: ReturnType<typeof createMockDocument>;
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;
  let originalDocument: typeof global.document;
  let originalLocalStorage: typeof global.localStorage;

  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();

    // Setup mock DOM
    mockDocument = createMockDocument();
    originalDocument = global.document;
    global.document = mockDocument as unknown as Document;

    // Setup mock localStorage
    mockLocalStorage = createMockLocalStorage();
    originalLocalStorage = global.localStorage;
    global.localStorage = mockLocalStorage as unknown as Storage;
  });

  afterEach(() => {
    // Restore original globals
    global.document = originalDocument;
    global.localStorage = originalLocalStorage;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = settingsMigrationService;
      const instance2 = settingsMigrationService;
      expect(instance1).toBe(instance2);
    });
  });

  describe('runMigrations', () => {
    it('should run v3.0.0 migration when not completed', async () => {
      mockStore.set('veo-settings-migrations', []);

      await settingsMigrationService.runMigrations();

      expect(logger.info).toHaveBeenCalledWith('[SettingsMigration] Running v3.0.0 migration');
      expect(logger.info).toHaveBeenCalledWith('[SettingsMigration] v3.0.0 migration complete');
      expect(mockSet).toHaveBeenCalledWith(
        'veo-settings-migrations',
        expect.arrayContaining([
          expect.objectContaining({
            version: '3.0.0',
            migratedAt: expect.any(String),
          }),
        ]),
      );
    });

    it('should skip v3.0.0 migration when already completed', async () => {
      mockStore.set('veo-settings-migrations', [
        { version: '3.0.0', migratedAt: '2024-01-01T00:00:00.000Z' },
      ]);

      await settingsMigrationService.runMigrations();

      expect(logger.info).not.toHaveBeenCalledWith('[SettingsMigration] Running v3.0.0 migration');
    });

    it('should handle empty migration records', async () => {
      mockStore.set('veo-settings-migrations', []);

      await settingsMigrationService.runMigrations();

      expect(mockSet).toHaveBeenCalledWith(
        'veo-settings-migrations',
        expect.arrayContaining([expect.objectContaining({ version: '3.0.0' })]),
      );
    });

    it('should handle missing migration records', async () => {
      // No data in mockStore

      await settingsMigrationService.runMigrations();

      expect(mockSet).toHaveBeenCalledWith(
        'veo-settings-migrations',
        expect.arrayContaining([expect.objectContaining({ version: '3.0.0' })]),
      );
    });

    it('should handle IndexedDB errors gracefully', async () => {
      mockGet.mockRejectedValueOnce(new Error('IDB error'));

      // Should not throw, just use empty array as fallback
      await expect(settingsMigrationService.runMigrations()).resolves.not.toThrow();
    });
  });

  describe('migrateV300', () => {
    it('should migrate body.light class to data-theme attribute', async () => {
      vi.mocked(mockDocument.body.classList.contains).mockReturnValueOnce(true);

      await settingsMigrationService.runMigrations();

      expect(mockDocument.body.classList.remove).toHaveBeenCalledWith('light');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
      expect(logger.info).toHaveBeenCalledWith(
        '[SettingsMigration] Migrated body.light → data-theme=light',
      );
    });

    it('should migrate body.dark-theme class to data-theme attribute', async () => {
      vi.mocked(mockDocument.body.classList.contains).mockReturnValueOnce(false); // Not light
      vi.mocked(mockDocument.body.classList.contains).mockReturnValueOnce(true); // Is dark-theme

      await settingsMigrationService.runMigrations();

      expect(mockDocument.body.classList.remove).toHaveBeenCalledWith('dark-theme');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      expect(logger.info).toHaveBeenCalledWith(
        '[SettingsMigration] Migrated body.dark-theme → data-theme=dark',
      );
    });

    it('should migrate legacy language key', async () => {
      mockLocalStorage.store.set('veo-language', 'es');

      await settingsMigrationService.runMigrations();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('veo-studio-language', 'es');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('veo-language');
      expect(logger.info).toHaveBeenCalledWith('[SettingsMigration] Migrated language key: es');
    });

    it('should not migrate language if legacy key does not exist', async () => {
      await settingsMigrationService.runMigrations();

      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(
        'veo-studio-language',
        expect.any(String),
      );
    });

    it('should not migrate language if new key already exists', async () => {
      mockLocalStorage.store.set('veo-language', 'es');
      mockLocalStorage.store.set('veo-studio-language', 'en');

      await settingsMigrationService.runMigrations();

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('veo-language');
    });

    it('should handle multiple migrations in single run', async () => {
      vi.mocked(mockDocument.body.classList.contains).mockReturnValueOnce(true); // light class
      mockLocalStorage.store.set('veo-language', 'fr');

      await settingsMigrationService.runMigrations();

      expect(mockDocument.body.classList.remove).toHaveBeenCalledWith('light');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('veo-studio-language', 'fr');
      expect(logger.info).toHaveBeenCalledTimes(4); // Running + light + language + complete
    });

    it('should not perform any DOM operations when no legacy classes exist', async () => {
      vi.mocked(mockDocument.body.classList.contains).mockReturnValue(false);

      await settingsMigrationService.runMigrations();

      expect(mockDocument.body.classList.remove).not.toHaveBeenCalled();
      expect(mockDocument.documentElement.setAttribute).not.toHaveBeenCalled();
    });
  });

  describe('markCompleted', () => {
    it('should add migration record with timestamp', async () => {
      await settingsMigrationService.runMigrations();

      const calls = mockSet.mock.calls.filter((call) => call[0] === 'veo-settings-migrations');
      expect(calls.length).toBeGreaterThan(0);

      const migrations = calls[calls.length - 1][1] as Array<{
        version: string;
        migratedAt: string;
      }>;
      const v300Migration = migrations.find((m) => m.version === '3.0.0');

      expect(v300Migration).toBeDefined();
      expect(v300Migration!.version).toBe('3.0.0');
      expect(v300Migration!.migratedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Verify the timestamp is a valid ISO string
      const migrationDate = new Date(v300Migration!.migratedAt);
      expect(migrationDate.getTime()).toBeGreaterThan(0);
    });

    it('should append to existing migrations', async () => {
      mockStore.set('veo-settings-migrations', [
        { version: '2.0.0', migratedAt: '2023-01-01T00:00:00.000Z' },
      ]);

      await settingsMigrationService.runMigrations();

      const calls = mockSet.mock.calls.filter((call) => call[0] === 'veo-settings-migrations');
      const migrations = calls[calls.length - 1][1] as Array<{
        version: string;
        migratedAt: string;
      }>;

      expect(migrations).toHaveLength(2);
      expect(migrations[0].version).toBe('2.0.0');
      expect(migrations[1].version).toBe('3.0.0');
    });
  });

  describe('getCompletedMigrations', () => {
    it('should return empty array when no migrations exist', async () => {
      mockGet.mockResolvedValueOnce(undefined);

      await settingsMigrationService.runMigrations();

      // Should not throw and should run migration
      expect(logger.info).toHaveBeenCalledWith('[SettingsMigration] Running v3.0.0 migration');
    });

    it('should return empty array on IndexedDB error', async () => {
      mockGet.mockRejectedValueOnce(new Error('IDB error'));

      await settingsMigrationService.runMigrations();

      // Should not throw and should run migration
      expect(logger.info).toHaveBeenCalledWith('[SettingsMigration] Running v3.0.0 migration');
    });

    it('should handle null values from IndexedDB', async () => {
      mockGet.mockResolvedValueOnce(null);

      await settingsMigrationService.runMigrations();

      // Should not throw and should run migration
      expect(logger.info).toHaveBeenCalledWith('[SettingsMigration] Running v3.0.0 migration');
    });
  });
});
