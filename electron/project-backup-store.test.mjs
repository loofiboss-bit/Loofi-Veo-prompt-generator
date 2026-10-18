import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ProjectBackupStore, atomicWriteJsonFile } = require('./project-backup-store.cjs');

test('rotates automatic backups and restores only checksum-verified snapshots', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loofi-backups-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new ProjectBackupStore(root, 3);
  for (let revision = 1; revision <= 5; revision += 1) {
    await store.save('project-1', { id: 'project-1', revision });
  }
  const backups = await store.list('project-1');
  assert.equal(backups.length, 3);
  const restored = await store.restore('project-1', backups[0].id);
  assert.equal(restored.verified, true);
  assert.equal(restored.snapshot.revision, 5);

  const file = path.join(root, 'project-1', backups[0].id);
  const record = JSON.parse(await fs.readFile(file, 'utf8'));
  record.payload = JSON.stringify({ id: 'project-1', revision: 999 });
  await fs.writeFile(file, JSON.stringify(record));
  await assert.rejects(() => store.restore('project-1', backups[0].id), /checksum mismatch/);
});

test('maintains primary project.json and rotates to project.json.bak on update', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loofi-backups-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new ProjectBackupStore(root, 3);

  // First save: creates project.json
  await store.save('proj-atomic', { id: 'proj-atomic', version: 1, title: 'Alpha' });
  const primaryPath = path.join(root, 'proj-atomic', 'project.json');
  const bakPath = path.join(root, 'proj-atomic', 'project.json.bak');

  const firstPrimary = JSON.parse(await fs.readFile(primaryPath, 'utf8'));
  assert.equal(JSON.parse(firstPrimary.payload).version, 1);

  // Second save: rotates old project.json to project.json.bak and writes new project.json
  await store.save('proj-atomic', { id: 'proj-atomic', version: 2, title: 'Beta' });
  const secondPrimary = JSON.parse(await fs.readFile(primaryPath, 'utf8'));
  const rotatedBak = JSON.parse(await fs.readFile(bakPath, 'utf8'));

  assert.equal(JSON.parse(secondPrimary.payload).version, 2);
  assert.equal(JSON.parse(rotatedBak.payload).version, 1);

  // loadLatest retrieves from primary
  const loaded = await store.loadLatest('proj-atomic');
  assert.equal(loaded?.source, 'primary');
  assert.equal(loaded?.snapshot.version, 2);

  // Corrupt primary: loadLatest automatically recovers from project.json.bak
  await fs.writeFile(primaryPath, '{ corrupt json');
  const recoveredFromBak = await store.loadLatest('proj-atomic');
  assert.equal(recoveredFromBak?.source, 'backup_copy');
  assert.equal(recoveredFromBak?.snapshot.version, 1);

  // Corrupt backup as well: loadLatest recovers from rolling backups
  await fs.writeFile(bakPath, '{ also corrupt');
  const recoveredFromRolling = await store.loadLatest('proj-atomic');
  assert.equal(recoveredFromRolling?.source, 'rolling_backup');
  assert.equal(recoveredFromRolling?.snapshot.version, 2);
});

test('atomicWriteJsonFile validates JSON integrity and cleans up temp files on failure', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loofi-atomic-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const target = path.join(root, 'sample.json');

  // Valid write
  await atomicWriteJsonFile(target, { safe: true, count: 42 });
  const content = JSON.parse(await fs.readFile(target, 'utf8'));
  assert.equal(content.safe, true);

  // Invalid JSON string rejected
  await assert.rejects(
    () => atomicWriteJsonFile(target, 'not valid json {{{'),
    /JSON parse integrity check/,
  );

  // Check no leftover .tmp files
  const files = await fs.readdir(root);
  const tmpFiles = files.filter((f) => f.includes('.tmp'));
  assert.equal(tmpFiles.length, 0);
});

test('rejects traversal in project and backup identifiers', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loofi-backups-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new ProjectBackupStore(root);
  await assert.rejects(
    () => store.save('../escape', { id: '../escape' }),
    /Invalid backup project ID/,
  );
  await assert.rejects(() => store.restore('project-1', '../escape'), /Invalid backup ID/);
});

