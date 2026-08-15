/**
 * OpenTimelineIO (OTIO) Export Service (v12.0.0)
 *
 * Exports multi-track video and audio timelines into standard OpenTimelineIO (.otio)
 * JSON packages with clip markers, Veo generation prompts, and continuity metadata.
 */

import type { OtioTimeline, OtioTrack, OtioClip, OtioMarker } from '@core/types/otio';
import type { Shot } from '@core/types';

export interface OtioExportOptions {
  projectName?: string;
  fps?: number;
  includeAnimaticTrack?: boolean;
  includeAudioTracks?: boolean;
  shots: Shot[];
}

/**
 * Builds a valid OpenTimelineIO Timeline schema object.
 */
export function buildOtioTimeline(options: OtioExportOptions): OtioTimeline {
  const fps = options.fps ?? 24;
  const projectName = options.projectName || 'Loofi Production Project';
  const shots = options.shots;

  const primaryVideoClips: OtioClip[] = [];
  const previzVideoClips: OtioClip[] = [];
  const dialogueAudioClips: OtioClip[] = [];

  for (const shot of shots) {
    const durationFrames = Math.max(24, Math.round((shot.duration || 4) * fps));

    const markers: OtioMarker[] = [];

    if (shot.action) {
      markers.push({
        OTIO_SCHEMA: 'Marker.1',
        name: `Shot ${shot.id} Action`,
        marked_range: {
          start_time: { value: 0, rate: fps },
          duration: { value: durationFrames, rate: fps },
        },
        color: 'CYAN',
        comment: shot.action,
      });
    }

    if (shot.camera) {
      markers.push({
        OTIO_SCHEMA: 'Marker.1',
        name: 'Camera Motion',
        marked_range: {
          start_time: { value: 0, rate: fps },
          duration: { value: Math.min(24, durationFrames), rate: fps },
        },
        color: 'GREEN',
        comment: shot.camera,
      });
    }

    // Primary Video Clip (V1)
    const videoClip: OtioClip = {
      OTIO_SCHEMA: 'Clip.1',
      name: `Shot_${String(shot.id).padStart(3, '0')}`,
      source_range: {
        start_time: { value: 0, rate: fps },
        duration: { value: durationFrames, rate: fps },
      },
      media_reference: {
        OTIO_SCHEMA: 'ExternalReference.1',
        name: `Shot_${shot.id}_take`,
        target_url: (shot as { videoUrl?: string }).videoUrl || `media/shot_${shot.id}.mp4`,
      },
      markers,
      metadata: {
        loofi: {
          shotId: shot.id,
          prompt: shot.action,
          modelTarget: 'veo-3.1',
          characterProfileIds: shot.characterArchetype ? [shot.characterArchetype] : [],
        },
      },
    };
    primaryVideoClips.push(videoClip);

    // Previz Animatic Clip (V2)
    const previzClip: OtioClip = {
      OTIO_SCHEMA: 'Clip.1',
      name: `Shot_${String(shot.id).padStart(3, '0')}_Previz`,
      source_range: {
        start_time: { value: 0, rate: fps },
        duration: { value: durationFrames, rate: fps },
      },
      media_reference: {
        OTIO_SCHEMA: 'ExternalReference.1',
        name: `Shot_${shot.id}_storyboard`,
        target_url: (shot as { imageUrl?: string }).imageUrl || `media/storyboard_${shot.id}.png`,
      },
      markers: [],
      metadata: {
        loofi: {
          shotId: shot.id,
          type: 'storyboard-animatic',
        },
      },
    };
    previzVideoClips.push(previzClip);

    // Dialogue Audio Clip (A2)
    if (shot.dialogue) {
      dialogueAudioClips.push({
        OTIO_SCHEMA: 'Clip.1',
        name: `Dialogue_Shot_${shot.id}`,
        source_range: {
          start_time: { value: 0, rate: fps },
          duration: { value: durationFrames, rate: fps },
        },
        markers: [
          {
            OTIO_SCHEMA: 'Marker.1',
            name: 'Dialogue',
            marked_range: {
              start_time: { value: 0, rate: fps },
              duration: { value: durationFrames, rate: fps },
            },
            color: 'YELLOW',
            comment: shot.dialogue,
          },
        ],
        metadata: {
          loofi: {
            shotId: shot.id,
            dialogueText: shot.dialogue,
          },
        },
      });
    }
  }

  const tracks: OtioTrack[] = [
    {
      OTIO_SCHEMA: 'Track.1',
      name: 'V1 - Primary Veo Takes',
      kind: 'Video',
      children: primaryVideoClips,
    },
  ];

  if (options.includeAnimaticTrack !== false) {
    tracks.push({
      OTIO_SCHEMA: 'Track.1',
      name: 'V2 - Previz Animatics',
      kind: 'Video',
      children: previzVideoClips,
    });
  }

  if (options.includeAudioTracks !== false && dialogueAudioClips.length > 0) {
    tracks.push({
      OTIO_SCHEMA: 'Track.1',
      name: 'A1 - Dialogue & Scratch TTS',
      kind: 'Audio',
      children: dialogueAudioClips,
    });
  }

  return {
    OTIO_SCHEMA: 'Timeline.1',
    name: projectName,
    global_start_time: { value: 0, rate: fps },
    tracks: {
      OTIO_SCHEMA: 'Stack.1',
      name: 'Tracks',
      children: tracks,
    },
    metadata: {
      loofiProject: {
        id: `loofi-export-${Date.now()}`,
        name: projectName,
        version: '12.0.0',
        exportedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * Serializes OpenTimelineIO object into formatted JSON string.
 */
export function exportOtioJson(options: OtioExportOptions): string {
  const timeline = buildOtioTimeline(options);
  return JSON.stringify(timeline, null, 2);
}
