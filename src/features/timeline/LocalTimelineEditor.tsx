import { useStore } from 'zustand';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimelineClip } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import InspectorPanel from '@shared/components/InspectorPanel';
import { TimelineSurface } from './components/TimelineSurface';
import { SilenceCutModal } from './components/SilenceCutModal';
import { VoiceoverRecorderModal } from './components/VoiceoverRecorderModal';

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
  const [showSilenceModal, setShowSilenceModal] = useState(false);
  const [showVoiceoverModal, setShowVoiceoverModal] = useState(false);
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
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!duration) return;
      const key = event.key.toLowerCase();
      if (event.key === ' ' || key === 'k') {
        event.preventDefault();
        const nowTime = useAppStore.getState().currentTime;
        if (nowTime >= duration) setCurrentTime(0);
        setPlaying((prev) => !prev);
      } else if (event.key === 'ArrowLeft' || key === 'j') {
        event.preventDefault();
        setPlaying(false);
        const step = event.shiftKey ? 1 : 1 / 30;
        const nowTime = useAppStore.getState().currentTime;
        setCurrentTime(Math.max(0, Number((nowTime - step).toFixed(4))));
      } else if (event.key === 'ArrowRight' || key === 'l') {
        event.preventDefault();
        setPlaying(false);
        const step = event.shiftKey ? 1 : 1 / 30;
        const nowTime = useAppStore.getState().currentTime;
        setCurrentTime(Math.min(duration, Number((nowTime + step).toFixed(4))));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setPlaying(false);
        setCurrentTime(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, setCurrentTime]);
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
          <button
            type="button"
            disabled={!duration || currentTime <= 0}
            aria-label={t('v16.stepBackFrame', 'Step back 1 frame')}
            onClick={() => {
              setPlaying(false);
              setCurrentTime(Math.max(0, Number((currentTime - 1 / 30).toFixed(4))));
            }}
          >
            -1f
          </button>
          <button
            type="button"
            disabled={!duration || currentTime >= duration}
            aria-label={t('v16.stepForwardFrame', 'Step forward 1 frame')}
            onClick={() => {
              setPlaying(false);
              setCurrentTime(Math.min(duration, Number((currentTime + 1 / 30).toFixed(4))));
            }}
          >
            +1f
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
          <button
            onClick={() => setShowVoiceoverModal(true)}
            className="flex items-center gap-1.5 rounded border border-rose-600/50 bg-rose-950/40 px-2 py-1 text-xs font-medium text-rose-300 hover:bg-rose-900/60 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {t('voiceover.recordButton', 'Record voiceover')}
          </button>
          {selected && (selected.type === 'video' || selected.type === 'audio') && (
            <button
              onClick={() => setShowSilenceModal(true)}
              className="rounded border border-sky-600/50 bg-sky-950/40 px-2 py-1 text-xs font-medium text-sky-300 hover:bg-sky-900/60 transition-colors"
            >
              {t('silence.button', 'Trim pauses')}
            </button>
          )}
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
      {showSilenceModal && selected && (
        <SilenceCutModal
          isOpen={showSilenceModal}
          onClose={() => setShowSilenceModal(false)}
          clip={selected}
          asset={assets.find((item) => item.id === selected.resourceId)}
          allClips={clips}
          onApplyCuts={(newClips) => {
            useAppStore.setState({ clips: newClips });
          }}
        />
      )}
      {showVoiceoverModal && (
        <VoiceoverRecorderModal
          isOpen={showVoiceoverModal}
          onClose={() => setShowVoiceoverModal(false)}
          currentTime={currentTime}
          tracks={tracks}
          clips={clips}
          onVoiceoverAdded={(newClip) => {
            setSelectedId(newClip.id);
          }}
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
