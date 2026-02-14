/**
 * Plugin Service
 * v1.4.0 Week 4 - Plugin Architecture Foundation
 *
 * Manages plugin loading, lifecycle, and sandboxing
 */

import { get, set, del, keys } from 'idb-keyval';
import type {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginAPI,
  PluginStorage,
  PluginEvents,
  PluginLogger,
  PluginLoadResult,
  PluginRegistry,
  PluginPermission,
} from '../types/plugin';

/**
 * Plugin service class
 */
class PluginService implements PluginRegistry {
  public plugins: Map<string, Plugin> = new Map();
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private permissionCache: Map<string, Set<PluginPermission>> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private studios: Map<string, { pluginId: string; config: any }> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Initialize plugin service
   */
  async initialize(): Promise<void> {
    console.log('[PluginService] Initializing...');

    // Load enabled plugins from storage
    const enabledPlugins = await this.getEnabledPlugins();

    for (const pluginId of enabledPlugins) {
      try {
        const manifest = await this.loadManifest(pluginId);
        if (manifest) {
          await this.load(manifest);
          await this.activate(pluginId);
        }
      } catch (error) {
        console.error(`[PluginService] Failed to load plugin ${pluginId}:`, error);
      }
    }

    console.log('[PluginService] Initialized with', this.plugins.size, 'plugins');
  }

  /**
   * Load a plugin from its manifest
   */
  async load(manifest: PluginManifest): Promise<PluginLoadResult> {
    try {
      console.log('[PluginService] Loading plugin:', manifest.id);

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

      // Create plugin instance
      const plugin: Plugin = {
        manifest,
        state: 'loaded',
      };

      // Store plugin
      this.plugins.set(manifest.id, plugin);

      // Cache permissions
      this.permissionCache.set(manifest.id, new Set(manifest.permissions));

      // Save manifest to storage
      await this.saveManifest(manifest);

      console.log('[PluginService] Plugin loaded successfully:', manifest.id);

      return { success: true, plugin };
    } catch (error) {
      console.error('[PluginService] Failed to load plugin:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Register an internal plugin (bundled with the app)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async registerInternalPlugin(manifest: PluginManifest, instance: any): Promise<void> {
    try {
      // Validate manifest
      this.validateManifest(manifest);

      // Create plugin entry
      const plugin: Plugin = {
        manifest,
        state: 'loaded',
        instance, // Pre-loaded instance
      };

      this.plugins.set(manifest.id, plugin);
      this.permissionCache.set(manifest.id, new Set(manifest.permissions));

      console.log('[PluginService] Registered internal plugin:', manifest.id);

      // Auto-activate internal plugins
      await this.activate(manifest.id);
    } catch (error) {
      console.error('[PluginService] Failed to register internal plugin:', error);
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  async unload(pluginId: string): Promise<void> {
    console.log('[PluginService] Unloading plugin:', pluginId);

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Deactivate if active
    if (plugin.state === 'active') {
      await this.deactivate(pluginId);
    }

    // Call onUninstall hook if defined
    if (plugin.manifest.hooks?.onUninstall && plugin.instance) {
      try {
        await plugin.instance[plugin.manifest.hooks.onUninstall]?.();
      } catch (error) {
        console.error('[PluginService] Error in onUninstall hook:', error);
      }
    }

    // Remove from registry
    this.plugins.delete(pluginId);
    this.permissionCache.delete(pluginId);

    // Remove from storage
    await this.deleteManifest(pluginId);

    console.log('[PluginService] Plugin unloaded:', pluginId);
  }

  /**
   * Activate a plugin
   */
  async activate(pluginId: string): Promise<void> {
    console.log('[PluginService] Activating plugin:', pluginId);

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.state === 'active') {
      console.warn('[PluginService] Plugin already active:', pluginId);
      return;
    }

    try {
      // Create plugin context
      const context = this.createPluginContext(plugin);
      plugin.context = context;

      // Load plugin code (in a real implementation, this would dynamically import the plugin)
      // For now, we'll just mark it as active
      plugin.state = 'active';

      // Call onActivate hook if defined
      if (plugin.manifest.hooks?.onActivate && plugin.instance) {
        await plugin.instance[plugin.manifest.hooks.onActivate]?.(context);
      }

      // Add to enabled plugins
      await this.addEnabledPlugin(pluginId);

      console.log('[PluginService] Plugin activated:', pluginId);
      this.notifyListeners();
    } catch (error) {
      plugin.state = 'error';
      plugin.error = error as Error;
      console.error('[PluginService] Failed to activate plugin:', error);
      throw error;
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivate(pluginId: string): Promise<void> {
    console.log('[PluginService] Deactivating plugin:', pluginId);

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.state !== 'active') {
      console.warn('[PluginService] Plugin not active:', pluginId);
      return;
    }

    try {
      // Call onDeactivate hook if defined
      if (plugin.manifest.hooks?.onDeactivate && plugin.instance) {
        await plugin.instance[plugin.manifest.hooks.onDeactivate]?.();
      }

      // Update state
      plugin.state = 'inactive';
      plugin.context = undefined;

      // Remove from enabled plugins
      await this.removeEnabledPlugin(pluginId);

      console.log('[PluginService] Plugin deactivated:', pluginId);
      this.notifyListeners();
    } catch (error) {
      plugin.state = 'error';
      plugin.error = error as Error;
      console.error('[PluginService] Failed to deactivate plugin:', error);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStudios(): any[] {
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
   * Create plugin context
   */
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
    const pluginId = plugin.manifest.id;

    return {
      manifest: plugin.manifest,
      api: this.createPluginAPI(pluginId),
      storage: this.createPluginStorage(pluginId),
      events: this.createPluginEvents(pluginId),
      logger: this.createPluginLogger(pluginId),
    };
  }

  /**
   * Create plugin API
   */
  private createPluginAPI(pluginId: string): PluginAPI {
    return {
      ui: {
        registerSidebarItem: (config) => {
          if (!this.hasPermission(pluginId, 'ui:sidebar')) {
            throw new Error('Plugin does not have ui:sidebar permission');
          }
          // Implementation would register the sidebar item
          console.log('[PluginService] Registered sidebar item:', config.id);
        },
        registerToolbarButton: (config) => {
          if (!this.hasPermission(pluginId, 'ui:toolbar')) {
            throw new Error('Plugin does not have ui:toolbar permission');
          }
          // Implementation would register the toolbar button
          console.log('[PluginService] Registered toolbar button:', config.id);
        },
        registerModal: (config) => {
          if (!this.hasPermission(pluginId, 'ui:modal')) {
            throw new Error('Plugin does not have ui:modal permission');
          }
          // Implementation would register the modal
          console.log('[PluginService] Registered modal:', config.id);
        },

        showNotification: (message, type = 'info') => {
          // Implementation would show a notification
          console.log(`[PluginService] Notification (${type}):`, message);
        },
        registerStudio: (config) => {
          if (!this.hasPermission(pluginId, 'ui:studio')) {
            throw new Error('Plugin does not have ui:studio permission');
          }
          this.studios.set(config.id, { pluginId, config });
          console.log('[PluginService] Registered studio:', config.id);
          this.notifyListeners();
        },
      },
      data: {
        getProjects: async () => {
          if (!this.hasPermission(pluginId, 'projects:read')) {
            throw new Error('Plugin does not have projects:read permission');
          }
          // Implementation would return projects
          return [];
        },
        getProject: async (_id) => {
          if (!this.hasPermission(pluginId, 'projects:read')) {
            throw new Error('Plugin does not have projects:read permission');
          }
          // Implementation would return a project
          return null;
        },
        saveProject: async (_project) => {
          if (!this.hasPermission(pluginId, 'projects:write')) {
            throw new Error('Plugin does not have projects:write permission');
          }
          // Implementation would save the project
        },
        getHistory: async () => {
          if (!this.hasPermission(pluginId, 'history:read')) {
            throw new Error('Plugin does not have history:read permission');
          }
          // Implementation would return history
          return [];
        },
        getTemplates: async () => {
          if (!this.hasPermission(pluginId, 'templates:read')) {
            throw new Error('Plugin does not have templates:read permission');
          }
          // Implementation would return templates
          return [];
        },
      },
      export: {
        registerFormat: (format) => {
          if (!this.hasPermission(pluginId, 'export')) {
            throw new Error('Plugin does not have export permission');
          }
          // Implementation would register the export format
          console.log('[PluginService] Registered export format:', format.id);
        },
        exportPrompt: async (_prompt, _format) => {
          if (!this.hasPermission(pluginId, 'export')) {
            throw new Error('Plugin does not have export permission');
          }
          // Implementation would export the prompt
        },
      },
      settings: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get: <T = any>(key: string): T | undefined => {
          const plugin = this.plugins.get(pluginId);
          if (!plugin?.context) return undefined;

          // Get from plugin settings
          const settingDef = plugin.manifest.settings?.[key];
          if (!settingDef) return undefined;

          // Return stored value or default
          return settingDef.default as T;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: async (key: string, value: any) => {
          // Implementation would save the setting
          await set(`plugin:${pluginId}:settings:${key}`, value);
        },
        getAll: () => {
          const plugin = this.plugins.get(pluginId);
          if (!plugin?.manifest.settings) return {};

          // Return all settings with defaults
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const settings: Record<string, any> = {};
          for (const [key, def] of Object.entries(plugin.manifest.settings)) {
            settings[key] = def.default;
          }
          return settings;
        },
      },
    };
  }

  /**
   * Create plugin storage
   */
  private createPluginStorage(pluginId: string): PluginStorage {
    const prefix = `plugin:${pluginId}:data:`;

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: async <T = any>(key: string): Promise<T | undefined> => {
        if (
          !this.hasPermission(pluginId, 'storage:read') &&
          !this.hasPermission(pluginId, 'storage')
        ) {
          throw new Error('Plugin does not have storage:read permission');
        }
        return await get<T>(prefix + key);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set: async (key: string, value: any) => {
        if (
          !this.hasPermission(pluginId, 'storage:write') &&
          !this.hasPermission(pluginId, 'storage')
        ) {
          throw new Error('Plugin does not have storage:write permission');
        }
        await set(prefix + key, value);
      },
      delete: async (key: string) => {
        if (
          !this.hasPermission(pluginId, 'storage:write') &&
          !this.hasPermission(pluginId, 'storage')
        ) {
          throw new Error('Plugin does not have storage:write permission');
        }
        await del(prefix + key);
      },
      clear: async () => {
        if (
          !this.hasPermission(pluginId, 'storage:write') &&
          !this.hasPermission(pluginId, 'storage')
        ) {
          throw new Error('Plugin does not have storage:write permission');
        }
        const allKeys = await keys();
        const pluginKeys = allKeys.filter((k) => String(k).startsWith(prefix));
        await Promise.all(pluginKeys.map((k) => del(k)));
      },
      keys: async () => {
        if (
          !this.hasPermission(pluginId, 'storage:read') &&
          !this.hasPermission(pluginId, 'storage')
        ) {
          throw new Error('Plugin does not have storage:read permission');
        }
        const allKeys = await keys();
        return allKeys
          .filter((k) => String(k).startsWith(prefix))
          .map((k) => String(k).substring(prefix.length));
      },
    };
  }

  /**
   * Create plugin events
   */
  private createPluginEvents(pluginId: string): PluginEvents {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on: (event: string, handler: (...args: any[]) => void) => {
        if (!this.hasPermission(pluginId, 'events:subscribe')) {
          throw new Error('Plugin does not have events:subscribe permission');
        }

        if (!this.eventHandlers.has(event)) {
          this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off: (event: string, handler: (...args: any[]) => void) => {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.delete(handler);
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emit: (event: string, ...args: any[]) => {
        if (!this.hasPermission(pluginId, 'events:publish')) {
          throw new Error('Plugin does not have events:publish permission');
        }

        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(...args);
            } catch (error) {
              console.error('[PluginService] Error in event handler:', error);
            }
          });
        }
      },
    };
  }

  /**
   * Create plugin logger
   */
  private createPluginLogger(pluginId: string): PluginLogger {
    const prefix = `[Plugin:${pluginId}]`;

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      debug: (...args: any[]) => console.debug(prefix, ...args),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      info: (...args: any[]) => console.info(prefix, ...args),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      warn: (...args: any[]) => console.warn(prefix, ...args),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (...args: any[]) => console.error(prefix, ...args),
    };
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
   * Check version compatibility
   */
  private checkVersionCompatibility(requiredVersion: string): boolean {
    // Simple version check (in production, use semver library)
    const currentVersion = '1.4.0';
    return currentVersion >= requiredVersion;
  }

  /**
   * Storage helpers
   */
  private async loadManifest(pluginId: string): Promise<PluginManifest | null> {
    return (await get<PluginManifest>(`plugin:manifest:${pluginId}`)) ?? null;
  }

  private async saveManifest(manifest: PluginManifest): Promise<void> {
    await set(`plugin:manifest:${manifest.id}`, manifest);
  }

  private async deleteManifest(pluginId: string): Promise<void> {
    await del(`plugin:manifest:${pluginId}`);
  }

  private async getEnabledPlugins(): Promise<string[]> {
    return (await get<string[]>('plugin:enabled')) || [];
  }

  private async addEnabledPlugin(pluginId: string): Promise<void> {
    const enabled = await this.getEnabledPlugins();
    if (!enabled.includes(pluginId)) {
      enabled.push(pluginId);
      await set('plugin:enabled', enabled);
    }
  }

  private async removeEnabledPlugin(pluginId: string): Promise<void> {
    const enabled = await this.getEnabledPlugins();
    const filtered = enabled.filter((id) => id !== pluginId);
    await set('plugin:enabled', filtered);
  }
}

// Export singleton instance
export const pluginService = new PluginService();
