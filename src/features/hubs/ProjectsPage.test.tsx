import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, waitFor } from '@/test-utils';

import { ProjectsPage } from './ProjectsPage';

const {
  captureCurrentProjectDocument,
  commitProjectDocument,
  flushBeforeProjectChange,
  loadProject,
  saveProject,
  setCurrentProject,
} = vi.hoisted(() => ({
  captureCurrentProjectDocument: vi.fn(),
  commitProjectDocument: vi.fn(),
  flushBeforeProjectChange: vi.fn().mockResolvedValue(undefined),
  loadProject: vi.fn(),
  saveProject: vi.fn().mockResolvedValue(undefined),
  setCurrentProject: vi.fn().mockResolvedValue(true),
}));

const projects = [
  {
    id: 'project-a',
    name: 'Project A',
    description: '',
    createdAt: 1,
    modifiedAt: 1,
    tags: [],
    status: 'active',
    settings: {},
    metadata: {},
  },
  {
    id: 'project-b',
    name: 'Project B',
    description: '',
    createdAt: 2,
    modifiedAt: 2,
    tags: [],
    status: 'active',
    settings: {},
    metadata: {},
  },
];

const projectDocument = {
  id: 'project-b',
  name: 'Project B',
  lastModified: 2,
  promptState: { idea: 'B' },
  characterBank: [],
  locationBank: [{ id: 'location-b', name: 'Location B' }],
  visualDNA: [],
  storyboard: { globalContext: {}, shots: [], timeline: {} },
};

vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({ projects, currentProjectId: 'project-a', setCurrentProject }),
    { getState: () => ({ projects, currentProjectId: 'project-a' }) },
  ),
}));

vi.mock('@core/services/projectTransferService', () => ({
  hydrateProjectMedia: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@core/services/projectDocumentService', () => ({
  setDocumentRegisterCallback: vi.fn(),
  projectDocumentService: { load: loadProject, save: saveProject },
}));

vi.mock('@core/services/projectSaveCoordinator', () => ({
  projectSaveCoordinator: { flushBeforeProjectChange },
}));

vi.mock('@core/store/useEditorSessionStore', () => ({
  useEditorSessionStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ captureCurrentProjectDocument, commitProjectDocument }),
}));

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flushBeforeProjectChange.mockResolvedValue(undefined);
  });

  it('keeps the current project when saving its document fails', async () => {
    flushBeforeProjectChange.mockRejectedValueOnce(new Error('Local storage unavailable'));
    const { user } = render(<ProjectsPage />);
    await user.click(screen.getByRole('button', { name: /Project B/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Local storage unavailable');
    expect(setCurrentProject).not.toHaveBeenCalled();
    expect(commitProjectDocument).not.toHaveBeenCalled();
  });
  it('saves the current project before loading and selecting the next project', async () => {
    loadProject.mockReturnValue(projectDocument);
    const { user } = render(<ProjectsPage />);

    await user.click(screen.getByRole('button', { name: /Project B/ }));

    await waitFor(() => {
      expect(commitProjectDocument).toHaveBeenCalledWith(projectDocument, 'load');
    });
    expect(flushBeforeProjectChange).toHaveBeenCalledWith('project-a');
    expect(flushBeforeProjectChange.mock.invocationCallOrder[0]).toBeLessThan(
      loadProject.mock.invocationCallOrder[0],
    );
    expect(loadProject).toHaveBeenCalledWith('project-b');
    expect(setCurrentProject).toHaveBeenCalledWith('project-b');
  });
});
