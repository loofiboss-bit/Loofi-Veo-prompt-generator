/**
 * Workspace Store
 * Zustand store for multi-workspace management state.
 * v1.9.0 - Platform Foundations (Sprint 2)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { workspaceService } from '@core/services/workspaceService';
import { logger } from '@core/services/loggerService';
import { idbStorage } from '@core/utils/storage';
import type { Workspace, CreateWorkspaceData, WorkspaceSettings } from '@core/types/workspace';

interface WorkspaceStore {
  // ─── State ──────────────────────────────────────────────────────
  currentWorkspaceId: string | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;

  // ─── Actions ────────────────────────────────────────────────────
  initialize: () => Promise<void>;
  createWorkspace: (data: CreateWorkspaceData) => Promise<Workspace | null>;
  updateWorkspace: (
    id: string,
    updates: Partial<Omit<Workspace, 'id' | 'createdAt'>>,
  ) => Promise<boolean>;
  deleteWorkspace: (id: string) => Promise<boolean>;
  setCurrentWorkspace: (id: string) => Promise<boolean>;
  refreshWorkspaces: () => Promise<void>;
  searchWorkspaces: (query: string) => Promise<Workspace[]>;

  // ─── Project Association ────────────────────────────────────────
  addProjectToWorkspace: (workspaceId: string, projectId: string) => Promise<boolean>;
  removeProjectFromWorkspace: (workspaceId: string, projectId: string) => Promise<boolean>;

  // ─── Settings ───────────────────────────────────────────────────
  updateWorkspaceSettings: (
    workspaceId: string,
    settings: Partial<WorkspaceSettings>,
  ) => Promise<boolean>;
  resetWorkspaceSettings: (workspaceId: string) => Promise<boolean>;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, _get) => ({
      // ─── Initial State ────────────────────────────────────────────
      currentWorkspaceId: null,
      workspaces: [],
      isLoading: false,
      error: null,

      // ─── Initialize ───────────────────────────────────────────────
      initialize: async () => {
        set({ isLoading: true, error: null });
        try {
          await workspaceService.initialize();
          const workspaces = await workspaceService.getAllWorkspaces();
          const currentId = await workspaceService.getCurrentWorkspaceId();

          set({
            workspaces,
            currentWorkspaceId: currentId,
            isLoading: false,
          });

          logger.info('Workspace store initialized', undefined, {
            workspaceCount: workspaces.length,
            currentId,
          });
        } catch (error) {
          logger.error('Failed to initialize workspace store', undefined, error);
          set({ error: 'Failed to initialize workspaces', isLoading: false });
        }
      },

      // ─── Create Workspace ─────────────────────────────────────────
      createWorkspace: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const workspace = await workspaceService.createWorkspace(data);
          const workspaces = await workspaceService.getAllWorkspaces();
          set({ workspaces, isLoading: false });
          return workspace;
        } catch (error) {
          logger.error('Failed to create workspace', undefined, error);
          set({ error: 'Failed to create workspace', isLoading: false });
          return null;
        }
      },

      // ─── Update Workspace ─────────────────────────────────────────
      updateWorkspace: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await workspaceService.updateWorkspace(id, updates);
          if (updated) {
            const workspaces = await workspaceService.getAllWorkspaces();
            set({ workspaces, isLoading: false });
            return true;
          }
          set({ error: 'Failed to update workspace', isLoading: false });
          return false;
        } catch (error) {
          logger.error('Failed to update workspace', undefined, error);
          set({ error: 'Failed to update workspace', isLoading: false });
          return false;
        }
      },

      // ─── Delete Workspace ─────────────────────────────────────────
      deleteWorkspace: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const success = await workspaceService.deleteWorkspace(id);
          if (success) {
            const workspaces = await workspaceService.getAllWorkspaces();
            const currentId = await workspaceService.getCurrentWorkspaceId();
            set({ workspaces, currentWorkspaceId: currentId, isLoading: false });
            return true;
          }
          set({ error: 'Failed to delete workspace', isLoading: false });
          return false;
        } catch (error) {
          logger.error('Failed to delete workspace', undefined, error);
          set({ error: 'Failed to delete workspace', isLoading: false });
          return false;
        }
      },

      // ─── Set Current Workspace ─────────────────────────────────────
      setCurrentWorkspace: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const success = await workspaceService.setCurrentWorkspace(id);
          if (success) {
            set({ currentWorkspaceId: id, isLoading: false });
            return true;
          }
          set({ error: 'Failed to set current workspace', isLoading: false });
          return false;
        } catch (error) {
          logger.error('Failed to set current workspace', undefined, error);
          set({ error: 'Failed to set current workspace', isLoading: false });
          return false;
        }
      },

      // ─── Refresh Workspaces ────────────────────────────────────────
      refreshWorkspaces: async () => {
        set({ isLoading: true, error: null });
        try {
          const workspaces = await workspaceService.getAllWorkspaces();
          set({ workspaces, isLoading: false });
        } catch (error) {
          logger.error('Failed to refresh workspaces', undefined, error);
          set({ error: 'Failed to refresh workspaces', isLoading: false });
        }
      },

      // ─── Search Workspaces ─────────────────────────────────────────
      searchWorkspaces: async (query) => {
        try {
          return await workspaceService.searchWorkspaces(query);
        } catch (error) {
          logger.error('Failed to search workspaces', undefined, error);
          return [];
        }
      },

      // ─── Project Association ───────────────────────────────────────
      addProjectToWorkspace: async (workspaceId, projectId) => {
        try {
          const success = await workspaceService.addProjectToWorkspace(workspaceId, projectId);
          if (success) {
            const workspaces = await workspaceService.getAllWorkspaces();
            set({ workspaces });
          }
          return success;
        } catch (error) {
          logger.error('Failed to add project to workspace', undefined, error);
          return false;
        }
      },

      removeProjectFromWorkspace: async (workspaceId, projectId) => {
        try {
          const success = await workspaceService.removeProjectFromWorkspace(workspaceId, projectId);
          if (success) {
            const workspaces = await workspaceService.getAllWorkspaces();
            set({ workspaces });
          }
          return success;
        } catch (error) {
          logger.error('Failed to remove project from workspace', undefined, error);
          return false;
        }
      },

      // ─── Workspace Settings ────────────────────────────────────────
      updateWorkspaceSettings: async (workspaceId, settings) => {
        try {
          const success = await workspaceService.updateWorkspaceSettings(workspaceId, settings);
          if (success) {
            const workspaces = await workspaceService.getAllWorkspaces();
            set({ workspaces });
          }
          return success;
        } catch (error) {
          logger.error('Failed to update workspace settings', undefined, error);
          return false;
        }
      },

      resetWorkspaceSettings: async (workspaceId) => {
        try {
          const success = await workspaceService.resetWorkspaceSettings(workspaceId);
          if (success) {
            const workspaces = await workspaceService.getAllWorkspaces();
            set({ workspaces });
          }
          return success;
        } catch (error) {
          logger.error('Failed to reset workspace settings', undefined, error);
          return false;
        }
      },
    }),
    {
      name: 'workspace-store',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspaceId,
      }),
    },
  ),
);
