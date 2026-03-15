import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test-utils';
import { useAppStore } from '@core/store/useAppStore';

import TimelinePage from './TimelinePage';

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
  default: ({ shots }: { shots: Array<{ id: number }> }) => (
    <div data-testid="timeline-player">Timeline player shots: {shots.length}</div>
  ),
}));

describe('TimelinePage', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
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
});
