import type { OtioTimeline, OtioTrack, OtioClip, OtioGap } from '@core/types/otio';
import type { Shot, TimelineState, ProductionRun } from '@core/types';

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
  ): OtioClip => {
    const shot = options.productionRun?.shots.find(
      (candidate) =>
        candidate.id === Number(resourceId) ||
        Boolean(selectedTakeId && candidate.takes.some((take) => take.id === selectedTakeId)),
    );
    const take = shot?.takes.find(
      (candidate) => candidate.id === (selectedTakeId ?? shot.selectedTakeId),
    );
    const mediaKey = take?.localMediaKey ?? String(resourceId);
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
          modelTarget: take?.request.modelId ?? shot?.generationRequest.modelId,
          takeId: take?.id,
          mediaKey,
          volume: undefined,
        },
      },
    };
  };
  if (options.timeline?.clips.length) {
    for (const track of options.timeline.tracks) {
      if (track.type === 'text' || (track.type === 'audio' && options.includeAudioTracks === false))
        continue;
      const children: Array<OtioClip | OtioGap> = [];
      let cursor = 0;
      for (const clip of options.timeline.clips
        .filter((item) => item.trackId === track.id)
        .sort((a, b) => a.startTime - b.startTime)) {
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
        );
        item.metadata.loofi = {
          ...item.metadata.loofi!,
          volume: clip.volume,
          volumeKeyframes: clip.volumeKeyframes,
          transition: clip.transition,
        };
        children.push(item);
        cursor = clip.startTime + clip.duration;
      }
      tracks.push({
        OTIO_SCHEMA: 'Track.1',
        name: track.label,
        kind: track.type === 'audio' ? 'Audio' : 'Video',
        children,
      });
    }
  } else {
    const shots = options.productionRun?.shots ?? options.shots;
    tracks.push({
      OTIO_SCHEMA: 'Track.1',
      name: 'V1 - Selected takes',
      kind: 'Video',
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
        version: '14.0.0',
        exportedAt: new Date().toISOString(),
      },
      missingMedia: [...new Set(missing)],
    },
  };
}

export function exportOtioJson(options: OtioExportOptions): string {
  return JSON.stringify(buildOtioTimeline(options), null, 2);
}
