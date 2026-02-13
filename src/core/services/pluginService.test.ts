import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pluginService } from './pluginService';
import { PluginManifest, PluginContext } from '../types/plugin';

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
  (pluginService as any).plugins.clear();
  (pluginService as any).studios.clear();
  (pluginService as any).permissionCache.clear();
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

  const mockInstance = {
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
    } catch (e) {
      // Expected error
    }

    const plugin = pluginService.get('forbidden-plugin');
    expect(plugin?.state).toBe('error');
    expect(plugin?.error?.message).toContain('does not have ui:studio permission');
  });
});
