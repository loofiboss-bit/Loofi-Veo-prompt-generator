import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PaidJobEngine, PaidJobStore } = require('./paid-job-engine.cjs');

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
