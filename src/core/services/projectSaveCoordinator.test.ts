import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => {
  const events: string[] = [];
  const app = { mutationVersion: 1 };
  const project = {
    id: 'project-1',
    name: 'Test project',
    documentRevision: 4,
  };
  const status = { projects: {} as Record<string, { status: string }> };
  return { events, app, project, status };
});

vi.mock('@core/services/projectDocumentService', () => ({
  ProjectConflictError: class ProjectConflictError extends Error {},
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
    setState: vi.fn(),
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

describe('project save coordinator', () => {
  beforeEach(() => {
    fixture.events.length = 0;
    fixture.app.mutationVersion = 1;
    fixture.project.documentRevision = 4;
    fixture.status.projects = {};
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
});
