import { describe, it, expect } from 'vitest';
import {
  getMotionKeyframes,
  interpolateAnimaticTransform,
  snapShotDurationsToBeatGrid,
} from './animaticService';
import type { TimelineBeatGrid } from '@core/types/animatic';
import type { Shot } from '@core/types';

describe('animaticService', () => {
  it('returns keyframes for standard motion types', () => {
    const zoomIn = getMotionKeyframes('ken-burns-zoom-in');
    expect(zoomIn.length).toBeGreaterThanOrEqual(2);
    expect(zoomIn[0].scale).toBe(1.0);
    expect(zoomIn[zoomIn.length - 1].scale).toBeGreaterThan(1.0);
  });

  it('interpolates transform smoothly at midpoint', () => {
    const mid = interpolateAnimaticTransform('ken-burns-zoom-in', 0.5);
    expect(mid.transform).toContain('scale(');
    expect(mid.opacity).toBe(1);
  });

  it('snaps shot durations to 120 BPM 4-beat bar grid', () => {
    const beatGrid: TimelineBeatGrid = {
      bpm: 120, // 1 beat = 0.5s, 4 beats = 2.0s
      timeSignature: [4, 4],
      downbeatsSeconds: [0, 2, 4, 6, 8],
      beatsSeconds: [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
    };

    const shots: Shot[] = [
      { id: 1, action: 'Shot 1', duration: 4.8 } as Shot,
      { id: 2, action: 'Shot 2', duration: 3.1 } as Shot,
    ];

    const snapped = snapShotDurationsToBeatGrid(shots, beatGrid, 4);
    // 4.8s at 2.0s unit -> 6.0s (or 4.0s) -> 4.8/2 = 2.4 -> round(2.4)*2 = 4.0s
    expect(snapped[0].duration).toBe(4.0);
    // 3.1s at 2.0s unit -> 3.1/2 = 1.55 -> round(1.55)*2 = 4.0s
    expect(snapped[1].duration).toBe(4.0);
  });
});
