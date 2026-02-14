import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { workspaceService } from './workspaceService';

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

// Silence console output during tests
beforeEach(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
  mockStore.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('WorkspaceService', () => {
  // ─── Initialization ──────────────────────────────────────────────

  describe('initialize', () => {
    it('should create default workspace on first run', async () => {
      await workspaceService.initialize();

      const defaultWs = await workspaceService.getWorkspace('default');
      expect(defaultWs).not.toBeNull();
      expect(defaultWs?.name).toBe('Default Workspace');
      expect(defaultWs?.id).toBe('default');
    });

    it('should be idempotent — running twice does not duplicate', async () => {
      await workspaceService.initialize();
      await workspaceService.initialize();

      const workspaces = await workspaceService.getAllWorkspaces();
      expect(workspaces).toHaveLength(1);
    });

    it('should set current workspace to default on first run', async () => {
      await workspaceService.initialize();

      const currentId = await workspaceService.getCurrentWorkspaceId();
      expect(currentId).toBe('default');
    });
  });

  // ─── CRUD ─────────────────────────────────────────────────────────

  describe('createWorkspace', () => {
    it('should create a workspace with correct fields', async () => {
      const ws = await workspaceService.createWorkspace({
        name: 'Test Workspace',
        description: 'A test workspace',
        color: '#ff0000',
        icon: 'star',
      });

      expect(ws.name).toBe('Test Workspace');
      expect(ws.description).toBe('A test workspace');
      expect(ws.projectIds).toEqual([]);
      expect(ws.metadata.color).toBe('#ff0000');
      expect(ws.metadata.icon).toBe('star');
      expect(ws.metadata.projectCount).toBe(0);
      expect(ws.createdAt).toBeGreaterThan(0);
      expect(ws.modifiedAt).toBeGreaterThan(0);
    });

    it('should generate a unique ID starting with ws_', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'Test' });
      expect(ws.id).toMatch(/^ws_/);
    });

    it('should default description to empty string', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'Test' });
      expect(ws.description).toBe('');
    });

    it('should persist the workspace in storage', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'Persisted' });
      const retrieved = await workspaceService.getWorkspace(ws.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Persisted');
    });
  });

  describe('getWorkspace', () => {
    it('should return null for non-existent workspace', async () => {
      const ws = await workspaceService.getWorkspace('nonexistent');
      expect(ws).toBeNull();
    });

    it('should return the correct workspace', async () => {
      const created = await workspaceService.createWorkspace({ name: 'Findable' });
      const found = await workspaceService.getWorkspace(created.id);
      expect(found?.name).toBe('Findable');
    });
  });

  describe('getAllWorkspaces', () => {
    it('should return empty array when no workspaces exist', async () => {
      const workspaces = await workspaceService.getAllWorkspaces();
      expect(workspaces).toEqual([]);
    });

    it('should return all workspaces sorted by modifiedAt (newest first)', async () => {
      await workspaceService.createWorkspace({ name: 'Older' });
      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));
      await workspaceService.createWorkspace({ name: 'Newer' });

      const workspaces = await workspaceService.getAllWorkspaces();
      expect(workspaces).toHaveLength(2);
      expect(workspaces[0].name).toBe('Newer');
      expect(workspaces[1].name).toBe('Older');
    });
  });

  describe('updateWorkspace', () => {
    it('should update workspace fields', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'Original' });
      const updated = await workspaceService.updateWorkspace(ws.id, { name: 'Updated' });

      expect(updated?.name).toBe('Updated');
      expect(updated?.modifiedAt).toBeGreaterThanOrEqual(ws.modifiedAt);
    });

    it('should not change id or createdAt', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'Immutable Fields' });
      const updated = await workspaceService.updateWorkspace(ws.id, {
        name: 'Changed',
      });

      expect(updated?.id).toBe(ws.id);
      expect(updated?.createdAt).toBe(ws.createdAt);
    });

    it('should return null for non-existent workspace', async () => {
      const result = await workspaceService.updateWorkspace('nonexistent', { name: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('deleteWorkspace', () => {
    it('should not allow deleting the default workspace', async () => {
      await workspaceService.initialize();
      const result = await workspaceService.deleteWorkspace('default');
      expect(result).toBe(false);

      const defaultWs = await workspaceService.getWorkspace('default');
      expect(defaultWs).not.toBeNull();
    });

    it('should return false for non-existent workspace', async () => {
      const result = await workspaceService.deleteWorkspace('nonexistent');
      expect(result).toBe(false);
    });

    it('should delete a workspace and migrate projects to default', async () => {
      await workspaceService.initialize();

      const ws = await workspaceService.createWorkspace({ name: 'Deletable' });
      // Add projects to the workspace
      await workspaceService.addProjectToWorkspace(ws.id, 'proj_1');
      await workspaceService.addProjectToWorkspace(ws.id, 'proj_2');

      const result = await workspaceService.deleteWorkspace(ws.id);
      expect(result).toBe(true);

      // Workspace should be gone
      const deleted = await workspaceService.getWorkspace(ws.id);
      expect(deleted).toBeNull();

      // Projects should be in default workspace
      const defaultWs = await workspaceService.getWorkspace('default');
      expect(defaultWs?.projectIds).toContain('proj_1');
      expect(defaultWs?.projectIds).toContain('proj_2');
    });

    it('should switch to default workspace if current was deleted', async () => {
      await workspaceService.initialize();

      const ws = await workspaceService.createWorkspace({ name: 'Current' });
      await workspaceService.setCurrentWorkspace(ws.id);
      expect(await workspaceService.getCurrentWorkspaceId()).toBe(ws.id);

      await workspaceService.deleteWorkspace(ws.id);
      expect(await workspaceService.getCurrentWorkspaceId()).toBe('default');
    });
  });

  // ─── Current Workspace ────────────────────────────────────────────

  describe('getCurrentWorkspaceId / setCurrentWorkspace', () => {
    it('should return null when no current workspace is set', async () => {
      const id = await workspaceService.getCurrentWorkspaceId();
      expect(id).toBeNull();
    });

    it('should set and get current workspace', async () => {
      await workspaceService.initialize();
      const ws = await workspaceService.createWorkspace({ name: 'Active' });

      const result = await workspaceService.setCurrentWorkspace(ws.id);
      expect(result).toBe(true);

      const currentId = await workspaceService.getCurrentWorkspaceId();
      expect(currentId).toBe(ws.id);
    });

    it('should not set a non-existent workspace as current', async () => {
      const result = await workspaceService.setCurrentWorkspace('nonexistent');
      expect(result).toBe(false);
    });
  });

  // ─── Project–Workspace Association ────────────────────────────────

  describe('addProjectToWorkspace', () => {
    it('should add a project to a workspace', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'With Projects' });
      const result = await workspaceService.addProjectToWorkspace(ws.id, 'proj_1');
      expect(result).toBe(true);

      const updated = await workspaceService.getWorkspace(ws.id);
      expect(updated?.projectIds).toContain('proj_1');
      expect(updated?.metadata.projectCount).toBe(1);
    });

    it('should not duplicate projects if already associated', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'Dedup' });
      await workspaceService.addProjectToWorkspace(ws.id, 'proj_1');
      await workspaceService.addProjectToWorkspace(ws.id, 'proj_1');

      const updated = await workspaceService.getWorkspace(ws.id);
      expect(updated?.projectIds.filter((id) => id === 'proj_1')).toHaveLength(1);
    });

    it('should return false for non-existent workspace', async () => {
      const result = await workspaceService.addProjectToWorkspace('nonexistent', 'proj_1');
      expect(result).toBe(false);
    });
  });

  describe('removeProjectFromWorkspace', () => {
    it('should remove a project from a workspace', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'Remove Test' });
      await workspaceService.addProjectToWorkspace(ws.id, 'proj_1');
      await workspaceService.addProjectToWorkspace(ws.id, 'proj_2');

      const result = await workspaceService.removeProjectFromWorkspace(ws.id, 'proj_1');
      expect(result).toBe(true);

      const updated = await workspaceService.getWorkspace(ws.id);
      expect(updated?.projectIds).not.toContain('proj_1');
      expect(updated?.projectIds).toContain('proj_2');
      expect(updated?.metadata.projectCount).toBe(1);
    });

    it('should succeed even if project is not in workspace', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'No Op' });
      const result = await workspaceService.removeProjectFromWorkspace(ws.id, 'not_there');
      expect(result).toBe(true);
    });
  });

  describe('getProjectsInWorkspace', () => {
    it('should return project IDs for a workspace', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'List Projects' });
      await workspaceService.addProjectToWorkspace(ws.id, 'proj_a');
      await workspaceService.addProjectToWorkspace(ws.id, 'proj_b');

      const ids = await workspaceService.getProjectsInWorkspace(ws.id);
      expect(ids).toEqual(['proj_a', 'proj_b']);
    });

    it('should return empty array for non-existent workspace', async () => {
      const ids = await workspaceService.getProjectsInWorkspace('nonexistent');
      expect(ids).toEqual([]);
    });
  });

  // ─── Orphan Migration ─────────────────────────────────────────────

  describe('migrateOrphanProjects', () => {
    it('should add new project IDs to default workspace', async () => {
      await workspaceService.initialize();
      await workspaceService.migrateOrphanProjects(['proj_1', 'proj_2']);

      const defaultWs = await workspaceService.getWorkspace('default');
      expect(defaultWs?.projectIds).toContain('proj_1');
      expect(defaultWs?.projectIds).toContain('proj_2');
    });

    it('should not duplicate already-present projects', async () => {
      await workspaceService.initialize();
      await workspaceService.migrateOrphanProjects(['proj_1']);
      await workspaceService.migrateOrphanProjects(['proj_1', 'proj_2']);

      const defaultWs = await workspaceService.getWorkspace('default');
      expect(defaultWs?.projectIds.filter((id) => id === 'proj_1')).toHaveLength(1);
      expect(defaultWs?.projectIds).toContain('proj_2');
    });
  });

  // ─── Settings ─────────────────────────────────────────────────────

  describe('workspace settings', () => {
    it('should return empty settings by default', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'Settings Test' });
      const settings = await workspaceService.getWorkspaceSettings(ws.id);
      expect(settings).toEqual({});
    });

    it('should update workspace settings', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'Settings Update' });
      await workspaceService.updateWorkspaceSettings(ws.id, {
        autoSave: false,
        compactMode: true,
      });

      const settings = await workspaceService.getWorkspaceSettings(ws.id);
      expect(settings.autoSave).toBe(false);
      expect(settings.compactMode).toBe(true);
    });

    it('should merge settings without overwriting unrelated fields', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'Merge' });
      await workspaceService.updateWorkspaceSettings(ws.id, { autoSave: false });
      await workspaceService.updateWorkspaceSettings(ws.id, { compactMode: true });

      const settings = await workspaceService.getWorkspaceSettings(ws.id);
      expect(settings.autoSave).toBe(false);
      expect(settings.compactMode).toBe(true);
    });

    it('should reset settings to empty', async () => {
      const ws = await workspaceService.createWorkspace({ name: 'Reset' });
      await workspaceService.updateWorkspaceSettings(ws.id, { autoSave: false });
      await workspaceService.resetWorkspaceSettings(ws.id);

      const settings = await workspaceService.getWorkspaceSettings(ws.id);
      expect(settings).toEqual({});
    });
  });

  // ─── Search ───────────────────────────────────────────────────────

  describe('searchWorkspaces', () => {
    it('should find workspaces by name', async () => {
      await workspaceService.createWorkspace({ name: 'Alpha Project' });
      await workspaceService.createWorkspace({ name: 'Beta Project' });
      await workspaceService.createWorkspace({ name: 'Gamma Suite' });

      const results = await workspaceService.searchWorkspaces('project');
      expect(results).toHaveLength(2);
    });

    it('should find workspaces by description', async () => {
      await workspaceService.createWorkspace({
        name: 'Hidden',
        description: 'Contains secret keyword',
      });

      const results = await workspaceService.searchWorkspaces('secret');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Hidden');
    });

    it('should return empty for no matches', async () => {
      await workspaceService.createWorkspace({ name: 'Nothing' });
      const results = await workspaceService.searchWorkspaces('zzzzzzz');
      expect(results).toEqual([]);
    });
  });

  // ─── Helpers ──────────────────────────────────────────────────────

  describe('getDefaultWorkspaceId', () => {
    it('should return "default"', () => {
      expect(workspaceService.getDefaultWorkspaceId()).toBe('default');
    });
  });
});
