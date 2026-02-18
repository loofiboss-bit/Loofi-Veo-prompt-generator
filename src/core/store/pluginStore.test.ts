import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePluginStore } from './pluginStore';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  createStore: vi.fn(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { mockPluginService } = vi.hoisted(() => ({
  mockPluginService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue({ success: true }),
    unload: vi.fn().mockResolvedValue(undefined),
    activate: vi.fn().mockResolvedValue(undefined),
    deactivate: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('@core/services/pluginService', () => ({
  pluginService: mockPluginService,
}));

const makePlugin = (id: string) =>
  ({
    manifest: {
      id,
      name: `Plugin ${id}`,
      version: '1.0.0',
      description: 'Test plugin',
      main: 'index.js',
      permissions: [],
    },
    status: 'active' as const,
    loadedAt: Date.now(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

beforeEach(() => {
  vi.clearAllMocks();
  usePluginStore.setState({
    plugins: [],
    loading: false,
    error: null,
    selectedPlugin: null,
  });
});

describe('usePluginStore', () => {
  it('has correct initial state', () => {
    const state = usePluginStore.getState();
    expect(state.plugins).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.selectedPlugin).toBeNull();
  });

  describe('initialize', () => {
    it('calls pluginService.initialize and refreshes plugins', async () => {
      const plugin = makePlugin('p1');
      mockPluginService.getAll.mockReturnValue([plugin]);
      await usePluginStore.getState().initialize();
      expect(mockPluginService.initialize).toHaveBeenCalledOnce();
      expect(usePluginStore.getState().plugins).toHaveLength(1);
      expect(usePluginStore.getState().loading).toBe(false);
    });

    it('sets error on initialize failure', async () => {
      mockPluginService.initialize.mockRejectedValueOnce(new Error('init failed'));
      await usePluginStore.getState().initialize();
      expect(usePluginStore.getState().error).toBe('init failed');
      expect(usePluginStore.getState().loading).toBe(false);
    });
  });

  describe('loadPlugin', () => {
    it('loads a plugin and refreshes list', async () => {
      const plugin = makePlugin('p1');
      mockPluginService.getAll.mockReturnValue([plugin]);
      await usePluginStore.getState().loadPlugin(plugin.manifest);
      expect(mockPluginService.load).toHaveBeenCalledWith(plugin.manifest);
      expect(usePluginStore.getState().plugins).toHaveLength(1);
    });

    it('sets error and rethrows when load fails', async () => {
      mockPluginService.load.mockResolvedValueOnce({
        success: false,
        error: new Error('load err'),
      });
      await expect(
        usePluginStore.getState().loadPlugin(makePlugin('x').manifest),
      ).rejects.toBeInstanceOf(Error);
      expect(usePluginStore.getState().error).toBeTruthy();
    });
  });

  describe('unloadPlugin', () => {
    it('unloads a plugin and refreshes list', async () => {
      mockPluginService.getAll.mockReturnValue([]);
      await usePluginStore.getState().unloadPlugin('p1');
      expect(mockPluginService.unload).toHaveBeenCalledWith('p1');
    });

    it('clears selectedPlugin when unloading the selected one', async () => {
      const plugin = makePlugin('p1');
      usePluginStore.setState({ selectedPlugin: plugin });
      mockPluginService.getAll.mockReturnValue([]);
      await usePluginStore.getState().unloadPlugin('p1');
      expect(usePluginStore.getState().selectedPlugin).toBeNull();
    });

    it('sets error and rethrows on failure', async () => {
      mockPluginService.unload.mockRejectedValueOnce(new Error('unload err'));
      await expect(usePluginStore.getState().unloadPlugin('p1')).rejects.toThrow('unload err');
      expect(usePluginStore.getState().error).toBe('unload err');
    });
  });

  describe('activatePlugin / deactivatePlugin', () => {
    it('activates a plugin', async () => {
      await usePluginStore.getState().activatePlugin('p1');
      expect(mockPluginService.activate).toHaveBeenCalledWith('p1');
    });

    it('sets error on activate failure', async () => {
      mockPluginService.activate.mockRejectedValueOnce(new Error('activate err'));
      await expect(usePluginStore.getState().activatePlugin('p1')).rejects.toThrow();
      expect(usePluginStore.getState().error).toBe('activate err');
    });

    it('deactivates a plugin', async () => {
      await usePluginStore.getState().deactivatePlugin('p1');
      expect(mockPluginService.deactivate).toHaveBeenCalledWith('p1');
    });

    it('sets error on deactivate failure', async () => {
      mockPluginService.deactivate.mockRejectedValueOnce(new Error('deactivate err'));
      await expect(usePluginStore.getState().deactivatePlugin('p1')).rejects.toThrow();
      expect(usePluginStore.getState().error).toBe('deactivate err');
    });
  });

  describe('selectPlugin', () => {
    it('sets selectedPlugin', () => {
      const plugin = makePlugin('p1');
      usePluginStore.getState().selectPlugin(plugin);
      expect(usePluginStore.getState().selectedPlugin?.manifest.id).toBe('p1');
    });

    it('clears selectedPlugin when called with null', () => {
      usePluginStore.setState({ selectedPlugin: makePlugin('p1') });
      usePluginStore.getState().selectPlugin(null);
      expect(usePluginStore.getState().selectedPlugin).toBeNull();
    });
  });

  describe('refreshPlugins', () => {
    it('syncs plugins list from service', () => {
      const plugin = makePlugin('p2');
      mockPluginService.getAll.mockReturnValue([plugin]);
      usePluginStore.getState().refreshPlugins();
      expect(usePluginStore.getState().plugins).toHaveLength(1);
      expect(usePluginStore.getState().plugins[0].manifest.id).toBe('p2');
    });
  });
});
