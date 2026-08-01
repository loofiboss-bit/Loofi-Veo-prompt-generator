import { describe, expect, it, vi } from 'vitest';

import { render, screen, waitFor } from '@/test-utils';

import { ProjectsPage } from './ProjectsPage';

const {
  captureCurrentProjectDocument,
  commitProjectDocument,
  loadProject,
  saveProject,
  setCurrentProject,
} = vi.hoisted(() => ({
  captureCurrentProjectDocument: vi.fn(),
  commitProjectDocument: vi.fn(),
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
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ projects, currentProjectId: 'project-a', setCurrentProject }),
}));

vi.mock('@core/services/projectDocumentService', () => ({
  projectDocumentService: { load: loadProject, save: saveProject },
}));

vi.mock('@core/store/useEditorSessionStore', () => ({
  useEditorSessionStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ captureCurrentProjectDocument, commitProjectDocument }),
}));

describe('ProjectsPage', () => {
  it('loads the selected project document before persisting the current project id', async () => {
    const currentDocument = { ...projectDocument, id: 'project-a', name: 'Project A' };
    captureCurrentProjectDocument.mockReturnValue(currentDocument);
    loadProject.mockReturnValue(projectDocument);
    const { user } = render(<ProjectsPage />);

    await user.click(screen.getByRole('button', { name: /Project B/ }));

    await waitFor(() => {
      expect(commitProjectDocument).toHaveBeenCalledWith(projectDocument, 'load');
    });
    expect(captureCurrentProjectDocument).toHaveBeenCalledWith({
      id: 'project-a',
      name: 'Project A',
    });
    expect(saveProject).toHaveBeenCalledWith(currentDocument);
    expect(loadProject).toHaveBeenCalledWith('project-b');
    expect(setCurrentProject).toHaveBeenCalledWith('project-b');
  });
});
