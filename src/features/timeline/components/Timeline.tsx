import React, { useRef, useState, useEffect, useMemo } from 'react';
import { TimelineState, TimelineClip } from '@core/types';
import TimelineTrackView from './TimelineTrack';
import Icon from '@shared/components/ui/Icon';
import { useAppStore } from '@core/store/useAppStore';
import * as geminiService from '@core/services/geminiService';
import { logger } from '@core/services/loggerService';

interface TimelineProps {
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

const Timeline: React.FC<TimelineProps> = ({
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
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [rippleEnabled, setRippleEnabled] = useState(false); // Magnetic Timeline Mode

  // Tools State
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
  } = useAppStore();

  const { tracks, clips, zoomLevel, currentTime } = timelineState;
  const totalWidth = Math.max(duration + 10, 60) * zoomLevel;

  // --- KEYBOARD HANDLING (DELETE) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
        const shouldRipple = rippleEnabled || e.shiftKey;
        removeTimelineClip(selectedClipId, shouldRipple);
        if (onSelectClip) onSelectClip(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, rippleEnabled, removeTimelineClip, onSelectClip]);

  // --- GAP DETECTION LOGIC ---
  const detectedGaps = useMemo(() => {
    const allGaps: { trackId: string; start: number; end: number }[] = [];
    tracks.forEach((track) => {
      if (track.id !== 'video_main') return;
      const trackClips = clips
        .filter((c) => c.trackId === track.id)
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
        sbShots.length > 0 ? sbShots[0].action || 'Scene context' : 'Ambient scene';
      const style = sbGlobalContext.style || 'Cinematic';
      const prompt = await geminiService.generateBRollPrompt(contextText, style);

      const newShotId = sbShots.length > 0 ? Math.max(...sbShots.map((s) => s.id)) + 1 : 1;
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
        volume: 1.0,
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
    if (onSelectClip) onSelectClip(clip);
  };

  const handleClipSplit = (clip: TimelineClip, relTime: number) => {
    if (relTime <= 0 || relTime >= clip.duration) return;
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) =>
    setScrollLeft(e.currentTarget.scrollLeft);
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isRecording) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left + scrollLeft;
    onSeek(Math.max(0, clickX / zoomLevel));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderRuler = () => {
    const ticks = [];
    const step = Math.max(1, Math.floor(100 / zoomLevel));
    for (let i = 0; i < duration + 10; i += step) {
      ticks.push(
        <div
          key={i}
          className="absolute bottom-0 border-l border-slate-500 h-2 text-[9px] text-slate-400 pl-1 select-none"
          style={{ left: `${i * zoomLevel}px` }}
        >
          {formatTime(i)}
        </div>,
      );
    }
    return ticks;
  };

  const trackHeight = 96;
  const headerWidth = 192;

  return (
    <div className="flex flex-col h-full bg-slate-950 select-none">
      <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-cyan-400">{formatTime(currentTime)}</span>
          <div className="flex bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTool('select')}
              className={`p-1 rounded ${activeTool === 'select' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Select Tool (V)"
            >
              <Icon name="move" className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('razor')}
              className={`p-1 rounded ${activeTool === 'razor' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Razor Tool (C)"
            >
              <Icon name="scissors" className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button
            onClick={() => setRippleEnabled(!rippleEnabled)}
            className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${rippleEnabled ? 'text-fuchsia-400 bg-fuchsia-900/20 border border-fuchsia-500/30' : 'text-slate-500 hover:text-slate-300'}`}
            title="Magnetic Timeline (Ripple Edit)"
          >
            <Icon name="layers" className="w-3.5 h-3.5" />
            Magnetic
          </button>
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${snapEnabled ? 'text-cyan-400 bg-cyan-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Icon name="activity" className="w-3.5 h-3.5" /> Snap
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="search" className="w-3 h-3 text-slate-500" />
          <input
            type="range"
            min="5"
            max="100"
            value={zoomLevel}
            readOnly
            className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <div className="flex h-8 bg-slate-900 border-b border-slate-700">
        <div className="w-48 border-r border-slate-700 bg-slate-900 z-20 shadow-md"></div>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Interactive timeline ruler; has role="application" and aria-label */}
        <div
          className="flex-grow overflow-hidden relative cursor-pointer"
          ref={rulerRef}
          onMouseDown={handleRulerClick}
          role="application"
          aria-label="Timeline ruler"
          tabIndex={0}
        >
          <div
            className="h-full relative"
            style={{ width: `${totalWidth}px`, transform: `translateX(-${scrollLeft}px)` }}
          >
            {renderRuler()}
          </div>
        </div>
      </div>

      <div
        className="flex-grow overflow-auto relative custom-scrollbar"
        onScroll={handleScroll}
        ref={containerRef}
      >
        <div className="relative" style={{ width: `${totalWidth + headerWidth}px` }}>
          <div
            className={`absolute top-0 bottom-0 w-px z-50 pointer-events-none transition-colors ${isRecording ? 'bg-red-500' : 'bg-white'}`}
            style={{ left: `${currentTime * zoomLevel + headerWidth}px` }}
          >
            <div
              className={`w-3 h-3 transform -translate-x-1.5 rotate-45 -mt-1.5 ${isRecording ? 'bg-red-500' : 'bg-white'}`}
            />
          </div>

          {tracks.map((track, _trackIndex) => (
            <TimelineTrackView
              key={track.id}
              track={track}
              clips={clips.filter((c) => c.trackId === track.id)}
              zoomLevel={zoomLevel}
              duration={duration + 10}
              onClipUpdate={(id, changes) => updateTimelineClip(id, changes, rippleEnabled)}
              onSelectClip={(clip) => handleClipClick(clip)}
              selectedClipId={selectedClipId}
              onSplitClip={handleClipSplit}
            />
          ))}

          {detectedGaps.map((gap, i) => {
            const tIndex = tracks.findIndex((t) => t.id === gap.trackId);
            if (tIndex === -1) return null;
            return (
              <div
                key={`gap-${gap.trackId}-${i}`}
                className="absolute h-20 z-20 flex items-center justify-center pointer-events-none group"
                style={{
                  left: `${gap.start * zoomLevel + headerWidth}px`,
                  width: `${(gap.end - gap.start) * zoomLevel}px`,
                  top: `${tIndex * trackHeight + 2}px`,
                }}
              >
                <div className="flex gap-1 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCloseGap(gap)}
                    className="bg-slate-800/80 hover:bg-red-500/80 p-2 rounded text-white shadow-lg transition-colors"
                    title="Close Gap (Ripple)"
                  >
                    <Icon name="arrow-right" className="w-4 h-4 rotate-180" />
                  </button>
                  {gap.trackId === 'video_main' && (
                    <button
                      onClick={() => handleFillGap(gap.start, gap.end)}
                      disabled={!!fillingGapId}
                      className="bg-slate-800/80 hover:bg-cyan-600/80 p-2 rounded text-white shadow-lg transition-colors"
                      title="Fill with AI B-Roll"
                    >
                      {fillingGapId === `${gap.start}-${gap.end}` ? (
                        <Icon name="spinner" className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon name="magic" className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                <div className="absolute inset-x-0 h-full border-x-2 border-red-500/20 group-hover:border-red-500/50 pointer-events-none"></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Timeline);
