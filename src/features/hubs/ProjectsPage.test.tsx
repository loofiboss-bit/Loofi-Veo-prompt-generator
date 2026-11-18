import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, waitFor, within } from '@/test-utils';
import { useLocation } from 'react-router';
import { useAppStore } from '@core/store/useAppStore';

import { ProjectsPage } from './ProjectsPage';

const {
  captureCurrentProjectDocument,
  commitProjectDocument,
  flushBeforeProjectChange,
  coordinateSave,
  copyProject,
  editor,
  loadProject,
  saveProject,
  setCurrentProject,
  refreshProjects,
} = vi.hoisted(() => ({
  captureCurrentProjectDocument: vi.fn(),
  commitProjectDocument: vi.fn(),
  flushBeforeProjectChange: vi.fn().mockResolvedValue(undefined),
  coordinateSave: vi.fn().mockResolvedValue(undefined),
  copyProject: vi.fn().mockResolvedValue(undefined),
  editor: { mode: '' },
  loadProject: vi.fn(),
  saveProject: vi.fn().mockResolvedValue(undefined),
  setCurrentProject: vi.fn().mockResolvedValue(true),
  refreshProjects: vi.fn().mockResolvedValue(undefined),
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
    { getState: () => ({ projects, currentProjectId: 'project-a', refreshProjects }) },
  ),
}));

vi.mock('@core/services/projectTransferService', () => ({
  hydrateProjectMedia: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@core/services/projectDocumentService', () => ({
  setDocumentRegisterCallback: vi.fn(),
  projectDocumentService: { load: loadProject, save: saveProject, copy: copyProject },
}));

vi.mock('@core/services/projectSaveCoordinator', () => ({
  projectSaveCoordinator: { flushBeforeProjectChange, saveProject: coordinateSave },
}));

vi.mock('@core/store/useEditorSessionStore', () => ({
  useEditorSessionStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({ captureCurrentProjectDocument, commitProjectDocument }),
    { getState: () => ({ projectSnapshot: { creatorDelivery: { editorMode: editor.mode } } }) },
  ),
}));

function CurrentLocation() {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname}</output>;
}

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flushBeforeProjectChange.mockResolvedValue(undefined);
    editor.mode = '';
    useAppStore.setState({ clips: [], assets: [] });
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

  it('displays continue editing for current project and navigates without reloading', async () => {
    useAppStore.setState({
      assets: [
        { id: 'ref', type: 'image', name: 'Reference', url: '', data: '', mimeType: 'image/png' },
      ],
    });
    const { user } = render(
      <>
        <ProjectsPage />
        <CurrentLocation />
      </>,
    );
    const projectAButton = screen.getByRole('button', { name: /Project A/ });
    expect(projectAButton).toHaveTextContent(/Continue editing/i);

    await user.click(projectAButton);
    expect(flushBeforeProjectChange).not.toHaveBeenCalled();
    expect(loadProject).not.toHaveBeenCalled();
    expect(setCurrentProject).not.toHaveBeenCalled();
    expect(screen.getByTestId('current-location')).toHaveTextContent('/studio');
  });

  it('continues image-based editing without treating reference-only projects as timelines', async () => {
    useAppStore.setState({
      assets: [
        { id: 'image', type: 'image', name: 'Image', url: '', data: '', mimeType: 'image/png' },
      ],
    });
    editor.mode = 'delivery';
    const { user } = render(
      <>
        <ProjectsPage />
        <CurrentLocation />
      </>,
    );
    await user.click(screen.getByRole('button', { name: /Project A/ }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/timeline');
  });

  it('saves the active project through the coordinator before duplicating it', async () => {
    loadProject.mockResolvedValueOnce({ ...projectDocument, id: 'project-a' });
    const { user } = render(<ProjectsPage />);
    const row = screen.getByRole('button', { name: /Project A/ }).parentElement!;
    await user.click(within(row).getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(copyProject).toHaveBeenCalledOnce());
    expect(coordinateSave).toHaveBeenCalledWith('project-a');
    expect(coordinateSave.mock.invocationCallOrder[0]).toBeLessThan(
      loadProject.mock.invocationCallOrder[0],
    );
  });

  it('does not duplicate a project when the coordinated save fails', async () => {
    coordinateSave.mockRejectedValueOnce(new Error('Storage unavailable'));
    const { user } = render(<ProjectsPage />);
    const row = screen.getByRole('button', { name: /Project A/ }).parentElement!;
    await user.click(within(row).getByRole('button', { name: 'Duplicate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable');
    expect(copyProject).not.toHaveBeenCalled();
  });
});
