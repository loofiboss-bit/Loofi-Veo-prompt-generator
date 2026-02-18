import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted Mock Variables ───────────────────────────────────────────────
const {
  mockInitialize,
  mockCreateProject,
  mockGetProject,
  mockGetAllProjects,
  mockUpdateProject,
  mockDeleteProject,
  mockArchiveProject,
  mockUnarchiveProject,
  mockDuplicateProject,
  mockSetCurrentProject,
  mockGetCurrentProjectId,
  mockSearchProjects,
  mockLoggerInfo,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockInitialize: vi.fn(),
  mockCreateProject: vi.fn(),
  mockGetProject: vi.fn(),
  mockGetAllProjects: vi.fn(),
  mockUpdateProject: vi.fn(),
  mockDeleteProject: vi.fn(),
  mockArchiveProject: vi.fn(),
  mockUnarchiveProject: vi.fn(),
  mockDuplicateProject: vi.fn(),
  mockSetCurrentProject: vi.fn(),
  mockGetCurrentProjectId: vi.fn(),
  mockSearchProjects: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerError: vi.fn(),
}));

// Mock idb-keyval (used by persist middleware)
vi.mock('idb-keyval', () => ({
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
}));

// Mock projectService
vi.mock('@core/services/projectService', () => ({
  projectService: {
    initialize: mockInitialize,
    createProject: mockCreateProject,
    getProject: mockGetProject,
    getAllProjects: mockGetAllProjects,
    updateProject: mockUpdateProject,
    deleteProject: mockDeleteProject,
    archiveProject: mockArchiveProject,
    unarchiveProject: mockUnarchiveProject,
    duplicateProject: mockDuplicateProject,
    setCurrentProject: mockSetCurrentProject,
    getCurrentProjectId: mockGetCurrentProjectId,
    searchProjects: mockSearchProjects,
  },
}));

// Mock logger
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { useProjectStore } from './useProjectStore';
import type { Project } from '@core/services/projectService';

describe('useProjectStore', () => {
  const mockProject1: Project = {
    id: 'proj-1',
    name: 'Test Project',
    description: 'A test project',
    tags: ['test', 'demo'],
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    status: 'active',
    settings: {},
    metadata: {},
  };

  const mockProject2: Project = {
    id: 'proj-2',
    name: 'Another Project',
    description: 'Another test project',
    tags: [],
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    status: 'active',
    settings: {},
    metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockInitialize.mockResolvedValue(undefined);
    mockGetAllProjects.mockResolvedValue([]);
    mockGetCurrentProjectId.mockResolvedValue(null);

    // Reset store to initial state
    useProjectStore.setState({
      currentProjectId: null,
      projects: [],
      isLoading: false,
      error: null,
    });
  });

  it('should have correct initial state', () => {
    const state = useProjectStore.getState();
    expect(state.currentProjectId).toBeNull();
    expect(state.projects).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  describe('initialize', () => {
    it('should initialize and load projects', async () => {
      mockGetAllProjects.mockResolvedValue([mockProject1, mockProject2]);
      mockGetCurrentProjectId.mockResolvedValue('proj-1');

      await useProjectStore.getState().initialize();

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([mockProject1, mockProject2]);
      expect(state.currentProjectId).toBe('proj-1');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockInitialize).toHaveBeenCalledTimes(1);
      expect(mockLoggerInfo).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockInitialize.mockRejectedValue(new Error('Init failed'));

      await useProjectStore.getState().initialize();

      const state = useProjectStore.getState();
      expect(state.error).toBe('Failed to initialize projects');
      expect(state.isLoading).toBe(false);
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('createProject', () => {
    it('should create a project and set it as current', async () => {
      mockCreateProject.mockResolvedValue(mockProject1);
      mockGetAllProjects.mockResolvedValue([mockProject1]);
      mockSetCurrentProject.mockResolvedValue(true);

      const result = await useProjectStore.getState().createProject({
        name: 'Test Project',
        description: 'A test project',
        tags: ['test'],
      });

      expect(result).toEqual(mockProject1);
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'A test project',
        tags: ['test'],
      });
      expect(mockSetCurrentProject).toHaveBeenCalledWith('proj-1');

      const state = useProjectStore.getState();
      expect(state.currentProjectId).toBe('proj-1');
      expect(state.projects).toEqual([mockProject1]);
      expect(state.isLoading).toBe(false);
    });

    it('should handle create project errors', async () => {
      mockCreateProject.mockRejectedValue(new Error('Create failed'));

      const result = await useProjectStore.getState().createProject({
        name: 'Test',
      });

      expect(result).toBeNull();
      expect(useProjectStore.getState().error).toBe('Failed to create project');
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('loadProject', () => {
    it('should load a project and set it as current', async () => {
      mockGetProject.mockResolvedValue(mockProject1);
      mockSetCurrentProject.mockResolvedValue(true);

      const result = await useProjectStore.getState().loadProject('proj-1');

      expect(result).toEqual(mockProject1);
      expect(mockGetProject).toHaveBeenCalledWith('proj-1');
      expect(mockSetCurrentProject).toHaveBeenCalledWith('proj-1');

      const state = useProjectStore.getState();
      expect(state.currentProjectId).toBe('proj-1');
      expect(state.isLoading).toBe(false);
    });

    it('should handle project not found', async () => {
      mockGetProject.mockResolvedValue(null);

      const result = await useProjectStore.getState().loadProject('nonexistent');

      expect(result).toBeNull();
      expect(useProjectStore.getState().error).toBe('Project not found');
    });

    it('should handle load project errors', async () => {
      mockGetProject.mockRejectedValue(new Error('Load failed'));

      const result = await useProjectStore.getState().loadProject('proj-1');

      expect(result).toBeNull();
      expect(useProjectStore.getState().error).toBe('Failed to load project');
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('should update a project successfully', async () => {
      mockUpdateProject.mockResolvedValue(true);
      mockGetAllProjects.mockResolvedValue([{ ...mockProject1, name: 'Updated Name' }]);

      const result = await useProjectStore.getState().updateProject('proj-1', {
        name: 'Updated Name',
      });

      expect(result).toBe(true);
      expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', { name: 'Updated Name' });
      expect(useProjectStore.getState().isLoading).toBe(false);
    });

    it('should handle update failure', async () => {
      mockUpdateProject.mockResolvedValue(false);

      const result = await useProjectStore.getState().updateProject('proj-1', {
        name: 'Test',
      });

      expect(result).toBe(false);
      expect(useProjectStore.getState().error).toBe('Failed to update project');
    });

    it('should handle update errors', async () => {
      mockUpdateProject.mockRejectedValue(new Error('Update failed'));

      const result = await useProjectStore.getState().updateProject('proj-1', {});

      expect(result).toBe(false);
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('should delete a project successfully', async () => {
      mockDeleteProject.mockResolvedValue(true);
      mockGetAllProjects.mockResolvedValue([mockProject2]);
      mockGetCurrentProjectId.mockResolvedValue(null);

      const result = await useProjectStore.getState().deleteProject('proj-1');

      expect(result).toBe(true);
      expect(mockDeleteProject).toHaveBeenCalledWith('proj-1');

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([mockProject2]);
    });

    it('should handle delete failure', async () => {
      mockDeleteProject.mockResolvedValue(false);

      const result = await useProjectStore.getState().deleteProject('proj-1');

      expect(result).toBe(false);
      expect(useProjectStore.getState().error).toBe('Failed to delete project');
    });

    it('should handle delete errors', async () => {
      mockDeleteProject.mockRejectedValue(new Error('Delete failed'));

      const result = await useProjectStore.getState().deleteProject('proj-1');

      expect(result).toBe(false);
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('archiveProject', () => {
    it('should archive a project successfully', async () => {
      mockArchiveProject.mockResolvedValue(true);
      mockGetAllProjects.mockResolvedValue([{ ...mockProject1, isArchived: true }]);

      const result = await useProjectStore.getState().archiveProject('proj-1');

      expect(result).toBe(true);
      expect(mockArchiveProject).toHaveBeenCalledWith('proj-1');
    });

    it('should handle archive failure', async () => {
      mockArchiveProject.mockResolvedValue(false);

      const result = await useProjectStore.getState().archiveProject('proj-1');

      expect(result).toBe(false);
      expect(useProjectStore.getState().error).toBe('Failed to archive project');
    });

    it('should handle archive errors', async () => {
      mockArchiveProject.mockRejectedValue(new Error('Archive failed'));

      const result = await useProjectStore.getState().archiveProject('proj-1');

      expect(result).toBe(false);
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('unarchiveProject', () => {
    it('should unarchive a project successfully', async () => {
      mockUnarchiveProject.mockResolvedValue(true);
      mockGetAllProjects.mockResolvedValue([{ ...mockProject1, isArchived: false }]);

      const result = await useProjectStore.getState().unarchiveProject('proj-1');

      expect(result).toBe(true);
      expect(mockUnarchiveProject).toHaveBeenCalledWith('proj-1');
    });

    it('should handle unarchive failure', async () => {
      mockUnarchiveProject.mockResolvedValue(false);

      const result = await useProjectStore.getState().unarchiveProject('proj-1');

      expect(result).toBe(false);
      expect(useProjectStore.getState().error).toBe('Failed to unarchive project');
    });

    it('should handle unarchive errors', async () => {
      mockUnarchiveProject.mockRejectedValue(new Error('Unarchive failed'));

      const result = await useProjectStore.getState().unarchiveProject('proj-1');

      expect(result).toBe(false);
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('duplicateProject', () => {
    it('should duplicate a project successfully', async () => {
      const duplicatedProject: Project = {
        ...mockProject1,
        id: 'proj-3',
        name: 'Test Project (Copy)',
      };
      mockDuplicateProject.mockResolvedValue(duplicatedProject);
      mockGetAllProjects.mockResolvedValue([mockProject1, duplicatedProject]);

      const result = await useProjectStore.getState().duplicateProject('proj-1');

      expect(result).toEqual(duplicatedProject);
      expect(mockDuplicateProject).toHaveBeenCalledWith('proj-1', undefined);
    });

    it('should duplicate with custom name', async () => {
      const duplicatedProject: Project = {
        ...mockProject1,
        id: 'proj-3',
        name: 'Custom Name',
      };
      mockDuplicateProject.mockResolvedValue(duplicatedProject);
      mockGetAllProjects.mockResolvedValue([mockProject1, duplicatedProject]);

      const result = await useProjectStore.getState().duplicateProject('proj-1', 'Custom Name');

      expect(result).toEqual(duplicatedProject);
      expect(mockDuplicateProject).toHaveBeenCalledWith('proj-1', 'Custom Name');
    });

    it('should handle duplicate failure', async () => {
      mockDuplicateProject.mockResolvedValue(null);

      const result = await useProjectStore.getState().duplicateProject('proj-1');

      expect(result).toBeNull();
      expect(useProjectStore.getState().error).toBe('Failed to duplicate project');
    });

    it('should handle duplicate errors', async () => {
      mockDuplicateProject.mockRejectedValue(new Error('Duplicate failed'));

      const result = await useProjectStore.getState().duplicateProject('proj-1');

      expect(result).toBeNull();
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('setCurrentProject', () => {
    it('should set current project successfully', async () => {
      mockSetCurrentProject.mockResolvedValue(true);

      const result = await useProjectStore.getState().setCurrentProject('proj-1');

      expect(result).toBe(true);
      expect(mockSetCurrentProject).toHaveBeenCalledWith('proj-1');
      expect(useProjectStore.getState().currentProjectId).toBe('proj-1');
    });

    it('should handle set current project failure', async () => {
      mockSetCurrentProject.mockResolvedValue(false);

      const result = await useProjectStore.getState().setCurrentProject('proj-1');

      expect(result).toBe(false);
      expect(useProjectStore.getState().error).toBe('Failed to set current project');
    });

    it('should handle set current project errors', async () => {
      mockSetCurrentProject.mockRejectedValue(new Error('Set failed'));

      const result = await useProjectStore.getState().setCurrentProject('proj-1');

      expect(result).toBe(false);
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('clearCurrentProject', () => {
    it('should clear current project', () => {
      useProjectStore.setState({ currentProjectId: 'proj-1' });

      useProjectStore.getState().clearCurrentProject();

      expect(useProjectStore.getState().currentProjectId).toBeNull();
    });
  });

  describe('refreshProjects', () => {
    it('should refresh projects list', async () => {
      mockGetAllProjects.mockResolvedValue([mockProject1, mockProject2]);

      await useProjectStore.getState().refreshProjects();

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([mockProject1, mockProject2]);
      expect(state.isLoading).toBe(false);
    });

    it('should handle refresh errors', async () => {
      mockGetAllProjects.mockRejectedValue(new Error('Refresh failed'));

      await useProjectStore.getState().refreshProjects();

      expect(useProjectStore.getState().error).toBe('Failed to refresh projects');
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('searchProjects', () => {
    it('should search projects successfully', async () => {
      const searchResults = [mockProject1];
      mockSearchProjects.mockResolvedValue(searchResults);

      const result = await useProjectStore.getState().searchProjects('test');

      expect(result).toEqual(searchResults);
      expect(mockSearchProjects).toHaveBeenCalledWith('test');
    });

    it('should return empty array on search error', async () => {
      mockSearchProjects.mockRejectedValue(new Error('Search failed'));

      const result = await useProjectStore.getState().searchProjects('test');

      expect(result).toEqual([]);
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should handle empty search results', async () => {
      mockSearchProjects.mockResolvedValue([]);

      const result = await useProjectStore.getState().searchProjects('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
