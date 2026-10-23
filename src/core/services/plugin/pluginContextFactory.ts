/**
 * Plugin Context Factory
 * Factory functions for constructing PluginContext, PluginAPI, PluginStorage, PluginEvents, PluginLogger.
 */

import { get, set, del, keys } from 'idb-keyval';
import type {
  Plugin,
  PluginContext,
  PluginAPI,
  PluginStorage,
  PluginEvents,
  PluginLogger,
  PluginPermission,
  StudioConfig,
} from '../../types/plugin';
import { logger } from '../loggerService';
import { historyService } from '../historyService';
import { projectService } from '../projectService';
import { getUserTemplates } from '../templateManager';

export interface PluginContextDeps {
  hasPermission: (pluginId: string, permission: PluginPermission) => boolean;
  getPlugin: (pluginId: string) => Plugin | undefined;
  registerStudio: (pluginId: string, config: StudioConfig) => void;
  eventHandlers: Map<string, Set<Function>>;
  optimizationHooks: Map<string, Array<{ pluginId: string; handler: Function }>>;
}

export class PluginContextFactory {
  /**
   * Create plugin context for a plugin instance
   */
  createPluginContext(plugin: Plugin, deps: PluginContextDeps): PluginContext {
    const pluginId = plugin.manifest.id;

    return {
      manifest: plugin.manifest,
      api: this.createPluginAPI(pluginId, deps),
      storage: this.createPluginStorage(pluginId, deps.hasPermission),
      events: this.createPluginEvents(pluginId, deps.hasPermission, deps.eventHandlers),
      logger: this.createPluginLogger(pluginId),
    };
  }

  /**
   * Create plugin API
   */
  private createPluginAPI(pluginId: string, deps: PluginContextDeps): PluginAPI {
    return {
      ui: {
        registerSidebarItem: (config) => {
          if (!deps.hasPermission(pluginId, 'ui:sidebar')) {
            throw new Error('Plugin does not have ui:sidebar permission');
          }
          logger.debug(`Registered sidebar item: ${config.id}`);
        },
        registerToolbarButton: (config) => {
          if (!deps.hasPermission(pluginId, 'ui:toolbar')) {
            throw new Error('Plugin does not have ui:toolbar permission');
          }
          logger.debug(`Registered toolbar button: ${config.id}`);
        },
        registerModal: (config) => {
          if (!deps.hasPermission(pluginId, 'ui:modal')) {
            throw new Error('Plugin does not have ui:modal permission');
          }
          logger.debug(`Registered modal: ${config.id}`);
        },
        showNotification: (message, type = 'info') => {
          logger.info(`Plugin notification (${type}): ${message}`);
        },
        registerStudio: (config) => {
          if (!deps.hasPermission(pluginId, 'ui:studio')) {
            throw new Error('Plugin does not have ui:studio permission');
          }
          deps.registerStudio(pluginId, config);
          logger.debug(`Registered studio: ${config.id}`);
        },
      },
      data: {
        getProjects: async () => {
          if (!deps.hasPermission(pluginId, 'projects:read')) {
            throw new Error('Plugin does not have projects:read permission');
          }
          return projectService.getAllProjects();
        },
        getProject: async (id) => {
          if (!deps.hasPermission(pluginId, 'projects:read')) {
            throw new Error('Plugin does not have projects:read permission');
          }
          return projectService.getProject(id);
        },
        saveProject: async (project) => {
          if (!deps.hasPermission(pluginId, 'projects:write')) {
            throw new Error('Plugin does not have projects:write permission');
          }
          const proj = project as { id: string; [key: string]: unknown };
          await projectService.updateProject(proj.id, proj as Partial<Record<string, unknown>>);
        },
        getHistory: async () => {
          if (!deps.hasPermission(pluginId, 'history:read')) {
            throw new Error('Plugin does not have history:read permission');
          }
          return historyService.getEntries();
        },
        getTemplates: async () => {
          if (!deps.hasPermission(pluginId, 'templates:read')) {
            throw new Error('Plugin does not have templates:read permission');
          }
          return getUserTemplates();
        },
      },
      export: {
        registerFormat: (format) => {
          if (!deps.hasPermission(pluginId, 'export')) {
            throw new Error('Plugin does not have export permission');
          }
          logger.debug(`Registered export format: ${format.id}`);
        },
        exportPrompt: async (_prompt, _format) => {
          if (!deps.hasPermission(pluginId, 'export')) {
            throw new Error('Plugin does not have export permission');
          }
        },
      },
      settings: {
        get: <T = unknown>(key: string): T | undefined => {
          const plugin = deps.getPlugin(pluginId);
          if (!plugin?.context) return undefined;

          const settingDef = plugin.manifest.settings?.[key];
          if (!settingDef) return undefined;

          return settingDef.default as T;
        },
        set: async (key: string, value: unknown) => {
          await set(`plugin:${pluginId}:settings:${key}`, value);
        },
        getAll: () => {
          const plugin = deps.getPlugin(pluginId);
          if (!plugin?.manifest.settings) return {};

          const settings: Record<string, unknown> = {};
          for (const [key, def] of Object.entries(plugin.manifest.settings)) {
            settings[key] = def.default;
          }
          return settings;
        },
      },
      optimization: {
        onPromptAnalysis: (handler) => {
          const hooks = deps.optimizationHooks.get('promptAnalysis') ?? [];
          hooks.push({ pluginId, handler });
          deps.optimizationHooks.set('promptAnalysis', hooks);
          logger.debug(`Plugin ${pluginId} registered onPromptAnalysis hook`);
        },
        onScoreCalculation: (handler) => {
          const hooks = deps.optimizationHooks.get('scoreCalculation') ?? [];
          hooks.push({ pluginId, handler });
          deps.optimizationHooks.set('scoreCalculation', hooks);
          logger.debug(`Plugin ${pluginId} registered onScoreCalculation hook`);
        },
        onNarrativeCheck: (handler) => {
          const hooks = deps.optimizationHooks.get('narrativeCheck') ?? [];
          hooks.push({ pluginId, handler });
          deps.optimizationHooks.set('narrativeCheck', hooks);
          logger.debug(`Plugin ${pluginId} registered onNarrativeCheck hook`);
        },
      },
    };
  }

  /**
   * Create plugin storage
   */
  private createPluginStorage(
    pluginId: string,
    hasPermission: (pluginId: string, permission: PluginPermission) => boolean,
  ): PluginStorage {
    const prefix = `plugin:${pluginId}:data:`;

    return {
      get: async <T = unknown>(key: string): Promise<T | undefined> => {
        if (!hasPermission(pluginId, 'storage:read') && !hasPermission(pluginId, 'storage')) {
          throw new Error('Plugin does not have storage:read permission');
        }
        return await get<T>(prefix + key);
      },
      set: async (key: string, value: unknown) => {
        if (!hasPermission(pluginId, 'storage:write') && !hasPermission(pluginId, 'storage')) {
          throw new Error('Plugin does not have storage:write permission');
        }
        await set(prefix + key, value);
      },
      delete: async (key: string) => {
        if (!hasPermission(pluginId, 'storage:write') && !hasPermission(pluginId, 'storage')) {
          throw new Error('Plugin does not have storage:write permission');
        }
        await del(prefix + key);
      },
      clear: async () => {
        if (!hasPermission(pluginId, 'storage:write') && !hasPermission(pluginId, 'storage')) {
          throw new Error('Plugin does not have storage:write permission');
        }
        const allKeys = await keys();
        const pluginKeys = allKeys.filter((k) => String(k).startsWith(prefix));
        await Promise.all(pluginKeys.map((k) => del(k)));
      },
      keys: async () => {
        if (!hasPermission(pluginId, 'storage:read') && !hasPermission(pluginId, 'storage')) {
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
  private createPluginEvents(
    pluginId: string,
    hasPermission: (pluginId: string, permission: PluginPermission) => boolean,
    eventHandlers: Map<string, Set<Function>>,
  ): PluginEvents {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- event emitter uses heterogeneous payloads; per-event generics would require a full typed event map
      on: (event: string, handler: (...args: any[]) => void) => {
        if (!hasPermission(pluginId, 'events:subscribe')) {
          throw new Error('Plugin does not have events:subscribe permission');
        }

        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, new Set());
        }
        eventHandlers.get(event)!.add(handler);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same rationale as `on`
      off: (event: string, handler: (...args: any[]) => void) => {
        const handlers = eventHandlers.get(event);
        if (handlers) {
          handlers.delete(handler);
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- variadic args forwarded verbatim
      emit: (event: string, ...args: any[]) => {
        if (!hasPermission(pluginId, 'events:publish')) {
          throw new Error('Plugin does not have events:publish permission');
        }

        const handlers = eventHandlers.get(event);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(...args);
            } catch (error) {
              logger.error('[PluginService] Error in event handler:', error);
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
      debug: (...args: unknown[]) => logger.debug(`${prefix} ${args.join(' ')}`, 'pluginService'),
      info: (...args: unknown[]) => logger.info(`${prefix} ${args.join(' ')}`, 'pluginService'),
      warn: (...args: unknown[]) => logger.warn(prefix, ...args),
      error: (...args: unknown[]) => logger.error(prefix, ...args),
    };
  }
}

export const pluginContextFactory = new PluginContextFactory();
