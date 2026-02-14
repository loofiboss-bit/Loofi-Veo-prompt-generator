import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  createStore: vi.fn(),
}));

// Mock loggerService
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock workspaceService
const mockWorkspaceService = {
  getAllWorkspaces: vi.fn().mockResolvedValue([]),
  migrateOrphanProjects: vi.fn().mockResolvedValue(undefined),
};
vi.mock('./workspaceService', () => ({
  workspaceService: mockWorkspaceService,
}));

// Mock projectService
const mockProjectService = {
  getAllProjects: vi.fn().mockResolvedValue([]),
};
vi.mock('./projectService', () => ({
  projectService: mockProjectService,
}));

// Mock pluginService
const mockPluginService = {
  getAll: vi.fn().mockReturnValue([]),
};
vi.mock('./pluginService', () => ({
  pluginService: mockPluginService,
}));

// Mock pluginCrypto
vi.mock('@core/utils/pluginCrypto', () => ({
  determinePluginTrustLevel: vi.fn().mockResolvedValue('unsigned'),
}));

import { dataMigrationService } from './dataMigrationService';

beforeEach(() => {
  mockStore.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DataMigrationService', () => {
  // ─── Version Tracking ────────────────────────────────────────────

  describe('version tracking', () => {
    it('should return 0 when no migration has been run', async () => {
      const version = await dataMigrationService.getStoredVersion();
      expect(version).toBe(0);
    });

    it('should report migration is needed when version is 0', async () => {
      const needs = await dataMigrationService.needsMigration();
      expect(needs).toBe(true);
    });

    it('should return current migration version', () => {
      const version = dataMigrationService.getCurrentVersion();
      expect(version).toBeGreaterThan(0);
    });
  });

  // ─── Running Migrations ──────────────────────────────────────────

  describe('runPendingMigrations', () => {
    it('should run migrations and update stored version', async () => {
      const result = await dataMigrationService.runPendingMigrations();

      expect(result.ran).toContain(1);
      expect(result.failed).toHaveLength(0);
      expect(result.fromVersion).toBe(0);
      expect(result.toVersion).toBeGreaterThan(0);
    });

    it('should be idempotent — running twice does not re-run', async () => {
      await dataMigrationService.runPendingMigrations();
      const result = await dataMigrationService.runPendingMigrations();

      expect(result.ran).toHaveLength(0);
    });

    it('should not need migration after running', async () => {
      await dataMigrationService.runPendingMigrations();
      const needs = await dataMigrationService.needsMigration();
      expect(needs).toBe(false);
    });
  });

  // ─── Orphan Project Migration ────────────────────────────────────

  describe('orphan project migration', () => {
    it('should migrate orphan projects to default workspace', async () => {
      mockProjectService.getAllProjects.mockResolvedValueOnce([{ id: 'proj_1' }, { id: 'proj_2' }]);
      mockWorkspaceService.getAllWorkspaces.mockResolvedValueOnce([
        { id: 'default', projectIds: [] },
      ]);

      // Reset stored version so migration will run
      mockStore.delete('data_migration_version');

      await dataMigrationService.runPendingMigrations();

      expect(mockWorkspaceService.migrateOrphanProjects).toHaveBeenCalledWith(['proj_1', 'proj_2']);
    });

    it('should not migrate projects already in a workspace', async () => {
      mockProjectService.getAllProjects.mockResolvedValueOnce([{ id: 'proj_1' }, { id: 'proj_2' }]);
      mockWorkspaceService.getAllWorkspaces.mockResolvedValueOnce([
        { id: 'default', projectIds: ['proj_1', 'proj_2'] },
      ]);

      mockStore.delete('data_migration_version');

      await dataMigrationService.runPendingMigrations();

      expect(mockWorkspaceService.migrateOrphanProjects).not.toHaveBeenCalled();
    });
  });

  // ─── Plugin Trust Backfill ────────────────────────────────────────

  describe('plugin trust backfill', () => {
    it('should backfill trust levels for plugins without one', async () => {
      const pluginWithoutTrust = {
        manifest: {
          id: 'test-plugin',
          name: 'Test',
          version: '1.0.0',
          main: 'index.js',
          permissions: [],
        },
        state: 'active',
        health: { status: 'healthy', crashCount: 0 },
        trustLevel: undefined,
      };
      mockPluginService.getAll.mockReturnValueOnce([pluginWithoutTrust]);

      mockStore.delete('data_migration_version');

      await dataMigrationService.runPendingMigrations();

      // Trust level should have been set
      expect(pluginWithoutTrust.trustLevel).toBe('unsigned');
    });

    it('should not change trust level for plugins that already have one', async () => {
      const pluginWithTrust = {
        manifest: {
          id: 'trusted-plugin',
          name: 'Trusted',
          version: '1.0.0',
          main: 'index.js',
          permissions: [],
        },
        state: 'active',
        health: { status: 'healthy', crashCount: 0 },
        trustLevel: 'trusted',
      };
      mockPluginService.getAll.mockReturnValueOnce([pluginWithTrust]);

      mockStore.delete('data_migration_version');

      await dataMigrationService.runPendingMigrations();

      expect(pluginWithTrust.trustLevel).toBe('trusted');
    });
  });
});
