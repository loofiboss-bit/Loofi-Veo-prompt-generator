/**
 * Workspace Service
 * Manages multi-workspace support — CRUD, project association, and current workspace tracking.
 * v1.9.0 - Platform Foundations
 */

import { get, set, del, keys } from 'idb-keyval';
import { logger } from './loggerService';
import type {
  Workspace,
  WorkspaceSettings,
  CreateWorkspaceData,
  UpdateWorkspaceData,
} from '@core/types/workspace';

const WORKSPACE_PREFIX = 'workspace_';
const CURRENT_WORKSPACE_KEY = 'current_workspace_id';
const DEFAULT_WORKSPACE_ID = 'default';

class WorkspaceService {
  private static instance: WorkspaceService;

  static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService();
    }
    return WorkspaceService.instance;
  }

  // ─── Initialization ──────────────────────────────────────────────

  /**
   * Initialize workspace system.
   * Creates the default workspace and migrates orphan projects on first run.
   * Idempotent — safe to call multiple times.
   */
  async initialize(): Promise<void> {
    try {
      const workspaces = await this.getAllWorkspaces();

      if (workspaces.length === 0) {
        // First run: create default workspace
        await this.createDefaultWorkspace();
        logger.info('Default workspace created');
      }

      // Ensure current workspace is set
      const currentId = await this.getCurrentWorkspaceId();
      if (!currentId) {
        await this.setCurrentWorkspace(DEFAULT_WORKSPACE_ID);
      }
    } catch (error) {
      logger.error('Failed to initialize workspaces', undefined, error);
    }
  }

  /**
   * Migrate existing projects into the default workspace.
   * Call after workspace init and project service init to pick up orphan projects.
   */
  async migrateOrphanProjects(projectIds: string[]): Promise<void> {
    try {
      const defaultWorkspace = await this.getWorkspace(DEFAULT_WORKSPACE_ID);
      if (!defaultWorkspace) return;

      const existingIds = new Set(defaultWorkspace.projectIds);
      const newIds = projectIds.filter((id) => !existingIds.has(id));

      if (newIds.length === 0) return;

      const updatedProjectIds = [...defaultWorkspace.projectIds, ...newIds];
      await this.updateWorkspace(DEFAULT_WORKSPACE_ID, {
        projectIds: updatedProjectIds,
        metadata: {
          ...defaultWorkspace.metadata,
          projectCount: updatedProjectIds.length,
        },
      });

      logger.info('Orphan projects migrated to default workspace', undefined, {
        count: newIds.length,
      });
    } catch (error) {
      logger.error('Failed to migrate orphan projects', undefined, error);
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────

  /**
   * Create a new workspace.
   */
  async createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    try {
      const workspace: Workspace = {
        id: this.generateId(),
        name: data.name,
        description: data.description || '',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        projectIds: [],
        settings: data.settings || {},
        metadata: {
          projectCount: 0,
          lastActivity: Date.now(),
          color: data.color,
          icon: data.icon,
        },
      };

      await set(`${WORKSPACE_PREFIX}${workspace.id}`, workspace);
      logger.info('Workspace created', undefined, { id: workspace.id, name: workspace.name });

      return workspace;
    } catch (error) {
      logger.error('Failed to create workspace', undefined, error);
      throw error;
    }
  }

  /**
   * Get a workspace by ID.
   */
  async getWorkspace(id: string): Promise<Workspace | null> {
    try {
      const workspace = await get<Workspace>(`${WORKSPACE_PREFIX}${id}`);
      return workspace || null;
    } catch (error) {
      logger.error('Failed to get workspace', undefined, error);
      return null;
    }
  }

  /**
   * Get all workspaces, sorted by last modified (newest first).
   */
  async getAllWorkspaces(): Promise<Workspace[]> {
    try {
      const allKeys = await keys();
      const workspaceKeys = allKeys.filter((key) => String(key).startsWith(WORKSPACE_PREFIX));

      const workspaces: Workspace[] = [];
      for (const key of workspaceKeys) {
        const workspace = await get<Workspace>(key);
        if (workspace) {
          workspaces.push(workspace);
        }
      }

      workspaces.sort((a, b) => b.modifiedAt - a.modifiedAt);
      return workspaces;
    } catch (error) {
      logger.error('Failed to get all workspaces', undefined, error);
      return [];
    }
  }

  /**
   * Update an existing workspace.
   */
  async updateWorkspace(id: string, updates: UpdateWorkspaceData): Promise<Workspace | null> {
    try {
      const existing = await this.getWorkspace(id);
      if (!existing) {
        logger.warn('Workspace not found for update', undefined, { id });
        return null;
      }

      const updated: Workspace = {
        ...existing,
        ...updates,
        id: existing.id, // Prevent ID change
        createdAt: existing.createdAt, // Prevent creation date change
        modifiedAt: Date.now(),
      };

      await set(`${WORKSPACE_PREFIX}${id}`, updated);
      logger.info('Workspace updated', undefined, { id });

      return updated;
    } catch (error) {
      logger.error('Failed to update workspace', undefined, error);
      return null;
    }
  }

  /**
   * Delete a workspace. Projects are moved to the default workspace.
   * The default workspace cannot be deleted.
   */
  async deleteWorkspace(id: string): Promise<boolean> {
    try {
      if (id === DEFAULT_WORKSPACE_ID) {
        logger.warn('Cannot delete default workspace');
        return false;
      }

      const workspace = await this.getWorkspace(id);
      if (!workspace) {
        logger.warn('Workspace not found for deletion', undefined, { id });
        return false;
      }

      // Move projects to default workspace
      if (workspace.projectIds.length > 0) {
        const defaultWorkspace = await this.getWorkspace(DEFAULT_WORKSPACE_ID);
        if (defaultWorkspace) {
          const mergedIds = [...new Set([...defaultWorkspace.projectIds, ...workspace.projectIds])];
          await this.updateWorkspace(DEFAULT_WORKSPACE_ID, {
            projectIds: mergedIds,
            metadata: {
              ...defaultWorkspace.metadata,
              projectCount: mergedIds.length,
            },
          });
        }
      }

      await del(`${WORKSPACE_PREFIX}${id}`);
      logger.info('Workspace deleted', undefined, {
        id,
        projectsMigrated: workspace.projectIds.length,
      });

      // If current workspace was deleted, switch to default
      const currentId = await this.getCurrentWorkspaceId();
      if (currentId === id) {
        await this.setCurrentWorkspace(DEFAULT_WORKSPACE_ID);
      }

      return true;
    } catch (error) {
      logger.error('Failed to delete workspace', undefined, error);
      return false;
    }
  }

  // ─── Current Workspace ────────────────────────────────────────────

  /**
   * Get the current active workspace ID.
   */
  async getCurrentWorkspaceId(): Promise<string | null> {
    try {
      const id = await get<string>(CURRENT_WORKSPACE_KEY);
      return id || null;
    } catch (error) {
      logger.error('Failed to get current workspace ID', undefined, error);
      return null;
    }
  }

  /**
   * Set the current active workspace.
   */
  async setCurrentWorkspace(id: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(id);
      if (!workspace) {
        logger.warn('Cannot set non-existent workspace as current', undefined, { id });
        return false;
      }

      await set(CURRENT_WORKSPACE_KEY, id);

      // Update last activity
      await this.updateWorkspace(id, {
        metadata: {
          ...workspace.metadata,
          lastActivity: Date.now(),
        },
      });

      logger.info('Current workspace set', undefined, { id });
      return true;
    } catch (error) {
      logger.error('Failed to set current workspace', undefined, error);
      return false;
    }
  }

  // ─── Project–Workspace Association ────────────────────────────────

  /**
   * Add a project to a workspace.
   */
  async addProjectToWorkspace(workspaceId: string, projectId: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) {
        logger.warn('Workspace not found', undefined, { workspaceId });
        return false;
      }

      if (workspace.projectIds.includes(projectId)) {
        return true; // Already associated
      }

      const updatedIds = [...workspace.projectIds, projectId];
      await this.updateWorkspace(workspaceId, {
        projectIds: updatedIds,
        metadata: {
          ...workspace.metadata,
          projectCount: updatedIds.length,
          lastActivity: Date.now(),
        },
      });

      logger.info('Project added to workspace', undefined, { workspaceId, projectId });
      return true;
    } catch (error) {
      logger.error('Failed to add project to workspace', undefined, error);
      return false;
    }
  }

  /**
   * Remove a project from a workspace.
   */
  async removeProjectFromWorkspace(workspaceId: string, projectId: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) {
        logger.warn('Workspace not found', undefined, { workspaceId });
        return false;
      }

      const updatedIds = workspace.projectIds.filter((id) => id !== projectId);
      if (updatedIds.length === workspace.projectIds.length) {
        return true; // Not in workspace anyway
      }

      await this.updateWorkspace(workspaceId, {
        projectIds: updatedIds,
        metadata: {
          ...workspace.metadata,
          projectCount: updatedIds.length,
        },
      });

      logger.info('Project removed from workspace', undefined, { workspaceId, projectId });
      return true;
    } catch (error) {
      logger.error('Failed to remove project from workspace', undefined, error);
      return false;
    }
  }

  /**
   * Get project IDs belonging to a workspace.
   */
  async getProjectsInWorkspace(workspaceId: string): Promise<string[]> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      return workspace?.projectIds || [];
    } catch (error) {
      logger.error('Failed to get workspace projects', undefined, error);
      return [];
    }
  }

  // ─── Settings ─────────────────────────────────────────────────────

  /**
   * Get workspace-level settings.
   */
  async getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      return workspace?.settings || {};
    } catch (error) {
      logger.error('Failed to get workspace settings', undefined, error);
      return {};
    }
  }

  /**
   * Update workspace-level settings (sparse merge).
   */
  async updateWorkspaceSettings(
    workspaceId: string,
    settings: Partial<WorkspaceSettings>,
  ): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) return false;

      const updated = await this.updateWorkspace(workspaceId, {
        settings: {
          ...workspace.settings,
          ...settings,
        },
      });

      return updated !== null;
    } catch (error) {
      logger.error('Failed to update workspace settings', undefined, error);
      return false;
    }
  }

  /**
   * Reset workspace settings to empty (inherit all from global).
   */
  async resetWorkspaceSettings(workspaceId: string): Promise<boolean> {
    try {
      const updated = await this.updateWorkspace(workspaceId, { settings: {} });
      return updated !== null;
    } catch (error) {
      logger.error('Failed to reset workspace settings', undefined, error);
      return false;
    }
  }

  // ─── Search ───────────────────────────────────────────────────────

  /**
   * Search workspaces by name or description.
   */
  async searchWorkspaces(query: string): Promise<Workspace[]> {
    try {
      const workspaces = await this.getAllWorkspaces();
      const lowerQuery = query.toLowerCase();

      return workspaces.filter(
        (w) =>
          w.name.toLowerCase().includes(lowerQuery) ||
          w.description.toLowerCase().includes(lowerQuery),
      );
    } catch (error) {
      logger.error('Failed to search workspaces', undefined, error);
      return [];
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  /**
   * Get the default workspace ID constant.
   */
  getDefaultWorkspaceId(): string {
    return DEFAULT_WORKSPACE_ID;
  }

  /**
   * Create the default workspace (used during initialization).
   */
  private async createDefaultWorkspace(): Promise<Workspace> {
    const workspace: Workspace = {
      id: DEFAULT_WORKSPACE_ID,
      name: 'Default Workspace',
      description: 'Your main workspace for all projects',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      projectIds: [],
      settings: {},
      metadata: {
        projectCount: 0,
        lastActivity: Date.now(),
        color: '#6366f1', // Indigo
        icon: 'folder',
      },
    };

    await set(`${WORKSPACE_PREFIX}${workspace.id}`, workspace);
    return workspace;
  }

  /**
   * Generate a unique workspace ID.
   */
  private generateId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const workspaceService = WorkspaceService.getInstance();
