import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { pluginService } from './pluginService';
import { logger } from './loggerService';
import { PluginManifest, PluginContext, StudioPlugin } from '../types/plugin';
import * as pluginCrypto from '../utils/pluginCrypto';

interface PluginServiceInternals {
  plugins: { clear: () => void };
  studios: { clear: () => void };
  permissionCache: { clear: () => void };
  listeners: { clear: () => void };
}

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn().mockResolvedValue([]),
}));

vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
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
  const internals = pluginService as unknown as PluginServiceInternals;
  internals.plugins.clear();
  internals.studios.clear();
  internals.permissionCache.clear();
  internals.listeners.clear();
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

  const mockInstance: StudioPlugin & { activate: Mock; deactivate: Mock } = {
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

  it('should allow wildcard permission checks via base resource permission', async () => {
    const wildcardManifest: PluginManifest = {
      ...mockManifest,
      id: 'wildcard-plugin',
      permissions: ['storage'],
    };

    const result = await pluginService.load(wildcardManifest);
    expect(result.success).toBe(true);
    expect(pluginService.hasPermission('wildcard-plugin', 'storage:read')).toBe(true);
  });

  it('should return false when checking permission for unknown plugin cache entry', () => {
    expect(pluginService.hasPermission('missing-plugin', 'ui:studio')).toBe(false);
  });

  it('should hit warning branches for activate already-active and deactivate non-active', async () => {
    const warnSpy = vi.spyOn(logger, 'warn');
    await pluginService.registerInternalPlugin(mockManifest, mockInstance);

    await pluginService.activate('test-plugin');
    expect(warnSpy).toHaveBeenCalledWith('[PluginService] Plugin already active:', 'test-plugin');

    await pluginService.deactivate('test-plugin');
    await pluginService.deactivate('test-plugin');
    expect(warnSpy).toHaveBeenCalledWith('[PluginService] Plugin not active:', 'test-plugin');
  });

  it('should throw when unloading a plugin that does not exist', async () => {
    await expect(pluginService.unload('missing-plugin')).rejects.toThrow('not found');
  });

  it('should refresh trust level and filter plugins by trust level, including missing plugin branch', async () => {
    await pluginService.load({ ...mockManifest, id: 'trust-plugin' });

    expect(pluginService.getPluginsByTrust('unsigned').map((p) => p.manifest.id)).toContain(
      'trust-plugin',
    );
    await expect(pluginService.refreshTrustLevel('missing-plugin')).resolves.toBeUndefined();

    vi.spyOn(pluginCrypto, 'determinePluginTrustLevel').mockResolvedValue('trusted');
    await expect(pluginService.refreshTrustLevel('trust-plugin')).resolves.toBe('trusted');

    expect(pluginService.getPluginsByTrust('trusted').map((p) => p.manifest.id)).toContain(
      'trust-plugin',
    );
  });

  it('should no-op when reporting crash for unknown plugin', async () => {
    const listener = vi.fn();
    pluginService.subscribe(listener);

    await expect(
      pluginService.reportCrash('missing-plugin', new Error('boom')),
    ).resolves.toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
    expect(pluginService.getHealth('missing-plugin')).toBeUndefined();
  });

  // ─── Activate / Deactivate edge cases ──────────────────────────────

  it('should throw when activating non-existent plugin', async () => {
    await expect(pluginService.activate('non-existent')).rejects.toThrow('not found');
  });

  it('should throw when deactivating non-existent plugin', async () => {
    await expect(pluginService.deactivate('non-existent')).rejects.toThrow('not found');
  });

  // ─── Subscribe / Unsubscribe ───────────────────────────────────────

  it('should unsubscribe listener', async () => {
    const listener = vi.fn();
    const unsub = pluginService.subscribe(listener);

    await pluginService.registerInternalPlugin(mockManifest, mockInstance);
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    unsub();

    await pluginService.deactivate('test-plugin');
    expect(listener).not.toHaveBeenCalled();
  });

  // ─── Plugin Context API ────────────────────────────────────────────

  it('should provide storage API in plugin context', async () => {
    let capturedContext: PluginContext | null = null;
    const storageManifest: PluginManifest = {
      ...mockManifest,
      id: 'storage-plugin',
      permissions: ['ui:studio', 'storage'],
    };
    const storageInstance: StudioPlugin = {
      activate: vi.fn().mockImplementation(async (ctx: PluginContext) => {
        capturedContext = ctx;
      }),
    };

    await pluginService.registerInternalPlugin(storageManifest, storageInstance);

    expect(capturedContext).not.toBeNull();
    expect(capturedContext!.storage).toBeDefined();
    expect(typeof capturedContext!.storage.get).toBe('function');
    expect(typeof capturedContext!.storage.set).toBe('function');
    expect(typeof capturedContext!.storage.delete).toBe('function');
    expect(typeof capturedContext!.storage.clear).toBe('function');
    expect(typeof capturedContext!.storage.keys).toBe('function');
  });

  it('should provide events API in plugin context', async () => {
    let capturedContext: PluginContext | null = null;
    const evtInstance: StudioPlugin = {
      activate: vi.fn().mockImplementation(async (ctx: PluginContext) => {
        capturedContext = ctx;
      }),
    };

    await pluginService.registerInternalPlugin({ ...mockManifest, id: 'evt-plugin' }, evtInstance);

    expect(capturedContext).not.toBeNull();
    expect(typeof capturedContext!.events.on).toBe('function');
    expect(typeof capturedContext!.events.off).toBe('function');
    expect(typeof capturedContext!.events.emit).toBe('function');
  });

  it('should provide logger API in plugin context', async () => {
    let capturedContext: PluginContext | null = null;
    const logInstance: StudioPlugin = {
      activate: vi.fn().mockImplementation(async (ctx: PluginContext) => {
        capturedContext = ctx;
      }),
    };

    await pluginService.registerInternalPlugin({ ...mockManifest, id: 'log-plugin' }, logInstance);

    expect(capturedContext).not.toBeNull();
    expect(typeof capturedContext!.logger.info).toBe('function');
    expect(typeof capturedContext!.logger.warn).toBe('function');
    expect(typeof capturedContext!.logger.error).toBe('function');
  });

  it('should use plugin context logger that prefixes plugin id', async () => {
    let capturedContext: PluginContext | null = null;
    const logInstance2: StudioPlugin = {
      activate: vi.fn().mockImplementation(async (ctx: PluginContext) => {
        capturedContext = ctx;
      }),
    };

    await pluginService.registerInternalPlugin(
      { ...mockManifest, id: 'log2-plugin' },
      logInstance2,
    );

    const infoSpy = vi.mocked(logger.info);
    capturedContext!.logger.info('test message');
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('log2-plugin'), 'pluginService');
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('test message'), 'pluginService');
  });

  it('should use plugin context events for on/emit', async () => {
    let capturedContext: PluginContext | null = null;
    const evtManifest: PluginManifest = {
      ...mockManifest,
      id: 'evt2-plugin',
      permissions: ['ui:studio', 'events:subscribe', 'events:publish'],
    };
    const evtInstance2: StudioPlugin = {
      activate: vi.fn().mockImplementation(async (ctx: PluginContext) => {
        capturedContext = ctx;
      }),
    };

    await pluginService.registerInternalPlugin(evtManifest, evtInstance2);

    const handler = vi.fn();
    capturedContext!.events.on('test-event', handler);
    capturedContext!.events.emit('test-event', { data: 42 });

    expect(handler).toHaveBeenCalledWith({ data: 42 });

    capturedContext!.events.off('test-event', handler);
    handler.mockClear();
    capturedContext!.events.emit('test-event', { data: 99 });
    expect(handler).not.toHaveBeenCalled();
  });

  // ─── Load with no engine version ──────────────────────────────────

  it('should accept manifest without engineVersion', async () => {
    const noEngineManifest: PluginManifest = {
      ...mockManifest,
      id: 'no-engine-plugin',
    };
    // Ensure no engineVersion property
    delete (noEngineManifest as Partial<PluginManifest> & Record<string, unknown>).engineVersion;

    const result = await pluginService.load(noEngineManifest);
    expect(result.success).toBe(true);
  });

  // ─── getPluginsByTrust edge case ──────────────────────────────────

  it('returns empty when no plugins match trust level', async () => {
    const result = pluginService.getPluginsByTrust('untrusted');
    expect(result).toHaveLength(0);
  });

  // ─── Health edge cases ─────────────────────────────────────────────

  it('should record multiple errors in crash list', async () => {
    await pluginService.registerInternalPlugin(mockManifest, mockInstance);

    await pluginService.reportCrash('test-plugin', new Error('crash 1'));
    await pluginService.reportCrash('test-plugin', new Error('crash 2'));

    const health = pluginService.getHealth('test-plugin');
    expect(health!.crashCount).toBe(2);
    expect(health!.lastError?.message).toBe('crash 2');
  });

  it('resetHealth should not throw for unknown plugin', () => {
    expect(() => pluginService.resetHealth('missing-plugin')).not.toThrow();
  });

  // ─── Multiple studio registrations ────────────────────────────────

  it('should collect multiple studios from different plugins', async () => {
    const inst1: StudioPlugin = {
      activate: vi.fn().mockImplementation(async (ctx: PluginContext) => {
        ctx.api.ui.registerStudio({
          id: 'studio-a',
          title: 'Studio A',
          component: () => null,
        });
      }),
    };

    const inst2: StudioPlugin = {
      activate: vi.fn().mockImplementation(async (ctx: PluginContext) => {
        ctx.api.ui.registerStudio({
          id: 'studio-b',
          title: 'Studio B',
          component: () => null,
        });
      }),
    };

    await pluginService.registerInternalPlugin({ ...mockManifest, id: 'plug-a' }, inst1);
    await pluginService.registerInternalPlugin({ ...mockManifest, id: 'plug-b' }, inst2);

    expect(pluginService.getStudios()).toHaveLength(2);
  });
});
