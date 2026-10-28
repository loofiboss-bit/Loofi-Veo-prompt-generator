import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { mediaDisplayUrl, registerCreatorMediaProtocol } = require('./creator-media-protocol.cjs');

test('streams only registered media and verified renders, including seek ranges', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-media-protocol-'));
  try {
    const file = path.join(directory, 'clip.mp4');
    await fs.writeFile(file, 'abcdefghij');
    let handler;
    let previewCalls = 0;
    registerCreatorMediaProtocol({
      protocol: {
        handle: (scheme, callback) => {
          assert.equal(scheme, 'loofi-media');
          handler = callback;
        },
      },
      allowedOrigins: ['http://localhost:8080'],
      getStore: () => ({
        resolve: async (id) =>
          id === 'local-media:123' ? { path: file, mimeType: 'video/mp4' } : null,
      }),
      getEngine: () => ({
        preview: async (id) => {
          previewCalls++;
          if (id !== 'job-1') throw new Error('not verified');
          return { url: pathToFileURL(file).href };
        },
      }),
    });
    const url = mediaDisplayUrl('media', 'local-media:123');
    const partial = await handler(
      new Request(url, {
        headers: { Range: 'bytes=2-5', Origin: 'http://localhost:8080' },
      }),
    );
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get('content-range'), 'bytes 2-5/10');
    assert.equal(partial.headers.get('access-control-allow-origin'), 'http://localhost:8080');
    assert.equal(await partial.text(), 'cdef');
    const suffix = await handler(new Request(url, { headers: { Range: 'bytes=-3' } }));
    assert.equal(await suffix.text(), 'hij');
    assert.equal(
      (await handler(new Request(url, { headers: { Range: 'bytes=20-30' } }))).status,
      416,
    );
    assert.equal(
      (await handler(new Request(url, { headers: { Origin: 'https://untrusted.example' } })))
        .status,
      403,
    );
    assert.equal((await handler(new Request('loofi-media://media/%2Fetc%2Fpasswd'))).status, 404);
    assert.equal((await handler(new Request('loofi-media://media/unknown'))).status, 404);
    const preview = await handler(new Request(mediaDisplayUrl('render', 'job-1')));
    assert.equal(await preview.text(), 'abcdefghij');
    assert.equal(previewCalls, 1);
    assert.equal((await handler(new Request(mediaDisplayUrl('render', 'job-2')))).status, 404);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('accepts the full supported media key length without accepting paths', () => {
  const key = `local-media:${'a'.repeat(238)}`;
  assert.equal(decodeURIComponent(new URL(mediaDisplayUrl('media', key)).pathname.slice(1)), key);
  assert.throws(() => mediaDisplayUrl('media', `${key}a`));
  assert.throws(() => mediaDisplayUrl('media', '../private'));
});
