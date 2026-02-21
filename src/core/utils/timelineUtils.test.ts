import { describe, it, expect } from 'vitest';
import { applySmartCut } from './timelineUtils';
import type { TimelineClip } from '@core/types';
import type { TimeRange } from '@core/services/audioAnalysisService';

const makeClip = (overrides: Partial<TimelineClip> = {}): TimelineClip => ({
  id: 'clip-1',
  resourceId: 1,
  trackId: 'track-1',
  startTime: 0,
  duration: 10,
  offset: 0,
  type: 'video',
  label: 'Test Clip',
  ...overrides,
});

describe('applySmartCut', () => {
  it('should return the full clip when there is no silence', () => {
    const clip = makeClip({ duration: 10, offset: 0, startTime: 0 });
    const result = applySmartCut(clip, []);

    expect(result).toHaveLength(1);
    expect(result[0].duration).toBe(10);
    expect(result[0].startTime).toBe(0);
  });

  it('should split clip around a single silence range', () => {
    const clip = makeClip({ duration: 10, offset: 0, startTime: 0 });
    // Silence from 3 to 5 seconds, so active = [0-3] and [5-10]
    const silence: TimeRange[] = [{ start: 3, end: 5 }];
    const result = applySmartCut(clip, silence);

    expect(result).toHaveLength(2);
    expect(result[0].duration).toBe(3);
    expect(result[0].offset).toBe(0);
    expect(result[1].duration).toBe(5);
    expect(result[1].offset).toBe(5);
  });

  it('should ripple clips so there are no gaps', () => {
    const clip = makeClip({ duration: 10, offset: 0, startTime: 5 });
    const silence: TimeRange[] = [{ start: 3, end: 5 }];
    const result = applySmartCut(clip, silence);

    // First clip starts at original startTime
    expect(result[0].startTime).toBe(5);
    // Second clip starts right after first
    expect(result[1].startTime).toBe(5 + result[0].duration);
  });

  it('should skip microscopic clips (< 0.1s)', () => {
    const clip = makeClip({ duration: 10, offset: 0, startTime: 0 });
    // Very tiny active segment between two silences
    const silence: TimeRange[] = [
      { start: 0, end: 4.95 },
      { start: 5.0, end: 10 },
    ];
    const result = applySmartCut(clip, silence);

    // The 0.05s segment should be skipped
    expect(result.every((c) => c.duration >= 0.1)).toBe(true);
  });

  it('should assign unique IDs to each cut clip', () => {
    const clip = makeClip({ id: 'original' });
    const silence: TimeRange[] = [{ start: 3, end: 5 }];
    const result = applySmartCut(clip, silence);

    const ids = result.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length); // all unique
    expect(ids.every((id) => id.startsWith('original_cut_'))).toBe(true);
  });

  it('should preserve clip metadata', () => {
    const clip = makeClip({ trackId: 'track-2', type: 'audio', resourceId: 42 });
    const silence: TimeRange[] = [{ start: 3, end: 5 }];
    const result = applySmartCut(clip, silence);

    for (const c of result) {
      expect(c.trackId).toBe('track-2');
      expect(c.type).toBe('audio');
      expect(c.resourceId).toBe(42);
    }
  });

  it('should label cut segments sequentially', () => {
    const clip = makeClip({ label: 'Interview' });
    const silence: TimeRange[] = [
      { start: 2, end: 4 },
      { start: 6, end: 8 },
    ];
    const result = applySmartCut(clip, silence);

    expect(result[0].label).toBe('Interview (1)');
    expect(result[1].label).toBe('Interview (2)');
    expect(result[2].label).toBe('Interview (3)');
  });

  it('should handle silence at the start of the clip', () => {
    const clip = makeClip({ duration: 10, offset: 0, startTime: 0 });
    const silence: TimeRange[] = [{ start: 0, end: 3 }];
    const result = applySmartCut(clip, silence);

    expect(result).toHaveLength(1);
    expect(result[0].offset).toBe(3);
    expect(result[0].duration).toBe(7);
  });

  it('should handle silence at the end of the clip', () => {
    const clip = makeClip({ duration: 10, offset: 0, startTime: 0 });
    const silence: TimeRange[] = [{ start: 7, end: 15 }];
    const result = applySmartCut(clip, silence);

    expect(result).toHaveLength(1);
    expect(result[0].duration).toBe(7);
  });

  it('should handle multiple silence ranges', () => {
    const clip = makeClip({ duration: 20, offset: 0, startTime: 0 });
    const silence: TimeRange[] = [
      { start: 3, end: 5 },
      { start: 8, end: 10 },
      { start: 15, end: 17 },
    ];
    const result = applySmartCut(clip, silence);

    expect(result).toHaveLength(4);
  });

  it('should handle clip with non-zero offset', () => {
    // Clip starts at 10s in the source, duration 5s, so it views [10, 15]
    const clip = makeClip({ duration: 5, offset: 10, startTime: 0 });
    // Silence at [11, 13] in the source
    const silence: TimeRange[] = [{ start: 11, end: 13 }];
    const result = applySmartCut(clip, silence);

    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('should sort unsorted silence ranges', () => {
    const clip = makeClip({ duration: 10, offset: 0, startTime: 0 });
    const silence: TimeRange[] = [
      { start: 6, end: 8 },
      { start: 2, end: 4 },
    ];
    const result = applySmartCut(clip, silence);

    // Should produce 3 active segments: [0-2], [4-6], [8-10]
    expect(result).toHaveLength(3);
  });
});
