import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pluginService } from './pluginService';
import { PluginManifest, PluginContext, StudioPlugin } from '../types/plugin';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn().mockResolvedValue([]),
}));

// Mock console to keep test output clean
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
  // Reset singleton state if possible, or we just rely on fresh tests
  // Since pluginService is a singleton exported as 'const', we might need to clear its internal state
  // But verify if we can access private members or if we need to add a reset method
  // For now, we'll try to use the public API to clean up
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pluginService as any).plugins.clear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pluginService as any).studios.clear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pluginService as any).permissionCache.clear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pluginService as any).listeners.clear();
});

afterEach(() => {
  console = { ...originalConsole };
  vi.clearAllMocks();
});

describe('PluginService', () => {
  const mockManifest: PluginManifest = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Tester',
    main: 'index.ts',
    permissions: ['ui:studio'],
    hooks: {
      onActivate: 'activate',
      onDeactivate: 'deactivate',
    },
  };

  const mockInstance: StudioPlugin = {
    activate: vi.fn(),
    deactivate: vi.fn(),
  };

  it('should register an internal plugin', async () => {
    await pluginService.registerInternalPlugin(mockManifest, mockInstance);

    const plugin = pluginService.get('test-plugin');
    expect(plugin).toBeDefined();
    expect(plugin?.manifest).toEqual(mockManifest);
    expect(plugin?.state).toBe('active'); // Internal plugins auto-activate
  });

  it('should register studios from active plugins', async () => {
    // Mock the implementation of activate to register a studio
    mockInstance.activate.mockImplementation(async (context: PluginContext) => {
      context.api.ui.registerStudio({
        id: 'test-studio',
        title: 'Test Studio',
        component: () => null,
      });
    });

    await pluginService.registerInternalPlugin(mockManifest, mockInstance);

    const studios = pluginService.getStudios();
    expect(studios).toHaveLength(1);
    expect(studios[0].id).toBe('test-studio');
  });

  it('should filter studios when plugin is deactivated', async () => {
    // Setup with active plugin
    mockInstance.activate.mockImplementation(async (context: PluginContext) => {
      context.api.ui.registerStudio({
        id: 'test-studio',
        title: 'Test Studio',
        component: () => null,
      });
    });

    await pluginService.registerInternalPlugin(mockManifest, mockInstance);

    // Confirm active
    expect(pluginService.getStudios()).toHaveLength(1);

    // Deactivate
    await pluginService.deactivate('test-plugin');

    // Confirm filtered out
    expect(pluginService.getStudios()).toHaveLength(0);
  });

  it('should notify listeners on state change', async () => {
    const listener = vi.fn();
    pluginService.subscribe(listener);

    await pluginService.registerInternalPlugin(mockManifest, mockInstance);
    // registerInternalPlugin calls activate, which calls registerStudio, which calls notifyListeners
    // AND activate calls notifyListeners at the end.
    expect(listener).toHaveBeenCalled();

    listener.mockClear();

    await pluginService.deactivate('test-plugin');
    expect(listener).toHaveBeenCalled();
  });

  it('should enforce permissions', async () => {
    const forbiddenManifest: PluginManifest = {
      ...mockManifest,
      id: 'forbidden-plugin',
      permissions: [], // No permissions
    };

    const forbiddenInstance = {
      activate: async (context: PluginContext) => {
        // Should throw
        context.api.ui.registerStudio({
          id: 'forbidden',
          title: 'Forbidden',
          component: () => null,
        });
      },
    };

    // We expect registerInternalPlugin to fail or log error because activate fails
    // The service catches activation errors and sets state to 'error'

    try {
      await pluginService.registerInternalPlugin(forbiddenManifest, forbiddenInstance);
    } catch (_e) {
      // Expected error
    }

    const plugin = pluginService.get('forbidden-plugin');
    expect(plugin?.state).toBe('error');
    expect(plugin?.error?.message).toContain('does not have ui:studio permission');
  });

  // ─── Health Tracking Tests ──────────────────────────────────────────

  it('should initialize plugins with healthy status', async () => {
    await pluginService.registerInternalPlugin(mockManifest, mockInstance);

    const health = pluginService.getHealth('test-plugin');
    expect(health).toBeDefined();
    expect(health!.status).toBe('healthy');
    expect(health!.crashCount).toBe(0);
  });

  it('should track crash count on reportCrash', async () => {
    await pluginService.registerInternalPlugin(mockManifest, mockInstance);

    await pluginService.reportCrash('test-plugin', new Error('render error'));

    const health = pluginService.getHealth('test-plugin');
    expect(health!.status).toBe('degraded');
    expect(health!.crashCount).toBe(1);
    expect(health!.lastError?.message).toBe('render error');
    expect(health!.lastCrashAt).toBeGreaterThan(0);
  });

  it('should auto-disable after 3 crashes', async () => {
    await pluginService.registerInternalPlugin(mockManifest, mockInstance);

    await pluginService.reportCrash('test-plugin', new Error('crash 1'));
    await pluginService.reportCrash('test-plugin', new Error('crash 2'));
    await pluginService.reportCrash('test-plugin', new Error('crash 3'));

    const health = pluginService.getHealth('test-plugin');
    expect(health!.status).toBe('crashed');
    expect(health!.crashCount).toBe(3);

    const plugin = pluginService.get('test-plugin');
    expect(plugin?.state).toBe('inactive');
  });

  it('should reset health state', async () => {
    await pluginService.registerInternalPlugin(mockManifest, mockInstance);

    await pluginService.reportCrash('test-plugin', new Error('crash'));
    expect(pluginService.getHealth('test-plugin')!.status).toBe('degraded');

    pluginService.resetHealth('test-plugin');
    const health = pluginService.getHealth('test-plugin');
    expect(health!.status).toBe('healthy');
    expect(health!.crashCount).toBe(0);
  });

  // ─── Version Compatibility Tests ────────────────────────────────────

  it('should return app version', () => {
    const version = pluginService.getAppVersion();
    expect(version).toBeTruthy();
    // Should be semver-like
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should reject incompatible engine version', async () => {
    const futureManifest: PluginManifest = {
      ...mockManifest,
      id: 'future-plugin',
      engineVersion: '99.0.0', // Way ahead of current
    };

    const result = await pluginService.load(futureManifest);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('requires app version');
  });

  it('should accept compatible engine version', async () => {
    const compatibleManifest: PluginManifest = {
      ...mockManifest,
      id: 'compatible-plugin',
      engineVersion: '1.0.0', // Well below current
    };

    const result = await pluginService.load(compatibleManifest);
    expect(result.success).toBe(true);
  });

  // ─── Lifecycle Tests ────────────────────────────────────────────────

  it('should call activate on the StudioPlugin instance', async () => {
    const instance: StudioPlugin = {
      activate: vi.fn(),
      deactivate: vi.fn(),
    };

    await pluginService.registerInternalPlugin(mockManifest, instance);
    expect(instance.activate).toHaveBeenCalledTimes(1);
    expect(instance.activate).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest: mockManifest,
        api: expect.any(Object),
        storage: expect.any(Object),
        events: expect.any(Object),
        logger: expect.any(Object),
      }),
    );
  });

  it('should call deactivate on the StudioPlugin instance', async () => {
    const instance: StudioPlugin = {
      activate: vi.fn(),
      deactivate: vi.fn(),
    };

    await pluginService.registerInternalPlugin(mockManifest, instance);
    await pluginService.deactivate('test-plugin');

    expect(instance.deactivate).toHaveBeenCalledTimes(1);
  });

  it('should call dispose on unload', async () => {
    const instance: StudioPlugin = {
      activate: vi.fn(),
      deactivate: vi.fn(),
      dispose: vi.fn(),
    };

    await pluginService.registerInternalPlugin(mockManifest, instance);
    await pluginService.unload('test-plugin');

    expect(instance.dispose).toHaveBeenCalledTimes(1);
    expect(pluginService.get('test-plugin')).toBeUndefined();
  });

  it('should handle plugins without optional lifecycle hooks', async () => {
    const minimalInstance: StudioPlugin = {
      activate: vi.fn(),
      // No deactivate or dispose
    };

    await pluginService.registerInternalPlugin(
      { ...mockManifest, id: 'minimal-plugin' },
      minimalInstance,
    );

    // Deactivate should not throw
    await expect(pluginService.deactivate('minimal-plugin')).resolves.toBeUndefined();

    // Unload should not throw
    await expect(pluginService.unload('minimal-plugin')).resolves.toBeUndefined();
  });

  // ─── Manifest Validation Tests ──────────────────────────────────────

  it('should reject manifest without id', async () => {
    const badManifest = { ...mockManifest, id: '' } as PluginManifest;
    const result = await pluginService.load(badManifest);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('missing id');
  });

  it('should reject manifest without permissions array', async () => {
    const badManifest = {
      ...mockManifest,
      id: 'bad-perms',
      permissions: null,
    } as unknown as PluginManifest;
    const result = await pluginService.load(badManifest);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('missing permissions');
  });

  it('should reject loading a duplicate plugin', async () => {
    await pluginService.load(mockManifest);
    const result2 = await pluginService.load(mockManifest);
    expect(result2.success).toBe(false);
    expect(result2.error?.message).toContain('already loaded');
  });

  // ─── Query Methods Tests ────────────────────────────────────────────

  it('getAll should return all plugins', async () => {
    await pluginService.registerInternalPlugin(mockManifest, mockInstance);
    await pluginService.registerInternalPlugin(
      { ...mockManifest, id: 'plugin-2', name: 'Plugin 2' },
      { activate: vi.fn() },
    );

    const all = pluginService.getAll();
    expect(all).toHaveLength(2);
  });

  it('getActive should return only active plugins', async () => {
    await pluginService.registerInternalPlugin(mockManifest, mockInstance);
    await pluginService.registerInternalPlugin(
      { ...mockManifest, id: 'other-plugin' },
      { activate: vi.fn() },
    );

    await pluginService.deactivate('other-plugin');

    const active = pluginService.getActive();
    expect(active).toHaveLength(1);
    expect(active[0].manifest.id).toBe('test-plugin');
  });
});
