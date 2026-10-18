import { describe, expect, it } from 'vitest';
import {
  TICKS_PER_SECOND,
  alignAudioStemToVideoCut,
  calculateClipBoundaries,
  calculateGapOrOverlapTicks,
  formatSMPTETimecode,
  framesToTicks,
  parseSMPTETimecode,
  rippleTrimClips,
  secondsToTicks,
  snapTicksToFrame,
  ticksPerFrame,
  ticksToFrames,
  ticksToSeconds,
} from './timelineMath';

describe('timelineMath (Integer Ticks)', () => {
  it('converts between seconds and ticks with zero floating point drift', () => {
    expect(TICKS_PER_SECOND).toBe(24000);
    expect(secondsToTicks(0)).toBe(0);
    expect(secondsToTicks(1)).toBe(24000);
    expect(secondsToTicks(2.5)).toBe(60000);

    expect(ticksToSeconds(24000)).toBe(1);
    expect(ticksToSeconds(60000)).toBe(2.5);
  });

  it('calculates exact ticks per frame across cinematic and broadcast frame rates', () => {
    expect(ticksPerFrame(24)).toBe(1000);
    expect(ticksPerFrame(25)).toBe(960);
    expect(ticksPerFrame(30)).toBe(800);
    expect(ticksPerFrame(48)).toBe(500);
    expect(ticksPerFrame(50)).toBe(480);
    expect(ticksPerFrame(60)).toBe(400);
    expect(ticksPerFrame(120)).toBe(200);
  });

  it('converts between frames and ticks accurately', () => {
    expect(framesToTicks(24, 24)).toBe(24000);
    expect(framesToTicks(12, 24)).toBe(12000);
    expect(ticksToFrames(24000, 24)).toBe(24);
    expect(ticksToFrames(12000, 24)).toBe(12);
  });

  it('snaps arbitrary ticks to the nearest frame boundary', () => {
    // At 24fps, frame boundaries are multiples of 1000
    expect(snapTicksToFrame(999, 24)).toBe(1000);
    expect(snapTicksToFrame(499, 24)).toBe(0);
    expect(snapTicksToFrame(500, 24)).toBe(1000);
    expect(snapTicksToFrame(2410, 24)).toBe(2000);
  });

  it('formats and parses standard SMPTE timecode (HH:MM:SS:FF)', () => {
    // 0 frames
    expect(formatSMPTETimecode(0, 24)).toBe('00:00:00:00');

    // Exactly 1 second = 24 frames at 24fps
    expect(formatSMPTETimecode(24000, 24)).toBe('00:00:01:00');

    // 1 second + 12 frames
    expect(formatSMPTETimecode(36000, 24)).toBe('00:00:01:12');

    // 1 hour + 2 minutes + 3 seconds + 4 frames
    const parsedTicks = parseSMPTETimecode('01:02:03:04', 24);
    expect(formatSMPTETimecode(parsedTicks, 24)).toBe('01:02:03:04');
  });

  it('calculates frame-accurate clip boundaries in integer ticks', () => {
    const boundaries = calculateClipBoundaries(
      {
        startSeconds: 1.0,
        durationSeconds: 4.5,
        trimInSeconds: 0.5,
        trimOutSeconds: 0,
      },
      24,
    );

    expect(boundaries.startTicks).toBe(24000);
    expect(boundaries.durationTicks).toBe(108000); // 4.5 * 24000 = 108000
    expect(boundaries.endTicks).toBe(132000);
    expect(boundaries.trimInTicks).toBe(12000);
    expect(boundaries.frameCount).toBe(108); // 4.5 * 24 = 108 frames
  });

  it('detects gap or overlap between clips accurately in ticks', () => {
    const clipA = { startTicks: 0, endTicks: 24000 };
    const clipBWithGap = { startTicks: 26000, endTicks: 50000 };
    const clipCWithOverlap = { startTicks: 22000, endTicks: 46000 };

    expect(calculateGapOrOverlapTicks(clipA, clipBWithGap)).toBe(2000); // 2000 tick gap
    expect(calculateGapOrOverlapTicks(clipA, clipCWithOverlap)).toBe(-2000); // 2000 tick overlap
  });

  it('aligns audio stem to video cut when within tolerance', () => {
    const videoCut = 24000;
    // Audio starts at 24200 (within 1000 tick frame tolerance)
    expect(alignAudioStemToVideoCut(24200, videoCut, 1000)).toBe(videoCut);

    // Audio starts at 26000 (outside tolerance)
    expect(alignAudioStemToVideoCut(26000, videoCut, 1000)).toBe(26000);
  });

  it('performs ripple trim shifting subsequent clips deterministically', () => {
    const clips = [
      { id: 'c1', startTicks: 0, durationTicks: 24000 },
      { id: 'c2', startTicks: 24000, durationTicks: 48000 },
      { id: 'c3', startTicks: 72000, durationTicks: 24000 },
    ];

    // Extend c1 by 12000 ticks (+0.5s)
    const rippled = rippleTrimClips(clips, 'c1', 12000);

    expect(rippled[0].durationTicks).toBe(36000);
    expect(rippled[1].startTicks).toBe(36000); // Shifted by +12000
    expect(rippled[2].startTicks).toBe(84000); // Shifted by +12000
  });
});
