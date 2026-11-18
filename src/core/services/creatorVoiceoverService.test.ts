import { describe, expect, it } from 'vitest';
import type { Asset, TimelineClip, TimelineTrack } from '@core/types';
import { creatorVoiceoverService } from './creatorVoiceoverService';

describe('creatorVoiceoverService', () => {
  const mockAsset: Asset = {
    id: 'asset-vo-1',
    storageKey: 'local-media:vo-1',
    name: 'Voiceover Take 1',
    type: 'audio',
    mimeType: 'audio/webm',
    data: '',
    url: 'loofi-media://vo-1',
    groupId: 'group-1',
    version: 1,
    tags: [],
    durationSeconds: 12.5,
  };

  it('reuses existing dialogue track if available', () => {
    const existingTrack: TimelineTrack = {
      id: 'existing-dialogue',
      label: 'Main Dialogue',
      type: 'audio',
      trackType: 'dialogue',
      zIndex: 2,
    };
    const tracks: TimelineTrack[] = [
      { id: 'video-1', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 0 },
      existingTrack,
    ];

    const result = creatorVoiceoverService.resolveVoiceoverTrack(tracks);
    expect(result.created).toBe(false);
    expect(result.track.id).toBe('existing-dialogue');
    expect(result.updatedTracks).toHaveLength(2);
  });

  it('creates new dialogue track if none exists', () => {
    const tracks: TimelineTrack[] = [
      { id: 'video-1', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 0 },
    ];

    const result = creatorVoiceoverService.resolveVoiceoverTrack(tracks);
    expect(result.created).toBe(true);
    expect(result.track.id).toBe('creator-audio-dialogue');
    expect(result.track.trackType).toBe('dialogue');
    expect(result.track.type).toBe('audio');
    expect(result.updatedTracks).toHaveLength(2);
  });

  it('creates voiceover clip with correct parameters', () => {
    const clip = creatorVoiceoverService.createVoiceoverClip({
      asset: mockAsset,
      trackId: 'track-vo',
      startTime: 5.25,
    });

    expect(clip.id).toBeTruthy();
    expect(clip.resourceId).toBe(mockAsset.id);
    expect(clip.trackId).toBe('track-vo');
    expect(clip.startTime).toBe(5.25);
    expect(clip.duration).toBe(12.5);
    expect(clip.type).toBe('audio');
    expect(clip.label).toBe('Voiceover Take 1');
    expect(clip.volume).toBe(1);
  });

  it('inserts voiceover onto timeline at playhead position', () => {
    const tracks: TimelineTrack[] = [];
    const clips: TimelineClip[] = [];

    const result = creatorVoiceoverService.insertVoiceover({
      asset: mockAsset,
      tracks,
      clips,
      insertAtTime: 3.0,
    });

    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].id).toBe('creator-audio-dialogue');
    expect(result.clips).toHaveLength(1);
    expect(result.newClip.startTime).toBe(3.0);
    expect(result.newClip.duration).toBe(12.5);
    expect(result.newClip.trackId).toBe('creator-audio-dialogue');
  });
});
