import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test-utils';
import { AssetsPage } from './AssetsPage';

const { appState, runState } = vi.hoisted(() => ({
  appState: {
    assets: [] as unknown[],
    clips: [] as unknown[],
    productionBible: { profiles: [], updatedAt: 0 },
    setProductionBible: vi.fn(),
    removeAsset: vi.fn(),
  },
  runState: { runs: [], initialize: vi.fn() },
}));

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: (selector: (state: typeof appState) => unknown) => selector(appState),
}));
vi.mock('@core/store/useProductionRunStore', () => ({
  useProductionRunStore: (selector: (state: typeof runState) => unknown) => selector(runState),
}));
vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: (selector: (state: { currentProjectId: string }) => unknown) =>
    selector({ currentProjectId: 'project-a' }),
}));

describe('AssetsPage navigation', () => {
  it('opens the media library first and preserves the profile draft across tabs', async () => {
    const { user } = render(<AssetsPage />);
    expect(screen.getByRole('tab', { name: 'Media library' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByLabelText('Profile name')).not.toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Continuity profiles' }));
    await user.type(screen.getByLabelText('Profile name'), 'Mara');
    await user.click(screen.getByRole('tab', { name: 'Media library' }));
    await user.click(screen.getByRole('tab', { name: 'Continuity profiles' }));
    expect(screen.getByLabelText('Profile name')).toHaveValue('Mara');
  });

  it('supports arrow navigation between the library and continuity tabs', async () => {
    const { user } = render(<AssetsPage />);
    const media = screen.getByRole('tab', { name: 'Media library' });
    media.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Continuity profiles' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Continuity profiles' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('filters assets by type and blocks deletion of assets placed on timeline', async () => {
    appState.assets = [
      { id: 'video-1', name: 'clip1.mp4', type: 'video', mimeType: 'video/mp4' },
      { id: 'image-1', name: 'bg.png', type: 'image', mimeType: 'image/png' },
    ];
    appState.clips = [
      { id: 'c-1', resourceId: 'video-1', trackId: 't-1', startTime: 0, duration: 5 },
    ];

    const { user } = render(<AssetsPage />);
    expect(screen.getByRole('heading', { name: 'clip1.mp4' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'bg.png' })).toBeInTheDocument();

    // Check usage badge for video-1
    expect(screen.getByText(/Used in 1 clip\(s\)/i)).toBeInTheDocument();

    // The remove button for video-1 should be disabled
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    expect(removeButtons[0]).toBeDisabled();
    expect(removeButtons[1]).not.toBeDisabled();

    // Filter by Images
    await user.click(screen.getByRole('tab', { name: /^Images/i }));
    expect(screen.queryByRole('heading', { name: 'clip1.mp4' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'bg.png' })).toBeInTheDocument();

    // Reset appState
    appState.assets = [];
    appState.clips = [];
  });
});
