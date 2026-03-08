/**
 * History Store
 * Zustand store for prompt history management
 * v1.4.0 - Git-like Prompt Branching
 */

import { create } from 'zustand';
import {
  historyService,
  type HistoryEntry,
  type HistoryFilter,
  type HistoryStats,
} from '@core/services/historyService';
import { branchService } from '@core/services/branchService';
import { logger } from '@core/services/loggerService';
import type { BranchNode, PromptBranch, BranchTree } from '@core/types';

interface HistoryStore {
  // State
  entries: HistoryEntry[];
  stats: HistoryStats | null;
  isLoading: boolean;
  error: string | null;
  filter: HistoryFilter;

  // Branch State
  branchTree: BranchTree | null;
  viewMode: 'list' | 'tree';

  // Actions
  initialize: () => Promise<void>;
  addEntry: (
    entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'version'>,
  ) => Promise<HistoryEntry | null>;
  getEntries: (filter?: HistoryFilter) => Promise<void>;
  updateEntry: (id: string, updates: Partial<HistoryEntry>) => Promise<boolean>;
  rateEntry: (id: string, rating: number) => Promise<boolean>;
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

  // Branch Actions
  forkBranch: (fromNodeId: string, name?: string) => Promise<PromptBranch | null>;
  switchBranch: (branchId: string) => Promise<void>;
  setActiveNode: (nodeId: string) => Promise<void>;
  renameBranch: (branchId: string, newName: string) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
  setViewMode: (mode: 'list' | 'tree') => void;
  getActiveBranch: () => PromptBranch | null;
  getActiveNode: () => BranchNode | null;
  getBranchEntries: (branchId: string) => HistoryEntry[];
  refreshBranchTree: () => Promise<void>;
}

const initialFilter: HistoryFilter = {};
let filterRequestId = 0;

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  // Initial State
  entries: [],
  stats: null,
  isLoading: false,
  error: null,
  filter: initialFilter,

  // Branch State
  branchTree: null,
  viewMode: 'list' as const,

  // Initialize
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const entries = await historyService.getEntries();
      const stats = await historyService.getStats();
      const branchTree = await branchService.loadTree();

      set({
        entries,
        stats,
        branchTree,
        isLoading: false,
      });

      logger.info('History store initialized with branching');
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

      // Add node to branch tree
      const tree = branchService.getTree();
      const activeBranch = tree.branches[tree.activeBranchId];
      entry.branchId = activeBranch?.id;
      entry.parentId = activeBranch?.activeNodeId || null;
      await branchService.addNode(entry);

      // Refresh entries and stats
      const entries = await historyService.getEntries(get().filter);
      const stats = await historyService.getStats();
      const branchTree = await branchService.loadTree();

      set({
        entries,
        stats,
        branchTree,
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

  // Rate Entry
  rateEntry: async (id, rating) => {
    try {
      const updated = await historyService.rateEntry(id, rating);
      if (updated) {
        const entries = await historyService.getEntries(get().filter);
        set({ entries });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to rate history entry', undefined, error);
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
    const requestId = ++filterRequestId;
    historyService.getEntries(newFilter).then((entries) => {
      if (requestId === filterRequestId) {
        set({ entries });
      }
    });
  },

  // Reset Filter
  resetFilter: () => {
    set({ filter: initialFilter });
    const requestId = ++filterRequestId;
    historyService.getEntries(initialFilter).then((entries) => {
      if (requestId === filterRequestId) {
        set({ entries });
      }
    });
  },

  // Branch Actions
  forkBranch: async (fromNodeId, name) => {
    try {
      const newBranch = await branchService.forkBranch(fromNodeId, name);
      const branchTree = await branchService.loadTree();
      set({ branchTree });
      return newBranch;
    } catch (error) {
      logger.error('Failed to fork branch', undefined, error);
      set({ error: 'Failed to fork branch' });
      return null;
    }
  },

  switchBranch: async (branchId) => {
    try {
      await branchService.switchBranch(branchId);
      const branchTree = await branchService.loadTree();
      set({ branchTree });
    } catch (error) {
      logger.error('Failed to switch branch', undefined, error);
    }
  },

  setActiveNode: async (nodeId) => {
    try {
      await branchService.setActiveNode(nodeId);
      const branchTree = await branchService.loadTree();
      set({ branchTree });
    } catch (error) {
      logger.error('Failed to set active node', undefined, error);
    }
  },

  renameBranch: async (branchId, newName) => {
    try {
      await branchService.renameBranch(branchId, newName);
      const branchTree = await branchService.loadTree();
      set({ branchTree });
    } catch (error) {
      logger.error('Failed to rename branch', undefined, error);
    }
  },

  deleteBranch: async (branchId) => {
    try {
      await branchService.deleteBranch(branchId);
      const branchTree = await branchService.loadTree();
      set({ branchTree });
    } catch (error) {
      logger.error('Failed to delete branch', undefined, error);
    }
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  getActiveBranch: () => {
    const { branchTree } = get();
    if (!branchTree) return null;
    return branchTree.branches[branchTree.activeBranchId] || null;
  },

  getActiveNode: () => {
    const { branchTree } = get();
    if (!branchTree) return null;
    const activeBranch = branchTree.branches[branchTree.activeBranchId];
    if (!activeBranch) return null;
    return branchTree.nodes[activeBranch.activeNodeId] || null;
  },

  getBranchEntries: (branchId) => {
    const { entries } = get();
    const branchNodes = branchService.getBranchNodes(branchId);
    const entryMap = new Map(entries.map((e) => [e.id, e]));
    return branchNodes
      .map((n) => entryMap.get(n.entryId))
      .filter((e): e is HistoryEntry => e !== undefined);
  },

  refreshBranchTree: async () => {
    try {
      const branchTree = await branchService.loadTree();
      set({ branchTree });
    } catch (error) {
      logger.error('Failed to refresh branch tree', undefined, error);
    }
  },
}));
