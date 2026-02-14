/**
 * Registry Store
 * Zustand store for remote plugin registry browsing and state.
 * v1.9.0 - Platform Foundations (Sprint 2)
 */

import { create } from 'zustand';
import { registryService } from '@core/services/registryService';
import { logger } from '@core/services/loggerService';
import type {
  RegistryEntry,
  RegistrySearchParams,
  RegistrySearchResult,
  RegistryCategory,
} from '@core/types/registry';

interface RegistryStore {
  // ─── State ──────────────────────────────────────────────────────
  entries: RegistryEntry[];
  searchResult: RegistrySearchResult | null;
  categories: RegistryCategory[];
  tags: string[];
  selectedEntry: RegistryEntry | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  lastFetched: number | null;

  // ─── Actions ────────────────────────────────────────────────────
  initialize: () => Promise<void>;
  fetchIndex: (force?: boolean) => Promise<void>;
  search: (params: RegistrySearchParams) => Promise<RegistrySearchResult>;
  getEntry: (pluginId: string) => Promise<RegistryEntry | null>;
  selectEntry: (entry: RegistryEntry | null) => void;
  clearCache: () => Promise<void>;
  refreshMetadata: () => Promise<void>;
}

export const useRegistryStore = create<RegistryStore>((set, get) => ({
  // ─── Initial State ────────────────────────────────────────────────
  entries: [],
  searchResult: null,
  categories: [],
  tags: [],
  selectedEntry: null,
  isLoading: false,
  isFetching: false,
  error: null,
  lastFetched: null,

  // ─── Initialize ───────────────────────────────────────────────────
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      await get().fetchIndex();
      await get().refreshMetadata();
      set({ isLoading: false });
      logger.info('Registry store initialized');
    } catch (error) {
      logger.error('Failed to initialize registry store', undefined, error);
      set({ error: 'Failed to initialize registry', isLoading: false });
    }
  },

  // ─── Fetch Index ──────────────────────────────────────────────────
  fetchIndex: async (force = false) => {
    set({ isFetching: true, error: null });
    try {
      const index = await registryService.fetchIndex(force);
      if (index) {
        const lastFetched = await registryService.getLastFetched();
        set({
          entries: index.entries,
          lastFetched,
          isFetching: false,
        });
      } else {
        set({ isFetching: false });
      }
    } catch (error) {
      logger.error('Failed to fetch registry index', undefined, error);
      set({ error: 'Failed to fetch registry', isFetching: false });
    }
  },

  // ─── Search ───────────────────────────────────────────────────────
  search: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const result = await registryService.search(params);
      set({ searchResult: result, isLoading: false });
      return result;
    } catch (error) {
      logger.error('Failed to search registry', undefined, error);
      set({ error: 'Failed to search registry', isLoading: false });
      return { entries: [], total: 0, page: 1, hasMore: false };
    }
  },

  // ─── Get Entry ────────────────────────────────────────────────────
  getEntry: async (pluginId) => {
    try {
      return await registryService.getEntry(pluginId);
    } catch (error) {
      logger.error('Failed to get registry entry', undefined, error);
      return null;
    }
  },

  // ─── Select Entry ─────────────────────────────────────────────────
  selectEntry: (entry) => {
    set({ selectedEntry: entry });
  },

  // ─── Clear Cache ──────────────────────────────────────────────────
  clearCache: async () => {
    try {
      await registryService.clearCache();
      set({ entries: [], searchResult: null, lastFetched: null });
      logger.info('Registry cache cleared');
    } catch (error) {
      logger.error('Failed to clear registry cache', undefined, error);
    }
  },

  // ─── Refresh Metadata ─────────────────────────────────────────────
  refreshMetadata: async () => {
    try {
      const [categories, tags] = await Promise.all([
        registryService.getCategories(),
        registryService.getTags(),
      ]);
      set({ categories, tags });
    } catch (error) {
      logger.error('Failed to refresh registry metadata', undefined, error);
    }
  },
}));
