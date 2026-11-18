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

test('IPC contract parity: validates inputs and rejects malformed payloads before execution', async () => {
  const { handlers, ipcMain } = ipcFixture();
  const mockStore = {
    save: async () => ({ ok: true }),
    list: async () => [],
    restore: async () => ({ verified: true }),
  };
  const mockMediaStore = {
    read: async () => null,
    relink: async () => ({ relinked: true }),
    setAccepted: async () => true,
    cacheRemote: async () => ({ cached: true }),
  };

  registerProjectIpc({
    ipcMain,
    dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
    getMainWindow: () => null,
    getProjectBackupStore: () => mockStore,
    configureRoot: async () => {},
  });

  registerMediaIpc({
    ipcMain,
    getMediaStore: () => mockMediaStore,
    getApiKey: async () => 'test-key',
  });

  // Project IPC contract validation
  await assert.rejects(handlers.get('project-backup-save')(null, null), /must be an object/);
  await assert.rejects(
    handlers.get('project-backup-save')(null, { projectId: '' }),
    /alphanumeric/,
  );
  await assert.rejects(
    handlers.get('project-backup-save')(null, { projectId: 'p1', snapshot: null }),
    /snapshot must be an object/,
  );
  await assert.rejects(handlers.get('project-backup-list')(null, '../traversal'), /alphanumeric/);
  await assert.rejects(
    handlers.get('project-backup-restore')(null, { projectId: 'p1', id: 'bad-id' }),
    /Invalid backup ID/,
  );

  // Media IPC contract validation
  await assert.rejects(handlers.get('desktop-media-read')(null, ''), /Invalid media storage key/);
  assert.equal(await handlers.get('desktop-media-read')(null, 'local-media:1234'), null);
  assert.equal(await handlers.get('desktop-media-read')(null, 'external:1234'), null);
  await assert.rejects(
    handlers.get('desktop-media-read')(null, 'local-media:../secret'),
    /Invalid media storage key/,
  );
  await assert.rejects(
    handlers.get('desktop-media-read')(null, 'C:\\secret'),
    /Invalid media storage key/,
  );
  await assert.rejects(handlers.get('desktop-media-cache')(null, { url: '' }), /missing URL/);
  await assert.rejects(
    handlers.get('desktop-media-relink')(null, { key: 'valid-key', candidatePath: '' }),
    /candidatePath must be a string/,
  );
  await assert.rejects(handlers.get('desktop-media-set-accepted')(null, null), /accepted payload/);
});

test('validateProjectBackupSaveInput rejects deep nesting, cycles, and oversized snapshots', () => {
  const { validateProjectBackupSaveInput } = require('./ipc-validator.cjs');

  // Deep nesting > 24 levels
  let nested = { leaf: true };
  for (let i = 0; i < 26; i += 1) {
    nested = { child: nested };
  }
  assert.throws(
    () => validateProjectBackupSaveInput({ projectId: 'p1', snapshot: nested }),
    /exceeds 24 levels/,
  );

  // Circular reference
  const circular = {};
  circular.self = circular;
  assert.throws(
    () => validateProjectBackupSaveInput({ projectId: 'p1', snapshot: circular }),
    /circular reference/,
  );

  // Oversized (> 15 MB) snapshot
  const oversized = { blob: 'x'.repeat(15 * 1024 * 1024 + 1024) };
  assert.throws(
    () => validateProjectBackupSaveInput({ projectId: 'p1', snapshot: oversized }),
    /exceeds .* bytes limit/,
  );
});

test('update-ipc throttles intermediate download-progress events while guaranteeing 100%', async () => {
  const { handlers, ipcMain } = ipcFixture();
  const sentProgress = [];

  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'loofi-upd-'));

  try {
    const chunkA = Buffer.from('hello ');
    const chunkB = Buffer.from('world ');
    const chunkC = Buffer.from('update!');
    const full = Buffer.concat([chunkA, chunkB, chunkC]);
    const expectedHash = crypto.createHash('sha256').update(full).digest('hex');

    async function* bodyStream() {
      yield chunkA;
      yield chunkB;
      yield chunkC;
    }

    registerUpdateIpc({
      ipcMain,
      app: { getPath: () => tmpDir, quit: () => {} },
      shell: { openPath: async () => '' },
      fs,
      path,
      fetchImpl: async (url) => {
        if (String(url).includes('SHA')) {
          return { ok: true, text: async () => `${expectedHash}  installer.AppImage` };
        }
        return {
          ok: true,
          headers: new Headers({ 'content-length': String(full.length) }),
          body: bodyStream(),
        };
      },
      validateReleaseAssetUrl: (u) => ({
        url: new URL(u),
        fileName: String(u).endsWith('SHA256SUMS.txt') ? 'SHA256SUMS.txt' : 'installer.AppImage',
      }),
      checksumFromManifest: () => expectedHash,
      sha256File: async () => expectedHash,
      getMainWindow: () => ({
        webContents: {
          send: (channel, value) => {
            if (channel === 'download-progress') sentProgress.push(value);
          },
        },
      }),
    });

    await handlers.get('download-update')(null, {
      url: 'https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/download/v1/installer.AppImage',
      checksumUrl:
        'https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/download/v1/SHA256SUMS.txt',
    });

    assert.equal(sentProgress.at(-1), 100);
    assert.ok(sentProgress.length <= 2, `Expected throttled progress events, got ${sentProgress}`);
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
});

test('project IPC exposes validated SQLite WAL endpoints and rejects malformed inputs', async () => {
  const { handlers, ipcMain } = ipcFixture();
  const commits = [];
  const mockDb = {
    openProject: (id) => ({ id, name: 'SQLite Opened' }),
    listProjects: () => [{ id: 'proj-1', name: 'SQLite Listed' }],
    commitDelta: (input) => {
      commits.push(input);
      return { projectId: input.projectId, documentRevision: 1, entityChanges: 1 };
    },
    snapshotBackup: async ({ backupDir, projectId }) => ({
      id: `${projectId}.sqlite`,
      path: backupDir,
    }),
  };

  registerProjectIpc({
    ipcMain,
    dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
    getMainWindow: () => null,
    getProjectBackupStore: () => null,
    getProjectDatabase: () => mockDb,
    getSnapshotBackupDir: () => '/tmp/db-backups',
    configureRoot: async () => {},
  });

  await assert.rejects(handlers.get('project-db-open')(null, '../escape'), /alphanumeric/);
  assert.deepEqual(await handlers.get('project-db-open')(null, 'proj-1'), {
    id: 'proj-1',
    name: 'SQLite Opened',
  });
  assert.equal((await handlers.get('project-db-list')()).length, 1);
  await assert.rejects(
    handlers.get('project-db-commit-delta')(null, { projectId: 'proj-1', expectedRevision: -1 }),
    /expectedRevision/,
  );
  const committed = await handlers.get('project-db-commit-delta')(null, {
    projectId: 'proj-1',
    expectedRevision: 0,
    delta: { upsertedShots: [{ id: 1 }] },
  });
  assert.equal(committed.documentRevision, 1);
  assert.equal(commits.length, 1);
  const snap = await handlers.get('project-db-snapshot-backup')(null, 'proj-1');
  assert.equal(snap.id, 'proj-1.sqlite');
});
