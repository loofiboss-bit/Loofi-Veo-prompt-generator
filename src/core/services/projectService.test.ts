import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
  keys: vi.fn(() => Promise.resolve([...mockStore.keys()])),
}));

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock workspaceService
vi.mock('./workspaceService', () => ({
  workspaceService: {
    getCurrentWorkspaceId: vi.fn().mockResolvedValue(null),
    addProjectToWorkspace: vi.fn().mockResolvedValue(undefined),
    removeProjectFromWorkspace: vi.fn().mockResolvedValue(undefined),
    getProjectsInWorkspace: vi.fn().mockResolvedValue([]),
  },
}));

// Mock historyService
vi.mock('./historyService', () => ({
  historyService: {
    getEntries: vi.fn().mockResolvedValue([]),
    importHistory: vi.fn().mockResolvedValue(0),
  },
}));

// Mock templateManager
vi.mock('./templateManager', () => ({
  getUserTemplates: vi.fn().mockResolvedValue([]),
  saveTemplate: vi.fn().mockResolvedValue(undefined),
}));

// Mock presetManager
vi.mock('./presetManager', () => ({
  getAllPresets: vi.fn().mockResolvedValue([]),
  savePreset: vi.fn().mockResolvedValue(undefined),
}));

import { projectService } from './projectService';

describe('projectService', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  // ─── createProject ────────────────────────────────────────────
  describe('createProject', () => {
    it('should create a project with the given name', async () => {
      const project = await projectService.createProject({ name: 'Test Project' });
      expect(project).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.status).toBe('active');
      expect(project.id).toMatch(/^proj_/);
    });

    it('should use default ID for "My First Project"', async () => {
      const project = await projectService.createProject({ name: 'My First Project' });
      expect(project.id).toBe('default');
    });

    it('should include provided tags', async () => {
      const project = await projectService.createProject({
        name: 'Tagged Project',
        tags: ['cinematic', 'veo'],
      });
      expect(project.tags).toEqual(['cinematic', 'veo']);
    });

    it('should include provided settings', async () => {
      const project = await projectService.createProject({
        name: 'Settings Project',
        settings: { defaultModel: 'veo', defaultDuration: 8 },
      });
      expect(project.settings.defaultModel).toBe('veo');
      expect(project.settings.defaultDuration).toBe(8);
    });

    it('should set createdAt and modifiedAt timestamps', async () => {
      const before = Date.now();
      const project = await projectService.createProject({ name: 'Timed' });
      const after = Date.now();
      expect(project.createdAt).toBeGreaterThanOrEqual(before);
      expect(project.createdAt).toBeLessThanOrEqual(after);
      expect(project.modifiedAt).toBeGreaterThanOrEqual(before);
    });
  });

  // ─── getProject ───────────────────────────────────────────────
  describe('getProject', () => {
    it('should retrieve an existing project by ID', async () => {
      const created = await projectService.createProject({ name: 'Retrievable' });
      const retrieved = await projectService.getProject(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Retrievable');
    });

    it('should return null for non-existent ID', async () => {
      const result = await projectService.getProject('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ─── getAllProjects ───────────────────────────────────────────
  describe('getAllProjects', () => {
    it('should return all active projects', async () => {
      await projectService.createProject({ name: 'Project A' });
      await projectService.createProject({ name: 'Project B' });
      const projects = await projectService.getAllProjects();
      expect(projects.length).toBeGreaterThanOrEqual(2);
    });

    it('should exclude archived projects by default', async () => {
      const project = await projectService.createProject({ name: 'To Archive' });
      await projectService.archiveProject(project.id);
      const projects = await projectService.getAllProjects();
      const found = projects.find((p) => p.id === project.id);
      expect(found).toBeUndefined();
    });

    it('should include archived projects when requested', async () => {
      const project = await projectService.createProject({ name: 'Archived' });
      await projectService.archiveProject(project.id);
      const projects = await projectService.getAllProjects(true);
      const found = projects.find((p) => p.id === project.id);
      expect(found).toBeDefined();
      expect(found?.status).toBe('archived');
    });

    it('should sort by modifiedAt descending', async () => {
      await projectService.createProject({ name: 'First' });
      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));
      await projectService.createProject({ name: 'Second' });
      const projects = await projectService.getAllProjects();
      if (projects.length >= 2) {
        expect(projects[0].modifiedAt).toBeGreaterThanOrEqual(projects[1].modifiedAt);
      }
    });
  });

  // ─── updateProject ───────────────────────────────────────────
  describe('updateProject', () => {
    it('should update project fields', async () => {
      const project = await projectService.createProject({ name: 'Original' });
      const updated = await projectService.updateProject(project.id, {
        name: 'Updated',
        description: 'New description',
      });
      expect(updated?.name).toBe('Updated');
      expect(updated?.description).toBe('New description');
    });

    it('should update modifiedAt timestamp', async () => {
      const project = await projectService.createProject({ name: 'Timestamps' });
      const originalModified = project.modifiedAt;
      await new Promise((r) => setTimeout(r, 10));
      const updated = await projectService.updateProject(project.id, { name: 'Changed' });
      expect(updated?.modifiedAt).toBeGreaterThan(originalModified);
    });

    it('should return null for non-existent project', async () => {
      const result = await projectService.updateProject('fake-id', { name: 'Nope' });
      expect(result).toBeNull();
    });
  });

  // ─── deleteProject ───────────────────────────────────────────
  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const project = await projectService.createProject({ name: 'To Delete' });
      const result = await projectService.deleteProject(project.id);
      expect(result).toBe(true);
      const retrieved = await projectService.getProject(project.id);
      expect(retrieved).toBeNull();
    });

    it('should refuse to delete the default project', async () => {
      await projectService.createProject({ name: 'My First Project' });
      const result = await projectService.deleteProject('default');
      expect(result).toBe(false);
    });
  });

  // ─── archiveProject / unarchiveProject ────────────────────────
  describe('archiveProject / unarchiveProject', () => {
    it('should archive a project', async () => {
      const project = await projectService.createProject({ name: 'To Archive' });
      const result = await projectService.archiveProject(project.id);
      expect(result).toBe(true);
      const retrieved = await projectService.getProject(project.id);
      expect(retrieved?.status).toBe('archived');
    });

    it('should unarchive a project', async () => {
      const project = await projectService.createProject({ name: 'To Unarchive' });
      await projectService.archiveProject(project.id);
      const result = await projectService.unarchiveProject(project.id);
      expect(result).toBe(true);
      const retrieved = await projectService.getProject(project.id);
      expect(retrieved?.status).toBe('active');
    });
  });

  // ─── duplicateProject ─────────────────────────────────────────
  describe('duplicateProject', () => {
    it('should duplicate a project with (Copy) suffix', async () => {
      const original = await projectService.createProject({
        name: 'Original Project',
        tags: ['cinematic'],
      });
      const copy = await projectService.duplicateProject(original.id);
      expect(copy).toBeDefined();
      expect(copy?.name).toContain('(Copy)');
      expect(copy?.id).not.toBe(original.id);
      expect(copy?.tags).toContain('duplicate');
    });

    it('should use custom name if provided', async () => {
      const original = await projectService.createProject({ name: 'Source' });
      const copy = await projectService.duplicateProject(original.id, 'Custom Copy Name');
      expect(copy?.name).toBe('Custom Copy Name');
    });

    it('should return null for non-existent project', async () => {
      const result = await projectService.duplicateProject('fake-id');
      expect(result).toBeNull();
    });
  });

  // ─── setCurrentProject / getCurrentProjectId ──────────────────
  describe('setCurrentProject / getCurrentProjectId', () => {
    it('should set and get the current project ID', async () => {
      const project = await projectService.createProject({ name: 'Current' });
      const result = await projectService.setCurrentProject(project.id);
      expect(result).toBe(true);
      const currentId = await projectService.getCurrentProjectId();
      expect(currentId).toBe(project.id);
    });

    it('should return false for non-existent project', async () => {
      const result = await projectService.setCurrentProject('fake-id');
      expect(result).toBe(false);
    });
  });

  // ─── exportProject / importProject ────────────────────────────
  describe('exportProject / importProject', () => {
    it('should export a project as JSON', async () => {
      const project = await projectService.createProject({ name: 'Export Me' });
      const json = await projectService.exportProject(project.id);
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('3.3.0');
      expect(parsed.project.name).toBe('Export Me');
      expect(parsed.exportedAt).toBeDefined();
    });

    it('should throw when exporting non-existent project', async () => {
      await expect(projectService.exportProject('fake-id')).rejects.toThrow();
    });

    it('should import a project from exported JSON', async () => {
      const project = await projectService.createProject({ name: 'For Import' });
      const json = await projectService.exportProject(project.id);
      const imported = await projectService.importProject(json);
      expect(imported).toBeDefined();
      expect(imported?.name).toContain('(Imported)');
      expect(imported?.tags).toContain('imported');
    });

    it('should include history when includeHistory is true', async () => {
      const { historyService } = await import('./historyService');
      const mockEntries = [{ id: 'h1', projectId: 'p1', prompt: 'test' }];
      vi.mocked(historyService.getEntries).mockResolvedValueOnce(mockEntries as never);

      const project = await projectService.createProject({ name: 'With History' });
      const json = await projectService.exportProject(project.id, { includeHistory: true });
      const parsed = JSON.parse(json);
      expect(parsed.history).toEqual(mockEntries);
      expect(historyService.getEntries).toHaveBeenCalledWith({ projectId: project.id });
    });

    it('should include templates when includeTemplates is true', async () => {
      const { getUserTemplates } = await import('./templateManager');
      const mockTemplates = [{ id: 't1', name: 'My Template' }];
      vi.mocked(getUserTemplates).mockResolvedValueOnce(mockTemplates as never);

      const project = await projectService.createProject({ name: 'With Templates' });
      const json = await projectService.exportProject(project.id, { includeTemplates: true });
      const parsed = JSON.parse(json);
      expect(parsed.templates).toEqual(mockTemplates);
    });

    it('should include user presets (not built-in) when includePresets is true', async () => {
      const { getAllPresets } = await import('./presetManager');
      const mockPresets = [
        { id: 'p1', name: 'User Preset', isBuiltIn: false },
        { id: 'p2', name: 'Built-in', isBuiltIn: true },
      ];
      vi.mocked(getAllPresets).mockResolvedValueOnce(mockPresets as never);

      const project = await projectService.createProject({ name: 'With Presets' });
      const json = await projectService.exportProject(project.id, { includePresets: true });
      const parsed = JSON.parse(json);
      expect(parsed.presets).toHaveLength(1);
      expect(parsed.presets[0].id).toBe('p1');
    });

    it('should not include related data by default', async () => {
      const project = await projectService.createProject({ name: 'Minimal Export' });
      const json = await projectService.exportProject(project.id);
      const parsed = JSON.parse(json);
      expect(parsed.history).toBeUndefined();
      expect(parsed.templates).toBeUndefined();
      expect(parsed.presets).toBeUndefined();
    });
  });

  // ─── searchProjects ───────────────────────────────────────────
  describe('searchProjects', () => {
    it('should find projects by name', async () => {
      await projectService.createProject({ name: 'Cyberpunk Scene' });
      await projectService.createProject({ name: 'Nature Documentary' });
      const results = await projectService.searchProjects('cyberpunk');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toContain('Cyberpunk');
    });

    it('should find projects by tag', async () => {
      await projectService.createProject({ name: 'Tagged', tags: ['cinematic'] });
      const results = await projectService.searchProjects('cinematic');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for no matches', async () => {
      const results = await projectService.searchProjects('xyznonexistent');
      expect(results).toEqual([]);
    });
  });

  // ─── getStats ─────────────────────────────────────────────────
  describe('getStats', () => {
    it('should return project statistics', async () => {
      await projectService.createProject({ name: 'Stats A' });
      await projectService.createProject({ name: 'Stats B' });
      const stats = await projectService.getStats();
      expect(stats.totalProjects).toBeGreaterThanOrEqual(2);
      expect(stats.activeProjects).toBeGreaterThanOrEqual(2);
      expect(stats.archivedProjects).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── updateMetadata ───────────────────────────────────────────
  describe('updateMetadata', () => {
    it('should update project metadata', async () => {
      const project = await projectService.createProject({ name: 'Meta' });
      const result = await projectService.updateMetadata(project.id, {
        totalPrompts: 42,
        category: 'cinematic',
      });
      expect(result).toBe(true);
      const retrieved = await projectService.getProject(project.id);
      expect(retrieved?.metadata.totalPrompts).toBe(42);
      expect(retrieved?.metadata.category).toBe('cinematic');
    });
  });

  // ─── initialize ───────────────────────────────────────────────
  describe('initialize', () => {
    it('should create default project if none exist', async () => {
      await projectService.initialize();
      const defaultProject = await projectService.getProject('default');
      expect(defaultProject).toBeDefined();
      expect(defaultProject?.name).toBe('My First Project');
    });
  });
});
