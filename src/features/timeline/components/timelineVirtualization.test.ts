import { describe, expect, it } from 'vitest';

import { getVisibleClips, getVisibleTrackWindow } from './timelineVirtualization';
import type { TimelineClip } from '@core/types';

function makeClip(id: string, startTime: number, duration: number): TimelineClip {
  return {
    id,
    resourceId: id,
    trackId: 'video_main',
    startTime,
    duration,
    offset: 0,
    type: 'video',
    label: id,
  };
}

describe('timelineVirtualization', () => {
  it('calculates a bounded visible track window', () => {
    const result = getVisibleTrackWindow(12, 240, 192, 96);

    expect(result).toEqual({ startIndex: 0, endIndex: 7 });
  });

  it('returns all tracks when viewport metrics are unavailable', () => {
    const result = getVisibleTrackWindow(5, 0, 0, 96);

    expect(result).toEqual({ startIndex: 0, endIndex: 5 });
  });

  it('filters clips to the current viewport with overscan', () => {
    const clips = [
      makeClip('clip-a', 0, 4),
      makeClip('clip-b', 10, 4),
      makeClip('clip-c', 30, 4),
      makeClip('clip-d', 35, 4),
    ];

    const visible = getVisibleClips(clips, 20, 160, 520, 80);

    expect(visible.map((clip) => clip.id)).toEqual(['clip-a', 'clip-b', 'clip-c']);
  });
});
