import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreatorAsrLanguage } from './creatorAsrService';

const mocks = vi.hoisted(() => ({
  workers: [] as Array<{
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: ErrorEvent) => void) | null;
    posted: {
      type: string;
      requestId: string;
      pcm: ArrayBuffer;
      language: CreatorAsrLanguage;
    } | null;
    terminated: boolean;
    postMessage: (
      message: {
        type: string;
        requestId: string;
        pcm: ArrayBuffer;
        language: CreatorAsrLanguage;
      },
      transfer: Transferable[],
    ) => void;
    terminate: () => void;
  }>,
}));

vi.mock('@infrastructure/workers/creatorAsr.worker?worker', () => ({
  default: class MockCreatorAsrWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    posted: (typeof mocks.workers)[number]['posted'] = null;
    terminated = false;

    constructor() {
      mocks.workers.push(this);
    }

    postMessage(
      message: {
        type: string;
        requestId: string;
        pcm: ArrayBuffer;
        language: CreatorAsrLanguage;
      },
      transfer: Transferable[],
    ) {
      this.posted = structuredClone(message, { transfer });
    }

    terminate() {
      this.terminated = true;
    }
  },
}));

import {
  assertClipAudioRequestCurrent,
  creatorAsrService,
  groupWhisperWordChunks,
  type ClipAudioRequest,
  type CurrentClipAudioSourceState,
} from './creatorAsrService';

describe('local Whisper caption proposal', () => {
  beforeEach(() => mocks.workers.splice(0));

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

  it('keeps the PCM duration after transferring and detaching its ArrayBuffer', async () => {
    const pcm = new ArrayBuffer(16_000 * Float32Array.BYTES_PER_ELEMENT);
    const resultPromise = creatorAsrService.transcribe(pcm, 'en', () => undefined);
    const worker = mocks.workers[0];
    expect(worker.posted).not.toBeNull();
    expect(pcm.byteLength).toBe(0);

    worker.onmessage?.(
      new MessageEvent('message', {
        data: {
          type: 'RESULT',
          requestId: worker.posted!.requestId,
          text: 'Hello there',
          chunks: [{ text: ' Hello', timestamp: [0, 0.2] }],
          modelId: 'onnx-community/whisper-base',
          modelRevision: '1846881b6b3a3024392c1eea3ad983695bc23925',
        },
      }),
    );

    await expect(resultPromise).resolves.toMatchObject({
      transcript: 'Hello there',
      segments: [{ text: 'Hello', startTime: 0, endTime: 0.2 }],
    });
    expect(worker.terminated).toBe(true);
  });
});
