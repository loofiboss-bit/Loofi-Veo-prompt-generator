import type { Asset, TimelineClip, TimelineTrack } from '@core/types';

export interface ResolveVoiceoverTrackResult {
  track: TimelineTrack;
  created: boolean;
  updatedTracks: TimelineTrack[];
}

export interface InsertVoiceoverInput {
  asset: Asset;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  insertAtTime: number;
}

export interface InsertVoiceoverResult {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  newClip: TimelineClip;
}

export const creatorVoiceoverService = {
  /**
   * Resolves the primary dialogue/voiceover track, creating one if not present.
   */
  resolveVoiceoverTrack(tracks: TimelineTrack[]): ResolveVoiceoverTrackResult {
    const existing = tracks.find(
      (t) =>
        t.type === 'audio' &&
        (t.trackType === 'dialogue' ||
          t.id === 'audio_dialogue' ||
          t.id === 'creator-audio-dialogue' ||
          t.id.includes('voiceover')),
    );

    if (existing) {
      return {
        track: existing,
        created: false,
        updatedTracks: [...tracks],
      };
    }

    const maxZ = tracks.reduce((acc, t) => Math.max(acc, t.zIndex), 0);
    const newTrack: TimelineTrack = {
      id: 'creator-audio-dialogue',
      label: 'Dialogue / Voiceover',
      type: 'audio',
      trackType: 'dialogue',
      zIndex: maxZ + 1,
    };

    return {
      track: newTrack,
      created: true,
      updatedTracks: [...tracks, newTrack],
    };
  },

  /**
   * Creates a timeline clip for a voiceover asset.
   */
  createVoiceoverClip(input: { asset: Asset; trackId: string; startTime: number }): TimelineClip {
    const duration = input.asset.durationSeconds ?? 0;
    return {
      id: crypto.randomUUID(),
      resourceId: input.asset.id,
      trackId: input.trackId,
      startTime: Math.max(0, input.startTime),
      duration,
      offset: 0,
      type: 'audio',
      label: input.asset.name || 'Voiceover',
      volume: 1,
    };
  },

  /**
   * Inserts a voiceover asset onto the timeline at the specified time.
   */
  insertVoiceover(input: InsertVoiceoverInput): InsertVoiceoverResult {
    const { track, updatedTracks } = this.resolveVoiceoverTrack(input.tracks);
    const newClip = this.createVoiceoverClip({
      asset: input.asset,
      trackId: track.id,
      startTime: input.insertAtTime,
    });

    return {
      tracks: updatedTracks,
      clips: [...input.clips, newClip],
      newClip,
    };
  },
};
