/**
 * Project Store
 * Zustand store for project management state
 * v1.3.0 - Workflow Integration
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { projectService, type Project } from '@core/services/projectService';
import { logger } from '@core/services/loggerService';

interface ProjectStore {
  // State
  currentProjectId: string | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  createProject: (data: {
    name: string;
    description?: string;
    tags?: string[];
  }) => Promise<Project | null>;
  loadProject: (id: string) => Promise<Project | null>;
  updateProject: (
    id: string,
    updates: Partial<Omit<Project, 'id' | 'createdAt'>>,
  ) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  archiveProject: (id: string) => Promise<boolean>;
  unarchiveProject: (id: string) => Promise<boolean>;
  duplicateProject: (id: string, newName?: string) => Promise<Project | null>;
  setCurrentProject: (id: string) => Promise<boolean>;
  clearCurrentProject: () => void;
  refreshProjects: () => Promise<void>;
  searchProjects: (query: string) => Promise<Project[]>;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, _get) => ({
      // Initial State
      currentProjectId: null,
      projects: [],
      isLoading: false,
      error: null,

      // Initialize
      initialize: async () => {
        set({ isLoading: true, error: null });
        try {
          await projectService.initialize();
          const projects = await projectService.getAllProjects();
          const currentId = await projectService.getCurrentProjectId();

          set({
            projects,
            currentProjectId: currentId,
            isLoading: false,
          });

          logger.info('Project store initialized', undefined, {
            projectCount: projects.length,
            currentId,
          });
        } catch (error) {
          logger.error('Failed to initialize project store', undefined, error);
          set({ error: 'Failed to initialize projects', isLoading: false });
        }
      },

      // Create Project
      createProject: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const project = await projectService.createProject(data);
          const projects = await projectService.getAllProjects();

          set({
            projects,
            currentProjectId: project.id,
            isLoading: false,
          });

          await projectService.setCurrentProject(project.id);
          return project;
        } catch (error) {
          logger.error('Failed to create project', undefined, error);
          set({ error: 'Failed to create project', isLoading: false });
          return null;
        }
      },

      // Load Project
      loadProject: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const project = await projectService.getProject(id);
          if (project) {
            await projectService.setCurrentProject(id);
            set({ currentProjectId: id, isLoading: false });
            return project;
          }
          set({ error: 'Project not found', isLoading: false });
          return null;
        } catch (error) {
          logger.error('Failed to load project', undefined, error);
          set({ error: 'Failed to load project', isLoading: false });
          return null;
        }
      },

      // Update Project
      updateProject: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await projectService.updateProject(id, updates);
          if (updated) {
            const projects = await projectService.getAllProjects();
            set({ projects, isLoading: false });
            return true;
          }
          set({ error: 'Failed to update project', isLoading: false });
          return false;
        } catch (error) {
          logger.error('Failed to update project', undefined, error);
          set({ error: 'Failed to update project', isLoading: false });
          return false;
        }
      },

      // Delete Project
      deleteProject: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const success = await projectService.deleteProject(id);
          if (success) {
            const projects = await projectService.getAllProjects();
            const currentId = await projectService.getCurrentProjectId();
            set({
              projects,
              currentProjectId: currentId,
              isLoading: false,
            });
            return true;
          }
          set({ error: 'Failed to delete project', isLoading: false });
          return false;
        } catch (error) {
          logger.error('Failed to delete project', undefined, error);
          set({ error: 'Failed to delete project', isLoading: false });
          return false;
        }
      },

      // Archive Project
      archiveProject: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const success = await projectService.archiveProject(id);
          if (success) {
            const projects = await projectService.getAllProjects();
            set({ projects, isLoading: false });
            return true;
          }
          set({ error: 'Failed to archive project', isLoading: false });
          return false;
        } catch (error) {
          logger.error('Failed to archive project', undefined, error);
          set({ error: 'Failed to archive project', isLoading: false });
          return false;
        }
      },

      // Unarchive Project
      unarchiveProject: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const success = await projectService.unarchiveProject(id);
          if (success) {
            const projects = await projectService.getAllProjects();
            set({ projects, isLoading: false });
            return true;
          }
          set({ error: 'Failed to unarchive project', isLoading: false });
          return false;
        } catch (error) {
          logger.error('Failed to unarchive project', undefined, error);
          set({ error: 'Failed to unarchive project', isLoading: false });
          return false;
        }
      },

      // Duplicate Project
      duplicateProject: async (id, newName) => {
        set({ isLoading: true, error: null });
        try {
          const duplicate = await projectService.duplicateProject(id, newName);
          if (duplicate) {
            const projects = await projectService.getAllProjects();
            set({ projects, isLoading: false });
            return duplicate;
          }
          set({ error: 'Failed to duplicate project', isLoading: false });
          return null;
        } catch (error) {
          logger.error('Failed to duplicate project', undefined, error);
          set({ error: 'Failed to duplicate project', isLoading: false });
          return null;
        }
      },

      // Set Current Project
      setCurrentProject: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const success = await projectService.setCurrentProject(id);
          if (success) {
            set({ currentProjectId: id, isLoading: false });
            return true;
          }
          set({ error: 'Failed to set current project', isLoading: false });
          return false;
        } catch (error) {
          logger.error('Failed to set current project', undefined, error);
          set({ error: 'Failed to set current project', isLoading: false });
          return false;
        }
      },

      // Clear Current Project
      clearCurrentProject: () => {
        set({ currentProjectId: null });
      },

      // Refresh Projects
      refreshProjects: async () => {
        set({ isLoading: true, error: null });
        try {
          const projects = await projectService.getAllProjects();
          set({ projects, isLoading: false });
        } catch (error) {
          logger.error('Failed to refresh projects', undefined, error);
          set({ error: 'Failed to refresh projects', isLoading: false });
        }
      },

      // Search Projects
      searchProjects: async (query) => {
        try {
          return await projectService.searchProjects(query);
        } catch (error) {
          logger.error('Failed to search projects', undefined, error);
          return [];
        }
      },
    }),
    {
      name: 'project-store',
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
      }),
    },
  ),
);
