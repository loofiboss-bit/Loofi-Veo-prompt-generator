import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Asset, ProductionRun, Shot, TimelineClip, TimelineTrack } from '@core/types';
import { resolveOtioSelection } from '@core/services/otioExportService';

export function timelinePreviewSource(
  clip: TimelineClip,
  assets: Asset[],
  shots: Shot[],
  run: ProductionRun | null,
): string | undefined {
  const selected = resolveOtioSelection(clip.resourceId, clip.selectedTakeId, run, clip.type);
  // A frozen selection must never silently switch to the scene's latest take.
  if (clip.selectedTakeId) {
    const frozenAsset = assets.find(
      (item) => item.id === clip.selectedTakeId || item.id === selected.mediaKey,
    );
    // A registered streaming URL is usable from both file and development origins.
    // It belongs to the frozen identity above, never the scene's newer selected take.
    if (frozenAsset?.url?.startsWith('loofi-media:')) return frozenAsset.url;
    return selected.take?.localMediaUrl || frozenAsset?.proxyUrl || frozenAsset?.url;
  }
  const asset = assets.find((item) => item.id === clip.resourceId);
  const shot = shots.find((item) => item.id === clip.resourceId);
  return asset?.url || (clip.type === 'audio' ? shot?.audioUrl : shot?.generatedVideoUrl);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function timelinePreviewGain(
  clip: TimelineClip,
  time: number,
  fade: { inSeconds: number; outSeconds: number } | undefined,
  muted: boolean,
  enabled: boolean,
): number {
  if (muted || !enabled) return 0;
  const elapsed = Math.max(0, time - clip.startTime);
  const keyframes = [...(clip.volumeKeyframes ?? [])].sort((a, b) => a.time - b.time);
  const left = keyframes.filter((frame) => frame.time <= elapsed).at(-1);
  const right = keyframes.find((frame) => frame.time > elapsed);
  const keyframeGain =
    left && right
      ? left.value + ((right.value - left.value) * (elapsed - left.time)) / (right.time - left.time)
      : (left?.value ?? right?.value ?? 1);
  const fadeIn = fade?.inSeconds ? clamp01(elapsed / fade.inSeconds) : 1;
  const fadeOut = fade?.outSeconds ? clamp01((clip.duration - elapsed) / fade.outSeconds) : 1;
  return clamp01((clip.volume ?? 1) * keyframeGain * Math.min(fadeIn, fadeOut));
}

function createPreviewAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) return null;
  try {
    return new AudioContextCtor();
  } catch {
    return null;
  }
}

function TimedMedia({
  clip,
  src,
  time,
  playing,
  onFailure,
  visual = false,
  audioContext,
  fade,
  muted,
}: {
  clip: TimelineClip;
  src: string;
  time: number;
  playing: boolean;
  onFailure: (message: string) => void;
  visual?: boolean;
  audioContext: AudioContext | null;
  fade?: { inSeconds: number; outSeconds: number };
  muted: boolean;
}) {
  const ref = useRef<HTMLMediaElement | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const { t } = useTranslation('creator');

  useEffect(() => {
    const element = ref.current;
    if (!element || !audioContext) return;
    try {
      const source = audioContext.createMediaElementSource(element);
      const gain = audioContext.createGain();
      source.connect(gain);
      gain.connect(audioContext.destination);
      gainRef.current = gain;
      return () => {
        gainRef.current = null;
        source.disconnect();
        gain.disconnect();
      };
    } catch {
      // Browsers without a usable Web Audio route keep ordinary element playback.
      return;
    }
  }, [audioContext]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let live = true;
    const applyGain = () => {
      const gain = timelinePreviewGain(clip, time, fade, muted, true);
      if (gainRef.current) {
        // MediaElementAudioSource routes through this gain node, avoiding a second audible path.
        element.volume = 1;
        gainRef.current.gain.value = gain;
      } else {
        element.volume = gain;
      }
    };
    const synchronize = () => {
      applyGain();
      if (element.readyState < 1) return;
      const target = clip.offset + time - clip.startTime;
      if (Number.isFinite(element.duration) && element.duration > 0 && target >= element.duration) {
        onFailure(
          t(
            'v16.previewRange',
            'The clip exceeds its source. Shorten it or relink the correct take.',
          ),
        );
        return;
      }
      if (Math.abs(element.currentTime - target) > 0.15) element.currentTime = target;
      if (playing) {
        if (audioContext?.state === 'suspended') void audioContext.resume().catch(() => undefined);
        if (element.paused)
          void element.play().catch(() => {
            if (live)
              onFailure(
                t(
                  'v16.previewPlayFailed',
                  'Playback could not start. Check the source or try again.',
                ),
              );
          });
      } else if (!element.paused) {
        element.pause();
      }
    };
    synchronize();
    element.addEventListener('loadedmetadata', synchronize);
    return () => {
      live = false;
      element.removeEventListener('loadedmetadata', synchronize);
    };
  }, [audioContext, clip, fade, muted, time, playing, src, onFailure, t]);

  useEffect(() => {
    const element = ref.current;
    return () => element?.pause();
  }, []);

  const error = () =>
    onFailure(t('v16.previewMissing', 'A preview source is unavailable. Relink this clip.'));
  const mediaProps = {
    ref: (value: HTMLMediaElement | null) => {
      ref.current = value;
    },
    crossOrigin: src.startsWith('loofi-media:') ? ('anonymous' as const) : undefined,
    src,
    playsInline: true,
    preload: 'auto' as const,
    onError: error,
  };
  return visual ? (
    <video {...mediaProps} />
  ) : clip.type === 'video' ? (
    <video
      {...mediaProps}
      className="pointer-events-none absolute h-px w-px opacity-0"
      aria-hidden="true"
    />
  ) : (
    <audio {...mediaProps} />
  );
}

/** All active timeline media share one clock and one Web Audio output mix. */
export function TimelineSourcePreview({
  clips,
  tracks,
  assets,
  shots,
  run,
  time,
  playing,
  audioFades = {},
  onFailure,
}: {
  clips: TimelineClip[];
  tracks: TimelineTrack[];
  assets: Asset[];
  shots: Shot[];
  run: ProductionRun | null;
  time: number;
  playing: boolean;
  audioFades?: Record<string, { inSeconds: number; outSeconds: number }>;
  onFailure: (message: string) => void;
}) {
  const { t } = useTranslation('creator');
  const [error, setError] = useState('');
  const [audioContext] = useState(createPreviewAudioContext);
  const trackById = new Map(tracks.map((track) => [track.id, track]));
  const trackEnabled = (clip: TimelineClip) => trackById.get(clip.trackId)?.active !== false;
  const enabledClips = clips.filter(trackEnabled);
  const active = enabledClips.filter(
    (clip) => clip.startTime <= time && clip.startTime + clip.duration > time,
  );
  const visuals = active
    .filter((clip) => clip.type === 'video' || clip.type === 'image')
    .sort(
      (a, b) => (trackById.get(b.trackId)?.zIndex ?? 0) - (trackById.get(a.trackId)?.zIndex ?? 0),
    );
  const visual = visuals[0];
  const visualUrl = visual && timelinePreviewSource(visual, assets, shots, run);
  const fail = useCallback(
    (message: string) => {
      setError(message);
      onFailure(message);
    },
    [onFailure],
  );
  const missing = active.some(
    (clip) =>
      ['video', 'audio', 'image'].includes(clip.type) &&
      !timelinePreviewSource(clip, assets, shots, run),
  );
  useEffect(() => {
    if (playing && missing)
      fail(t('v16.previewMissing', 'A preview source is unavailable. Relink this clip.'));
    else if (playing) setError('');
  }, [playing, missing, fail, t]);
  useEffect(
    () => () => {
      if (audioContext && audioContext.state !== 'closed') void audioContext.close();
    },
    [audioContext],
  );

  const audioBearingVideoClips = active.filter(
    (clip) => clip.type === 'video' && clip.id !== visual?.id,
  );
  const mediaClips = [...active.filter((clip) => clip.type === 'audio'), ...audioBearingVideoClips];
  return (
    <div className="relative h-full w-full">
      {visual?.type === 'image' && visualUrl ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Decode failures are not user interaction.
        <img
          src={visualUrl}
          alt={visual.label}
          onError={() =>
            fail(t('v16.previewMissing', 'A preview source is unavailable. Relink this clip.'))
          }
        />
      ) : visual?.type === 'video' && visualUrl ? (
        <TimedMedia
          key={`${visual.id}:${visualUrl}`}
          clip={visual}
          src={visualUrl}
          time={time}
          playing={playing}
          onFailure={fail}
          visual
          audioContext={audioContext}
          fade={audioFades[visual.id]}
          muted={trackById.get(visual.trackId)?.muted === true}
        />
      ) : (
        <p>{t('v16.sourceGap', 'No visual clip at the playhead')}</p>
      )}
      {mediaClips.map((clip) => {
        const src = timelinePreviewSource(clip, assets, shots, run);
        return src ? (
          <TimedMedia
            key={`${clip.id}:${src}`}
            clip={clip}
            src={src}
            time={time}
            playing={playing}
            onFailure={fail}
            audioContext={audioContext}
            fade={audioFades[clip.id]}
            muted={trackById.get(clip.trackId)?.muted === true}
          />
        ) : null;
      })}
      {active
        .filter((clip) => clip.type === 'text' && clip.caption)
        .map((clip) => (
          <p
            key={clip.id}
            className="absolute bottom-[10%] left-[8%] right-[8%] whitespace-pre-wrap bg-black/70 px-3 py-2 text-center text-white"
            aria-label={t('v16.previewCaption', 'Preview caption')}
          >
            {clip.caption!.text}
          </p>
        ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
