import { describe, it, expect } from 'vitest';
import { buildOtioTimeline, exportOtioJson } from './otioExportService';
import type { Shot, TimelineState } from '@core/types';

describe('otioExportService', () => {
  it('uses actual video/audio tracks, gaps and source trims at the specified frame rate', () => {
    const timeline = {
      tracks: [
        { id: 'v', label: 'Video', type: 'video' },
        { id: 'a', label: 'Music', type: 'audio' },
      ],
      clips: [
        {
          id: 'v1',
          resourceId: 'video',
          trackId: 'v',
          label: 'Take',
          startTime: 2,
          duration: 0.5,
          offset: 1,
        },
        {
          id: 'a1',
          resourceId: 'audio',
          trackId: 'a',
          label: 'Music',
          startTime: 0,
          duration: 3,
          offset: 0.25,
          volume: 0.6,
        },
      ],
    } as TimelineState;
    const result = buildOtioTimeline({
      shots: [],
      timeline,
      fps: 30,
      mediaPaths: { video: 'assets/video.mp4', audio: 'assets/audio.wav' },
      requireMedia: true,
    });
    expect(result.tracks.children).toHaveLength(2);
    expect(result.tracks.children[0].children[0].OTIO_SCHEMA).toBe('Gap.1');
    const clip = result.tracks.children[0].children[1];
    expect(clip.source_range).toEqual({
      start_time: { value: 30, rate: 30 },
      duration: { value: 15, rate: 30 },
    });
    if (clip.OTIO_SCHEMA === 'Clip.1')
      expect(clip.media_reference?.target_url).toBe('assets/video.mp4');
    expect(result.tracks.children[1].kind).toBe('Audio');
  });

  it('reports unavailable media without invented paths or model IDs', () => {
    const result = buildOtioTimeline({ shots: [{ id: 1, duration: 0.2 } as Shot] });
    expect(result.metadata.missingMedia).toEqual(['1']);
    const clip = result.tracks.children[0].children[0];
    if (clip.OTIO_SCHEMA === 'Clip.1') {
      expect(clip.media_reference?.OTIO_SCHEMA).toBe('MissingReference.1');
      expect(clip.metadata.loofi?.modelTarget).toBeUndefined();
      expect(clip.source_range?.duration.value).toBe(5);
    }
    expect(() =>
      buildOtioTimeline({ shots: [{ id: 1, duration: 1 } as Shot], requireMedia: true }),
    ).toThrow('Local timeline media missing');
  });

  it('serializes a valid timeline', () => {
    expect(JSON.parse(exportOtioJson({ shots: [] })).OTIO_SCHEMA).toBe('Timeline.1');
  });
  it('keeps storyboard dialogue distinct from a selected video take on the same numeric scene', () => {
    const timeline = {
      tracks: [
        { id: 'v', type: 'video', label: 'Video' },
        { id: 'a', type: 'audio', label: 'Dialogue' },
      ],
      clips: [
        {
          id: 'v1',
          resourceId: 1,
          trackId: 'v',
          type: 'video',
          label: 'Video',
          startTime: 0,
          duration: 2,
          offset: 0,
        },
        {
          id: 'a1',
          resourceId: 1,
          trackId: 'a',
          type: 'audio',
          label: 'Dialogue',
          startTime: 0,
          duration: 2,
          offset: 0,
        },
      ],
    } as TimelineState;
    const result = buildOtioTimeline({
      shots: [],
      timeline,
      productionRun: {
        shots: [{ id: 1, selectedTakeId: 'take', takes: [{ id: 'take', localMediaKey: 'video' }] }],
      } as unknown as import('@core/types').ProductionRun,
      mediaPaths: { video: 'assets/video.mp4', 'audio:1': 'assets/dialogue.wav' },
      requireMedia: true,
    });
    const dialogue = result.tracks.children[1].children[0];
    if (dialogue.OTIO_SCHEMA === 'Clip.1') {
      expect(dialogue.media_reference?.target_url).toBe('assets/dialogue.wav');
      expect(dialogue.metadata.loofi?.takeId).toBeUndefined();
    }
  });
  it('does not regenerate scenes when an explicitly empty timeline is exported', () => {
    const result = buildOtioTimeline({
      shots: [{ id: 1, duration: 2 } as Shot],
      timeline: {
        tracks: [{ id: 'v', type: 'video', label: 'Video' }],
        clips: [],
      } as unknown as TimelineState,
      requireMedia: true,
    });
    expect(result.tracks.children[0].children).toEqual([]);
  });

  it('keeps numeric-looking audio asset IDs separate from scene selection', () => {
    const timeline = {
      tracks: [{ id: 'a', type: 'audio', label: 'Audio' }],
      clips: [
        {
          id: 'a1',
          resourceId: '1',
          trackId: 'a',
          label: 'Music',
          startTime: 0,
          duration: 2,
          offset: 0,
        },
      ],
    } as TimelineState;
    const result = buildOtioTimeline({
      shots: [],
      timeline,
      productionRun: {
        shots: [{ id: 1, selectedTakeId: 'take', takes: [{ id: 'take', localMediaKey: 'video' }] }],
      } as unknown as import('@core/types').ProductionRun,
      mediaPaths: { '1': 'assets/music.wav' },
      requireMedia: true,
    });
    const clip = result.tracks.children[0].children[0];
    if (clip.OTIO_SCHEMA === 'Clip.1')
      expect(clip.media_reference?.target_url).toBe('assets/music.wav');
  });
});
