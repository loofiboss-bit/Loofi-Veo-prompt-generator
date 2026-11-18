import type { OtioTimeline, OtioTrack, OtioClip, OtioGap, OtioMarker } from '@core/types/otio';
import type { Caption, Shot, TimelineState, ProductionRun, TimelineClip } from '@core/types';
import { exportCreatorSrt } from '@core/services/creatorCaptionService';

export interface OtioExportOptions {
  projectName?: string;
  projectId?: string;
  fps?: number;
  includeAnimaticTrack?: boolean;
  includeAudioTracks?: boolean;
  shots: Shot[];
  timeline?: TimelineState;
  productionRun?: ProductionRun | null;
  /** Paths relative to the packaged OTIO file, indexed by asset ID/local media key. */
  mediaPaths?: Record<string, string>;
  requireMedia?: boolean;
}

/** Resolve only the selected take; audio/asset IDs must never select a numeric scene by accident. */
export function resolveOtioSelection(
  resourceId: string | number,
  selectedTakeId: string | undefined,
  run?: ProductionRun | null,
  mediaType: TimelineClip['type'] = 'video',
) {
  // Storyboard dialogue uses the same numeric scene ID as its video clip.
  // Give it its own key and never select a generated video take for an audio track.
  if (mediaType !== 'video')
    return {
      shot: undefined,
      take: undefined,
      mediaKey: typeof resourceId === 'number' ? `${mediaType}:${resourceId}` : resourceId,
    };
  const shot = run?.shots.find((candidate) =>
    selectedTakeId
      ? candidate.takes.some((take) => take.id === selectedTakeId)
      : typeof resourceId === 'number' && candidate.id === resourceId,
  );
  const take = shot?.takes.find(
    (candidate) => candidate.id === (selectedTakeId ?? shot.selectedTakeId),
  );
  return { shot, take, mediaKey: take?.localMediaKey ?? String(resourceId) };
}

export function selectedOtioClips(options: OtioExportOptions): TimelineClip[] {
  if (options.timeline) {
    const includedTracks = new Set(
      options.timeline.tracks
        .filter(
          (track) =>
            track.type !== 'text' &&
            (track.type !== 'audio' || options.includeAudioTracks !== false),
        )
        .map((track) => track.id),
    );
    return options.timeline.clips
      .filter((clip) => includedTracks.has(clip.trackId))
      .map((clip) => ({
        ...clip,
        type:
          clip.type ??
          (options.timeline!.tracks.find((track) => track.id === clip.trackId)?.type === 'audio'
            ? 'audio'
            : 'video'),
      }));
  }
  return (options.shots.length ? options.shots : (options.productionRun?.shots ?? [])).map(
    (shot) => ({
      id: `shot:${shot.id}`,
      resourceId: shot.id,
      trackId: 'selected-video',
      startTime: 0,
      offset: 0,
      duration:
        'generationRequest' in shot ? shot.generationRequest.durationSeconds : shot.duration,
      type: 'video',
      label: `Shot ${shot.id}`,
    }),
  );
}

export function buildOtioTimeline(options: OtioExportOptions): OtioTimeline {
  const fps = options.fps ?? 24;
  if (!Number.isFinite(fps) || fps <= 0) throw new Error('A positive frame rate is required.');
  const missing: string[] = [];
  const paths = options.mediaPaths ?? {};
  const tracks: OtioTrack[] = [];
  const makeClip = (
    resourceId: string | number,
    name: string,
    duration: number,
    offset: number,
    selectedTakeId?: string,
    mediaType: TimelineClip['type'] = 'video',
  ): OtioClip => {
    const { shot, take, mediaKey } = resolveOtioSelection(
      resourceId,
      selectedTakeId,
      options.productionRun,
      mediaType,
    );
    const path = paths[mediaKey];
    if (!path || path.startsWith('/') || path.split('/').includes('..') || /^[a-z]+:/i.test(path))
      missing.push(mediaKey);
    const range = {
      start_time: { value: Math.round(offset * fps), rate: fps },
      duration: { value: Math.round(duration * fps), rate: fps },
    };
    return {
      OTIO_SCHEMA: 'Clip.1',
      name,
      source_range: range,
      media_reference:
        path && !missing.includes(mediaKey)
          ? { OTIO_SCHEMA: 'ExternalReference.1', target_url: path }
          : { OTIO_SCHEMA: 'MissingReference.1', name: mediaKey },
      markers: [],
      metadata: {
        loofi: {
          shotId:
            shot?.id ?? (Number.isFinite(Number(resourceId)) ? Number(resourceId) : undefined),
          prompt: take?.prompt ?? shot?.prompt,
          modelTarget: take?.request?.modelId ?? shot?.generationRequest?.modelId,
          takeId: take?.id,
          mediaKey,
          volume: undefined,
        },
      },
    };
  };
  const textClips: TimelineClip[] = options.timeline
    ? options.timeline.clips
        .filter((clip) => {
          const track = options.timeline!.tracks.find((item) => item.id === clip.trackId);
          return track?.type === 'text' || clip.type === 'text';
        })
        .sort((a, b) => a.startTime - b.startTime)
    : [];

  const captionMarkers: OtioMarker[] = textClips.map((clip) => ({
    OTIO_SCHEMA: 'Marker.1',
    name: clip.caption?.text ?? clip.label,
    marked_range: {
      start_time: { value: Math.round(clip.startTime * fps), rate: fps },
      duration: { value: Math.round(clip.duration * fps), rate: fps },
    },
    color: 'CYAN',
    comment: clip.caption?.style ?? 'classic',
    metadata: {
      loofiCaption: {
        id: clip.id,
        text: clip.caption?.text ?? clip.label,
        style: clip.caption?.style ?? 'classic',
        startTime: clip.startTime,
        endTime: clip.startTime + clip.duration,
      },
    },
  }));

  if (options.timeline) {
    let attachedMarkers = false;
    for (const track of options.timeline.tracks) {
      if (track.type === 'text' || (track.type === 'audio' && options.includeAudioTracks === false))
        continue;
      const children: Array<OtioClip | OtioGap> = [];
      let cursor = 0;
      for (const clip of options.timeline.clips
        .filter((item) => item.trackId === track.id)
        .sort((a, b) => a.startTime - b.startTime)) {
        if (
          ![clip.startTime, clip.duration, clip.offset].every(Number.isFinite) ||
          clip.startTime < 0 ||
          clip.duration <= 0 ||
          clip.offset < 0
        )
          throw new Error(`Invalid timing for timeline clip: ${clip.label}`);
        if (clip.startTime < cursor)
          throw new Error(
            `Overlapping clips on track ${track.label} cannot be represented in a sequential OTIO track.`,
          );
        if (clip.startTime > cursor)
          children.push({
            OTIO_SCHEMA: 'Gap.1',
            name: 'Gap',
            source_range: {
              start_time: { value: 0, rate: fps },
              duration: { value: Math.round((clip.startTime - cursor) * fps), rate: fps },
            },
          });
        const item = makeClip(
          clip.resourceId,
          clip.label,
          clip.duration,
          clip.offset,
          clip.selectedTakeId,
          clip.type ?? (track.type === 'audio' ? 'audio' : 'video'),
        );
        if (track.type === 'video' && captionMarkers.length) {
          const clipEnd = clip.startTime + clip.duration;
          item.markers = textClips
            .map((captionClip, idx) => ({ captionClip, marker: captionMarkers[idx] }))
            .filter(
              ({ captionClip }) =>
                captionClip.startTime < clipEnd &&
                captionClip.startTime + captionClip.duration > clip.startTime,
            )
            .map(({ captionClip, marker }) => ({
              ...marker,
              marked_range: {
                start_time: {
                  value: Math.max(0, Math.round((captionClip.startTime - clip.startTime) * fps)),
                  rate: fps,
                },
                duration: marker.marked_range.duration,
              },
            }));
        }
        item.metadata.loofi = {
          ...item.metadata.loofi!,
          volume: clip.volume,
          volumeKeyframes: clip.volumeKeyframes,
          transition: clip.transition,
        };
        children.push(item);
        cursor = clip.startTime + clip.duration;
      }
      const otioTrack: OtioTrack = {
        OTIO_SCHEMA: 'Track.1',
        name: track.label,
        kind: track.type === 'audio' ? 'Audio' : 'Video',
        children,
      };
      if (track.type === 'video' && !attachedMarkers && captionMarkers.length) {
        otioTrack.markers = captionMarkers;
        attachedMarkers = true;
      }
      tracks.push(otioTrack);
    }
  } else {
    const shots = options.shots.length ? options.shots : (options.productionRun?.shots ?? []);
    tracks.push({
      OTIO_SCHEMA: 'Track.1',
      name: 'V1 - Selected takes',
      kind: 'Video',
      ...(captionMarkers.length ? { markers: captionMarkers } : {}),
      children: shots.map((shot) =>
        makeClip(
          shot.id,
          `Shot ${shot.id}`,
          'generationRequest' in shot ? shot.generationRequest.durationSeconds : shot.duration,
          0,
        ),
      ),
    });
  }
  if (options.requireMedia && missing.length)
    throw new Error(`Local timeline media missing: ${[...new Set(missing)].join(', ')}`);
  const name = options.projectName || 'Loofi Production Project';
  return {
    OTIO_SCHEMA: 'Timeline.1',
    name,
    global_start_time: { value: 0, rate: fps },
    tracks: { OTIO_SCHEMA: 'Stack.1', name: 'Tracks', children: tracks },
    metadata: {
      loofiProject: {
        id: options.projectId ?? '',
        name,
        version: '22.0.0',
        exportedAt: new Date().toISOString(),
        ...(captionMarkers.length ? { captionsSidecar: 'captions.srt' } : {}),
      },
      missingMedia: [...new Set(missing)],
    },
  };
}

export function exportOtioJson(options: OtioExportOptions): string {
  return JSON.stringify(buildOtioTimeline(options), null, 2);
}

export function exportOtioWithSrt(options: OtioExportOptions): {
  otioJson: string;
  srtContent: string;
  markerCount: number;
} {
  const otio = buildOtioTimeline(options);
  const captions: Caption[] = (options.timeline?.clips ?? [])
    .filter((clip) => {
      const track = options.timeline?.tracks.find((item) => item.id === clip.trackId);
      return track?.type === 'text' || clip.type === 'text';
    })
    .map((clip) => ({
      id: clip.id,
      text: (clip.caption?.text ?? clip.label).trim() || clip.label,
      startTime: clip.startTime,
      endTime: clip.startTime + clip.duration,
      style: clip.caption?.style ?? 'classic',
    }));

  return {
    otioJson: JSON.stringify(otio, null, 2),
    srtContent: captions.length ? exportCreatorSrt(captions) : '',
    markerCount: captions.length,
  };
}
