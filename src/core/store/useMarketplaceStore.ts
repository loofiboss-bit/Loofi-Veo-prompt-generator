/**
 * Marketplace Store
 * v2.0.0 - Platform Transformation
 *
 * Zustand store for Extension Marketplace state.
 * Manages installed plugins, install/update operations,
 * update checking, and user confirmations.
 */

import { create } from 'zustand';
import { pluginInstallService } from '@core/services/pluginInstallService';
import { pluginSandboxService } from '@core/services/pluginSandboxService';
import type { RegistryEntry } from '@core/types/registry';
import type {
  MarketplaceView,
  InstalledPluginBundle,
  InstallProgress,
  PluginUpdateInfo,
  PendingConfirmation,
  InstallResult,
} from '@core/types/marketplace';
import type { SandboxInfo } from '@core/types/marketplace';

// ─── State Shape ────────────────────────────────────────────────────

interface MarketplaceStoreState {
  /** Currently active marketplace view */
  view: MarketplaceView;
  /** Installed plugin bundles (loaded from IndexedDB) */
  installedBundles: InstalledPluginBundle[];
  /** Active install/update operations */
  activeOperations: Record<string, InstallProgress>;
  /** Available updates */
  availableUpdates: PluginUpdateInfo[];
  /** Whether an update check is running */
  isCheckingUpdates: boolean;
  /** Last time updates were checked */
  lastUpdateCheck: number | null;
  /** Pending user confirmation dialog */
  pendingConfirmation: PendingConfirmation | null;
  /** Active sandbox info (for monitoring) */
  sandboxes: SandboxInfo[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  // ─── Actions ──────────────────────────────────────────────────

  /** Set the active marketplace view */
  setView: (view: MarketplaceView) => void;
  /** Initialize — load installed bundles and sandbox state */
  initialize: () => Promise<void>;
  /** Refresh installed bundles from IndexedDB */
  refreshInstalled: () => Promise<void>;
  /** Install a plugin from a registry entry */
  installPlugin: (entry: RegistryEntry) => Promise<InstallResult>;
  /** Uninstall a plugin */
  uninstallPlugin: (pluginId: string) => Promise<void>;
  /** Update a plugin to the latest version */
  updatePlugin: (pluginId: string) => Promise<InstallResult>;
  /** Check all installed plugins for updates */
  checkForUpdates: () => Promise<void>;
  /** Check if a plugin is installed */
  isInstalled: (pluginId: string) => boolean;
  /** Get install progress for a plugin */
  getProgress: (pluginId: string) => InstallProgress | undefined;
  /** Show a confirmation dialog and wait for user response */
  requestConfirmation: (confirmation: Omit<PendingConfirmation, 'resolve'>) => Promise<boolean>;
  /** Resolve a pending confirmation */
  resolveConfirmation: (confirmed: boolean) => void;
  /** Clear error state */
  clearError: () => void;
  /** Refresh sandbox state */
  refreshSandboxes: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────

export const useMarketplaceStore = create<MarketplaceStoreState>((set, get) => ({
  // Initial state
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

  setView: (view) => set({ view }),

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      // Load installed bundles
      const bundles = await pluginInstallService.getInstalledBundles();
      const sandboxes = pluginSandboxService.getAllSandboxes();

      // Subscribe to progress updates
      pluginInstallService.onProgress((_pluginId, progress) => {
        set((state) => ({
          activeOperations: {
            ...state.activeOperations,
            [progress.pluginId]: progress,
          },
        }));
      });

      // Subscribe to sandbox changes
      pluginSandboxService.subscribe(() => {
        set({ sandboxes: pluginSandboxService.getAllSandboxes() });
      });

      set({ installedBundles: bundles, sandboxes, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  refreshInstalled: async () => {
    try {
      const bundles = await pluginInstallService.getInstalledBundles();
      set({ installedBundles: bundles });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  installPlugin: async (entry) => {
    const { requestConfirmation } = get();

    // Request user confirmation with permissions
    const confirmed = await requestConfirmation({
      action: 'install',
      pluginId: entry.id,
      pluginName: entry.name,
      permissions: entry.permissions,
      trustLevel: entry.signature ? 'untrusted' : 'unsigned',
    });

    if (!confirmed) {
      return {
        success: false,
        error: 'Installation cancelled by user',
        durationMs: 0,
      };
    }

    const result = await pluginInstallService.installFromRegistry(entry);

    // Refresh state
    await get().refreshInstalled();

    return result;
  },

  uninstallPlugin: async (pluginId) => {
    const bundle = get().installedBundles.find((b) => b.pluginId === pluginId);
    const { requestConfirmation } = get();

    const confirmed = await requestConfirmation({
      action: 'uninstall',
      pluginId,
      pluginName: bundle?.manifest.name ?? pluginId,
      permissions: [],
      trustLevel: bundle?.trustLevel ?? 'unsigned',
    });

    if (!confirmed) return;

    await pluginInstallService.uninstall(pluginId);
    await get().refreshInstalled();
  },

  updatePlugin: async (pluginId) => {
    const updateInfo = get().availableUpdates.find((u) => u.pluginId === pluginId);

    if (updateInfo?.hasNewPermissions) {
      const { requestConfirmation } = get();
      const confirmed = await requestConfirmation({
        action: 'update',
        pluginId,
        pluginName: pluginId,
        permissions: updateInfo.newPermissions,
        trustLevel: 'untrusted',
      });

      if (!confirmed) {
        return {
          success: false,
          error: 'Update cancelled by user',
          durationMs: 0,
        };
      }
    }

    const result = await pluginInstallService.updatePlugin(pluginId);

    if (result.success) {
      // Remove from available updates
      set((state) => ({
        availableUpdates: state.availableUpdates.filter((u) => u.pluginId !== pluginId),
      }));
      await get().refreshInstalled();
    }

    return result;
  },

  checkForUpdates: async () => {
    set({ isCheckingUpdates: true });
    try {
      const updates = await pluginInstallService.checkForUpdates();
      set({
        availableUpdates: updates,
        isCheckingUpdates: false,
        lastUpdateCheck: Date.now(),
      });
    } catch (err) {
      set({
        isCheckingUpdates: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  isInstalled: (pluginId) => {
    return get().installedBundles.some((b) => b.pluginId === pluginId);
  },

  getProgress: (pluginId) => {
    return get().activeOperations[pluginId];
  },

  requestConfirmation: (confirmation) => {
    return new Promise<boolean>((resolve) => {
      set({
        pendingConfirmation: { ...confirmation, resolve },
      });
    });
  },

  resolveConfirmation: (confirmed) => {
    const { pendingConfirmation } = get();
    if (pendingConfirmation) {
      pendingConfirmation.resolve(confirmed);
      set({ pendingConfirmation: null });
    }
  },

  clearError: () => set({ error: null }),

  refreshSandboxes: () => {
    set({ sandboxes: pluginSandboxService.getAllSandboxes() });
  },
}));
