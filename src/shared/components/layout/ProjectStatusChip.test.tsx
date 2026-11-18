import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';

const fixture = vi.hoisted(() => ({
  saveProject: vi.fn(),
  status: 'unsaved' as 'unsaved' | 'saving' | 'saved' | 'error' | 'conflict' | undefined,
  draftProjectId: 'project-1',
  draftStatus: 'saved' as 'loading' | 'saving' | 'saved' | 'error',
  startupComplete: false,
}));

vi.mock('@core/services/projectSaveCoordinator', () => ({
  projectSaveCoordinator: { saveProject: fixture.saveProject },
}));
vi.mock('@core/store/useProjectSaveStore', () => ({
  useProjectSaveStore: (selector: (state: unknown) => unknown) =>
    selector({ projects: fixture.status ? { 'project-1': { status: fixture.status } } : {} }),
}));
vi.mock('@core/store/usePromptStudioDraftStore', () => ({
  usePromptStudioDraftStore: (selector: (state: unknown) => unknown) =>
    selector({ draft: { projectId: fixture.draftProjectId }, status: fixture.draftStatus }),
}));
vi.mock('@core/store/useStartupStore', () => ({
  useStartupStore: (selector: (state: unknown) => unknown) =>
    selector({ criticalBootstrapComplete: fixture.startupComplete }),
}));

import { ProjectStatusChip } from './ProjectStatusChip';

describe('ProjectStatusChip', () => {
  beforeEach(() => {
    fixture.saveProject.mockReset().mockResolvedValue(undefined);
    fixture.status = 'unsaved';
    fixture.draftProjectId = 'project-1';
    fixture.draftStatus = 'saved';
    fixture.startupComplete = false;
  });

  it('delegates manual saves to the coordinator and never marks the snapshot saved itself', async () => {
    let release!: () => void;
    fixture.saveProject.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const { user } = render(<ProjectStatusChip project={{ id: 'project-1' }} />);
    await user.click(screen.getByRole('button', { name: 'Save project' }));
    expect(fixture.saveProject).toHaveBeenCalledWith('project-1');
    expect(screen.getByRole('status')).toHaveTextContent('Saving');
    release();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Unsaved'));
  });

  it('does not show another project’s draft error as the active project’s error', () => {
    fixture.status = 'saved';
    fixture.draftProjectId = 'project-2';
    fixture.draftStatus = 'error';
    render(<ProjectStatusChip project={{ id: 'project-1' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('shows a conflict instead of offering an unsafe normal save', () => {
    fixture.status = 'conflict';
    render(<ProjectStatusChip project={{ id: 'project-1' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Conflicting changes');
    expect(screen.queryByRole('button', { name: 'Save project' })).not.toBeInTheDocument();
  });

  it('does not claim an untracked project has been saved', () => {
    fixture.status = undefined;
    render(<ProjectStatusChip project={{ id: 'project-1' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking save status');
    expect(screen.queryByRole('button', { name: 'Save project' })).not.toBeInTheDocument();
  });

  it('does not claim all work is saved while the active Studio draft is loading', () => {
    fixture.status = 'saved';
    fixture.draftStatus = 'loading';
    render(<ProjectStatusChip project={{ id: 'project-1' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking save status');
  });

  it('reports an unavailable status rather than checking forever after startup', () => {
    fixture.status = undefined;
    fixture.startupComplete = true;
    render(<ProjectStatusChip project={{ id: 'project-1' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Save status unavailable');
  });
});
