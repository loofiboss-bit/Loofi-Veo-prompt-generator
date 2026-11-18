/**
 * Plugin Health Manager
 * Tracks runtime crash counts, health status, and auto-disabling.
 */

import type { Plugin, PluginHealth } from '../../types/plugin';
import { logger } from '../loggerService';

export class PluginHealthManager {
  /** Maximum crash count before auto-disabling a plugin */
  public static readonly MAX_CRASH_COUNT = 3;

  /**
   * Report a crash for a plugin. Increments crash counter and
   * auto-deactivates after MAX_CRASH_COUNT consecutive crashes.
   */
  async reportCrash(
    plugin: Plugin | undefined,
    error: Error,
    onAutoDisable: (pluginId: string) => Promise<void>,
    notifyListeners: () => void,
  ): Promise<void> {
    if (!plugin) return;

    plugin.health.crashCount += 1;
    plugin.health.lastError = error;
    plugin.health.lastCrashAt = Date.now();

    if (plugin.health.crashCount >= PluginHealthManager.MAX_CRASH_COUNT) {
      plugin.health.status = 'crashed';
      logger.error(
        `[PluginService] Plugin ${plugin.manifest.id} crashed ${plugin.health.crashCount} times — auto-disabling`,
      );
      try {
        await onAutoDisable(plugin.manifest.id);
      } catch {
        // Already logging above; swallow deactivation errors
      }
    } else {
      plugin.health.status = 'degraded';
      logger.warn(
        `[PluginService] Plugin ${plugin.manifest.id} crash #${plugin.health.crashCount}`,
      );
    }

    notifyListeners();
  }

  /**
   * Reset health state for a plugin.
   */
  resetHealth(plugin: Plugin | undefined, notifyListeners: () => void): void {
    if (!plugin) return;

    plugin.health = { status: 'healthy', crashCount: 0 };
    notifyListeners();
  }

  /**
   * Get health status for a plugin.
   */
  getHealth(plugin: Plugin | undefined): PluginHealth | undefined {
    return plugin?.health;
  }
}

export const pluginHealthManager = new PluginHealthManager();
