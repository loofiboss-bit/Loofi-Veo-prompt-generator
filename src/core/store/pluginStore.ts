/**
 * Plugin Store
 * v1.4.0 Week 4 - Plugin Architecture Foundation
 */

import { create } from 'zustand';
import { pluginService } from '@core/services/pluginService';
import type { Plugin, PluginManifest } from '../types/plugin';

interface PluginStore {
    // State
    plugins: Plugin[];
    loading: boolean;
    error: string | null;
    selectedPlugin: Plugin | null;

    // Actions
    initialize: () => Promise<void>;
    loadPlugin: (manifest: PluginManifest) => Promise<void>;
    unloadPlugin: (pluginId: string) => Promise<void>;
    activatePlugin: (pluginId: string) => Promise<void>;
    deactivatePlugin: (pluginId: string) => Promise<void>;
    selectPlugin: (plugin: Plugin | null) => void;
    refreshPlugins: () => void;
}

export const usePluginStore = create<PluginStore>((set, get) => ({
    // Initial state
    plugins: [],
    loading: false,
    error: null,
    selectedPlugin: null,

    // Initialize plugin system
    initialize: async () => {
        set({ loading: true, error: null });
        try {
            await pluginService.initialize();
            get().refreshPlugins();
        } catch (error) {
            set({ error: (error as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    // Load a plugin
    loadPlugin: async (manifest: PluginManifest) => {
        set({ loading: true, error: null });
        try {
            const result = await pluginService.load(manifest);
            if (!result.success) {
                throw result.error;
            }
            get().refreshPlugins();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    // Unload a plugin
    unloadPlugin: async (pluginId: string) => {
        set({ loading: true, error: null });
        try {
            await pluginService.unload(pluginId);
            get().refreshPlugins();

            // Clear selection if unloaded plugin was selected
            if (get().selectedPlugin?.manifest.id === pluginId) {
                set({ selectedPlugin: null });
            }
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    // Activate a plugin
    activatePlugin: async (pluginId: string) => {
        set({ loading: true, error: null });
        try {
            await pluginService.activate(pluginId);
            get().refreshPlugins();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    // Deactivate a plugin
    deactivatePlugin: async (pluginId: string) => {
        set({ loading: true, error: null });
        try {
            await pluginService.deactivate(pluginId);
            get().refreshPlugins();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    // Select a plugin
    selectPlugin: (plugin: Plugin | null) => {
        set({ selectedPlugin: plugin });
    },

    // Refresh plugins list
    refreshPlugins: () => {
        const plugins = pluginService.getAll();
        set({ plugins });
    },
}));
