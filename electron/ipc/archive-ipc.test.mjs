import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import JSZip from 'jszip';

const require = createRequire(import.meta.url);
const { writeStreamingZipArchive, registerArchiveIpc } = require('./archive-ipc.cjs');

test('writeStreamingZipArchive writes ZIP extractable by JSZip with zero-copy STORE for randomized media', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loofi-stream-zip-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const mediaPath = path.join(root, 'clip.mp4');
  const mediaBytes = crypto.randomBytes(3 * 1024 * 1024 + 137);
  await fs.writeFile(mediaPath, mediaBytes);
  const expectedMediaSha = crypto.createHash('sha256').update(mediaBytes).digest('hex');

  const projectJson = JSON.stringify({ schemaVersion: 11, project: { id: 'p1', name: 'Stream' } });
  const manifestJson = JSON.stringify({ format: 'loofi-project', schemaVersion: 11 });
  const outZip = path.join(root, 'out.loofi-project');
  const progressEvents = [];

  const result = await writeStreamingZipArchive({
    destinationPath: outZip,
    entries: [
      { archivePath: 'assets/clip.mp4', filePath: mediaPath },
      { archivePath: 'project.json', data: projectJson },
      { archivePath: 'manifest.json', data: manifestJson },
    ],
    onProgress: (ev) => progressEvents.push(ev),
  });

  assert.equal(result.checksums['assets/clip.mp4'], expectedMediaSha);
  assert.equal(progressEvents.at(-1)?.percent, 100);
  assert.equal(progressEvents.at(-1)?.phase, 'complete');

  const zipData = await fs.readFile(outZip);
  const zip = await JSZip.loadAsync(zipData);
  const restoredMedia = await zip.file('assets/clip.mp4').async('nodebuffer');
  const restoredProject = await zip.file('project.json').async('string');
  assert.equal(restoredMedia.length, mediaBytes.length);
  assert.equal(crypto.createHash('sha256').update(restoredMedia).digest('hex'), expectedMediaSha);
  assert.equal(restoredProject, projectJson);
});

test('registerArchiveIpc streams disk assets via DesktopMediaStore without buffering archives in renderer', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loofi-archive-ipc-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const diskMedia = path.join(root, 'stored.mp4');
  const raw = crypto.randomBytes(512 * 1024);
  await fs.writeFile(diskMedia, raw);
  const sha = crypto.createHash('sha256').update(raw).digest('hex');

  const handlers = new Map();
  const events = [];
  const destPath = path.join(root, 'exported.loofi-project');

  registerArchiveIpc({
    ipcMain: { handle: (channel, fn) => handlers.set(channel, fn) },
    dialog: {
      showSaveDialog: async () => ({ canceled: false, filePath: destPath }),
    },
    getMainWindow: () => ({
      isDestroyed: () => false,
      webContents: {
        send: (ch, data) => events.push({ ch, data }),
      },
    }),
    getMediaStore: () => ({
      resolve: async (key) => (key === 'local-media:1' ? { path: diskMedia, sha256: sha } : null),
    }),
  });

  const exportHandler = handlers.get('project-archive-export');
  await assert.rejects(() => exportHandler(null, null), /expected an object/);
  await assert.rejects(
    () =>
      exportHandler(null, {
        archive: {},
        manifest: {},
        diskAssets: [{ id: 'bad', archivePath: '../etc/passwd', storageKey: 'local-media:1' }],
      }),
    /Unsafe ZIP entry path/,
  );

  const res = await exportHandler(null, {
    archive: { schemaVersion: 11, project: { id: 'p1' }, assets: [] },
    manifest: { format: 'loofi-project', schemaVersion: 11, checksums: {} },
    diskAssets: [{ id: 'a1', archivePath: 'assets/a1.mp4', storageKey: 'local-media:1' }],
  });

  assert.equal(res.canceled, false);
  assert.equal(res.path, destPath);
  assert.equal(res.entryCount, 3);
  assert.ok(events.some((e) => e.ch === 'project-archive-progress' && e.data.percent === 100));

  const zip = await JSZip.loadAsync(await fs.readFile(destPath));
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  assert.equal(manifest.assets[0].sha256, sha);
});
