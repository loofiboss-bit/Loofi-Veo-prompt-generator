/**
 * Plugin Manifest & Configuration Storage
 * Encapsulates idb-keyval operations for plugin manifests and enabled status.
 */

import { get, set, del } from 'idb-keyval';
import type { PluginManifest } from '../../types/plugin';

export class PluginStorageManager {
  /**
   * Load manifest from key-value store.
   */
  async loadManifest(pluginId: string): Promise<PluginManifest | null> {
    return (await get<PluginManifest>(`plugin:manifest:${pluginId}`)) ?? null;
  }

  /**
   * Save manifest to key-value store.
   */
  async saveManifest(manifest: PluginManifest): Promise<void> {
    await set(`plugin:manifest:${manifest.id}`, manifest);
  }

  /**
   * Delete manifest from key-value store.
   */
  async deleteManifest(pluginId: string): Promise<void> {
    await del(`plugin:manifest:${pluginId}`);
  }

  /**
   * Get list of enabled plugin IDs.
   */
  async getEnabledPlugins(): Promise<string[]> {
    return (await get<string[]>('plugin:enabled')) || [];
  }

  /**
   * Add plugin ID to enabled list.
   */
  async addEnabledPlugin(pluginId: string): Promise<void> {
    const enabled = await this.getEnabledPlugins();
    if (!enabled.includes(pluginId)) {
      enabled.push(pluginId);
      await set('plugin:enabled', enabled);
    }
  }

  /**
   * Remove plugin ID from enabled list.
   */
  async removeEnabledPlugin(pluginId: string): Promise<void> {
    const enabled = await this.getEnabledPlugins();
    const filtered = enabled.filter((id) => id !== pluginId);
    await set('plugin:enabled', filtered);
  }
}

export const pluginStorageManager = new PluginStorageManager();
