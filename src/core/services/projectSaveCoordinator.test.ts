import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => {
  const events: string[] = [];
  const app = { mutationVersion: 1 };
  const project = {
    id: 'project-1',
    name: 'Test project',
    documentRevision: 4,
  };
  const status = {
    projects: {} as Record<string, { status: string; error?: string; conflictDocument?: unknown }>,
  };
  return { events, app, project, status };
});

vi.mock('@core/services/projectDocumentService', () => ({
  ProjectConflictError: class ProjectConflictError extends Error {
    constructor(
      public localDocument: unknown,
      public latestDocument: unknown,
    ) {
      super('Project conflict');
    }
  },
  projectDocumentService: {
    save: vi.fn(async () => {
      fixture.events.push('project-document');
      return { durable: true };
    }),
  },
}));
vi.mock('@core/services/projectService', () => ({
  projectService: {
    registerDocument: vi.fn(async () => fixture.events.push('project-metadata')),
  },
}));
vi.mock('@core/services/loggerService', () => ({
  logger: { error: vi.fn() },
}));
vi.mock('@core/store/useAppStore', () => ({
  useAppStore: { getState: () => fixture.app },
  persistAppStoreNow: vi.fn(async () => fixture.events.push('media-and-catalog')),
}));
vi.mock('@core/store/useEditorSessionStore', () => ({
  useEditorSessionStore: {
    getState: () => ({
      projectSnapshot: fixture.project,
      captureCurrentProjectDocument: () => ({ ...fixture.project }),
    }),
    setState: vi.fn(
      (
        update: (state: { projectSnapshot: typeof fixture.project }) => {
          projectSnapshot: typeof fixture.project;
        },
      ) => {
        Object.assign(
          fixture.project,
          update({ projectSnapshot: fixture.project }).projectSnapshot,
        );
      },
    ),
  },
}));
vi.mock('@core/store/useProjectSaveStore', () => ({
  useProjectSaveStore: {
    getState: () => ({
      projects: fixture.status.projects,
      setStatus: (id: string, value: { status: string }) => {
        fixture.events.push(value.status === 'saved' ? 'saved' : value.status);
        fixture.status.projects[id] = value;
      },
      markDirty: (id: string) => {
        fixture.status.projects[id] = { status: 'unsaved' };
      },
    }),
  },
}));
vi.mock('@core/utils/storage', () => ({
  idbStorage: { flush: vi.fn(async () => fixture.events.push('catalog-flushed')) },
}));

import { projectSaveCoordinator } from './projectSaveCoordinator';
import { ProjectConflictError, projectDocumentService } from './projectDocumentService';
import { projectService } from './projectService';

describe('project save coordinator', () => {
  beforeEach(() => {
    fixture.events.length = 0;
    fixture.app.mutationVersion = 1;
    fixture.project.id = 'project-1';
    fixture.project.name = 'Test project';
    fixture.project.documentRevision = 4;
    fixture.status.projects = {};
    vi.mocked(projectDocumentService.save)
      .mockReset()
      .mockImplementation(async () => {
        fixture.events.push('project-document');
        return { durable: true };
      });
    vi.mocked(projectService.registerDocument)
      .mockReset()
      .mockImplementation(async () => {
        fixture.events.push('project-metadata');
      });
  });

  it('waits for media/catalog, document and project metadata before reporting saved', async () => {
    await projectSaveCoordinator.flushBeforeProjectChange('project-1');
    expect(fixture.events).toEqual([
      'media-and-catalog',
      'saving',
      'project-document',
      'project-metadata',
      'saved',
      'catalog-flushed',
    ]);
    expect(fixture.status.projects['project-1']?.status).toBe('saved');
  });

  it('persists a new snapshot before reporting saved when edits arrive during a write', async () => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started!: () => void;
    const writing = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.mocked(projectDocumentService.save).mockImplementationOnce(async () => {
      fixture.events.push('project-document');
      started();
      await blocked;
      return { durable: true };
    });
    const saving = projectSaveCoordinator.saveProject('project-1');
    await writing;
    fixture.app.mutationVersion++;
    fixture.status.projects['project-1'] = { status: 'unsaved' };
    expect(fixture.events).not.toContain('saved');
    release();
    await saving;
    expect(fixture.events.filter((event) => event === 'project-document')).toHaveLength(2);
    expect(fixture.status.projects['project-1']?.status).toBe('saved');
    expect(fixture.events.at(-1)).toBe('saved');
  });

  it('saves the renamed active document before subsequent coordinated saves', async () => {
    await projectSaveCoordinator.renameProject('project-1', 'Renamed project');
    expect(projectDocumentService.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Renamed project' }),
      expect.anything(),
    );
    await projectSaveCoordinator.saveProject('project-1');
    expect(projectService.registerDocument).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Renamed project' }),
    );
  });

  it('retains conflict details and leaves recovery to the user', async () => {
    const local = { ...fixture.project };
    vi.mocked(projectDocumentService.save).mockRejectedValueOnce(
      new ProjectConflictError(local as never, { ...local, documentRevision: 5 } as never),
    );
    await expect(projectSaveCoordinator.saveProject('project-1')).rejects.toBeInstanceOf(
      ProjectConflictError,
    );
    expect(fixture.status.projects['project-1']).toMatchObject({
      status: 'conflict',
      conflictDocument: local,
    });
    await expect(projectSaveCoordinator.saveProject('project-1')).rejects.toThrow(/conflict/i);
    expect(projectDocumentService.save).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite a conflict reported while a save is in progress', async () => {
    let release!: () => void;
    let started!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writing = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.mocked(projectDocumentService.save).mockImplementationOnce(async () => {
      started();
      await blocked;
      return { durable: true };
    });
    const saving = projectSaveCoordinator.saveProject('project-1');
    await writing;
    const conflictDocument = { ...fixture.project };
    fixture.status.projects['project-1'] = {
      status: 'conflict',
      error: 'Changed elsewhere',
      conflictDocument,
    };
    release();
    await expect(saving).rejects.toThrow('Changed elsewhere');
    expect(fixture.status.projects['project-1']).toEqual({
      status: 'conflict',
      error: 'Changed elsewhere',
      conflictDocument,
    });
  });

  it('does not report saved after a non-durable write', async () => {
    vi.mocked(projectDocumentService.save).mockResolvedValueOnce({
      durable: false,
      error: 'Storage unavailable',
    });
    await expect(projectSaveCoordinator.saveProject('project-1')).rejects.toThrow(
      'Storage unavailable',
    );
    expect(fixture.status.projects['project-1']).toMatchObject({
      status: 'error',
      error: 'Storage unavailable',
    });
    expect(projectService.registerDocument).not.toHaveBeenCalled();
  });

  it('does not report saved when the active project changes during metadata registration', async () => {
    let release!: () => void;
    let started!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const registering = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.mocked(projectService.registerDocument).mockImplementationOnce(async () => {
      started();
      await blocked;
    });
    const saving = projectSaveCoordinator.saveProject('project-1');
    await registering;
    fixture.project.id = 'project-2';
    release();
    await expect(saving).rejects.toThrow('active project changed');
    expect(fixture.status.projects['project-1']?.status).toBe('error');
    expect(fixture.events).not.toContain('saved');
  });

  it('retains the durable revision when metadata registration fails, so retry uses it', async () => {
    vi.mocked(projectDocumentService.save).mockImplementation(async (document) => {
      expect(document.documentRevision).toBe(fixture.project.documentRevision);
      document.documentRevision = (document.documentRevision ?? 0) + 1;
      return { durable: true };
    });
    vi.mocked(projectService.registerDocument).mockRejectedValueOnce(new Error('Metadata failed'));
    await expect(projectSaveCoordinator.saveProject('project-1')).rejects.toThrow(
      'Metadata failed',
    );
    expect(fixture.project.documentRevision).toBe(5);
    await projectSaveCoordinator.saveProject('project-1');
    expect(fixture.project.documentRevision).toBe(6);
    expect(fixture.status.projects['project-1']?.status).toBe('saved');
  });
});
