/**
 * Plugin Service
 * v1.4.0 Week 4 - Plugin Architecture Foundation
 * v1.7.0 - Plugin API v1 (typed StudioPlugin contract, semver, health tracking)
 *
 * Manages plugin loading, lifecycle, and sandboxing
 */

import type {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginLoadResult,
  PluginRegistry,
  PluginPermission,
  PluginHealth,
  StudioPlugin,
  PluginTrustLevel,
  StudioConfig,
} from '../types/plugin';
import { satisfiesSemver } from '../utils/semver';
import { logger } from './loggerService';
import { pluginStorageManager } from './plugin/pluginStorageManager';
import { pluginHealthManager } from './plugin/pluginHealthManager';
import { pluginTrustManager } from './plugin/pluginTrustManager';
import { pluginContextFactory } from './plugin/pluginContextFactory';

/** App version from build-time define (falls back for tests) */
const APP_VERSION: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) || '1.6.0';

/**
 * Plugin service class
 */
class PluginService implements PluginRegistry {
  public plugins: Map<string, Plugin> = new Map();
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private permissionCache: Map<string, Set<PluginPermission>> = new Map();
  private studios: Map<string, { pluginId: string; config: StudioConfig }> = new Map();
  private listeners: Set<() => void> = new Set();
  // Optimization hook registrations (v3.3.0)
  private optimizationHooks: Map<string, Array<{ pluginId: string; handler: Function }>> =
    new Map();

  /**
   * Initialize plugin service
   */
  async initialize(): Promise<void> {
    logger.info('PluginService initializing...');

    // Load enabled plugins from storage
    const enabledPlugins = await pluginStorageManager.getEnabledPlugins();

    for (const pluginId of enabledPlugins) {
      try {
        const manifest = await pluginStorageManager.loadManifest(pluginId);
        if (manifest) {
          await this.load(manifest);
          await this.activate(pluginId);
        }
      } catch (error) {
        logger.error(`[PluginService] Failed to load plugin ${pluginId}:`, error);
      }
    }

    logger.info(`PluginService initialized with ${this.plugins.size} plugins`);
  }

  /**
   * Load a plugin from its manifest.
   * Verifies signature and assigns trust level during load.
   */
  async load(manifest: PluginManifest): Promise<PluginLoadResult> {
    try {
      logger.info(`Loading plugin: ${manifest.id}`);

      // Validate manifest
      this.validateManifest(manifest);

      // Check if already loaded
      if (this.plugins.has(manifest.id)) {
        throw new Error(`Plugin ${manifest.id} is already loaded`);
      }

      // Check engine version compatibility
      if (manifest.engineVersion) {
        const isCompatible = this.checkVersionCompatibility(manifest.engineVersion);
        if (!isCompatible) {
          throw new Error(`Plugin requires app version ${manifest.engineVersion} or higher`);
        }
      }

      // Determine trust level from signature verification
      const trustLevel = await pluginTrustManager.evaluateTrustLevel(manifest);

      // Create plugin instance
      const plugin: Plugin = {
        manifest,
        state: 'loaded',
        health: { status: 'healthy', crashCount: 0 },
        trustLevel,
      };

      // Store plugin
      this.plugins.set(manifest.id, plugin);

      // Cache permissions
      this.permissionCache.set(manifest.id, new Set(manifest.permissions));

      // Save manifest to storage
      await pluginStorageManager.saveManifest(manifest);

      logger.info(`Plugin loaded successfully: ${manifest.id} (trust: ${trustLevel})`);

      return { success: true, plugin };
    } catch (error) {
      logger.error('[PluginService] Failed to load plugin:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Register an internal plugin (bundled with the app).
   * Internal plugins are automatically trusted.
   */
  async registerInternalPlugin(manifest: PluginManifest, instance: StudioPlugin): Promise<void> {
    try {
      // Validate manifest
      this.validateManifest(manifest);

      // Create plugin entry — internal plugins are always trusted
      const plugin: Plugin = {
        manifest,
        state: 'loaded',
        instance,
        health: { status: 'healthy', crashCount: 0 },
        trustLevel: 'trusted',
      };

      this.plugins.set(manifest.id, plugin);
      this.permissionCache.set(manifest.id, new Set(manifest.permissions));

      logger.info(`Registered internal plugin: ${manifest.id}`);

      // Auto-activate internal plugins
      await this.activate(manifest.id);
    } catch (error) {
      logger.error('[PluginService] Failed to register internal plugin:', error);
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  async unload(pluginId: string): Promise<void> {
    logger.info(`Unloading plugin: ${pluginId}`);

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Deactivate if active
    if (plugin.state === 'active') {
      await this.deactivate(pluginId);
    }

    // Call dispose hook via typed StudioPlugin interface
    if (plugin.instance?.dispose) {
      try {
        await plugin.instance.dispose();
      } catch (error) {
        logger.error('[PluginService] Error in dispose hook:', error);
      }
    }

    // Remove from registry
    this.plugins.delete(pluginId);
    this.permissionCache.delete(pluginId);

    // Remove from storage
    await pluginStorageManager.deleteManifest(pluginId);

    logger.info(`Plugin unloaded: ${pluginId}`);
  }

  /**
   * Activate a plugin
   */
  async activate(pluginId: string): Promise<void> {
    logger.info(`Activating plugin: ${pluginId}`);

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.state === 'active') {
      logger.warn('[PluginService] Plugin already active:', pluginId);
      return;
    }

    try {
      // Create plugin context
      const context = this.createPluginContext(plugin);
      plugin.context = context;

      // Load plugin code (in a real implementation, this would dynamically import the plugin)
      // For now, we'll just mark it as active
      plugin.state = 'active';

      // Call onActivate hook via typed StudioPlugin interface
      if (plugin.instance?.activate) {
        await plugin.instance.activate(context);
      }

      // Add to enabled plugins
      await pluginStorageManager.addEnabledPlugin(pluginId);

      logger.info(`Plugin activated: ${pluginId}`);
      this.notifyListeners();
    } catch (error) {
      plugin.state = 'error';
      plugin.error = error as Error;
      logger.error('[PluginService] Failed to activate plugin:', error);
      throw error;
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivate(pluginId: string): Promise<void> {
    logger.info(`Deactivating plugin: ${pluginId}`);

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.state !== 'active') {
      logger.warn('[PluginService] Plugin not active:', pluginId);
      return;
    }

    try {
      // Call onDeactivate hook via typed StudioPlugin interface
      if (plugin.instance?.deactivate) {
        await plugin.instance.deactivate();
      }

      // Update state
      plugin.state = 'inactive';
      plugin.context = undefined;

      // Remove from enabled plugins
      await pluginStorageManager.removeEnabledPlugin(pluginId);

      logger.info(`Plugin deactivated: ${pluginId}`);
      this.notifyListeners();
    } catch (error) {
      plugin.state = 'error';
      plugin.error = error as Error;
      logger.error('[PluginService] Failed to deactivate plugin:', error);
      throw error;
    }
  }

  /**
   * Get a plugin by ID
   */
  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get active plugins
   */
  getActive(): Plugin[] {
    return this.getAll().filter((p) => p.state === 'active');
  }

  /**
   * Get all registered studios from active plugins
   */
  getStudios(): StudioConfig[] {
    return Array.from(this.studios.values())
      .filter((item) => {
        const plugin = this.plugins.get(item.pluginId);
        return plugin && plugin.state === 'active';
      })
      .map((item) => item.config);
  }

  /**
   * Check if a plugin has a permission
   */
  hasPermission(pluginId: string, permission: PluginPermission): boolean {
    const permissions = this.permissionCache.get(pluginId);
    if (!permissions) return false;

    // Check exact permission
    if (permissions.has(permission)) return true;

    // Check wildcard permissions
    if (permission.includes(':')) {
      const [resource] = permission.split(':');
      if (permissions.has(resource as PluginPermission)) return true;
    }

    return false;
  }

  /**
   * Subscribe to registry changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  private createPluginContext(plugin: Plugin): PluginContext {
    return pluginContextFactory.createPluginContext(plugin, {
      hasPermission: (pluginId, perm) => this.hasPermission(pluginId, perm),
      getPlugin: (pluginId) => this.get(pluginId),
      registerStudio: (pluginId, config) => {
        this.studios.set(config.id, { pluginId, config });
        this.notifyListeners();
      },
      eventHandlers: this.eventHandlers,
      optimizationHooks: this.optimizationHooks,
    });
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id) throw new Error('Plugin manifest missing id');
    if (!manifest.name) throw new Error('Plugin manifest missing name');
    if (!manifest.version) throw new Error('Plugin manifest missing version');
    if (!manifest.main) throw new Error('Plugin manifest missing main entry point');
    if (!Array.isArray(manifest.permissions)) {
      throw new Error('Plugin manifest missing permissions array');
    }
  }

  /**
   * Check version compatibility using proper semver comparison
   */
  private checkVersionCompatibility(requiredVersion: string): boolean {
    const currentVersion = APP_VERSION;
    return satisfiesSemver(currentVersion, `>=${requiredVersion}`);
  }

  // ─── Trust & Signing ──────────────────────────────────────────────

  /**
   * Get the trust level of a loaded plugin.
   */
  getTrustLevel(pluginId: string): PluginTrustLevel | undefined {
    return pluginTrustManager.getTrustLevel(this.plugins.get(pluginId));
  }

  /**
   * Re-evaluate the trust level of a loaded plugin (e.g. after key rotation).
   */
  async refreshTrustLevel(pluginId: string): Promise<PluginTrustLevel | undefined> {
    return pluginTrustManager.refreshTrustLevel(this.plugins.get(pluginId), () =>
      this.notifyListeners(),
    );
  }

  /**
   * Get all plugins filtered by trust level.
   */
  getPluginsByTrust(trustLevel: PluginTrustLevel): Plugin[] {
    return pluginTrustManager.getPluginsByTrust(this.getAll(), trustLevel);
  }

  // ─── Health Tracking ────────────────────────────────────────────────

  /**
   * Report a crash for a plugin. Increments crash counter and
   * auto-deactivates after MAX_CRASH_COUNT consecutive crashes.
   */
  async reportCrash(pluginId: string, error: Error): Promise<void> {
    return pluginHealthManager.reportCrash(
      this.plugins.get(pluginId),
      error,
      (id) => this.deactivate(id),
      () => this.notifyListeners(),
    );
  }

  /**
   * Reset health state for a plugin (e.g. after user manually re-enables).
   */
  resetHealth(pluginId: string): void {
    pluginHealthManager.resetHealth(this.plugins.get(pluginId), () => this.notifyListeners());
  }

  /**
   * Get health status for a plugin.
   */
  getHealth(pluginId: string): PluginHealth | undefined {
    return pluginHealthManager.getHealth(this.plugins.get(pluginId));
  }

  /**
   * Get the current app version used for compatibility checks.
   */
  getAppVersion(): string {
    return APP_VERSION;
  }
}

// Export singleton instance
export const pluginService = new PluginService();
