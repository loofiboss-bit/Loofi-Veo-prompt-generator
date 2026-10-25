import { describe, expect, it } from 'vitest';
import {
  assertClipAudioRequestCurrent,
  groupWhisperWordChunks,
  type ClipAudioRequest,
  type CurrentClipAudioSourceState,
} from './creatorAsrService';

describe('local Whisper caption proposal', () => {
  it('groups real word timestamps into editable sentence-sized captions', () => {
    const captions = groupWhisperWordChunks(
      [
        { text: ' Hello', timestamp: [0, 0.35] },
        { text: ' there.', timestamp: [0.4, 0.9] },
        { text: ' Welcome', timestamp: [1.2, 1.7] },
        { text: ' back.', timestamp: [1.8, 2.3] },
      ],
      4,
    );

    expect(captions).toHaveLength(2);
    expect(captions[0]).toMatchObject({ text: 'Hello there.', startTime: 0, endTime: 0.9 });
    expect(captions[1]).toMatchObject({ text: 'Welcome back.', startTime: 1.2, endTime: 2.3 });
  });

  it('clamps timestamps to the extracted trim and rejects output without word times', () => {
    expect(groupWhisperWordChunks([{ text: ' word', timestamp: [2, 6] }], 3)[0]).toMatchObject({
      startTime: 2,
      endTime: 3,
      text: 'word',
    });
    expect(() =>
      groupWhisperWordChunks([{ text: ' no timing', timestamp: [null, null] }], 3),
    ).toThrow(/word timings/);
  });

  it('rejects proposals when project, clip occurrence, media hash, or trim changes', () => {
    const request: ClipAudioRequest = {
      requestId: 'request',
      projectId: 'project',
      projectRevision: 4,
      clipId: 'clip-occurrence-2',
      mediaId: 'local-media:audio',
      mediaSha256: 'a'.repeat(64),
      offsetSeconds: 2,
      durationSeconds: 8,
      language: 'sv',
    };
    const current: CurrentClipAudioSourceState = {
      projectId: request.projectId,
      projectRevision: request.projectRevision,
      clipId: request.clipId,
      mediaId: request.mediaId,
      mediaSha256: request.mediaSha256,
      offsetSeconds: request.offsetSeconds,
      durationSeconds: request.durationSeconds,
    };

    expect(() => assertClipAudioRequestCurrent(request, current)).not.toThrow();
    for (const change of [
      { projectId: 'another-project' },
      { projectRevision: 5 },
      { clipId: 'clip-occurrence-1' },
      { mediaId: 'another-media' },
      { mediaSha256: 'b'.repeat(64) },
      { offsetSeconds: 1 },
      { durationSeconds: 9 },
    ]) {
      expect(() => assertClipAudioRequestCurrent(request, { ...current, ...change })).toThrow(
        /proposal is stale/,
      );
    }
  });
});
