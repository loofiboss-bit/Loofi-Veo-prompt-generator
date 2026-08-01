import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { KEYTAR_SERVICE, registerCredentialsIpc } = require('./credentials-ipc.cjs');
const { registerMediaIpc } = require('./media-ipc.cjs');
const { registerProjectIpc } = require('./project-ipc.cjs');
const { registerUpdateIpc } = require('./update-ipc.cjs');

const ipcFixture = () => {
  const handlers = new Map();
  return {
    handlers,
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
  };
};

test('credential IPC exposes only the allowlisted vault key and bounded values', async () => {
  const { handlers, ipcMain } = ipcFixture();
  const calls = [];
  const keytar = {
    getPassword: async (...args) => {
      calls.push(['get', ...args]);
      return 'configured';
    },
    setPassword: async (...args) => calls.push(['set', ...args]),
    deletePassword: async (...args) => calls.push(['delete', ...args]),
  };
  registerCredentialsIpc({ ipcMain, keytar });

  assert.equal(await handlers.get('keychain-has')(null, 'gemini-api-key'), true);
  assert.equal(await handlers.get('keychain-has')(null, 'other-key'), false);
  assert.equal(await handlers.get('keychain-set')(null, 'gemini-api-key', 'too-short'), true);
  assert.equal(await handlers.get('keychain-set')(null, 'gemini-api-key', 'short'), false);
  assert.equal(await handlers.get('keychain-set')(null, 'other-key', 'long-enough-value'), false);
  await handlers.get('keychain-delete')(null, 'gemini-api-key');

  assert.deepEqual(calls[0], ['get', KEYTAR_SERVICE, 'gemini-api-key']);
  assert.deepEqual(calls.at(-1), ['delete', KEYTAR_SERVICE, 'gemini-api-key']);
});

test('media IPC fails closed before initialization and validates migration bytes', async () => {
  const { handlers, ipcMain } = ipcFixture();
  registerMediaIpc({ ipcMain, getMediaStore: () => null, getApiKey: async () => 'secret' });

  assert.deepEqual(await handlers.get('desktop-media-usage')(), { bytes: 0, files: 0 });
  assert.deepEqual(await handlers.get('desktop-media-health')(), []);
  await assert.rejects(handlers.get('desktop-media-cache')(null, {}), /not ready/);
  await assert.rejects(handlers.get('desktop-media-import')(null, { bytes: 'invalid' }), /payload/);
});

test('project IPC returns safe empty state and respects folder-dialog cancellation', async () => {
  const { handlers, ipcMain } = ipcFixture();
  let configured = false;
  registerProjectIpc({
    ipcMain,
    dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
    getMainWindow: () => null,
    getProjectBackupStore: () => null,
    configureRoot: async () => {
      configured = true;
    },
  });

  assert.deepEqual(await handlers.get('project-backup-list')(null, 'project-1'), []);
  await assert.rejects(handlers.get('project-backup-save')(null, {}), /not ready/);
  assert.equal(await handlers.get('select-project-folder')(), null);
  assert.equal(configured, false);
});

test('update IPC cannot install before a checksum-verified download', async () => {
  const { handlers, ipcMain } = ipcFixture();
  registerUpdateIpc({
    ipcMain,
    app: { getPath: () => '/tmp', quit: () => assert.fail('must not quit') },
    shell: { openPath: async () => '' },
    fs: { existsSync: () => false },
    path: { join: (...parts) => parts.join('/') },
    fetchImpl: async () => assert.fail('must not fetch'),
    validateReleaseAssetUrl: () => assert.fail('must not validate'),
    checksumFromManifest: () => assert.fail('must not parse'),
    sha256File: async () => assert.fail('must not hash'),
    getMainWindow: () => null,
  });

  await assert.rejects(handlers.get('install-update')(), /No verified update/);
});
