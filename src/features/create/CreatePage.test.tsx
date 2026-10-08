import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test-utils';
import { CreatePage } from './CreatePage';

vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: (selector: (state: { currentProjectId: string }) => unknown) =>
    selector({ currentProjectId: 'project-a' }),
}));
vi.mock('@core/store/useProductionRunStore', () => ({
  useProductionRunStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ activeRun: null, isLoading: false, error: null }),
}));
vi.mock('./CreateWorkflow', () => ({
  CreateWorkflow: ({ activeStep }: { activeStep: string }) => <p>Editing {activeStep}</p>,
}));
vi.mock('./components/MusicGenerator', () => ({ MusicGenerator: () => null }));
vi.mock('./components/ContinuitySummary', () => ({ ContinuitySummary: () => null }));

describe('Production workspace navigation', () => {
  beforeEach(() => localStorage.clear());

  it('does not fabricate an autosaved checkpoint without a persisted plan', () => {
    render(<CreatePage />);
    expect(screen.getByRole('status')).toHaveTextContent('No saved production plan yet');
    expect(screen.queryByText(/Autosaved/)).not.toBeInTheDocument();
  });

  it('allows direct step navigation and restores the selected step after remount', async () => {
    const { user, unmount } = render(<CreatePage />);
    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(screen.getByText('Editing export')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Export' })).toHaveFocus();
    unmount();
    render(<CreatePage />);
    expect(screen.getByText('Editing export')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toHaveAttribute('aria-current', 'step');
  });
});
