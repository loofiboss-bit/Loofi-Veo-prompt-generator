/**
 * Project Service
 * Manages project-based organization and workspace isolation
 * v1.3.0 - Workflow Integration
 */

import { get, set, del, keys } from 'idb-keyval';
import { loggerService } from './loggerService';

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

                loggerService.info('Default project created');
            }

            // Ensure current project is set
            const currentId = await this.getCurrentProjectId();
            if (!currentId) {
                await this.setCurrentProject(this.DEFAULT_PROJECT_ID);
            }
        } catch (error) {
            loggerService.error('Failed to initialize projects', error);
        }
    }

    /**
     * Create a new project
     */
    async createProject(data: {
        name: string;
        description?: string;
        tags?: string[];
        settings?: Partial<ProjectSettings>;
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
            loggerService.info('Project created', { id: project.id, name: project.name });

            return project;
        } catch (error) {
            loggerService.error('Failed to create project', error);
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
            loggerService.error('Failed to get project', error);
            return null;
        }
    }

    /**
     * Get all projects
     */
    async getAllProjects(includeArchived: boolean = false): Promise<Project[]> {
        try {
            const allKeys = await keys();
            const projectKeys = allKeys.filter((key) =>
                String(key).startsWith(this.PROJECT_PREFIX)
            );

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
            loggerService.error('Failed to get all projects', error);
            return [];
        }
    }

    /**
     * Update an existing project
     */
    async updateProject(
        id: string,
        updates: Partial<Omit<Project, 'id' | 'createdAt'>>
    ): Promise<Project | null> {
        try {
            const existing = await this.getProject(id);
            if (!existing) {
                loggerService.warn('Project not found for update', { id });
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
            loggerService.info('Project updated', { id });

            return updated;
        } catch (error) {
            loggerService.error('Failed to update project', error);
            return null;
        }
    }

    /**
     * Delete a project
     */
    async deleteProject(id: string): Promise<boolean> {
        try {
            // Prevent deletion of default project
            if (id === this.DEFAULT_PROJECT_ID) {
                loggerService.warn('Cannot delete default project');
                return false;
            }

            await del(`${this.PROJECT_PREFIX}${id}`);
            loggerService.info('Project deleted', { id });

            // If this was the current project, switch to default
            const currentId = await this.getCurrentProjectId();
            if (currentId === id) {
                await this.setCurrentProject(this.DEFAULT_PROJECT_ID);
            }

            return true;
        } catch (error) {
            loggerService.error('Failed to delete project', error);
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
            loggerService.error('Failed to archive project', error);
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
            loggerService.error('Failed to unarchive project', error);
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
                loggerService.warn('Project not found for duplication', { id });
                return null;
            }

            const duplicate = await this.createProject({
                name: newName || `${original.name} (Copy)`,
                description: original.description,
                tags: [...original.tags, 'duplicate'],
                settings: { ...original.settings },
            });

            loggerService.info('Project duplicated', { originalId: id, newId: duplicate.id });
            return duplicate;
        } catch (error) {
            loggerService.error('Failed to duplicate project', error);
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
            loggerService.error('Failed to get current project ID', error);
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
                loggerService.warn('Cannot set non-existent project as current', { id });
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

            loggerService.info('Current project set', { id });
            return true;
        } catch (error) {
            loggerService.error('Failed to set current project', error);
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
            loggerService.error('Failed to get project stats', error);
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
     * Export project data
     */
    async exportProject(id: string): Promise<string> {
        try {
            const project = await this.getProject(id);
            if (!project) {
                throw new Error('Project not found');
            }

            // TODO: Include related data (history, templates, presets)
            const exportData = {
                version: '1.3.0',
                exportedAt: Date.now(),
                project,
                // history: await historyService.getEntries({ projectId: id }),
                // templates: await templateManager.getTemplates(id),
                // presets: await presetManager.getPresets(id),
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            loggerService.error('Failed to export project', error);
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

            // TODO: Import related data (history, templates, presets)

            loggerService.info('Project imported', { id: project.id });
            return project;
        } catch (error) {
            loggerService.error('Failed to import project', error);
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
                    p.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
            );
        } catch (error) {
            loggerService.error('Failed to search projects', error);
            return [];
        }
    }

    /**
     * Update project metadata
     */
    async updateMetadata(
        id: string,
        metadata: Partial<ProjectMetadata>
    ): Promise<boolean> {
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
            loggerService.error('Failed to update project metadata', error);
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
