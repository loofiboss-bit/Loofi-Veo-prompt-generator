import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { createLazyDesktopDependencies } = require('./lazy-desktop-dependencies.cjs');
const { registerDiagnosticsIpc } = require('./ipc/diagnostics-ipc.cjs');
const { registerProviderIpc } = require('./ipc/provider-ipc.cjs');

function registeredHandlers(register, dependencies) {
  const handlers = new Map();
  register({
    ...dependencies,
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
  });
  return handlers;
}

test('diagnostics first/repeated ZIP constructors and static loading preserve archive contents', async () => {
  const loads = [];
  const { JSZip } = createLazyDesktopDependencies((name) => {
    loads.push(name);
    return require(name);
  });
  const output = new Map();
  const destination = path.join(os.tmpdir(), 'lazy-support-bundle.zip');
  const handlers = registeredHandlers(registerDiagnosticsIpc, {
    app: { getPath: () => os.tmpdir(), getVersion: () => '16.0.0', getName: () => 'Test' },
    dialog: { showSaveDialog: async () => ({ canceled: false, filePath: destination }) },
    fs: {
      promises: {
        readFile: async () => '',
        writeFile: async (filename, bytes) => output.set(filename, bytes),
      },
    },
    path,
    os,
    keytar: { getPassword: async () => null },
    keytarService: 'test',
    JSZip,
    buildSupportSnapshot: (snapshot) => snapshot,
    getSafeModeStatus: () => ({ enabled: false }),
    getMediaStore: () => null,
    getPaidJobEngine: () => null,
    getMainWindow: () => null,
  });
  assert.deepEqual(loads, []);
  await handlers.get('desktop-diagnostics')();
  assert.deepEqual(loads, []);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    assert.equal(await handlers.get('export-support-bundle')(), destination);
    const archive = await JSZip.loadAsync(output.get(destination));
    assert.deepEqual(Object.keys(archive.files).sort(), ['README.txt', 'diagnostics.json']);
    assert.equal(
      JSON.parse(await archive.file('diagnostics.json').async('string')).app.version,
      '16.0.0',
    );
  }
  assert.deepEqual(loads, ['jszip']);
});

test('provider registration defers auth and first/repeated methods bind the single real instance', async () => {
  const loads = [];
  let constructed = 0;
  class GoogleAuth {
    #calls = 0;
    constructor(options) {
      constructed += 1;
      assert.deepEqual(options.scopes, ['https://www.googleapis.com/auth/cloud-platform']);
    }
    async getClient() {
      this.#calls += 1;
      return { request: this.#calls };
    }
    get calls() {
      return this.#calls;
    }
  }
  const { vertexAuth } = createLazyDesktopDependencies((name) => {
    loads.push(name);
    assert.equal(name, 'google-auth-library');
    return { GoogleAuth };
  });
  const handlers = registeredHandlers(registerProviderIpc, {
    vertexAuth,
    keytar: { getPassword: async () => null },
    keytarService: 'test',
    dialog: {},
    getMainWindow: () => null,
  });
  assert.deepEqual(loads, []);
  const connect = handlers.get('provider-test-connection');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await connect(null, { profile: { provider: 'vertex-ai' } });
    assert.equal(result.ok, true);
    assert.equal(result.provider, 'vertex-ai');
  }
  assert.equal(vertexAuth.calls, 2);
  const detached = vertexAuth.getClient;
  assert.deepEqual(await detached(), { request: 3 });
  assert.equal(constructed, 1);
  assert.deepEqual(loads, ['google-auth-library']);
});

test('a failed lazy dependency load can be retried without caching failure', async () => {
  let attempts = 0;
  const { JSZip } = createLazyDesktopDependencies((name) => {
    attempts += 1;
    if (attempts === 1) throw new Error('Module temporarily unavailable');
    return require(name);
  });
  assert.throws(() => new JSZip(), /temporarily unavailable/);
  const archive = new JSZip();
  archive.file('retry.txt', 'available');
  const result = await JSZip.loadAsync(await archive.generateAsync({ type: 'nodebuffer' }));
  assert.equal(await result.file('retry.txt').async('string'), 'available');
  assert.equal(attempts, 2);
});
