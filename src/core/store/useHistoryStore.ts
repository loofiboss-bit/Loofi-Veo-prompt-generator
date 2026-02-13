/**
 * History Store
 * Zustand store for prompt history management
 * v1.3.0 - Workflow Integration
 */

import { create } from 'zustand';
import {
  historyService,
  type HistoryEntry,
  type HistoryFilter,
  type HistoryStats,
} from '@core/services/historyService';
import { logger } from '@core/services/loggerService';

interface HistoryStore {
  // State
  entries: HistoryEntry[];
  stats: HistoryStats | null;
  isLoading: boolean;
  error: string | null;
  filter: HistoryFilter;

  // Actions
  initialize: () => Promise<void>;
  addEntry: (
    entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'version'>,
  ) => Promise<HistoryEntry | null>;
  getEntries: (filter?: HistoryFilter) => Promise<void>;
  updateEntry: (id: string, updates: Partial<HistoryEntry>) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<boolean>;
  deleteEntries: (ids: string[]) => Promise<number>;
  toggleFavorite: (id: string) => Promise<boolean>;
  addTags: (id: string, tags: string[]) => Promise<boolean>;
  removeTags: (id: string, tags: string[]) => Promise<boolean>;
  getStats: (projectId?: string) => Promise<void>;
  exportHistory: (format: 'json' | 'csv', filter?: HistoryFilter) => Promise<string | null>;
  clearHistory: (projectId?: string) => Promise<number>;
  setFilter: (filter: Partial<HistoryFilter>) => void;
  resetFilter: () => void;
}

const initialFilter: HistoryFilter = {};

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  // Initial State
  entries: [],
  stats: null,
  isLoading: false,
  error: null,
  filter: initialFilter,

  // Initialize
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const entries = await historyService.getEntries();
      const stats = await historyService.getStats();

      set({
        entries,
        stats,
        isLoading: false,
      });

      logger.info('History store initialized');
    } catch (error) {
      logger.error('Failed to initialize history store', undefined, error);
      set({ error: 'Failed to initialize history', isLoading: false });
    }
  },

  // Add Entry
  addEntry: async (entryData) => {
    set({ isLoading: true, error: null });
    try {
      const entry = await historyService.addEntry(
        entryData.prompt,
        entryData.params,
        entryData.metadata,
        entryData.projectId,
        entryData.tags,
      );

      // Refresh entries and stats
      const entries = await historyService.getEntries(get().filter);
      const stats = await historyService.getStats();

      set({
        entries,
        stats,
        isLoading: false,
      });

      return entry;
    } catch (error) {
      logger.error('Failed to add history entry', undefined, error);
      set({ error: 'Failed to add entry', isLoading: false });
      return null;
    }
  },

  // Get Entries
  getEntries: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const filterToUse = filter || get().filter;
      const entries = await historyService.getEntries(filterToUse);

      set({
        entries,
        filter: filterToUse,
        isLoading: false,
      });
    } catch (error) {
      logger.error('Failed to get history entries', undefined, error);
      set({ error: 'Failed to load entries', isLoading: false });
    }
  },

  // Update Entry
  updateEntry: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await historyService.updateEntry(id, updates);
      if (updated) {
        const entries = await historyService.getEntries(get().filter);
        set({ entries, isLoading: false });
        return true;
      }
      set({ error: 'Failed to update entry', isLoading: false });
      return false;
    } catch (error) {
      logger.error('Failed to update history entry', undefined, error);
      set({ error: 'Failed to update entry', isLoading: false });
      return false;
    }
  },

  // Delete Entry
  deleteEntry: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const success = await historyService.deleteEntry(id);
      if (success) {
        const entries = await historyService.getEntries(get().filter);
        const stats = await historyService.getStats();
        set({ entries, stats, isLoading: false });
        return true;
      }
      set({ error: 'Failed to delete entry', isLoading: false });
      return false;
    } catch (error) {
      logger.error('Failed to delete history entry', undefined, error);
      set({ error: 'Failed to delete entry', isLoading: false });
      return false;
    }
  },

  // Delete Multiple Entries
  deleteEntries: async (ids) => {
    set({ isLoading: true, error: null });
    try {
      const deleted = await historyService.deleteEntries(ids);
      const entries = await historyService.getEntries(get().filter);
      const stats = await historyService.getStats();

      set({ entries, stats, isLoading: false });
      return deleted;
    } catch (error) {
      logger.error('Failed to delete history entries', undefined, error);
      set({ error: 'Failed to delete entries', isLoading: false });
      return 0;
    }
  },

  // Toggle Favorite
  toggleFavorite: async (id) => {
    try {
      const success = await historyService.toggleFavorite(id);
      if (success) {
        const entries = await historyService.getEntries(get().filter);
        const stats = await historyService.getStats();
        set({ entries, stats });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to toggle favorite', undefined, error);
      return false;
    }
  },

  // Add Tags
  addTags: async (id, tags) => {
    try {
      const success = await historyService.addTags(id, tags);
      if (success) {
        const entries = await historyService.getEntries(get().filter);
        set({ entries });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to add tags', undefined, error);
      return false;
    }
  },

  // Remove Tags
  removeTags: async (id, tags) => {
    try {
      const success = await historyService.removeTags(id, tags);
      if (success) {
        const entries = await historyService.getEntries(get().filter);
        set({ entries });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to remove tags', undefined, error);
      return false;
    }
  },

  // Get Stats
  getStats: async (projectId) => {
    try {
      const stats = await historyService.getStats(projectId);
      set({ stats });
    } catch (error) {
      logger.error('Failed to get history stats', undefined, error);
    }
  },

  // Export History
  exportHistory: async (format, filter) => {
    set({ isLoading: true, error: null });
    try {
      const filterToUse = filter || get().filter;
      const exported = await historyService.exportHistory(format, filterToUse);
      set({ isLoading: false });
      return exported;
    } catch (error) {
      logger.error('Failed to export history', undefined, error);
      set({ error: 'Failed to export history', isLoading: false });
      return null;
    }
  },

  // Clear History
  clearHistory: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const deleted = await historyService.clearHistory(projectId);
      const entries = await historyService.getEntries(get().filter);
      const stats = await historyService.getStats();

      set({ entries, stats, isLoading: false });
      return deleted;
    } catch (error) {
      logger.error('Failed to clear history', undefined, error);
      set({ error: 'Failed to clear history', isLoading: false });
      return 0;
    }
  },

  // Set Filter
  setFilter: (filterUpdates) => {
    const newFilter = { ...get().filter, ...filterUpdates };
    set({ filter: newFilter });
    get().getEntries(newFilter);
  },

  // Reset Filter
  resetFilter: () => {
    set({ filter: initialFilter });
    get().getEntries(initialFilter);
  },
}));
