/**
 * useMarketplaceStore Tests
 *
 * Verifies marketplace store behavior: initialization, install/uninstall with
 * confirmation flow, update checking, sandbox monitoring, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RegistryEntry } from '@core/types/registry';
import type { InstalledPluginBundle, PluginUpdateInfo } from '@core/types/marketplace';

// ─── Mocks ──────────────────────────────────────────────────────────

// vi.mock factories are hoisted — cannot reference top-level variables.
// Use vi.hoisted() to declare mock objects before vi.mock.
const { mockPluginInstallService, mockPluginSandboxService } = vi.hoisted(() => ({
  mockPluginInstallService: {
    getInstalledBundles: vi.fn().mockResolvedValue([]),
    installFromRegistry: vi.fn().mockResolvedValue({ success: true, durationMs: 100 }),
    uninstall: vi.fn().mockResolvedValue(undefined),
    checkForUpdates: vi.fn().mockResolvedValue([]),
    updatePlugin: vi.fn().mockResolvedValue({ success: true, durationMs: 50 }),
    onProgress: vi.fn().mockReturnValue(() => {}),
  },
  mockPluginSandboxService: {
    getAllSandboxes: vi.fn().mockReturnValue([]),
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
}));

vi.mock('@core/services/pluginInstallService', () => ({
  pluginInstallService: mockPluginInstallService,
}));

vi.mock('@core/services/pluginSandboxService', () => ({
  pluginSandboxService: mockPluginSandboxService,
}));

import { useMarketplaceStore, _resetSubscriptionsFlag } from './useMarketplaceStore';

// ─── Helpers ────────────────────────────────────────────────────────

function resetStore(): void {
  useMarketplaceStore.setState({
    view: 'browse',
    installedBundles: [],
    activeOperations: {},
    availableUpdates: [],
    isCheckingUpdates: false,
    lastUpdateCheck: null,
    pendingConfirmation: null,
    sandboxes: [],
    isLoading: false,
    error: null,
  });
}

function createMockEntry(overrides?: Partial<RegistryEntry>): RegistryEntry {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    permissions: ['ui:sidebar'],
    signature: 'sig-abc123',
    downloadUrl: 'https://example.com/plugin.zip',
    checksumSHA256: 'abc123',
    veoEngineCompat: '>=2.0.0',
    category: 'tools',
    tags: ['test'],
    downloads: 100,
    rating: 4.5,
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  } as RegistryEntry;
}

function createMockBundle(overrides?: Partial<InstalledPluginBundle>): InstalledPluginBundle {
  return {
    pluginId: 'test-plugin',
    manifest: { name: 'Test Plugin', version: '1.0.0' },
    trustLevel: 'untrusted',
    installedAt: Date.now(),
    ...overrides,
  } as InstalledPluginBundle;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('useMarketplaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetSubscriptionsFlag();
    resetStore();
  });

  // ── Initial state ─────────────────────────────────────────────

  describe('initial state', () => {
    it('should have correct defaults', () => {
      const state = useMarketplaceStore.getState();

      expect(state.view).toBe('browse');
      expect(state.installedBundles).toEqual([]);
      expect(state.activeOperations).toEqual({});
      expect(state.availableUpdates).toEqual([]);
      expect(state.isCheckingUpdates).toBe(false);
      expect(state.lastUpdateCheck).toBeNull();
      expect(state.pendingConfirmation).toBeNull();
      expect(state.sandboxes).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ── setView ───────────────────────────────────────────────────

  describe('setView', () => {
    it('should update the view', () => {
      useMarketplaceStore.getState().setView('installed');
      expect(useMarketplaceStore.getState().view).toBe('installed');
    });

    it('should set to updates view', () => {
      useMarketplaceStore.getState().setView('updates');
      expect(useMarketplaceStore.getState().view).toBe('updates');
    });
  });

  // ── initialize ────────────────────────────────────────────────

  describe('initialize', () => {
    it('should load installed bundles and sandboxes', async () => {
      const bundles = [createMockBundle()];
      mockPluginInstallService.getInstalledBundles.mockResolvedValueOnce(bundles);

      await useMarketplaceStore.getState().initialize();

      const state = useMarketplaceStore.getState();
      expect(state.installedBundles).toEqual(bundles);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should subscribe to progress and sandbox updates', async () => {
      await useMarketplaceStore.getState().initialize();

      expect(mockPluginInstallService.onProgress).toHaveBeenCalled();
      expect(mockPluginSandboxService.subscribe).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockPluginInstallService.getInstalledBundles.mockRejectedValueOnce(
        new Error('Failed to load'),
      );

      await useMarketplaceStore.getState().initialize();

      const state = useMarketplaceStore.getState();
      expect(state.error).toBe('Failed to load');
      expect(state.isLoading).toBe(false);
    });
  });

  // ── installPlugin ─────────────────────────────────────────────

  describe('installPlugin', () => {
    it('should require user confirmation before installing', async () => {
      const entry = createMockEntry();

      // Start installation (will wait for confirmation)
      const installPromise = useMarketplaceStore.getState().installPlugin(entry);

      // Check that confirmation is pending
      await vi.waitFor(() => {
        expect(useMarketplaceStore.getState().pendingConfirmation).not.toBeNull();
      });

      const pending = useMarketplaceStore.getState().pendingConfirmation;
      expect(pending?.action).toBe('install');
      expect(pending?.pluginId).toBe('test-plugin');

      // Confirm
      useMarketplaceStore.getState().resolveConfirmation(true);

      const result = await installPromise;
      expect(result.success).toBe(true);
      expect(mockPluginInstallService.installFromRegistry).toHaveBeenCalledWith(entry);
    });

    it('should cancel installation when user declines', async () => {
      const entry = createMockEntry();

      const installPromise = useMarketplaceStore.getState().installPlugin(entry);

      await vi.waitFor(() => {
        expect(useMarketplaceStore.getState().pendingConfirmation).not.toBeNull();
      });

      // Decline
      useMarketplaceStore.getState().resolveConfirmation(false);

      const result = await installPromise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Installation cancelled by user');
      expect(mockPluginInstallService.installFromRegistry).not.toHaveBeenCalled();
    });
  });

  // ── uninstallPlugin ───────────────────────────────────────────

  describe('uninstallPlugin', () => {
    it('should uninstall a plugin after confirmation', async () => {
      useMarketplaceStore.setState({
        installedBundles: [createMockBundle({ pluginId: 'remove-me' })],
      });

      const uninstallPromise = useMarketplaceStore.getState().uninstallPlugin('remove-me');

      await vi.waitFor(() => {
        expect(useMarketplaceStore.getState().pendingConfirmation).not.toBeNull();
      });

      useMarketplaceStore.getState().resolveConfirmation(true);
      await uninstallPromise;

      expect(mockPluginInstallService.uninstall).toHaveBeenCalledWith('remove-me');
    });

    it('should skip uninstall when user declines', async () => {
      const uninstallPromise = useMarketplaceStore.getState().uninstallPlugin('keep-me');

      await vi.waitFor(() => {
        expect(useMarketplaceStore.getState().pendingConfirmation).not.toBeNull();
      });

      useMarketplaceStore.getState().resolveConfirmation(false);
      await uninstallPromise;

      expect(mockPluginInstallService.uninstall).not.toHaveBeenCalled();
    });
  });

  // ── checkForUpdates ───────────────────────────────────────────

  describe('checkForUpdates', () => {
    it('should set isCheckingUpdates during check', async () => {
      let resolveCheck: (v: PluginUpdateInfo[]) => void;
      mockPluginInstallService.checkForUpdates.mockReturnValueOnce(
        new Promise<PluginUpdateInfo[]>((resolve) => {
          resolveCheck = resolve;
        }),
      );

      const checkPromise = useMarketplaceStore.getState().checkForUpdates();

      expect(useMarketplaceStore.getState().isCheckingUpdates).toBe(true);

      resolveCheck!([]);
      await checkPromise;

      const state = useMarketplaceStore.getState();
      expect(state.isCheckingUpdates).toBe(false);
      expect(state.lastUpdateCheck).toBeTypeOf('number');
    });

    it('should store available updates', async () => {
      const updates: PluginUpdateInfo[] = [
        {
          pluginId: 'outdated-plugin',
          currentVersion: '1.0.0',
          latestVersion: '2.0.0',
          downloadUrl: 'https://example.com/plugin-2.0.0.zip',
          size: 1024,
          hasNewPermissions: false,
          newPermissions: [],
        },
      ];
      mockPluginInstallService.checkForUpdates.mockResolvedValueOnce(updates);

      await useMarketplaceStore.getState().checkForUpdates();

      expect(useMarketplaceStore.getState().availableUpdates).toEqual(updates);
    });

    it('should handle check errors', async () => {
      mockPluginInstallService.checkForUpdates.mockRejectedValueOnce(new Error('Network error'));

      await useMarketplaceStore.getState().checkForUpdates();

      const state = useMarketplaceStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isCheckingUpdates).toBe(false);
    });
  });

  // ── isInstalled ───────────────────────────────────────────────

  describe('isInstalled', () => {
    it('should return true for installed plugins', () => {
      useMarketplaceStore.setState({
        installedBundles: [createMockBundle({ pluginId: 'installed-id' })],
      });

      expect(useMarketplaceStore.getState().isInstalled('installed-id')).toBe(true);
    });

    it('should return false for non-installed plugins', () => {
      expect(useMarketplaceStore.getState().isInstalled('unknown-id')).toBe(false);
    });
  });

  // ── getProgress ───────────────────────────────────────────────

  describe('getProgress', () => {
    it('should return progress for active operation', () => {
      useMarketplaceStore.setState({
        activeOperations: {
          'busy-plugin': {
            pluginId: 'busy-plugin',
            state: 'downloading',
            progress: 50,
            message: 'Downloading...',
            startedAt: Date.now(),
          },
        },
      });

      const progress = useMarketplaceStore.getState().getProgress('busy-plugin');
      expect(progress?.state).toBe('downloading');
      expect(progress?.progress).toBe(50);
    });

    it('should return undefined when no operation is active', () => {
      expect(useMarketplaceStore.getState().getProgress('idle-plugin')).toBeUndefined();
    });
  });

  // ── requestConfirmation / resolveConfirmation ─────────────────

  describe('confirmation flow', () => {
    it('should set pending confirmation and resolve on confirm', async () => {
      const confirmPromise = useMarketplaceStore.getState().requestConfirmation({
        action: 'install',
        pluginId: 'confirm-test',
        pluginName: 'Confirm Test',
        permissions: ['ui:sidebar'],
        trustLevel: 'untrusted',
      });

      expect(useMarketplaceStore.getState().pendingConfirmation).not.toBeNull();

      useMarketplaceStore.getState().resolveConfirmation(true);

      const result = await confirmPromise;
      expect(result).toBe(true);
      expect(useMarketplaceStore.getState().pendingConfirmation).toBeNull();
    });

    it('should resolve false when declined', async () => {
      const confirmPromise = useMarketplaceStore.getState().requestConfirmation({
        action: 'uninstall',
        pluginId: 'decline-test',
        pluginName: 'Decline Test',
        permissions: [],
        trustLevel: 'unsigned',
      });

      useMarketplaceStore.getState().resolveConfirmation(false);

      const result = await confirmPromise;
      expect(result).toBe(false);
    });
  });

  // ── clearError ────────────────────────────────────────────────

  describe('clearError', () => {
    it('should clear the error state', () => {
      useMarketplaceStore.setState({ error: 'Something went wrong' });

      useMarketplaceStore.getState().clearError();

      expect(useMarketplaceStore.getState().error).toBeNull();
    });
  });

  // ── refreshSandboxes ──────────────────────────────────────────

  describe('refreshSandboxes', () => {
    it('should refresh sandbox state from service', () => {
      const mockSandboxes = [{ config: { pluginId: 's1' }, state: 'running' }];
      mockPluginSandboxService.getAllSandboxes.mockReturnValueOnce(mockSandboxes);

      useMarketplaceStore.getState().refreshSandboxes();

      expect(useMarketplaceStore.getState().sandboxes).toEqual(mockSandboxes);
    });
  });
});
