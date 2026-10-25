import React from 'react';
import { useTranslation } from 'react-i18next';
import { Asset, ClipTransition, Shot, TimelineClip, TimelineTrack } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';

import TransitionHandle from '../TransitionHandle';
import TimelineClipView from './TimelineClip';
import { getVisibleClips } from './timelineVirtualization';

interface TimelineTrackProps {
  track: TimelineTrack;
  clips: TimelineClip[];
  zoomLevel: number;
  duration: number;
  currentTime: number;
  viewportStartPx: number;
  viewportEndPx: number;
  shotsById: ReadonlyMap<number, Shot>;
  assetsById: ReadonlyMap<string, Asset>;
  onClipUpdate: (id: string, changes: Partial<TimelineClip>) => void;
  beatMarkers?: number[];
  onSelectClip?: (clip: TimelineClip) => void;
  selectedClipId?: string | null;
  onSplitClip?: (clip: TimelineClip, relTime: number) => void;
  razorEnabled?: boolean;
  deliveryMode?: boolean;
}

const TimelineTrackView: React.FC<TimelineTrackProps> = ({
  track,
  clips,
  zoomLevel,
  duration,
  currentTime,
  viewportStartPx,
  viewportEndPx,
  shotsById,
  assetsById,
  onClipUpdate,
  beatMarkers,
  onSelectClip,
  selectedClipId,
  onSplitClip,
  razorEnabled,
  deliveryMode = false,
}) => {
  const updateShotTransition = useAppStore((state) => state.updateShotTransition);
  const setTimelineClipTransition = useAppStore((state) => state.setTimelineClipTransition);
  const updateTimelineTrack = useAppStore((state) => state.updateTimelineTrack);
  const { t } = useTranslation('creator');
  const orderedClips = React.useMemo(
    () => [...clips].sort((a, b) => a.startTime - b.startTime),
    [clips],
  );
  const contentRef = React.useRef<HTMLDivElement>(null);
  const beatMarkerRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const clipIndexMap = React.useMemo(
    () => new Map(orderedClips.map((clip, index) => [clip.id, index])),
    [orderedClips],
  );
  const visibleClips = React.useMemo(
    () => getVisibleClips(orderedClips, zoomLevel, viewportStartPx, viewportEndPx),
    [orderedClips, zoomLevel, viewportStartPx, viewportEndPx],
  );

  React.useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.backgroundSize = `${zoomLevel}px 100%`;
      contentRef.current.style.minWidth = `${duration * zoomLevel}px`;
    }

    beatMarkerRefs.current.forEach((marker, idx) => {
      const time = beatMarkers?.[idx];

      if (!marker || typeof time !== 'number') {
        return;
      }

      marker.style.left = `${time * zoomLevel}px`;
    });

    beatMarkerRefs.current.length = beatMarkers?.length ?? 0;
  }, [beatMarkers, duration, zoomLevel]);

  const handleTransitionUpdate = (clip: TimelineClip, transition: ClipTransition) => {
    if (deliveryMode) {
      setTimelineClipTransition(clip.id, transition);
    } else if (typeof clip.resourceId === 'number') {
      updateShotTransition(clip.resourceId, transition);
    }
  };

  return (
    <div className="flex h-24 border-b border-slate-700/50 bg-slate-900">
      <div className="w-48 flex-shrink-0 border-r border-slate-700 bg-slate-800/50 p-2 flex flex-col justify-center z-10 shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-xs font-bold text-slate-300 uppercase tracking-wider truncate"
            title={track.label}
          >
            {track.label}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {track.type}
          </span>
        </div>
        <div className="flex gap-2">
          <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full w-3/4 ${track.type === 'audio' ? 'bg-fuchsia-500' : 'bg-cyan-500'}`}
            />
          </div>
        </div>
        <div className="mt-1 flex gap-1">
          <button
            type="button"
            aria-pressed={track.active !== false}
            aria-label={`${track.label}: ${track.active === false ? t('v16.trackEnable', 'Enable track') : t('v16.trackDisable', 'Disable track')}`}
            className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
            onClick={() => updateTimelineTrack(track.id, { active: track.active === false })}
          >
            {track.active === false ? t('v16.trackOff', 'Off') : t('v16.trackOn', 'On')}
          </button>
          {track.type === 'audio' && (
            <button
              type="button"
              aria-pressed={track.muted === true}
              aria-label={`${track.label}: ${track.muted ? t('v16.trackUnmute', 'Unmute track') : t('v16.trackMute', 'Mute track')}`}
              className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
              onClick={() => updateTimelineTrack(track.id, { muted: track.muted !== true })}
            >
              {track.muted ? t('v16.trackMuted', 'Muted') : t('v16.trackSoundOn', 'Sound on')}
            </button>
          )}
        </div>
      </div>

      <div
        ref={contentRef}
        className="relative flex-grow h-full bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]"
      >
        {beatMarkers && beatMarkers.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {beatMarkers.map((_, idx) => (
              <div
                key={idx}
                ref={(element) => {
                  beatMarkerRefs.current[idx] = element;
                }}
                className="absolute top-0 bottom-0 border-l border-fuchsia-500/30"
              />
            ))}
          </div>
        )}

        {visibleClips.map((clip) => {
          const clipIndex = clipIndexMap.get(clip.id) ?? 0;
          const previousClip = clipIndex > 0 ? orderedClips[clipIndex - 1] : null;

          return (
            <React.Fragment key={clip.id}>
              {track.type === 'video' && previousClip && (
                <TransitionHandle
                  deliveryMode={deliveryMode}
                  transition={clip.transition || { type: 'cut', duration: 0 }}
                  onUpdate={(transition) => handleTransitionUpdate(clip, transition)}
                  left={clip.startTime * zoomLevel}
                  zoomLevel={zoomLevel}
                  incomingClipId={clip.id}
                  outgoingClipId={previousClip.id}
                />
              )}
              <TimelineClipView
                clip={clip}
                zoomLevel={zoomLevel}
                currentTime={currentTime}
                shot={
                  typeof clip.resourceId === 'number' ? shotsById.get(clip.resourceId) : undefined
                }
                asset={assetsById.get(String(clip.resourceId))}
                onUpdate={onClipUpdate}
                onSelect={onSelectClip}
                isSelected={selectedClipId === clip.id}
                onSplit={onSplitClip}
                razorEnabled={razorEnabled}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineTrackView;
