/**
 * Plugin Trust Manager
 * Manages trust levels and Ed25519 signature evaluation for plugin manifests.
 */

import type { Plugin, PluginManifest, PluginTrustLevel } from '../../types/plugin';
import { determinePluginTrustLevel } from '../../utils/pluginCrypto';
import { logger } from '../loggerService';

export class PluginTrustManager {
  /**
   * Evaluate the trust level of a plugin manifest.
   * Wraps the crypto utility with fallback for environments without Ed25519.
   */
  async evaluateTrustLevel(manifest: PluginManifest): Promise<PluginTrustLevel> {
    try {
      return await determinePluginTrustLevel(manifest);
    } catch (error) {
      logger.warn('[PluginService] Trust evaluation failed, marking as unsigned:', error);
      return manifest.signature ? 'invalid' : 'unsigned';
    }
  }

  /**
   * Get trust level of a plugin.
   */
  getTrustLevel(plugin: Plugin | undefined): PluginTrustLevel | undefined {
    return plugin?.trustLevel;
  }

  /**
   * Re-evaluate the trust level of a loaded plugin.
   */
  async refreshTrustLevel(
    plugin: Plugin | undefined,
    notifyListeners: () => void,
  ): Promise<PluginTrustLevel | undefined> {
    if (!plugin) return undefined;

    const trustLevel = await this.evaluateTrustLevel(plugin.manifest);
    plugin.trustLevel = trustLevel;
    notifyListeners();
    return trustLevel;
  }

  /**
   * Filter plugins by trust level.
   */
  getPluginsByTrust(plugins: Plugin[], trustLevel: PluginTrustLevel): Plugin[] {
    return plugins.filter((p) => p.trustLevel === trustLevel);
  }
}

export const pluginTrustManager = new PluginTrustManager();
