import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
  });
  assert.equal(record.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.equal(record.sizeBytes, bytes.length);
  assert.equal(await store.verify(record), true);
  assert.deepEqual(await store.storageUsage(), { bytes: bytes.length, files: 1 });
  assert.equal(request.init.headers['x-goog-api-key'], 'secret');
  assert.equal(request.url.searchParams.has('key'), false);
  assert.equal((await fs.stat(record.path)).mode & 0o077, 0);
  assert.equal((await fs.readdir(path.dirname(record.path))).some((name) => name.includes('.partial')), false);
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
