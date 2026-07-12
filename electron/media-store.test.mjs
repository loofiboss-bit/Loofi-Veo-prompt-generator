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
  assert.equal((await fs.stat(record.path)).mode & 0o077, 0);
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
    async () => new Response('video'),
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
