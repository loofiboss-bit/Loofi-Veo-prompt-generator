import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ProjectBackupStore } = require('./project-backup-store.cjs');

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
