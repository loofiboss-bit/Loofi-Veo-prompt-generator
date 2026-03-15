import type { TimelineClip } from '@core/types';

export interface VisibleTrackWindow {
  startIndex: number;
  endIndex: number;
}

export function getVisibleTrackWindow(
  totalTracks: number,
  scrollTop: number,
  viewportHeight: number,
  trackHeight: number,
  overscanTracks: number = 2,
): VisibleTrackWindow {
  if (totalTracks <= 0 || viewportHeight <= 0 || trackHeight <= 0) {
    return { startIndex: 0, endIndex: totalTracks };
  }

  const rawStart = Math.floor(scrollTop / trackHeight) - overscanTracks;
  const rawEnd = Math.ceil((scrollTop + viewportHeight) / trackHeight) + overscanTracks;

  return {
    startIndex: Math.max(0, rawStart),
    endIndex: Math.min(totalTracks, rawEnd),
  };
}

export function getVisibleClips(
  clips: TimelineClip[],
  zoomLevel: number,
  viewportStartPx: number,
  viewportEndPx: number,
  overscanPx: number = 320,
): TimelineClip[] {
  const minPx = viewportStartPx - overscanPx;
  const maxPx = viewportEndPx + overscanPx;

  return clips.filter((clip) => {
    const startPx = clip.startTime * zoomLevel;
    const endPx = startPx + clip.duration * zoomLevel;

    return endPx >= minPx && startPx <= maxPx;
  });
}
