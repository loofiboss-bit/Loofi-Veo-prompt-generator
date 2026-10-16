import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { TimelineClip } from '@core/types';
import { creatorSilenceService } from './creatorSilenceService';

const makeClip = (overrides: Partial<TimelineClip> = {}): TimelineClip => ({
  id: 'v1',
  label: 'Interview',
  trackId: 'track_video',
  type: 'video',
  resourceId: 'asset_1',
  startTime: 10,
  duration: 8,
  offset: 2, // represents source interval [2s, 10s]
  ...overrides,
});

describe('creatorSilenceService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detectSilence invokes electron bridge with configured parameters', async () => {
    const mockDetect = vi.fn().mockResolvedValue([
      { start: 3, end: 4.5, duration: 1.5 },
      { start: 6, end: 7, duration: 1.0 },
    ]);
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: { detectTimelineSilence: mockDetect },
    });

    const result = await creatorSilenceService.detectSilence('asset_1', {
      noiseThresholdDb: -40,
      minDurationSeconds: 0.8,
    });

    expect(mockDetect).toHaveBeenCalledWith({
      mediaId: 'asset_1',
      noiseThresholdDb: -40,
      minDurationSeconds: 0.8,
    });
    expect(result).toHaveLength(2);
    expect(result[0].duration).toBe(1.5);
  });

  it('detectSilence returns empty array when electron bridge is unavailable', async () => {
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: undefined,
    });

    const result = await creatorSilenceService.detectSilence('asset_1');
    expect(result).toEqual([]);
  });

  it('buildProposals filters and maps source silence intervals to timeline range', () => {
    const clip = makeClip(); // source range: [2, 10], timeline range: [10, 18]

    const silences = [
      { start: 0.5, end: 1.5, duration: 1.0 }, // completely before clip.offset (ignored)
      { start: 1.5, end: 3.0, duration: 1.5 }, // overlaps clip start: clamped to [2.0, 3.0]
      { start: 5.0, end: 6.0, duration: 1.0 }, // inside clip: timeline [13.0, 14.0]
      { start: 9.5, end: 11.0, duration: 1.5 }, // overlaps clip end: clamped to [9.5, 10.0]
      { start: 12.0, end: 14.0, duration: 2.0 }, // completely after clip (ignored)
    ];

    const proposals = creatorSilenceService.buildProposals(clip, silences);

    expect(proposals).toHaveLength(3);
    // Overlapping start
    expect(proposals[0].clipTimelineStart).toBe(10);
    expect(proposals[0].clipTimelineEnd).toBe(11);
    expect(proposals[0].selected).toBe(true);

    // Completely inside
    expect(proposals[1].clipTimelineStart).toBe(13);
    expect(proposals[1].clipTimelineEnd).toBe(14);

    // Overlapping end
    expect(proposals[2].clipTimelineStart).toBe(17.5);
    expect(proposals[2].clipTimelineEnd).toBe(18);
  });

  it('applyCuts splits the clip into non-silent segments and shifts subsequent clips', () => {
    const targetClip = makeClip(); // start: 10, dur: 8, offset: 2 (timeline 10 to 18)
    const subsequentClip = makeClip({
      id: 'v2',
      startTime: 18,
      duration: 5,
      offset: 0,
    });
    const subsequentTextClip: TimelineClip = {
      id: 'caption_subsequent',
      label: 'Later caption',
      trackId: 'track_captions',
      type: 'text',
      resourceId: 'caption_res',
      startTime: 19,
      duration: 3,
      offset: 0,
    };
    const unrelatedEarlyClip = makeClip({
      id: 'v0',
      startTime: 0,
      duration: 5,
      offset: 0,
    });

    const clips = [unrelatedEarlyClip, targetClip, subsequentClip, subsequentTextClip];

    // Silence from timeline 13 to 14 (1 second pause in the middle)
    const proposals = [
      {
        silence: { start: 5, end: 6, duration: 1 },
        clipTimelineStart: 13,
        clipTimelineEnd: 14,
        selected: true,
      },
    ];

    const updated = creatorSilenceService.applyCuts(clips, 'v1', proposals);

    // Unrelated early clip should be unchanged
    expect(updated.find((c) => c.id === 'v0')?.startTime).toBe(0);

    // Target clip should now be split into 2 segments
    const firstSegment = updated.find((c) => c.id === 'v1');
    const secondSegment = updated.find((c) => c.id.startsWith('v1_cut_1'));

    expect(firstSegment).toBeDefined();
    expect(firstSegment?.startTime).toBe(10);
    expect(firstSegment?.duration).toBe(3);
    expect(firstSegment?.offset).toBe(2);

    expect(secondSegment).toBeDefined();
    expect(secondSegment?.startTime).toBe(13);
    expect(secondSegment?.duration).toBe(4);
    expect(secondSegment?.offset).toBe(6);

    // Total duration removed was 1.0 second.
    // Subsequent clips should be shifted backward by 1.0 second:
    const updatedSubsequent = updated.find((c) => c.id === 'v2');
    expect(updatedSubsequent?.startTime).toBe(17); // 18 - 1 = 17

    const updatedText = updated.find((c) => c.id === 'caption_subsequent');
    expect(updatedText?.startTime).toBe(18); // 19 - 1 = 18
  });
});
