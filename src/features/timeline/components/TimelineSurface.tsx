import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TimelineClip, TimelineState } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import * as geminiService from '@core/services/geminiService';
import { logger } from '@core/services/loggerService';
import Icon from '@shared/components/ui/Icon';

import TimelineTrackView from './TimelineTrack';
import { getVisibleTrackWindow } from './timelineVirtualization';

interface TimelineSurfaceProps {
  timelineState: TimelineState;
  onClipUpdate: (id: string, changes: Partial<TimelineClip>) => void;
  onSeek: (time: number) => void;
  duration: number;
  isRecording?: boolean;
  onRecordToggle?: () => void;
  startVideoGeneration: (
    prompt: string,
    settings: {
      aspectRatio: string;
      resolution: '1080p' | '720p';
      veoModel: 'fast' | 'quality';
      count?: number;
    },
    image?: { data: string; mimeType: string },
  ) => Promise<string>;
  onSelectClip?: (clip: TimelineClip | null) => void;
  selectedClipId?: string | null;
}

const HEADER_WIDTH = 192;
const TRACK_HEIGHT = 96;

export const TimelineSurface: React.FC<TimelineSurfaceProps> = ({
  timelineState,
  onClipUpdate: _onClipUpdate,
  onSeek,
  duration,
  isRecording,
  startVideoGeneration,
  onSelectClip,
  selectedClipId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [rippleEnabled, setRippleEnabled] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'razor'>('select');
  const [fillingGapId, setFillingGapId] = useState<string | null>(null);

  const {
    updateTimelineClip,
    removeTimelineClip,
    shiftTrackClips,
    sbShots,
    sbGlobalContext,
    addShot,
    updateShot,
    addTimelineClip,
    promptState,
    assets,
  } = useAppStore();

  const { tracks, clips, zoomLevel, currentTime } = timelineState;
  const safeShots = useMemo(() => sbShots ?? [], [sbShots]);
  const safeAssets = useMemo(() => assets ?? [], [assets]);
  const totalWidth = Math.max(duration + 10, 60) * zoomLevel;
  const viewportStartPx = Math.max(0, scrollLeft - 320);
  const viewportEndPx = scrollLeft + viewportWidth + 320;
  const shotsById = useMemo(() => new Map(safeShots.map((shot) => [shot.id, shot])), [safeShots]);
  const assetsById = useMemo(
    () => new Map(safeAssets.map((asset) => [asset.id, asset])),
    [safeAssets],
  );
  const { startIndex, endIndex } = useMemo(
    () => getVisibleTrackWindow(tracks.length, scrollTop, viewportHeight, TRACK_HEIGHT),
    [tracks.length, scrollTop, viewportHeight],
  );
  const visibleTracks = useMemo(
    () =>
      tracks.slice(startIndex, endIndex).map((track, offset) => ({
        track,
        trackIndex: startIndex + offset,
      })),
    [tracks, startIndex, endIndex],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
        const shouldRipple = rippleEnabled || e.shiftKey;
        removeTimelineClip(selectedClipId, shouldRipple);
        if (onSelectClip) {
          onSelectClip(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, rippleEnabled, removeTimelineClip, onSelectClip]);

  useEffect(() => {
    const updateViewportMetrics = () => {
      if (!containerRef.current) {
        return;
      }

      setViewportHeight(containerRef.current.clientHeight);
      setViewportWidth(Math.max(0, containerRef.current.clientWidth - HEADER_WIDTH));
    };

    updateViewportMetrics();
    window.addEventListener('resize', updateViewportMetrics);

    return () => {
      window.removeEventListener('resize', updateViewportMetrics);
    };
  }, []);

  const detectedGaps = useMemo(() => {
    const allGaps: Array<{ trackId: string; start: number; end: number }> = [];

    tracks.forEach((track) => {
      if (track.id !== 'video_main') {
        return;
      }

      const trackClips = clips
        .filter((clip) => clip.trackId === track.id)
        .sort((a, b) => a.startTime - b.startTime);

      let cursor = 0;
      trackClips.forEach((clip) => {
        if (clip.startTime - cursor > 0.1) {
          allGaps.push({ trackId: track.id, start: cursor, end: clip.startTime });
        }
        cursor = clip.startTime + clip.duration;
      });
    });

    return allGaps;
  }, [clips, tracks]);

  const handleCloseGap = (gap: { trackId: string; start: number; end: number }) => {
    const gapSize = gap.end - gap.start;
    shiftTrackClips(gap.trackId, gap.start, -gapSize);
  };

  const handleFillGap = async (start: number, end: number) => {
    const gapId = `${start}-${end}`;
    setFillingGapId(gapId);

    try {
      const contextText =
        safeShots.length > 0 ? safeShots[0].action || 'Scene context' : 'Ambient scene';
      const style = sbGlobalContext.style || 'Cinematic';
      const prompt = await geminiService.generateBRollPrompt(contextText, style);

      const newShotId =
        safeShots.length > 0 ? Math.max(...safeShots.map((shot) => shot.id)) + 1 : 1;
      addShot('video');
      updateShot(newShotId, 'action', prompt);
      updateShot(newShotId, 'duration', end - start);

      const newClip: TimelineClip = {
        id: `video_${newShotId}_broll`,
        resourceId: newShotId,
        trackId: 'video_main',
        startTime: start,
        duration: end - start,
        offset: 0,
        type: 'video',
        label: 'Generating B-Roll...',
        isLoading: true,
        volume: 1,
        panning: { x: 0, z: 0 },
      };
      addTimelineClip(newClip);

      await startVideoGeneration(prompt, {
        aspectRatio: promptState.aspectRatio,
        resolution: '720p',
        veoModel: 'fast',
        count: 1,
      });
    } catch (error) {
      logger.error('Failed to generate video for gap fill', error);
    } finally {
      setFillingGapId(null);
    }
  };

  const handleClipClick = (clip: TimelineClip, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onSelectClip) {
      onSelectClip(clip);
    }
  };

  const handleClipSplit = (clip: TimelineClip, relTime: number) => {
    if (relTime <= 0 || relTime >= clip.duration) {
      return;
    }

    const newClipId = `${clip.id}_split_${Date.now()}`;
    const newClip: TimelineClip = {
      ...clip,
      id: newClipId,
      startTime: clip.startTime + relTime,
      offset: clip.offset + relTime,
      duration: clip.duration - relTime,
      label: `${clip.label} (Part 2)`,
    };

    updateTimelineClip(clip.id, { duration: relTime }, false);
    addTimelineClip(newClip);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isRecording) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left + scrollLeft;
    onSeek(Math.max(0, clickX / zoomLevel));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderRuler = () => {
    const ticks = [];
    const step = Math.max(1, Math.floor(100 / zoomLevel));

    for (let second = 0; second < duration + 10; second += step) {
      ticks.push(
        <div
          key={second}
          className="absolute bottom-0 h-2 border-l border-slate-500 pl-1 text-[9px] text-slate-400 select-none"
          style={{ left: `${second * zoomLevel}px` }}
        >
          {formatTime(second)}
        </div>,
      );
    }

    return ticks;
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 select-none">
      <div className="flex h-10 items-center justify-between border-b border-slate-700 bg-slate-900 px-4">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-cyan-400">{formatTime(currentTime)}</span>
          <div className="flex rounded-lg bg-slate-800 p-0.5">
            <button
              onClick={() => setActiveTool('select')}
              className={`rounded p-1 ${activeTool === 'select' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Select Tool (V)"
            >
              <Icon name="move" className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('razor')}
              className={`rounded p-1 ${activeTool === 'razor' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Razor Tool (C)"
            >
              <Icon name="scissors" className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mx-1 h-4 w-px bg-slate-700" />
          <button
            onClick={() => setRippleEnabled(!rippleEnabled)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${rippleEnabled ? 'border border-fuchsia-500/30 bg-fuchsia-900/20 text-fuchsia-400' : 'text-slate-500 hover:text-slate-300'}`}
            title="Magnetic Timeline (Ripple Edit)"
          >
            <Icon name="layers" className="h-3.5 w-3.5" />
            Magnetic
          </button>
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${snapEnabled ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Icon name="activity" className="h-3.5 w-3.5" /> Snap
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Icon name="search" className="h-3 w-3 text-slate-500" />
          <input
            type="range"
            min="5"
            max="100"
            value={zoomLevel}
            readOnly
            aria-label="Timeline zoom level"
            className="h-1 w-24 cursor-pointer appearance-none rounded-lg bg-slate-700"
          />
        </div>
      </div>

      <div className="flex h-8 border-b border-slate-700 bg-slate-900">
        <div className="z-20 w-48 border-r border-slate-700 bg-slate-900 shadow-md" />
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Interactive timeline ruler; has role="application" and aria-label */}
        <div
          className="relative flex-grow cursor-pointer overflow-hidden"
          ref={rulerRef}
          onMouseDown={handleRulerClick}
          role="application"
          aria-label="Timeline ruler"
          tabIndex={0}
        >
          <div
            className="relative h-full"
            style={{ width: `${totalWidth}px`, transform: `translateX(-${scrollLeft}px)` }}
          >
            {renderRuler()}
          </div>
        </div>
      </div>

      <div
        className="relative flex-grow overflow-auto custom-scrollbar"
        onScroll={handleScroll}
        ref={containerRef}
      >
        <div
          className="relative"
          style={{
            width: `${totalWidth + HEADER_WIDTH}px`,
            height: `${tracks.length * TRACK_HEIGHT}px`,
          }}
        >
          <div
            className={`pointer-events-none absolute top-0 bottom-0 z-50 w-px transition-colors ${isRecording ? 'bg-red-500' : 'bg-white'}`}
            style={{ left: `${currentTime * zoomLevel + HEADER_WIDTH}px` }}
          >
            <div
              className={`-mt-1.5 h-3 w-3 -translate-x-1.5 rotate-45 transform ${isRecording ? 'bg-red-500' : 'bg-white'}`}
            />
          </div>

          {visibleTracks.map(({ track, trackIndex }) => (
            <div
              key={track.id}
              className="absolute left-0 right-0"
              style={{ top: `${trackIndex * TRACK_HEIGHT}px`, height: `${TRACK_HEIGHT}px` }}
            >
              <TimelineTrackView
                track={track}
                clips={clips.filter((clip) => clip.trackId === track.id)}
                zoomLevel={zoomLevel}
                duration={duration + 10}
                currentTime={currentTime}
                viewportStartPx={viewportStartPx}
                viewportEndPx={viewportEndPx}
                shotsById={shotsById}
                assetsById={assetsById}
                onClipUpdate={(id, changes) => updateTimelineClip(id, changes, rippleEnabled)}
                onSelectClip={(clip) => handleClipClick(clip)}
                selectedClipId={selectedClipId}
                onSplitClip={handleClipSplit}
              />
            </div>
          ))}

          {detectedGaps.map((gap, index) => {
            const trackIndex = tracks.findIndex((track) => track.id === gap.trackId);
            if (trackIndex === -1) {
              return null;
            }

            return (
              <div
                key={`gap-${gap.trackId}-${index}`}
                className="group pointer-events-none absolute z-20 flex h-20 items-center justify-center"
                style={{
                  left: `${gap.start * zoomLevel + HEADER_WIDTH}px`,
                  width: `${(gap.end - gap.start) * zoomLevel}px`,
                  top: `${trackIndex * TRACK_HEIGHT + 2}px`,
                }}
              >
                <div className="pointer-events-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleCloseGap(gap)}
                    className="rounded bg-slate-800/80 p-2 text-white shadow-lg transition-colors hover:bg-red-500/80"
                    title="Close Gap (Ripple)"
                  >
                    <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
                  </button>
                  {gap.trackId === 'video_main' && (
                    <button
                      onClick={() => handleFillGap(gap.start, gap.end)}
                      disabled={!!fillingGapId}
                      className="rounded bg-slate-800/80 p-2 text-white shadow-lg transition-colors hover:bg-cyan-600/80"
                      title="Fill with AI B-Roll"
                    >
                      {fillingGapId === `${gap.start}-${gap.end}` ? (
                        <Icon name="spinner" className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon name="magic" className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                <div className="pointer-events-none absolute inset-x-0 h-full border-x-2 border-red-500/20 group-hover:border-red-500/50" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimelineSurface);
