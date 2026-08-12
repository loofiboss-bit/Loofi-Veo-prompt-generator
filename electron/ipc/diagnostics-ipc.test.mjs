import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { registerDiagnosticsIpc } = require('./diagnostics-ipc.cjs');
const { buildSupportSnapshot } = require('../support-bundle.cjs');

test('desktop diagnostics remain available when the credential vault is unavailable', async () => {
  const handlers = new Map();
  registerDiagnosticsIpc({
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    app: {
      getPath: () => '/missing-user-data',
      getVersion: () => '10.0.0',
      getName: () => 'Loofi Creator Studio',
    },
    dialog: { showSaveDialog: async () => ({ canceled: true }) },
    fs: { promises: { readFile: async () => Promise.reject(new Error('missing')) } },
    path: { join: (...parts) => parts.join('/') },
    os: { release: () => 'test-release' },
    keytar: {
      getPassword: async () =>
        Promise.reject(
          new Error('Unknown or unsupported transport “disabled” for address “disabled:”'),
        ),
    },
    keytarService: 'com.loofi.flowveostudio',
    JSZip: class {},
    buildSupportSnapshot,
    getSafeModeStatus: () => ({ active: false }),
    getMediaStore: () => null,
    getPaidJobEngine: () => null,
    getMainWindow: () => null,
  });

  const snapshot = await handlers.get('desktop-diagnostics')();

  assert.equal(snapshot.app.version, '10.0.0');
  assert.equal(snapshot.provider.configured, false);
  assert.equal(snapshot.provider.credentialsIncluded, false);
  assert.deepEqual(snapshot.storage, { bytes: 0, files: 0 });
});
