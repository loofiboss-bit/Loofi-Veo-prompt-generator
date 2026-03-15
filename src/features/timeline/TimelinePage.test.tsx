import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test-utils';
import { ROUTES } from '@core/config/routes';
import { useAppStore } from '@core/store/useAppStore';

import TimelinePage from './TimelinePage';

const mockNavigate = vi.fn();
let mockLocationState: { returnToStudio?: 'story' } | null = null;

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/timeline',
      search: '',
      hash: '',
      key: 'timeline-test',
      state: mockLocationState,
    }),
  };
});

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
  createStore: vi.fn(),
  update: vi.fn(),
}));

vi.mock('./TimelinePlayer', () => ({
  default: ({ shots, onClose }: { shots: Array<{ id: number }>; onClose: () => void }) => (
    <div>
      <div data-testid="timeline-player">Timeline player shots: {shots.length}</div>
      <button onClick={onClose}>Close timeline</button>
    </div>
  ),
}));

describe('TimelinePage', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
    mockNavigate.mockReset();
    mockLocationState = null;
  });

  it('shows an empty state when there are no generated video clips', () => {
    render(<TimelinePage />);

    expect(
      screen.getByRole('status', {
        name: /timeline is ready when you have generated clips/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to prompt builder/i })).toBeInTheDocument();
  });

  it('returns to storyboard from the empty state when timeline was opened there', async () => {
    mockLocationState = { returnToStudio: 'story' };
    const { user } = render(<TimelinePage />);

    await user.click(screen.getByRole('button', { name: /back to story board/i }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME, {
      state: { reopenStudio: 'story' },
    });
  });

  it('renders the timeline player when a generated video clip exists', () => {
    useAppStore.setState({
      sbShots: [
        {
          id: 1,
          type: 'video',
          action: 'Reveal city skyline',
          camera: 'Wide shot',
          characterId: '',
          takes: [],
          selectedTakeIndex: 0,
          visualLink: false,
          duration: 5,
          transition: { type: 'cut', duration: 0 },
          generatedVideoUrl: 'https://example.com/shot.mp4',
        },
      ],
    });

    render(<TimelinePage />);

    expect(screen.getByTestId('timeline-player')).toHaveTextContent('Timeline player shots: 1');
  });

  it('returns to storyboard when closing the timeline after arriving from storyboard', async () => {
    mockLocationState = { returnToStudio: 'story' };
    useAppStore.setState({
      sbShots: [
        {
          id: 1,
          type: 'video',
          action: 'Reveal city skyline',
          camera: 'Wide shot',
          characterId: '',
          takes: [],
          selectedTakeIndex: 0,
          visualLink: false,
          duration: 5,
          transition: { type: 'cut', duration: 0 },
          generatedVideoUrl: 'https://example.com/shot.mp4',
        },
      ],
    });

    const { user } = render(<TimelinePage />);

    await user.click(screen.getByRole('button', { name: /close timeline/i }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME, {
      state: { reopenStudio: 'story' },
    });
  });
});
