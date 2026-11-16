import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fsNode from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { DesktopMediaStore, validateMediaUrl } = require('./media-store.cjs');

async function fixture(t, fetchImpl) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'veo-media-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return new DesktopMediaStore(directory, fetchImpl);
}

test('atomically stores provider media with checksum and private metadata', async (t) => {
  const bytes = Buffer.from('generated-video-content');
  let request;
  const store = await fixture(t, async (url, init) => {
    request = { url, init };
    return new Response(bytes, { headers: { 'content-type': 'video/mp4' } });
  });
  const record = await store.cacheRemote({
    key: 'production-media:take-1',
    url: 'https://generativelanguage.googleapis.com/media/file?key=leaked',
    apiKey: 'secret',
    metadata: {
      accepted: true,
      dimensions: { width: 1920, height: 1080 },
      durationSeconds: 8,
      modelId: 'veo-3.1-fast',
      promptRevision: 4,
      operationId: 'operations/123',
      sourceAssetId: 'storyboard-1',
    },
  });
  assert.equal(record.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.equal(record.sizeBytes, bytes.length);
  assert.equal(await store.verify(record), true);
  assert.deepEqual(await store.storageUsage(), { bytes: bytes.length, files: 1 });
  assert.equal(request.init.headers['x-goog-api-key'], 'secret');
  assert.equal(request.url.searchParams.has('key'), false);
  // Windows uses inherited ACLs rather than POSIX permission bits.
  if (process.platform !== 'win32') {
    assert.equal((await fs.stat(record.path)).mode & 0o077, 0);
  }
  assert.equal(
    (await fs.readdir(path.dirname(record.path))).some((name) => name.includes('.partial')),
    false,
  );
  assert.equal(record.accepted, true);
  assert.equal(record.modelId, 'veo-3.1-fast');
  assert.deepEqual(record.dimensions, { width: 1920, height: 1080 });
});

test('generates thumbnail and proxy metadata asynchronously outside the renderer', async (t) => {
  let resolveDerivative;
  const derivative = new Promise((resolve) => {
    resolveDerivative = resolve;
  });
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'veo-media-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = new DesktopMediaStore(
    directory,
    async () => new Response('video', { headers: { 'content-type': 'video/mp4' } }),
    async () => derivative,
  );
  const record = await store.cacheRemote({
    key: 'derived-take',
    url: 'https://storage.googleapis.com/bucket/video.mp4',
  });
  assert.equal(record.derivatives.status, 'queued');
  resolveDerivative({ thumbnailPath: '/thumb.jpg', proxyPath: '/proxy.mp4' });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const [stored] = await store.records();
    if (stored.derivatives.status === 'ready') {
      assert.equal(stored.derivatives.proxyPath, '/proxy.mp4');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail('derivative metadata did not become ready');
});

test('does not queue video derivatives for generated audio', async (t) => {
  const store = new DesktopMediaStore(
    await fs.mkdtemp(path.join(os.tmpdir(), 'veo-media-')),
    async () => new Response('audio', { headers: { 'content-type': 'audio/mpeg' } }),
    async () => assert.fail('audio must not reach the video derivative generator'),
  );
  t.after(() => fs.rm(store.rootPath, { recursive: true, force: true }));

  const record = await store.cacheRemote({
    key: 'generated-audio',
    url: 'https://generativelanguage.googleapis.com/media/audio.mp3',
  });

  assert.equal(record.mimeType, 'audio/mpeg');
  assert.deepEqual(record.derivatives, { status: 'disabled' });
});

test('imports legacy media with checksum readback before migration acknowledgement', async (t) => {
  const store = await fixture(t, async () => new Response('unused'));
  const bytes = Buffer.from('legacy-indexeddb-video');
  const record = await store.importBytes({
    key: 'legacy-media',
    bytes,
    mimeType: 'video/mp4',
  });
  assert.equal(record.migratedFrom, 'indexeddb-v1');
  assert.equal(record.sizeBytes, bytes.length);
  assert.equal(record.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.equal(await store.verify(record), true);
});

test('detects corruption and rejects non-provider hosts', async (t) => {
  const store = await fixture(t, async () => new Response('video'));
  const record = await store.cacheRemote({
    key: 'take-2',
    url: 'https://storage.googleapis.com/bucket/video.mp4',
  });
  await fs.writeFile(record.path, 'corrupt');
  assert.equal(await store.verify(record), false);
  assert.throws(() => validateMediaUrl('https://example.com/video.mp4'));
});

test('fails safely on disk-full writes without acknowledging migrated media', async (t) => {
  const store = await fixture(t, async () => new Response('unused'));
  t.mock.method(fsNode.promises, 'writeFile', async () => {
    const error = new Error('disk full');
    error.code = 'ENOSPC';
    throw error;
  });
  await assert.rejects(
    () => store.importBytes({ key: 'disk-full', bytes: Buffer.from('video') }),
    (error) => error.code === 'ENOSPC',
  );
  assert.deepEqual(await store.records(), []);
});

test('detects missing media and relinks only an exact checksum match', async (t) => {
  const bytes = Buffer.from('move-safe-media');
  const store = await fixture(t, async () => new Response(bytes));
  const record = await store.cacheRemote({
    key: 'accepted-take',
    url: 'https://storage.googleapis.com/bucket/video.mp4',
    metadata: { accepted: true },
  });
  const moved = path.join(path.dirname(path.dirname(record.path)), 'moved.mp4');
  await fs.rename(record.path, moved);
  assert.deepEqual(await store.health(), [
    { key: 'accepted-take', path: record.path, accepted: true, status: 'missing' },
  ]);
  const wrong = path.join(path.dirname(moved), 'wrong.mp4');
  await fs.writeFile(wrong, 'different-media');
  await assert.rejects(() => store.relink('accepted-take', wrong), /checksum/);
  const relinked = await store.relink('accepted-take', moved);
  assert.equal(relinked.path, moved);
  assert.deepEqual(await store.health(), [
    { key: 'accepted-take', path: moved, accepted: true, status: 'healthy' },
  ]);
});

test('cleanup preview identifies expired unreferenced media but always protects accepted media', async (t) => {
  const store = await fixture(t, async () => new Response('video'));
  const accepted = await store.cacheRemote({
    key: 'accepted',
    url: 'https://storage.googleapis.com/bucket/accepted.mp4',
    metadata: { accepted: true },
  });
  const draft = await store.cacheRemote({
    key: 'draft',
    url: 'https://storage.googleapis.com/bucket/draft.mp4',
  });
  const preview = await store.cleanupPreview({ retentionDays: 0 });
  assert.deepEqual(preview.protectedAccepted, ['accepted']);
  assert.deepEqual(
    preview.candidates.map((item) => item.key),
    ['draft'],
  );
  assert.equal(preview.reclaimableBytes, draft.sizeBytes);
  assert.equal(await store.verify(accepted), true);
  assert.equal(await store.verify(draft), true);
  await store.setAccepted('draft', true);
  const protectedPreview = await store.cleanupPreview({ retentionDays: 0 });
  assert.deepEqual(protectedPreview.candidates, []);
  assert.deepEqual(protectedPreview.protectedAccepted.sort(), ['accepted', 'draft']);
});

test('rejects an empty successful download before writing completion metadata', async (t) => {
  const store = await fixture(t, async () => new Response(''));
  await assert.rejects(
    store.cacheRemote({ key: 'empty-video', url: 'https://storage.googleapis.com/video.mp4' }),
    /empty/,
  );
  assert.deepEqual(await store.records(), []);
  assert.deepEqual(await store.storageUsage(), { bytes: 0, files: 0 });
});

test('reads only checksum verified local media by key or durable desktop reference', async (t) => {
  const store = await fixture(t, () => {
    throw new Error('Network must not be used');
  });
  const record = await store.importBytes({
    key: 'portable:take',
    bytes: Buffer.from('portable bytes'),
    mimeType: 'video/mp4',
  });
  const restored = await store.read(`desktop:${record.path}`);
  assert.equal(Buffer.from(restored.bytes).toString(), 'portable bytes');
  assert.equal(await store.read('missing:key'), null);
  await fs.writeFile(record.path, 'corrupt');
  await assert.rejects(store.read('portable:take'), /checksum/);
});

test('resolves metadata and verified paths without buffering bytes in memory', async (t) => {
  const store = await fixture(t, () => {
    throw new Error('Network must not be used');
  });
  const record = await store.importBytes({
    key: 'metadata-test',
    bytes: Buffer.from('metadata-test-payload'),
    mimeType: 'video/mp4',
  });
  const resolved = await store.resolve('metadata-test');
  assert.ok(resolved);
  assert.equal(resolved.key, 'metadata-test');
  assert.equal(resolved.mimeType, 'video/mp4');
  assert.equal(resolved.sha256, record.sha256);
  assert.equal(resolved.sizeBytes, 'metadata-test-payload'.length);
  assert.equal(resolved.path, record.path);
  assert.equal(resolved.bytes, undefined);
  assert.equal(await store.resolve('missing:key'), null);
  await fs.writeFile(record.path, 'corrupted-data');
  await assert.rejects(store.resolve('metadata-test'), /checksum/);
});

test('uses in-memory write-through index and skips per-range hashing when verifyChecksum is false', async (t) => {
  const store = await fixture(t, () => {
    throw new Error('Network must not be used');
  });
  const record = await store.importBytes({
    key: 'cached-index-key',
    bytes: Buffer.from('range-playback-bytes'),
    mimeType: 'video/mp4',
  });

  // Warm the index once, then verify subsequent playback resolutions avoid directory scans
  await store.records();
  let readdirCalls = 0;
  t.mock.method(fsNode.promises, 'readdir', async () => {
    readdirCalls += 1;
    return [];
  });

  const fastResolved = await store.resolve('cached-index-key', { verifyChecksum: false });
  assert.equal(fastResolved.key, 'cached-index-key');
  assert.equal(fastResolved.path, record.path);
  assert.equal(readdirCalls, 0);

  // Corrupting bytes still fails strict verification while fast playback skips per-chunk hashing
  await fs.writeFile(record.path, 'corrupted-chunk');
  const fastOnSeek = await store.resolve('cached-index-key', { verifyChecksum: false });
  assert.equal(fastOnSeek.path, record.path);
  await assert.rejects(store.resolve('cached-index-key'), /checksum/);
});

test('bounds concurrent video derivative FFmpeg tasks and prioritizes high-priority jobs', async () => {
  const { FFmpegTaskQueue } = require('./ffmpeg-queue.cjs');
  const queue = new FFmpegTaskQueue(2);
  let active = 0;
  let peak = 0;
  const order = [];
  const releaseCallbacks = [];

  const launch = (id, priority) =>
    queue.enqueue(
      () =>
        new Promise((resolve) => {
          active += 1;
          peak = Math.max(peak, active);
          order.push(id);
          releaseCallbacks.push(() => {
            active -= 1;
            resolve(id);
          });
        }),
      { priority },
    );

  const p1 = launch('n1', 'normal');
  const p2 = launch('n2', 'normal');
  const p3 = launch('n3', 'normal');
  const pHigh = launch('h1', 'high');
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(peak, 2);
  releaseCallbacks.shift()();
  await p1;
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(order[2], 'h1');
  releaseCallbacks.shift()();
  releaseCallbacks.shift()();
  await Promise.all([p2, pHigh]);
  await new Promise((r) => setTimeout(r, 10));
  releaseCallbacks.shift()();
  await p3;
  assert.equal(peak, 2);
});
