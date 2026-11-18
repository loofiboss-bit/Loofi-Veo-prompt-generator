import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Shot, TimelineClip, TimelineTrack, Asset, ProductionRun } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { usePlaybackStore } from '@core/store/usePlaybackStore';
import InspectorPanel from '@shared/components/InspectorPanel';
import { TimelineSurface } from './components/TimelineSurface';
import { TimelineSourcePreview } from './components/TimelineSourcePreview';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { SilenceCutModal } from './components/SilenceCutModal';
import { VoiceoverRecorderModal } from './components/VoiceoverRecorderModal';

const EMPTY_AUDIO_FADES: Record<string, { inSeconds: number; outSeconds: number }> = {};

function LocalSourcePreviewLeaf({
  clips,
  tracks,
  assets,
  shots,
  run,
  committedTime,
  playing,
  audioFades,
  onFailure,
}: {
  clips: TimelineClip[];
  tracks: TimelineTrack[];
  assets: Asset[];
  shots: Shot[];
  run: ProductionRun | null;
  committedTime: number;
  playing: boolean;
  audioFades: Record<string, { inSeconds: number; outSeconds: number }>;
  onFailure: () => void;
}) {
  const liveTime = usePlaybackStore((state) => (state.isPlaying ? state.currentTime : null));
  return (
    <TimelineSourcePreview
      clips={clips}
      tracks={tracks}
      assets={assets}
      shots={shots}
      run={run}
      time={liveTime ?? committedTime}
      playing={playing}
      audioFades={audioFades}
      onFailure={onFailure}
    />
  );
}

function LocalTransportScrubberLeaf({
  committedTime,
  duration,
  onSeekCommit,
  onPause,
  stepBackLabel,
  stepForwardLabel,
  playheadLabel,
}: {
  committedTime: number;
  duration: number;
  onSeekCommit: (nextTime: number) => void;
  onPause: () => void;
  stepBackLabel: string;
  stepForwardLabel: string;
  playheadLabel: string;
}) {
  const liveTime = usePlaybackStore((state) => (state.isPlaying ? state.currentTime : null));
  const activeTime = liveTime ?? committedTime;
  return (
    <>
      <button
        type="button"
        disabled={!duration || activeTime <= 0}
        aria-label={stepBackLabel}
        onClick={() => {
          onPause();
          onSeekCommit(Math.max(0, Number((activeTime - 1 / 30).toFixed(4))));
        }}
      >
        -1f
      </button>
      <button
        type="button"
        disabled={!duration || activeTime >= duration}
        aria-label={stepForwardLabel}
        onClick={() => {
          onPause();
          onSeekCommit(Math.min(duration, Number((activeTime + 1 / 30).toFixed(4))));
        }}
      >
        +1f
      </button>
      <input
        type="range"
        min="0"
        max={duration || 1}
        step={1 / 30}
        value={Math.min(activeTime, duration)}
        aria-label={playheadLabel}
        onChange={(event) => onSeekCommit(Number(event.target.value))}
      />
      <output>
        {activeTime.toFixed(1)} / {duration.toFixed(1)}s
      </output>
    </>
  );
}

/** Source playback aids editing; native delivery review is the composited output. */
export function LocalTimelineEditor({ onReviewDelivery }: { onReviewDelivery?: () => void }) {
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
  } = useAppStore(
    useShallow((state) => ({
      clips: state.clips,
      tracks: state.tracks,
      currentTime: state.currentTime,
      zoomLevel: state.zoomLevel,
      assets: state.assets,
      sbShots: state.sbShots,
      setCurrentTime: state.setCurrentTime,
      updateTimelineClip: state.updateTimelineClip,
    })),
  );
  const commitSeek = useCallback(
    (nextTime: number) => {
      usePlaybackStore.getState().setCurrentTime(nextTime);
      setCurrentTime(nextTime);
    },
    [setCurrentTime],
  );
  const canUndo = useStore(useAppStore.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(useAppStore.temporal, (state) => state.futureStates.length > 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const stopPreview = useCallback(() => setPlaying(false), []);
  const [showSilenceModal, setShowSilenceModal] = useState(false);
  const [showVoiceoverModal, setShowVoiceoverModal] = useState(false);
  const projectId = useProjectStore((state) => state.currentProjectId);
  const activeRun = useProductionRunStore((state) => state.activeRun);
  const storedAudioFades = useEditorSessionStore(
    (state) => state.projectSnapshot?.creatorDelivery?.audioFades,
  );
  const audioFades = storedAudioFades ?? EMPTY_AUDIO_FADES;
  const run = activeRun?.projectId === projectId ? activeRun : null;
  const duration = Math.max(0, ...clips.map((clip) => clip.startTime + clip.duration));
  const selected = clips.find((clip) => clip.id === selectedId) ?? null;
  const timelineState = useMemo(
    () => ({ clips, tracks, currentTime, zoomLevel }),
    [clips, tracks, currentTime, zoomLevel],
  );
  const handleSelectClip = useCallback((clip: TimelineClip | null) => {
    setSelectedId(clip?.id ?? null);
  }, []);
  const handleUnavailableGeneration = useCallback(async () => {
    throw new Error('Generation is unavailable in local delivery mode.');
  }, []);

  useEffect(() => {
    setPlaying(false);
    usePlaybackStore.getState().resetPlayback();
  }, [projectId]);
  useEffect(() => {
    usePlaybackStore.getState().setIsPlaying(playing);
    if (!playing) return;
    usePlaybackStore.getState().setCurrentTime(useAppStore.getState().currentTime);
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      if (now - previous < 100) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const playback = usePlaybackStore.getState();
      const next = Math.min(duration, playback.currentTime + (now - previous) / 1000);
      previous = now;
      playback.setCurrentTime(next);
      if (next >= duration) {
        playback.setIsPlaying(false);
        setPlaying(false);
        useAppStore.getState().setCurrentTime(next);
      } else {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      const playback = usePlaybackStore.getState();
      playback.setIsPlaying(false);
      useAppStore.getState().setCurrentTime(playback.currentTime);
    };
  }, [playing, duration]);
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
        const nowTime = usePlaybackStore.getState().isPlaying
          ? usePlaybackStore.getState().currentTime
          : useAppStore.getState().currentTime;
        if (nowTime >= duration) commitSeek(0);
        setPlaying((prev) => !prev);
      } else if (event.key === 'ArrowLeft' || key === 'j') {
        event.preventDefault();
        setPlaying(false);
        const step = event.shiftKey ? 1 : 1 / 30;
        const nowTime = useAppStore.getState().currentTime;
        commitSeek(Math.max(0, Number((nowTime - step).toFixed(4))));
      } else if (event.key === 'ArrowRight' || key === 'l') {
        event.preventDefault();
        setPlaying(false);
        const step = event.shiftKey ? 1 : 1 / 30;
        const nowTime = useAppStore.getState().currentTime;
        commitSeek(Math.min(duration, Number((nowTime + step).toFixed(4))));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setPlaying(false);
        commitSeek(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, commitSeek]);
  return (
    <div className="local-editor-workspace">
      <div className="local-editor-viewer">
        <div className="local-editor-source">
          <LocalSourcePreviewLeaf
            clips={clips}
            tracks={tracks}
            assets={assets}
            shots={sbShots}
            run={run}
            committedTime={currentTime}
            playing={playing}
            audioFades={audioFades}
            onFailure={stopPreview}
          />
        </div>
        <p>
          {t(
            'v16.sourcePreview',
            'Source preview for editing. Use Review delivery to check the final mix, transitions and captions.',
          )}
        </p>
        {onReviewDelivery && (
          <button type="button" onClick={onReviewDelivery}>
            {t('timeline.openDeliveryReview', 'Open delivery review')}
          </button>
        )}
        <div className="local-editor-transport">
          <button
            disabled={!duration}
            onClick={() => {
              const activeTime = usePlaybackStore.getState().isPlaying
                ? usePlaybackStore.getState().currentTime
                : useAppStore.getState().currentTime;
              if (activeTime >= duration) commitSeek(0);
              setPlaying((value) => !value);
            }}
          >
            {playing ? t('v16.pause', 'Pause') : t('v16.play', 'Play')}
          </button>
          <LocalTransportScrubberLeaf
            committedTime={currentTime}
            duration={duration}
            onSeekCommit={commitSeek}
            onPause={stopPreview}
            stepBackLabel={t('v16.stepBackFrame', 'Step back 1 frame')}
            stepForwardLabel={t('v16.stepForwardFrame', 'Step forward 1 frame')}
            playheadLabel={t('v16.playhead', 'Playhead')}
          />
          <button disabled={!canUndo} onClick={() => useAppStore.temporal.getState().undo()}>
            {t('v16.undo', 'Undo')}
          </button>
          <button disabled={!canRedo} onClick={() => useAppStore.temporal.getState().redo()}>
            {t('v16.redo', 'Redo')}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setShowVoiceoverModal(true);
            }}
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
          onVoiceoverAdded={(newClip) => {
            setSelectedId(newClip.id);
          }}
        />
      )}
      <div className="local-editor-timeline">
        <TimelineSurface
          deliveryMode
          timelineState={timelineState}
          duration={duration}
          onClipUpdate={updateTimelineClip}
          onSeek={commitSeek}
          selectedClipId={selectedId}
          onSelectClip={handleSelectClip}
          startVideoGeneration={handleUnavailableGeneration}
        />
      </div>
    </div>
  );
}
