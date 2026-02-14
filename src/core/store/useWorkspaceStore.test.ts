import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWorkspaceStore } from './useWorkspaceStore';

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
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock workspaceService
const mockWorkspaceService = {
  initialize: vi.fn().mockResolvedValue(undefined),
  getAllWorkspaces: vi.fn().mockResolvedValue([]),
  getCurrentWorkspaceId: vi.fn().mockResolvedValue('default'),
  createWorkspace: vi.fn(),
  updateWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  setCurrentWorkspace: vi.fn(),
  searchWorkspaces: vi.fn().mockResolvedValue([]),
  addProjectToWorkspace: vi.fn().mockResolvedValue(true),
  removeProjectFromWorkspace: vi.fn().mockResolvedValue(true),
  updateWorkspaceSettings: vi.fn().mockResolvedValue(true),
  resetWorkspaceSettings: vi.fn().mockResolvedValue(true),
};
vi.mock('@core/services/workspaceService', () => ({
  workspaceService: mockWorkspaceService,
}));

beforeEach(() => {
  mockStore.clear();
  vi.clearAllMocks();
  // Reset store state
  useWorkspaceStore.setState({
    currentWorkspaceId: null,
    workspaces: [],
    isLoading: false,
    error: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useWorkspaceStore', () => {
  // ─── Initialize ───────────────────────────────────────────────────

  describe('initialize', () => {
    it('should initialize workspace store', async () => {
      const defaultWorkspace = {
        id: 'default',
        name: 'Default Workspace',
        projectIds: [],
        settings: {},
        metadata: { projectCount: 0, lastActivity: Date.now() },
      };
      mockWorkspaceService.getAllWorkspaces.mockResolvedValueOnce([defaultWorkspace]);
      mockWorkspaceService.getCurrentWorkspaceId.mockResolvedValueOnce('default');

      await useWorkspaceStore.getState().initialize();

      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toHaveLength(1);
      expect(state.currentWorkspaceId).toBe('default');
      expect(state.isLoading).toBe(false);
    });

    it('should set error on initialization failure', async () => {
      mockWorkspaceService.initialize.mockRejectedValueOnce(new Error('Init failed'));

      await useWorkspaceStore.getState().initialize();

      const state = useWorkspaceStore.getState();
      expect(state.error).toBe('Failed to initialize workspaces');
      expect(state.isLoading).toBe(false);
    });
  });

  // ─── Create Workspace ─────────────────────────────────────────────

  describe('createWorkspace', () => {
    it('should create a workspace and refresh list', async () => {
      const newWs = { id: 'ws_1', name: 'Test' };
      mockWorkspaceService.createWorkspace.mockResolvedValueOnce(newWs);
      mockWorkspaceService.getAllWorkspaces.mockResolvedValueOnce([newWs]);

      const result = await useWorkspaceStore.getState().createWorkspace({ name: 'Test' });

      expect(result).toEqual(newWs);
      expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
    });

    it('should set error on creation failure', async () => {
      mockWorkspaceService.createWorkspace.mockRejectedValueOnce(new Error('Create failed'));

      const result = await useWorkspaceStore.getState().createWorkspace({ name: 'Fail' });

      expect(result).toBeNull();
      expect(useWorkspaceStore.getState().error).toBe('Failed to create workspace');
    });
  });

  // ─── Delete Workspace ─────────────────────────────────────────────

  describe('deleteWorkspace', () => {
    it('should delete workspace and update current if needed', async () => {
      mockWorkspaceService.deleteWorkspace.mockResolvedValueOnce(true);
      mockWorkspaceService.getAllWorkspaces.mockResolvedValueOnce([]);
      mockWorkspaceService.getCurrentWorkspaceId.mockResolvedValueOnce('default');

      const result = await useWorkspaceStore.getState().deleteWorkspace('ws_1');

      expect(result).toBe(true);
      expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('default');
    });
  });

  // ─── Set Current Workspace ─────────────────────────────────────────

  describe('setCurrentWorkspace', () => {
    it('should set the current workspace', async () => {
      mockWorkspaceService.setCurrentWorkspace.mockResolvedValueOnce(true);

      const result = await useWorkspaceStore.getState().setCurrentWorkspace('ws_1');

      expect(result).toBe(true);
      expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('ws_1');
    });

    it('should handle failure gracefully', async () => {
      mockWorkspaceService.setCurrentWorkspace.mockResolvedValueOnce(false);

      const result = await useWorkspaceStore.getState().setCurrentWorkspace('nonexistent');

      expect(result).toBe(false);
      expect(useWorkspaceStore.getState().error).toBe('Failed to set current workspace');
    });
  });

  // ─── Project Association ───────────────────────────────────────────

  describe('project association', () => {
    it('should add project to workspace', async () => {
      mockWorkspaceService.addProjectToWorkspace.mockResolvedValueOnce(true);
      mockWorkspaceService.getAllWorkspaces.mockResolvedValueOnce([]);

      const result = await useWorkspaceStore.getState().addProjectToWorkspace('default', 'proj_1');
      expect(result).toBe(true);
    });

    it('should remove project from workspace', async () => {
      mockWorkspaceService.removeProjectFromWorkspace.mockResolvedValueOnce(true);
      mockWorkspaceService.getAllWorkspaces.mockResolvedValueOnce([]);

      const result = await useWorkspaceStore
        .getState()
        .removeProjectFromWorkspace('default', 'proj_1');
      expect(result).toBe(true);
    });
  });

  // ─── Settings ─────────────────────────────────────────────────────

  describe('workspace settings', () => {
    it('should update workspace settings', async () => {
      mockWorkspaceService.updateWorkspaceSettings.mockResolvedValueOnce(true);
      mockWorkspaceService.getAllWorkspaces.mockResolvedValueOnce([]);

      const result = await useWorkspaceStore
        .getState()
        .updateWorkspaceSettings('default', { autoSave: false });
      expect(result).toBe(true);
    });

    it('should reset workspace settings', async () => {
      mockWorkspaceService.resetWorkspaceSettings.mockResolvedValueOnce(true);
      mockWorkspaceService.getAllWorkspaces.mockResolvedValueOnce([]);

      const result = await useWorkspaceStore.getState().resetWorkspaceSettings('default');
      expect(result).toBe(true);
    });
  });
});
