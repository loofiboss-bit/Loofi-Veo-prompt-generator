/**
 * Frame-Accurate Timeline Math (Integer Ticks)
 *
 * Professional NLE engines avoid floating-point time drift between video cuts and audio stems
 * by standardizing timeline mathematics on integer ticks.
 *
 * TICKS_PER_SECOND = 24000:
 *   - 24 fps  -> 1000 ticks/frame
 *   - 25 fps  -> 960 ticks/frame
 *   - 30 fps  -> 800 ticks/frame
 *   - 48 fps  -> 500 ticks/frame
 *   - 50 fps  -> 480 ticks/frame
 *   - 60 fps  -> 400 ticks/frame
 *   - 120 fps -> 200 ticks/frame
 */

export const TICKS_PER_SECOND = 24000;
export const DEFAULT_TIMELINE_FPS = 24;

export interface ClipTickRange {
  startTicks: number;
  durationTicks: number;
  endTicks: number;
  trimInTicks: number;
  trimOutTicks: number;
  frameCount: number;
}

export function secondsToTicks(seconds: number, ticksPerSecond = TICKS_PER_SECOND): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.round(seconds * ticksPerSecond);
}

export function ticksToSeconds(ticks: number, ticksPerSecond = TICKS_PER_SECOND): number {
  if (!Number.isFinite(ticks) || ticks <= 0) return 0;
  return ticks / ticksPerSecond;
}

export function framesToTicks(
  frames: number,
  fps: number = DEFAULT_TIMELINE_FPS,
  ticksPerSecond = TICKS_PER_SECOND,
): number {
  if (!Number.isFinite(frames) || frames <= 0) return 0;
  const safeFps = fps > 0 ? fps : DEFAULT_TIMELINE_FPS;
  return Math.round((frames * ticksPerSecond) / safeFps);
}

export function ticksToFrames(
  ticks: number,
  fps: number = DEFAULT_TIMELINE_FPS,
  ticksPerSecond = TICKS_PER_SECOND,
): number {
  if (!Number.isFinite(ticks) || ticks <= 0) return 0;
  const safeFps = fps > 0 ? fps : DEFAULT_TIMELINE_FPS;
  return Math.floor((ticks * safeFps) / ticksPerSecond);
}

export function ticksPerFrame(
  fps: number = DEFAULT_TIMELINE_FPS,
  ticksPerSecond = TICKS_PER_SECOND,
): number {
  const safeFps = fps > 0 ? fps : DEFAULT_TIMELINE_FPS;
  return Math.round(ticksPerSecond / safeFps);
}

/**
 * Snap arbitrary ticks to the nearest frame boundary.
 */
export function snapTicksToFrame(
  ticks: number,
  fps: number = DEFAULT_TIMELINE_FPS,
  ticksPerSecond = TICKS_PER_SECOND,
): number {
  const tpf = ticksPerFrame(fps, ticksPerSecond);
  return Math.round(ticks / tpf) * tpf;
}

/**
 * Formats integer ticks to standard SMPTE Timecode (HH:MM:SS:FF).
 */
export function formatSMPTETimecode(
  ticks: number,
  fps: number = DEFAULT_TIMELINE_FPS,
  ticksPerSecond = TICKS_PER_SECOND,
): string {
  if (!Number.isFinite(ticks) || ticks <= 0) return '00:00:00:00';
  const totalFrames = ticksToFrames(ticks, fps, ticksPerSecond);
  const safeFps = Math.round(fps > 0 ? fps : DEFAULT_TIMELINE_FPS);

  const ff = totalFrames % safeFps;
  const totalSeconds = Math.floor(totalFrames / safeFps);
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);

  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}

/**
 * Parses standard SMPTE Timecode (HH:MM:SS:FF) into integer ticks.
 */
export function parseSMPTETimecode(
  timecode: string,
  fps: number = DEFAULT_TIMELINE_FPS,
  ticksPerSecond = TICKS_PER_SECOND,
): number {
  if (!timecode || typeof timecode !== 'string') return 0;
  const parts = timecode
    .trim()
    .split(':')
    .map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0)) {
    return 0;
  }
  const [hh, mm, ss, ff] = parts;
  const safeFps = Math.round(fps > 0 ? fps : DEFAULT_TIMELINE_FPS);
  const totalFrames = ((hh * 60 + mm) * 60 + ss) * safeFps + ff;
  return framesToTicks(totalFrames, safeFps, ticksPerSecond);
}

/**
 * Calculates exact integer tick boundaries for an NLE clip.
 */
export function calculateClipBoundaries(
  clip: {
    startSeconds: number;
    durationSeconds: number;
    trimInSeconds?: number;
    trimOutSeconds?: number;
  },
  fps: number = DEFAULT_TIMELINE_FPS,
): ClipTickRange {
  const startTicks = snapTicksToFrame(secondsToTicks(clip.startSeconds), fps);
  const durationTicks = snapTicksToFrame(secondsToTicks(clip.durationSeconds), fps);
  const trimInTicks = snapTicksToFrame(secondsToTicks(clip.trimInSeconds ?? 0), fps);
  const trimOutTicks = snapTicksToFrame(secondsToTicks(clip.trimOutSeconds ?? 0), fps);
  const endTicks = startTicks + durationTicks;
  const frameCount = ticksToFrames(durationTicks, fps);

  return {
    startTicks,
    durationTicks,
    endTicks,
    trimInTicks,
    trimOutTicks,
    frameCount,
  };
}

/**
 * Measures gap (positive) or overlap (negative) between two clips in integer ticks.
 */
export function calculateGapOrOverlapTicks(
  clipA: { startTicks: number; endTicks: number },
  clipB: { startTicks: number; endTicks: number },
): number {
  return clipB.startTicks - clipA.endTicks;
}

/**
 * Snaps an audio stem start tick to a video cut frame tick if within snap tolerance (default: 1 frame).
 */
export function alignAudioStemToVideoCut(
  audioStartTicks: number,
  videoCutTicks: number,
  toleranceTicks = ticksPerFrame(DEFAULT_TIMELINE_FPS),
): number {
  const delta = Math.abs(audioStartTicks - videoCutTicks);
  if (delta <= toleranceTicks) {
    return videoCutTicks;
  }
  return audioStartTicks;
}

/**
 * Computes ripple edit changes across a sequence of clips when one clip's duration changes.
 */
export function rippleTrimClips<
  T extends { id: string; startTicks: number; durationTicks: number },
>(clips: T[], targetClipId: string, deltaDurationTicks: number): T[] {
  const sorted = [...clips].sort((a, b) => a.startTicks - b.startTicks);
  const targetIndex = sorted.findIndex((c) => c.id === targetClipId);
  if (targetIndex === -1 || deltaDurationTicks === 0) return clips;

  return sorted.map((clip, index) => {
    if (index === targetIndex) {
      const newDuration = Math.max(0, clip.durationTicks + deltaDurationTicks);
      return { ...clip, durationTicks: newDuration };
    }
    if (index > targetIndex) {
      return { ...clip, startTicks: Math.max(0, clip.startTicks + deltaDurationTicks) };
    }
    return clip;
  });
}
