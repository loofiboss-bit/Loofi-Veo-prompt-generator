import { useStore } from 'zustand';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimelineClip } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import InspectorPanel from '@shared/components/InspectorPanel';
import { TimelineSurface } from './components/TimelineSurface';

/** Source playback aids editing; native delivery review is the composited output. */
export function LocalTimelineEditor() {
  const { t } = useTranslation('creator');
  const {
    clips,
    tracks,
    currentTime,
    zoomLevel,
    assets,
    sbShots,
    setCurrentTime,
    updateTimelineClip,
  } = useAppStore();
  const canUndo = useStore(useAppStore.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(useAppStore.temporal, (state) => state.futureStates.length > 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const mediaRef = useRef<HTMLVideoElement>(null);
  const duration = Math.max(0, ...clips.map((clip) => clip.startTime + clip.duration));
  const active = clips.find(
    (clip) =>
      (clip.type === 'image' || clip.type === 'video') &&
      clip.startTime <= currentTime &&
      clip.startTime + clip.duration > currentTime,
  );
  const selected = clips.find((clip) => clip.id === selectedId) ?? null;
  const asset = assets.find((item) => item.id === active?.resourceId);
  const shot = sbShots.find((item) => item.id === active?.resourceId);
  const url = asset?.proxyUrl ?? asset?.url ?? shot?.generatedVideoUrl;
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      if (now - previous < 100) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const state = useAppStore.getState();
      const next = Math.min(duration, state.currentTime + (now - previous) / 1000);
      previous = now;
      state.setCurrentTime(next);
      if (next >= duration) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration]);
  useEffect(() => {
    const element = mediaRef.current;
    if (!element || !active) return;
    const synchronize = () => {
      const target = active.offset + currentTime - active.startTime;
      if (Math.abs(element.currentTime - target) > 0.15) element.currentTime = target;
      element.volume = Math.min(1, Math.max(0, active.volume ?? 1));
      if (playing) void element.play().catch(() => setPlaying(false));
      else element.pause();
    };
    if (element.readyState >= 1) synchronize();
    element.addEventListener('loadedmetadata', synchronize);
    return () => element.removeEventListener('loadedmetadata', synchronize);
  }, [active, currentTime, playing, url]);
  return (
    <div className="local-editor-workspace">
      <div className="local-editor-viewer">
        <div className="local-editor-source">
          {active?.type === 'image' && url ? (
            <img src={url} alt={active.label} />
          ) : url ? (
            <video ref={mediaRef} src={url} playsInline preload="metadata" />
          ) : (
            <p>{t('v16.sourceGap', 'No visual clip at the playhead')}</p>
          )}
        </div>
        <p>
          {t(
            'v16.sourcePreview',
            'Source preview for editing. Use Review delivery to check the final mix, transitions and captions.',
          )}
        </p>
        <div className="local-editor-transport">
          <button
            disabled={!duration}
            onClick={() => {
              if (currentTime >= duration) setCurrentTime(0);
              setPlaying((value) => !value);
            }}
          >
            {playing ? t('v16.pause', 'Pause') : t('v16.play', 'Play')}
          </button>
          <input
            type="range"
            min="0"
            max={duration || 1}
            step={1 / 30}
            value={Math.min(currentTime, duration)}
            aria-label={t('v16.playhead', 'Playhead')}
            onChange={(event) => setCurrentTime(Number(event.target.value))}
          />
          <output>
            {currentTime.toFixed(1)} / {duration.toFixed(1)}s
          </output>
          <button disabled={!canUndo} onClick={() => useAppStore.temporal.getState().undo()}>
            {t('v16.undo', 'Undo')}
          </button>
          <button disabled={!canRedo} onClick={() => useAppStore.temporal.getState().redo()}>
            {t('v16.redo', 'Redo')}
          </button>
        </div>
      </div>
      {selected && (
        <InspectorPanel
          deliveryMode
          selectedClip={selected}
          onUpdate={updateTimelineClip}
          currentTime={currentTime}
        />
      )}
      <div className="local-editor-timeline">
        <TimelineSurface
          deliveryMode
          timelineState={{ clips, tracks, currentTime, zoomLevel }}
          duration={duration}
          onClipUpdate={updateTimelineClip}
          onSeek={setCurrentTime}
          selectedClipId={selectedId}
          onSelectClip={(clip: TimelineClip | null) => setSelectedId(clip?.id ?? null)}
          startVideoGeneration={async () => {
            throw new Error('Generation is unavailable in local delivery mode.');
          }}
        />
      </div>
    </div>
  );
}
