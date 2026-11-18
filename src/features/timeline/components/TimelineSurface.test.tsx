import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { fireEvent, render, screen } from '@/test-utils';
import { useAppStore } from '@core/store/useAppStore';
import { usePlaybackStore } from '@core/store/usePlaybackStore';
import type { TimelineClip } from '@core/types';
import { TimelineSurface } from './TimelineSurface';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(),
}));
vi.mock('./TimelineTrack', () => ({
  default: ({ razorEnabled }: { razorEnabled?: boolean }) => (
    <div data-testid="track" data-razor={String(razorEnabled)} />
  ),
}));

const clip: TimelineClip = {
  id: 'video',
  resourceId: 'asset',
  trackId: 'video_main',
  startTime: 0,
  duration: 10,
  offset: 0,
  type: 'video',
  label: 'Imported clip',
};
const surface = () => (
  <TimelineSurface
    timelineState={{
      tracks: [
        { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
      ],
      clips: [clip],
      currentTime: 4,
      zoomLevel: 20,
    }}
    duration={10}
    selectedClipId="video"
    onClipUpdate={vi.fn()}
    onSeek={vi.fn()}
    startVideoGeneration={vi.fn()}
    deliveryMode
  />
);
beforeEach(() => {
  useAppStore.setState({ clips: [clip] });
  useAppStore.temporal.getState().clear();
});
describe('timeline editing controls', () => {
  it('splits the selection atomically at the playhead', () => {
    render(surface());
    fireEvent.click(screen.getByRole('button', { name: 'Split at playhead' }));
    expect(useAppStore.getState().clips.map((entry) => entry.duration)).toEqual([4, 6]);
    expect(useAppStore.temporal.getState().pastStates).toHaveLength(1);
  });
  it('trims the source start at the playhead and enables the razor tool', () => {
    render(surface());
    fireEvent.click(screen.getByRole('button', { name: 'Trim start to playhead' }));
    expect(useAppStore.getState().clips[0]).toMatchObject({ startTime: 4, offset: 4, duration: 6 });
    fireEvent.click(screen.getByRole('button', { name: 'Razor tool' }));
    expect(screen.getByTestId('track')).toHaveAttribute('data-razor', 'true');
  });
  it('does not remove a selected clip while typing', () => {
    render(
      <>
        <input aria-label="Caption text" />
        {surface()}
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText('Caption text'), { key: 'Backspace' });
    expect(useAppStore.getState().clips).toHaveLength(1);
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(useAppStore.getState().clips).toHaveLength(0);
  });

  it('keeps TimelineTrackView stable while playback ticks update usePlaybackStore', () => {
    const timelineState = {
      tracks: [
        {
          id: 'video_main',
          label: 'Video',
          type: 'video' as const,
          trackType: 'dialogue' as const,
          zIndex: 1,
        },
      ],
      clips: [clip],
      currentTime: 0,
      zoomLevel: 20,
    };
    const onClipUpdate = vi.fn();
    const onSeek = vi.fn();
    const startVideoGeneration = vi.fn();

    render(
      <TimelineSurface
        timelineState={timelineState}
        duration={10}
        onClipUpdate={onClipUpdate}
        onSeek={onSeek}
        startVideoGeneration={startVideoGeneration}
        deliveryMode
      />,
    );

    act(() => {
      usePlaybackStore.getState().setIsPlaying(true);
      for (let step = 1; step <= 10; step += 1) {
        usePlaybackStore.getState().setCurrentTime(step * 0.5);
      }
    });

    expect(screen.getByTestId('playhead-timecode')).toHaveTextContent('00:05');
    expect(useAppStore.getState().currentTime).toBe(0);
    act(() => {
      usePlaybackStore.getState().resetPlayback();
    });
  });
});
