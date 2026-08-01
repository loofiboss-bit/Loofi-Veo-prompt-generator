import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  PaidJobEngine,
  PaidJobStore,
  buildMusicSubmission,
  extractMusicOutput,
  validatePaidTask,
} = require('./paid-job-engine.cjs');

const task = (overrides = {}) => ({
  id: 'job-1',
  status: 'Queued',
  videoUrl: null,
  prompt: 'A cinematic sunrise.',
  settings: { veoModel: 'fast', resolution: '720p', aspectRatio: '16:9' },
  request: {
    mode: 'text-to-video',
    modelId: 'veo-3.1-fast',
    prompt: 'A cinematic sunrise.',
    aspectRatio: '16:9',
    resolution: '720p',
    durationSeconds: 8,
    referenceAssetIds: [],
  },
  costApproval: {
    approvalId: 'approval-1',
    modelId: 'veo-3.1-fast',
    maximumChargeUsd: 0.8,
    currency: 'USD',
    confidence: 'exact',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    verifiedDate: '2026-08-01',
    approvedAt: 1,
  },
  timestamp: 1,
  ...overrides,
});

const musicTask = (overrides = {}) => ({
  id: 'music-job-1',
  jobKind: 'music',
  status: 'Queued',
  prompt: 'A warm instrumental theme.',
  request: {
    modelId: 'lyria-3-clip-preview',
    prompt: 'A warm instrumental theme.',
    responseFormat: 'mp3',
    images: [],
  },
  costApproval: {
    approvalId: 'music-approval-1',
    modelId: 'lyria-3-clip-preview',
    maximumChargeUsd: 0.04,
    currency: 'USD',
    confidence: 'exact',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    verifiedDate: '2026-08-01',
    approvedAt: 1,
  },
  timestamp: 1,
  ...overrides,
});

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'veo-paid-job-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return new PaidJobStore(path.join(directory, 'jobs.json'));
}

test('persists operation acknowledgement before polling and completes without duplicate submit', async (t) => {
  const store = await fixture(t);
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (init.method === 'POST') return new Response(JSON.stringify({ name: 'operations/1' }));
    return new Response(
      JSON.stringify({
        done: true,
        response: { generatedVideos: [{ video: { uri: 'https://media/video.mp4' } }] },
      }),
    );
  };
  const engine = new PaidJobEngine({
    store,
    getApiKey: async () => 'secret',
    fetchImpl,
    sleep: async () => {},
  });
  const result = await engine.run(task());
  assert.equal(result.status, 'Complete');
  assert.equal(result.providerOperationName, 'operations/1');
  assert.equal(calls.filter((call) => call.init.method === 'POST').length, 1);
  assert.equal(calls[0].init.headers['x-goog-api-key'], 'secret');
  assert.equal(calls[0].url.includes('secret'), false);
});

test('rejects malformed or unsupported paid submissions at the IPC engine boundary', () => {
  assert.throws(() => validatePaidTask({ ...task(), id: '../escape' }), /job ID/);
  assert.throws(
    () => validatePaidTask({ ...task(), request: { ...task().request, modelId: 'unknown' } }),
    /model/,
  );
  assert.throws(
    () =>
      validatePaidTask({
        ...task(),
        request: { ...task().request, referenceAssetIds: ['1', '2', '3', '4'] },
      }),
    /references/,
  );
  assert.throws(() => validatePaidTask({ ...task(), costApproval: undefined }), /cost approval/);
  assert.throws(
    () =>
      validatePaidTask({
        ...task(),
        costApproval: { ...task().costApproval, maximumChargeUsd: 0.01 },
      }),
    /below/,
  );
});

test('marks lost submission acknowledgement for manual recovery instead of resubmitting', async (t) => {
  const store = await fixture(t);
  let calls = 0;
  const engine = new PaidJobEngine({
    store,
    getApiKey: async () => 'secret',
    fetchImpl: async () => {
      calls += 1;
      throw new Error('connection reset');
    },
  });
  const result = await engine.run(task());
  assert.equal(result.status, 'RecoveryRequired');
  assert.equal(calls, 1);
  await engine.resumeAll();
  assert.equal(calls, 1);
});

test('resumes a known operation after restart without another paid submission', async (t) => {
  const store = await fixture(t);
  await store.put(task({ status: 'Polling', providerOperationName: 'operations/known' }));
  const calls = [];
  const engine = new PaidJobEngine({
    store,
    getApiKey: async () => 'secret',
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          done: true,
          response: { generatedVideos: [{ video: { uri: 'https://media/resumed.mp4' } }] },
        }),
      );
    },
    sleep: async () => {},
  });
  await engine.resumeAll();
  await engine.active.get('job-1');
  assert.equal(
    calls.some((call) => call.init.method === 'POST'),
    false,
  );
  assert.equal((await store.get('job-1')).status, 'Complete');
});

test('cancels an active paid job and persists the user decision', async (t) => {
  const store = await fixture(t);
  const engine = new PaidJobEngine({
    store,
    getApiKey: async () => 'secret',
    fetchImpl: async (_url, init = {}) =>
      new Promise((_resolve, reject) => {
        if (init.signal.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        init.signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      }),
  });
  await engine.submit(task());
  while (!engine.active.has('job-1')) await new Promise((resolve) => setTimeout(resolve, 1));
  assert.equal(await engine.cancel('job-1'), true);
  await engine.active.get('job-1');
  assert.equal((await store.get('job-1')).error, 'Cancelled by user');
});

test('retries a known operation after an offline polling failure without resubmitting', async (t) => {
  const store = await fixture(t);
  await store.put(
    task({ status: 'Error', error: 'offline', providerOperationName: 'operations/retry-known' }),
  );
  const calls = [];
  const engine = new PaidJobEngine({
    store,
    getApiKey: async () => 'secret',
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          done: true,
          response: { generatedVideos: [{ video: { uri: 'https://media/retried.mp4' } }] },
        }),
      );
    },
    sleep: async () => {},
  });
  assert.equal(await engine.retry('job-1'), true);
  await engine.active.get('job-1');
  assert.equal(
    calls.some((call) => call.init.method === 'POST'),
    false,
  );
  assert.equal((await store.get('job-1')).status, 'Complete');
});

test('never retries an ambiguous lost-acknowledgement submission', async (t) => {
  const store = await fixture(t);
  await store.put(task({ status: 'RecoveryRequired', error: 'acknowledgement lost' }));
  const engine = new PaidJobEngine({ store, getApiKey: async () => 'secret' });
  assert.equal(await engine.retry('job-1'), false);
});

test('builds the documented Interactions request without requesting WAV for Clip', () => {
  assert.deepEqual(buildMusicSubmission(musicTask()), {
    model: 'lyria-3-clip-preview',
    input: 'A warm instrumental theme.',
  });
  const pro = musicTask({
    request: {
      modelId: 'lyria-3-pro-preview',
      prompt: 'A visual score.',
      lyrics: '[Verse] Home',
      structure: '[0:00 - 0:10] Intro',
      responseFormat: 'wav',
      images: [{ mimeType: 'image/jpeg', data: 'aW1hZ2U=' }],
    },
    costApproval: {
      ...musicTask().costApproval,
      modelId: 'lyria-3-pro-preview',
      maximumChargeUsd: 0.08,
    },
  });
  assert.deepEqual(buildMusicSubmission(pro), {
    model: 'lyria-3-pro-preview',
    input: [
      {
        type: 'text',
        text: 'A visual score.\n\nCustom lyrics:\n[Verse] Home\n\nSong structure:\n[0:00 - 0:10] Intro',
      },
      { type: 'image', mime_type: 'image/jpeg', data: 'aW1hZ2U=' },
    ],
    response_format: { type: 'audio' },
  });
});

test('parses interleaved Lyria model output blocks', () => {
  assert.deepEqual(
    extractMusicOutput({
      steps: [
        { type: 'model_output', content: [{ type: 'text', text: '[Verse]' }] },
        {
          type: 'model_output',
          content: [
            { type: 'audio', data: 'YXVkaW8=', mime_type: 'audio/mpeg' },
            { type: 'text', text: 'Generated line' },
          ],
        },
      ],
    }),
    {
      audio: { type: 'audio', data: 'YXVkaW8=', mime_type: 'audio/mpeg' },
      text: '[Verse]\n\nGenerated line',
    },
  );
});

test('stores Lyria output atomically before marking the durable task complete', async (t) => {
  const store = await fixture(t);
  const events = [];
  const mediaCalls = [];
  const engine = new PaidJobEngine({
    store,
    getApiKey: async () => 'secret',
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
      assert.equal(init.headers['x-goog-api-key'], 'secret');
      assert.equal(url.includes('secret'), false);
      return new Response(
        JSON.stringify({
          id: 'interaction-1',
          steps: [
            {
              type: 'model_output',
              content: [
                { type: 'text', text: '[Instrumental]' },
                { type: 'audio', data: 'YXVkaW8=', mime_type: 'audio/mpeg' },
              ],
            },
          ],
        }),
      );
    },
    storeMedia: async (input) => {
      mediaCalls.push(input);
      assert.equal((await store.get('music-job-1')).status, 'Submitting');
      return {
        key: input.key,
        path: '/local/music.mp3',
        localUrl: 'file:///local/music.mp3',
      };
    },
    onUpdate: (job) => events.push(job.status),
  });
  const queued = await engine.submit(musicTask());
  assert.ok(['Queued', 'Submitting'].includes(queued.status));
  await engine.active.get('music-job-1');
  const completed = await store.get('music-job-1');
  assert.equal(completed.status, 'Complete');
  assert.equal(completed.localMediaUrl, 'file:///local/music.mp3');
  assert.equal(completed.providerInteractionId, 'interaction-1');
  assert.equal(completed.generatedText, '[Instrumental]');
  assert.equal(mediaCalls.length, 1);
  assert.deepEqual(events, ['Queued', 'Submitting', 'Complete']);
});

test('rejects unsafe Lyria requests and under-approved flat pricing', () => {
  assert.throws(
    () =>
      validatePaidTask(musicTask({ request: { ...musicTask().request, responseFormat: 'wav' } })),
    /Clip only supports MP3/,
  );
  assert.throws(
    () =>
      validatePaidTask(
        musicTask({ costApproval: { ...musicTask().costApproval, maximumChargeUsd: 0.01 } }),
      ),
    /below/,
  );
  assert.throws(
    () =>
      validatePaidTask(
        musicTask({
          request: {
            ...musicTask().request,
            images: Array.from({ length: 11 }, () => ({ mimeType: 'image/png', data: 'eA==' })),
          },
        }),
      ),
    /ten images/,
  );
});

test('does not replay an ambiguous Lyria submission after restart', async (t) => {
  const store = await fixture(t);
  await store.put(musicTask({ status: 'Submitting' }));
  let calls = 0;
  const engine = new PaidJobEngine({
    store,
    getApiKey: async () => 'secret',
    fetchImpl: async () => {
      calls += 1;
      throw new Error('must not run');
    },
    storeMedia: async () => {
      throw new Error('must not run');
    },
  });
  await engine.resumeAll();
  assert.equal(calls, 0);
  assert.equal((await store.get('music-job-1')).status, 'RecoveryRequired');
});
