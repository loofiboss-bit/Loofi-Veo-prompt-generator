import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CreatorAsrModelStore } = require('./creator-asr-model-store.cjs');
const bytes = Buffer.from('local model test file');
const manifest = [
  {
    path: 'config.json',
    size: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  },
];
const request = (confirmed = true) => ({
  confirmed,
  modelId: 'onnx-community/whisper-base',
  revision: '1846881b6b3a3024392c1eea3ad983695bc23925',
  confirmedBytes: bytes.length,
  installId: crypto.randomUUID(),
});

async function withStore(fetchImpl, run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-asr-model-'));
  try {
    const store = new CreatorAsrModelStore({ root, fetchImpl, manifest });
    await run(store, root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('model installation requires explicit confirmation of the exact pinned payload', async () => {
  await withStore(
    async () => new Response(bytes),
    async (store) => {
      await assert.rejects(store.install(request(false)), /requires confirmation/);
      assert.deepEqual(await store.getStatus(), {
        installed: false,
        state: 'not-installed',
        revision: '1846881b6b3a3024392c1eea3ad983695bc23925',
        totalBytes: bytes.length,
      });
    },
  );
});

test('model installation verifies each fixed file before atomic publication', async () => {
  await withStore(
    async () => new Response(bytes),
    async (store) => {
      const progress = [];
      const result = await store.install(request(), (entry) => progress.push(entry));
      assert.equal(result.installed, true);
      assert.equal(result.state, 'ready');
      assert.equal(
        (await fs.readFile(store.resolveFilePath('config.json'))).toString(),
        'local model test file',
      );
      assert.equal(progress.at(-1).complete, true);
      await assert.rejects(store.resolveFile('../config.json'), /Unapproved local ASR model file/);
      await assert.rejects(store.resolveFile('README.md'), /Unapproved local ASR model file/);
      await fs.writeFile(store.resolveFilePath('config.json'), Buffer.alloc(bytes.length, 0x66));
      const damaged = await store.getStatus();
      assert.equal(damaged.installed, false);
      assert.equal(damaged.state, 'corrupt');
      assert.equal((await store.install(request())).state, 'ready');
      assert.equal((await store.remove()).installed, false);
    },
  );
});

test('model installation rejects bytes that do not match the reviewed manifest', async () => {
  await withStore(
    async () => new Response('unexpected model bytes'),
    async (store, root) => {
      await assert.rejects(store.install(request()), /integrity check failed/);
      assert.equal((await store.getStatus()).installed, false);
      assert.equal((await store.getStatus()).state, 'not-installed');
      const children = await fs.readdir(path.join(root, 'onnx-community', 'whisper-base'));
      assert.deepEqual(children, []);
    },
  );
});

test('model installation can be cancelled and leaves no partial model', async () => {
  const install = request();
  await withStore(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      }),
    async (store, root) => {
      const pending = store.install(install);
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(store.cancel(install.installId), true);
      await assert.rejects(pending, /cancelled/);
      assert.equal((await store.getStatus()).installed, false);
      assert.equal((await store.getStatus()).state, 'not-installed');
      assert.deepEqual(await fs.readdir(root), []);
    },
  );
});
