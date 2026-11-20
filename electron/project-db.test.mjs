import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ProjectDatabase, ProjectConflictDbError } = require('./project-db.cjs');
const { ProjectBackupStore } = require('./project-backup-store.cjs');

test('ProjectDatabase uses SQLite WAL, commits atomic deltas, and enforces CAS revisions', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loofi-sqlite-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const dbPath = path.join(root, 'studio.sqlite');
  const db = new ProjectDatabase(dbPath).open();
  t.after(() => db.close());

  const initialDoc = {
    id: 'proj-wal-1',
    name: 'WAL Film',
    schemaVersion: 18,
    mutationVersion: 1,
    documentRevision: 0,
    lastModified: Date.now(),
    promptState: { idea: 'Rainy street', targetModel: 'veo-3.1-quality' },
    storyboard: {
      globalContext: { style: 'Noir', character: 'Det', setting: 'Night' },
      shots: [{ id: 1, type: 'video', action: 'Shot 1', duration: 5, takes: [] }],
      timeline: {
        tracks: [
          { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
        ],
        clips: [
          {
            id: 'c1',
            trackId: 'video_main',
            resourceId: 1,
            startTime: 0,
            duration: 5,
            offset: 0,
            type: 'video',
          },
        ],
      },
    },
    assets: [
      { id: 'asset-1', storageKey: 'desktop:a1', sha256: 'abc123', name: 'A1', type: 'video' },
    ],
  };

  const firstCommit = db.commitDelta({
    projectId: 'proj-wal-1',
    expectedRevision: 0,
    document: initialDoc,
  });
  assert.equal(firstCommit.documentRevision, 1);

  // Concurrent second connection can read committed snapshot cleanly under WAL
  const reader = new ProjectDatabase(dbPath).open();
  t.after(() => reader.close());
  const loaded = reader.openProject('proj-wal-1');
  assert.equal(loaded?.documentRevision, 1);
  assert.equal(loaded?.storyboard?.shots?.length, 1);
  assert.equal(loaded?.assets?.length, 1);

  // Stale expectedRevision throws structured CAS conflict
  assert.throws(
    () =>
      db.commitDelta({
        projectId: 'proj-wal-1',
        expectedRevision: 0,
        delta: { meta: { name: 'Stale overwrite' } },
      }),
    (err) => err instanceof ProjectConflictDbError && err.actualRevision === 1,
  );

  // Incremental delta updates only touched entity without resending full document
  const deltaCommit = db.commitDelta({
    projectId: 'proj-wal-1',
    expectedRevision: 1,
    delta: {
      upsertedShots: [{ id: 2, type: 'video', action: 'Shot 2', duration: 6, takes: [] }],
    },
  });
  assert.equal(deltaCommit.documentRevision, 2);
  const reloaded = db.openProject('proj-wal-1');
  assert.equal(reloaded?.storyboard?.shots?.length, 2);
});

test('ProjectDatabase migrates legacy JSON backups without data loss and creates VACUUM INTO snapshots', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loofi-sqlite-mig-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const backupsRoot = path.join(root, 'backups');
  const backupStore = new ProjectBackupStore(backupsRoot, 3);
  await backupStore.save('legacy-1', {
    id: 'legacy-1',
    name: 'Legacy Project',
    schemaVersion: 18,
    documentRevision: 4,
    storyboard: {
      shots: [{ id: 10, type: 'video', action: 'Legacy action', duration: 4, takes: [] }],
      timeline: { tracks: [], clips: [] },
    },
  });

  const jobsFile = path.join(root, 'paid-jobs-v1.json');
  await fs.writeFile(
    jobsFile,
    JSON.stringify([
      { id: 'job-1', projectId: 'legacy-1', fsmState: 'COMPLETED', status: 'completed' },
    ]),
  );

  const db = new ProjectDatabase(path.join(root, 'studio.sqlite')).open();
  t.after(() => db.close());

  const mig = await db.migrateLegacyJsonDirectory({
    backupsRoot,
    legacyPaidJobsPath: jobsFile,
  });
  assert.deepEqual(mig.migratedProjects, ['legacy-1']);
  assert.equal(mig.migratedJobs, 1);

  const opened = db.openProject('legacy-1');
  assert.equal(opened?.name, 'Legacy Project');
  assert.equal(opened?.documentRevision, 4);
  assert.equal(opened?.storyboard?.shots?.[0]?.action, 'Legacy action');
  assert.equal(db.listPaidJobs('legacy-1').length, 1);

  const primaryMarker = path.join(backupsRoot, 'legacy-1', 'project.json.pre-sqlite.bak');
  await fs.access(primaryMarker);

  // Idempotent second run does not re-import or overwrite
  const migSecond = await db.migrateLegacyJsonDirectory({
    backupsRoot,
    legacyPaidJobsPath: jobsFile,
  });
  assert.deepEqual(migSecond.migratedProjects, []);

  // VACUUM INTO snapshot rotation
  const snapDir = path.join(root, 'db-backups');
  const snap1 = await db.snapshotBackup({
    backupDir: snapDir,
    projectId: 'legacy-1',
    retention: 2,
  });
  const snap2 = await db.snapshotBackup({
    backupDir: snapDir,
    projectId: 'legacy-1',
    retention: 2,
  });
  const snap3 = await db.snapshotBackup({
    backupDir: snapDir,
    projectId: 'legacy-1',
    retention: 2,
  });
  assert.ok(snap1.sizeBytes > 0 && snap2.sizeBytes > 0 && snap3.sizeBytes > 0);
  const files = await fs.readdir(path.join(snapDir, 'legacy-1'));
  assert.equal(files.filter((f) => f.endsWith('.sqlite')).length, 2);
});

test('ProjectDatabase 50-scene incremental delta commit completes p95 under 15ms', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loofi-sqlite-perf-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const db = new ProjectDatabase(path.join(root, 'perf.sqlite')).open();
  t.after(() => db.close());

  const shots = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    type: 'video',
    action: `Scene ${i + 1} tracking shot`,
    duration: 5,
    takes: [],
  }));
  const clips = Array.from({ length: 50 }, (_, i) => ({
    id: `clip-${i + 1}`,
    trackId: 'video_main',
    resourceId: i + 1,
    startTime: i * 5,
    duration: 5,
    offset: 0,
    type: 'video',
  }));

  db.commitDelta({
    projectId: 'perf-50',
    expectedRevision: 0,
    document: {
      id: 'perf-50',
      name: '50 Scene Project',
      schemaVersion: 18,
      storyboard: {
        shots,
        timeline: {
          tracks: [
            { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
          ],
          clips,
        },
      },
    },
  });

  const durations = [];
  let rev = 1;
  for (let i = 0; i < 20; i += 1) {
    const start = performance.now();
    const res = db.commitDelta({
      projectId: 'perf-50',
      expectedRevision: rev,
      delta: {
        upsertedShots: [
          { id: (i % 50) + 1, type: 'video', action: `Updated scene ${i}`, duration: 5, takes: [] },
        ],
      },
    });
    durations.push(performance.now() - start);
    rev = res.documentRevision;
  }

  durations.sort((a, b) => a - b);
  const p95 = durations[Math.floor(durations.length * 0.95)];
  assert.ok(p95 < 15, `Expected 50-scene incremental commit p95 < 15ms, got ${p95.toFixed(2)}ms`);

  // Verify videoIterationSessions persist cleanly through SQLite meta_json round-trip
  const iterCommit = db.commitDelta({
    projectId: 'perf-50',
    expectedRevision: rev,
    document: {
      id: 'perf-50',
      name: '50 Scene Project',
      schemaVersion: 18,
      videoIterationSessions: [
        {
          id: 'iter-1',
          projectId: 'perf-50',
          artifactId: 'art-1',
          variantIndex: 0,
          rootAssetId: 'a1',
          activeTurnId: 't2',
          updatedAt: 2000,
          turns: [
            { id: 't2', version: 2, assetId: 'a2', instruction: 'Rain', effectivePrompt: 'P' },
          ],
        },
      ],
      storyboard: {
        shots,
        timeline: {
          tracks: [
            { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
          ],
          clips,
        },
      },
    },
  });
  assert.equal(iterCommit.documentRevision, rev + 1);
  const reopened = db.openProject('perf-50');
  assert.equal(reopened?.videoIterationSessions?.length, 1);
  assert.equal(reopened?.videoIterationSessions?.[0]?.turns?.[0]?.assetId, 'a2');
});
