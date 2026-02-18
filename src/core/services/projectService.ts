/**
 * Project Service
 * Manages project-based organization and workspace isolation
 * v1.3.0 - Workflow Integration
 * v1.9.0 - Workspace integration (auto-associate projects with workspaces)
 */

import { get, set, del, keys } from 'idb-keyval';
import { logger } from './loggerService';
import { workspaceService } from './workspaceService';
import { historyService } from './historyService';
import { getUserTemplates } from './templateManager';
import { getAllPresets } from './presetManager';

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  modifiedAt: number;
  tags: string[];
  status: 'active' | 'archived';
  settings: ProjectSettings;
  metadata: ProjectMetadata;
}

export interface ProjectSettings {
  defaultModel?: string;
  defaultAspectRatio?: string;
  defaultDuration?: number;
  autosaveInterval?: number;
  theme?: 'light' | 'dark';
  customPresets?: string[];
  customTemplates?: string[];
}

export interface ProjectMetadata {
  totalPrompts?: number;
  totalVideos?: number;
  lastActivity?: number;
  favoriteCount?: number;
  category?: string;
  color?: string;
  icon?: string;
}

export interface ProjectExportOptions {
  /** Include prompt history entries for this project (default: false) */
  includeHistory?: boolean;
  /** Include user templates (default: false) */
  includeTemplates?: boolean;
  /** Include user presets (default: false) */
  includePresets?: boolean;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  archivedProjects: number;
  totalPrompts: number;
  recentActivity: Array<{ projectId: string; timestamp: number }>;
}

class ProjectService {
  private readonly PROJECT_PREFIX = 'project_';
  private readonly CURRENT_PROJECT_KEY = 'current_project_id';
  private readonly DEFAULT_PROJECT_ID = 'default';

  /**
   * Initialize default project if none exists
   */
  async initialize(): Promise<void> {
    try {
      const projects = await this.getAllProjects();

      if (projects.length === 0) {
        // Create default project
        await this.createProject({
          name: 'My First Project',
          description: 'Default project for getting started',
          tags: ['default'],
        });

        logger.info('Default project created');
      }

      // Ensure current project is set
      const currentId = await this.getCurrentProjectId();
      if (!currentId) {
        await this.setCurrentProject(this.DEFAULT_PROJECT_ID);
      }
    } catch (error) {
      logger.error('Failed to initialize projects', undefined, error);
    }
  }

  /**
   * Create a new project and auto-associate with the current workspace.
   */
  async createProject(data: {
    name: string;
    description?: string;
    tags?: string[];
    settings?: Partial<ProjectSettings>;
    workspaceId?: string;
  }): Promise<Project> {
    try {
      const project: Project = {
        id: data.name === 'My First Project' ? this.DEFAULT_PROJECT_ID : this.generateId(),
        name: data.name,
        description: data.description || '',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        tags: data.tags || [],
        status: 'active',
        settings: {
          autosaveInterval: 60000, // 1 minute
          ...data.settings,
        },
        metadata: {
          totalPrompts: 0,
          totalVideos: 0,
          lastActivity: Date.now(),
          favoriteCount: 0,
        },
      };

      await set(`${this.PROJECT_PREFIX}${project.id}`, project);
      logger.info('Project created', undefined, { id: project.id, name: project.name });

      // Auto-associate with workspace
      const targetWorkspaceId =
        data.workspaceId || (await workspaceService.getCurrentWorkspaceId());
      if (targetWorkspaceId) {
        await workspaceService.addProjectToWorkspace(targetWorkspaceId, project.id);
      }

      return project;
    } catch (error) {
      logger.error('Failed to create project', undefined, error);
      throw error;
    }
  }

  /**
   * Get a specific project by ID
   */
  async getProject(id: string): Promise<Project | null> {
    try {
      const project = await get<Project>(`${this.PROJECT_PREFIX}${id}`);
      return project || null;
    } catch (error) {
      logger.error('Failed to get project', undefined, error);
      return null;
    }
  }

  /**
   * Get all projects
   */
  async getAllProjects(includeArchived: boolean = false): Promise<Project[]> {
    try {
      const allKeys = await keys();
      const projectKeys = allKeys.filter((key) => String(key).startsWith(this.PROJECT_PREFIX));

      const projects: Project[] = [];
      for (const key of projectKeys) {
        const project = await get<Project>(key);
        if (project) {
          if (includeArchived || project.status === 'active') {
            projects.push(project);
          }
        }
      }

      // Sort by modified date (newest first)
      projects.sort((a, b) => b.modifiedAt - a.modifiedAt);

      return projects;
    } catch (error) {
      logger.error('Failed to get all projects', undefined, error);
      return [];
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'createdAt'>>,
  ): Promise<Project | null> {
    try {
      const existing = await this.getProject(id);
      if (!existing) {
        logger.warn('Project not found for update', undefined, { id });
        return null;
      }

      const updated: Project = {
        ...existing,
        ...updates,
        id: existing.id, // Prevent ID change
        createdAt: existing.createdAt, // Prevent creation date change
        modifiedAt: Date.now(),
      };

      await set(`${this.PROJECT_PREFIX}${id}`, updated);
      logger.info('Project updated', undefined, { id });

      return updated;
    } catch (error) {
      logger.error('Failed to update project', undefined, error);
      return null;
    }
  }

  /**
   * Delete a project and remove from workspace association.
   */
  async deleteProject(id: string): Promise<boolean> {
    try {
      // Prevent deletion of default project
      if (id === this.DEFAULT_PROJECT_ID) {
        logger.warn('Cannot delete default project');
        return false;
      }

      // Remove from current workspace association
      const currentWsId = await workspaceService.getCurrentWorkspaceId();
      if (currentWsId) {
        await workspaceService.removeProjectFromWorkspace(currentWsId, id);
      }

      await del(`${this.PROJECT_PREFIX}${id}`);
      logger.info('Project deleted', undefined, { id });

      // If this was the current project, switch to default
      const currentId = await this.getCurrentProjectId();
      if (currentId === id) {
        await this.setCurrentProject(this.DEFAULT_PROJECT_ID);
      }

      return true;
    } catch (error) {
      logger.error('Failed to delete project', undefined, error);
      return false;
    }
  }

  /**
   * Archive a project
   */
  async archiveProject(id: string): Promise<boolean> {
    try {
      const updated = await this.updateProject(id, { status: 'archived' });
      return updated !== null;
    } catch (error) {
      logger.error('Failed to archive project', undefined, error);
      return false;
    }
  }

  /**
   * Unarchive a project
   */
  async unarchiveProject(id: string): Promise<boolean> {
    try {
      const updated = await this.updateProject(id, { status: 'active' });
      return updated !== null;
    } catch (error) {
      logger.error('Failed to unarchive project', undefined, error);
      return false;
    }
  }

  /**
   * Duplicate a project
   */
  async duplicateProject(id: string, newName?: string): Promise<Project | null> {
    try {
      const original = await this.getProject(id);
      if (!original) {
        logger.warn('Project not found for duplication', undefined, { id });
        return null;
      }

      const duplicate = await this.createProject({
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        tags: [...original.tags, 'duplicate'],
        settings: { ...original.settings },
      });

      logger.info('Project duplicated', undefined, { originalId: id, newId: duplicate.id });
      return duplicate;
    } catch (error) {
      logger.error('Failed to duplicate project', undefined, error);
      return null;
    }
  }

  /**
   * Get current active project ID
   */
  async getCurrentProjectId(): Promise<string | null> {
    try {
      const id = await get<string>(this.CURRENT_PROJECT_KEY);
      return id || null;
    } catch (error) {
      logger.error('Failed to get current project ID', undefined, error);
      return null;
    }
  }

  /**
   * Set current active project
   */
  async setCurrentProject(id: string): Promise<boolean> {
    try {
      const project = await this.getProject(id);
      if (!project) {
        logger.warn('Cannot set non-existent project as current', undefined, { id });
        return false;
      }

      await set(this.CURRENT_PROJECT_KEY, id);

      // Update last activity
      await this.updateProject(id, {
        metadata: {
          ...project.metadata,
          lastActivity: Date.now(),
        },
      });

      logger.info('Current project set', undefined, { id });
      return true;
    } catch (error) {
      logger.error('Failed to set current project', undefined, error);
      return false;
    }
  }

  /**
   * Get project statistics
   */
  async getStats(): Promise<ProjectStats> {
    try {
      const projects = await this.getAllProjects(true);

      const recentActivity = projects
        .filter((p) => p.metadata.lastActivity)
        .map((p) => ({
          projectId: p.id,
          timestamp: p.metadata.lastActivity!,
        }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      return {
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.status === 'active').length,
        archivedProjects: projects.filter((p) => p.status === 'archived').length,
        totalPrompts: projects.reduce((sum, p) => sum + (p.metadata.totalPrompts || 0), 0),
        recentActivity,
      };
    } catch (error) {
      logger.error('Failed to get project stats', undefined, error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        archivedProjects: 0,
        totalPrompts: 0,
        recentActivity: [],
      };
    }
  }

  /**
   * Export project data with optional related data
   */
  async exportProject(id: string, options: ProjectExportOptions = {}): Promise<string> {
    try {
      const project = await this.getProject(id);
      if (!project) {
        throw new Error('Project not found');
      }

      const exportData: Record<string, unknown> = {
        version: '3.3.0',
        exportedAt: Date.now(),
        project,
      };

      if (options.includeHistory) {
        exportData.history = await historyService.getEntries({ projectId: id });
      }

      if (options.includeTemplates) {
        exportData.templates = await getUserTemplates();
      }

      if (options.includePresets) {
        const allPresets = await getAllPresets();
        exportData.presets = allPresets.filter((p) => !p.isBuiltIn);
      }

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logger.error('Failed to export project', undefined, error);
      throw error;
    }
  }

  /**
   * Import project data
   */
  async importProject(data: string): Promise<Project | null> {
    try {
      const importData = JSON.parse(data);

      if (!importData.project) {
        throw new Error('Invalid project data');
      }

      // Create new project with imported data
      const project = await this.createProject({
        name: `${importData.project.name} (Imported)`,
        description: importData.project.description,
        tags: [...importData.project.tags, 'imported'],
        settings: importData.project.settings,
      });

      // Import related data if present
      if (Array.isArray(importData.history) && importData.history.length > 0) {
        await historyService.importHistory(JSON.stringify(importData.history), 'json');
      }

      if (Array.isArray(importData.templates)) {
        const { saveTemplate } = await import('./templateManager');
        for (const template of importData.templates) {
          await saveTemplate(template);
        }
      }

      if (Array.isArray(importData.presets)) {
        const { savePreset } = await import('./presetManager');
        for (const preset of importData.presets) {
          await savePreset(preset);
        }
      }

      logger.info('Project imported', undefined, { id: project.id });
      return project;
    } catch (error) {
      logger.error('Failed to import project', undefined, error);
      return null;
    }
  }

  /**
   * Search projects
   */
  async searchProjects(query: string): Promise<Project[]> {
    try {
      const projects = await this.getAllProjects();
      const lowerQuery = query.toLowerCase();

      return projects.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery) ||
          p.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
      );
    } catch (error) {
      logger.error('Failed to search projects', undefined, error);
      return [];
    }
  }

  /**
   * Update project metadata
   */
  async updateMetadata(id: string, metadata: Partial<ProjectMetadata>): Promise<boolean> {
    try {
      const project = await this.getProject(id);
      if (!project) return false;

      const updated = await this.updateProject(id, {
        metadata: {
          ...project.metadata,
          ...metadata,
        },
      });

      return updated !== null;
    } catch (error) {
      logger.error('Failed to update project metadata', undefined, error);
      return false;
    }
  }

  /**
   * Get projects belonging to a specific workspace.
   * Returns all projects whose IDs are listed in the workspace.
   */
  async getProjectsInWorkspace(workspaceId: string): Promise<Project[]> {
    try {
      const projectIds = await workspaceService.getProjectsInWorkspace(workspaceId);
      const projects: Project[] = [];
      for (const id of projectIds) {
        const project = await this.getProject(id);
        if (project) projects.push(project);
      }
      projects.sort((a, b) => b.modifiedAt - a.modifiedAt);
      return projects;
    } catch (error) {
      logger.error('Failed to get projects in workspace', undefined, error);
      return [];
    }
  }

  /**
   * Get projects in the current active workspace.
   */
  async getProjectsInCurrentWorkspace(): Promise<Project[]> {
    try {
      const wsId = await workspaceService.getCurrentWorkspaceId();
      if (!wsId) return this.getAllProjects();
      return this.getProjectsInWorkspace(wsId);
    } catch (error) {
      logger.error('Failed to get projects in current workspace', undefined, error);
      return [];
    }
  }

  /**
   * Move a project from one workspace to another.
   */
  async moveProjectToWorkspace(
    projectId: string,
    fromWorkspaceId: string,
    toWorkspaceId: string,
  ): Promise<boolean> {
    try {
      await workspaceService.removeProjectFromWorkspace(fromWorkspaceId, projectId);
      await workspaceService.addProjectToWorkspace(toWorkspaceId, projectId);
      logger.info('Project moved between workspaces', undefined, {
        projectId,
        from: fromWorkspaceId,
        to: toWorkspaceId,
      });
      return true;
    } catch (error) {
      logger.error('Failed to move project between workspaces', undefined, error);
      return false;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const projectService = new ProjectService();
