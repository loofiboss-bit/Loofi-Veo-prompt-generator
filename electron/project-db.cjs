'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SAFE_PROJECT_ID = /^[a-zA-Z0-9_-]{1,160}$/;

function assertSafeProjectId(projectId) {
  if (typeof projectId !== 'string' || !SAFE_PROJECT_ID.test(projectId.trim())) {
    throw new Error('Invalid project ID: must be an alphanumeric identifier.');
  }
  return projectId.trim();
}

function escapeSqlLiteral(value) {
  return String(value).replaceAll("'", "''");
}

function stripProjectArrays(doc) {
  const meta = { ...doc };
  const storyboard =
    doc.storyboard && typeof doc.storyboard === 'object' ? { ...doc.storyboard } : {};
  delete storyboard.shots;
  if (storyboard.timeline && typeof storyboard.timeline === 'object') {
    const timeline = { ...storyboard.timeline };
    delete timeline.tracks;
    delete timeline.clips;
    storyboard.timeline = timeline;
  }
  meta.storyboard = storyboard;
  delete meta.assets;
  delete meta.productionRuns;
  return meta;
}

class ProjectConflictDbError extends Error {
  constructor(projectId, expectedRevision, actualRevision, latestDocument) {
    super(
      `Project revision conflict for ${projectId}: expected ${expectedRevision}, actual ${actualRevision}.`,
    );
    this.name = 'ProjectConflictDbError';
    this.code = 'PROJECT_CONFLICT';
    this.projectId = projectId;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
    this.latestDocument = latestDocument;
  }
}

class ProjectDatabase {
  constructor(dbPath) {
    if (!dbPath || typeof dbPath !== 'string') {
      throw new Error('ProjectDatabase requires a file path.');
    }
    this.dbPath = dbPath;
    this.db = null;
    this.stmts = null;
  }

  open() {
    if (this.db) return this;
    if (this.dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true, mode: 0o700 });
    }
    const db = new DatabaseSync(this.dbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA busy_timeout = 5000;');
    this.#applySchemaMigrations(db);
    this.db = db;
    this.#prepareStatements();
    return this;
  }

  close() {
    if (!this.db) return;
    this.stmts = null;
    try {
      if (this.dbPath !== ':memory:') {
        this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      }
    } catch {
      // Best-effort checkpoint on close
    }
    this.db.close();
    this.db = null;
  }

  #ensureOpen() {
    if (!this.db) this.open();
    return this.db;
  }

  #applySchemaMigrations(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
    `);

    const row = db
      .prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations;')
      .get();
    const currentVersion = Number(row?.version ?? 0);

    if (currentVersion < 1) {
      db.exec('BEGIN IMMEDIATE;');
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            schema_version INTEGER NOT NULL,
            mutation_version INTEGER NOT NULL DEFAULT 0,
            document_revision INTEGER NOT NULL DEFAULT 0,
            last_modified INTEGER NOT NULL,
            meta_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          );

          CREATE TABLE IF NOT EXISTS scenes_shots (
            project_id TEXT NOT NULL,
            id INTEGER NOT NULL,
            sort_order INTEGER NOT NULL,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (project_id, id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS timeline_tracks (
            project_id TEXT NOT NULL,
            id TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (project_id, id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS timeline_clips (
            project_id TEXT NOT NULL,
            id TEXT NOT NULL,
            track_id TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (project_id, id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS assets (
            project_id TEXT NOT NULL,
            id TEXT NOT NULL,
            storage_key TEXT,
            sha256 TEXT,
            meta_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (project_id, id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS production_runs (
            project_id TEXT NOT NULL,
            id TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (project_id, id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS paid_jobs (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            fsm_state TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_scenes_shots_order
            ON scenes_shots(project_id, sort_order);
          CREATE INDEX IF NOT EXISTS idx_timeline_clips_order
            ON timeline_clips(project_id, sort_order);
          CREATE INDEX IF NOT EXISTS idx_assets_storage_key
            ON assets(project_id, storage_key);
          CREATE INDEX IF NOT EXISTS idx_paid_jobs_project
            ON paid_jobs(project_id, updated_at DESC);
        `);
        db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);').run(
          1,
          Date.now(),
        );
        db.exec('COMMIT;');
      } catch (error) {
        try {
          db.exec('ROLLBACK;');
        } catch {
          // Ignore rollback failure after error
        }
        throw error;
      }
    }
  }

  #prepareStatements() {
    const db = this.db;
    this.stmts = {
      getProjectRow: db.prepare('SELECT * FROM projects WHERE id = ?;'),
      listProjects: db.prepare(
        'SELECT id, name, schema_version, mutation_version, document_revision, last_modified, updated_at FROM projects ORDER BY last_modified DESC;',
      ),
      upsertProject: db.prepare(`
        INSERT INTO projects (id, name, schema_version, mutation_version, document_revision, last_modified, meta_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          schema_version = excluded.schema_version,
          mutation_version = excluded.mutation_version,
          document_revision = excluded.document_revision,
          last_modified = excluded.last_modified,
          meta_json = excluded.meta_json,
          updated_at = excluded.updated_at;
      `),
      selectShots: db.prepare(
        'SELECT id, sort_order, data_json FROM scenes_shots WHERE project_id = ? ORDER BY sort_order ASC, id ASC;',
      ),
      upsertShot: db.prepare(`
        INSERT INTO scenes_shots (project_id, id, sort_order, data_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(project_id, id) DO UPDATE SET
          sort_order = excluded.sort_order,
          data_json = excluded.data_json,
          updated_at = excluded.updated_at;
      `),
      deleteShot: db.prepare('DELETE FROM scenes_shots WHERE project_id = ? AND id = ?;'),
      selectTracks: db.prepare(
        'SELECT id, sort_order, data_json FROM timeline_tracks WHERE project_id = ? ORDER BY sort_order ASC, id ASC;',
      ),
      upsertTrack: db.prepare(`
        INSERT INTO timeline_tracks (project_id, id, sort_order, data_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(project_id, id) DO UPDATE SET
          sort_order = excluded.sort_order,
          data_json = excluded.data_json,
          updated_at = excluded.updated_at;
      `),
      deleteTrack: db.prepare('DELETE FROM timeline_tracks WHERE project_id = ? AND id = ?;'),
      selectClips: db.prepare(
        'SELECT id, track_id, sort_order, data_json FROM timeline_clips WHERE project_id = ? ORDER BY sort_order ASC, id ASC;',
      ),
      upsertClip: db.prepare(`
        INSERT INTO timeline_clips (project_id, id, track_id, sort_order, data_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_id, id) DO UPDATE SET
          track_id = excluded.track_id,
          sort_order = excluded.sort_order,
          data_json = excluded.data_json,
          updated_at = excluded.updated_at;
      `),
      deleteClip: db.prepare('DELETE FROM timeline_clips WHERE project_id = ? AND id = ?;'),
      selectAssets: db.prepare('SELECT id, meta_json FROM assets WHERE project_id = ?;'),
      upsertAsset: db.prepare(`
        INSERT INTO assets (project_id, id, storage_key, sha256, meta_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_id, id) DO UPDATE SET
          storage_key = excluded.storage_key,
          sha256 = excluded.sha256,
          meta_json = excluded.meta_json,
          updated_at = excluded.updated_at;
      `),
      deleteAsset: db.prepare('DELETE FROM assets WHERE project_id = ? AND id = ?;'),
      selectRuns: db.prepare(
        'SELECT id, sort_order, data_json FROM production_runs WHERE project_id = ? ORDER BY sort_order ASC, id ASC;',
      ),
      upsertRun: db.prepare(`
        INSERT INTO production_runs (project_id, id, sort_order, data_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(project_id, id) DO UPDATE SET
          sort_order = excluded.sort_order,
          data_json = excluded.data_json,
          updated_at = excluded.updated_at;
      `),
      deleteRun: db.prepare('DELETE FROM production_runs WHERE project_id = ? AND id = ?;'),
      upsertPaidJob: db.prepare(`
        INSERT INTO paid_jobs (id, project_id, fsm_state, payload_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          project_id = excluded.project_id,
          fsm_state = excluded.fsm_state,
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at;
      `),
      listPaidJobsByProject: db.prepare(
        'SELECT payload_json FROM paid_jobs WHERE project_id = ? ORDER BY updated_at DESC;',
      ),
      listAllPaidJobs: db.prepare('SELECT payload_json FROM paid_jobs ORDER BY updated_at DESC;'),
    };
  }

  listProjects() {
    this.#ensureOpen();
    return this.stmts.listProjects.all().map((row) => ({
      id: row.id,
      name: row.name,
      schemaVersion: row.schema_version,
      mutationVersion: row.mutation_version,
      documentRevision: row.document_revision,
      lastModified: row.last_modified,
      updatedAt: row.updated_at,
    }));
  }

  openProject(projectId) {
    this.#ensureOpen();
    const safeId = assertSafeProjectId(projectId);
    const row = this.stmts.getProjectRow.get(safeId);
    if (!row) return null;

    const meta = JSON.parse(row.meta_json);
    const shots = this.stmts.selectShots.all(safeId).map((r) => JSON.parse(r.data_json));
    const tracks = this.stmts.selectTracks.all(safeId).map((r) => JSON.parse(r.data_json));
    const clips = this.stmts.selectClips.all(safeId).map((r) => JSON.parse(r.data_json));
    const assets = this.stmts.selectAssets.all(safeId).map((r) => JSON.parse(r.meta_json));
    const runs = this.stmts.selectRuns.all(safeId).map((r) => JSON.parse(r.data_json));

    const storyboard =
      meta.storyboard && typeof meta.storyboard === 'object' ? { ...meta.storyboard } : {};
    storyboard.shots = shots;
    storyboard.timeline = {
      ...(storyboard.timeline && typeof storyboard.timeline === 'object'
        ? storyboard.timeline
        : {}),
      tracks,
      clips,
    };

    const doc = {
      ...meta,
      id: row.id,
      name: row.name,
      schemaVersion: row.schema_version,
      mutationVersion: row.mutation_version,
      documentRevision: row.document_revision,
      lastModified: row.last_modified,
      storyboard,
    };
    if (assets.length > 0 || Array.isArray(meta._hasAssets)) {
      doc.assets = assets;
      delete doc._hasAssets;
    }
    if (runs.length > 0) {
      doc.productionRuns = runs;
    }
    return doc;
  }

  #syncArrayCollection({ existingRows, nextItems, getId, upsertFn, deleteFn, now }) {
    const existingMap = new Map(existingRows.map((row) => [row.id, row.data_json]));
    const nextIds = new Set();
    let changed = 0;

    nextItems.forEach((item, index) => {
      const id = getId(item);
      nextIds.add(id);
      const serialized = JSON.stringify(item);
      if (existingMap.get(id) !== serialized || existingRows[index]?.id !== id) {
        upsertFn(item, id, index, serialized, now);
        changed += 1;
      }
    });

    for (const row of existingRows) {
      if (!nextIds.has(row.id)) {
        deleteFn(row.id);
        changed += 1;
      }
    }
    return changed;
  }

  commitDelta(input) {
    const db = this.#ensureOpen();
    if (!input || typeof input !== 'object') {
      throw new Error('commitDelta requires an input object.');
    }
    const projectId = assertSafeProjectId(input.projectId || input.document?.id);
    const now = Date.now();
    const document = input.document && typeof input.document === 'object' ? input.document : null;
    const delta = input.delta && typeof input.delta === 'object' ? input.delta : null;

    db.exec('BEGIN IMMEDIATE;');
    try {
      const existing = this.stmts.getProjectRow.get(projectId);
      const currentRevision = existing ? Number(existing.document_revision) : 0;
      const expectedRevision =
        typeof input.expectedRevision === 'number'
          ? input.expectedRevision
          : typeof document?.documentRevision === 'number'
            ? document.documentRevision
            : currentRevision;

      if (existing && currentRevision !== expectedRevision) {
        const latestDocument = this.openProject(projectId);
        throw new ProjectConflictDbError(
          projectId,
          expectedRevision,
          currentRevision,
          latestDocument,
        );
      }

      const nextRevision =
        input.preserveRevision && !existing
          ? expectedRevision
          : (existing ? currentRevision : expectedRevision) + 1;
      const sourceDoc = document
        ? document
        : existing
          ? JSON.parse(existing.meta_json)
          : { id: projectId, name: 'Untitled Project', schemaVersion: 18 };
      const mergedMetaSource = delta?.meta ? { ...sourceDoc, ...delta.meta } : sourceDoc;
      const meta = stripProjectArrays(mergedMetaSource);
      if (Array.isArray(document?.assets)) {
        meta._hasAssets = [];
      }

      const name = String(mergedMetaSource.name || existing?.name || 'Untitled Project');
      const schemaVersion = Number(
        mergedMetaSource.schemaVersion ?? existing?.schema_version ?? 18,
      );
      const mutationVersion = Number(
        mergedMetaSource.mutationVersion ?? existing?.mutation_version ?? 0,
      );
      const lastModified = Number(mergedMetaSource.lastModified ?? now);

      this.stmts.upsertProject.run(
        projectId,
        name,
        schemaVersion,
        mutationVersion,
        nextRevision,
        lastModified,
        JSON.stringify(meta),
        now,
      );

      let entityChanges = 0;

      if (document) {
        const shots = Array.isArray(document.storyboard?.shots) ? document.storyboard.shots : [];
        entityChanges += this.#syncArrayCollection({
          existingRows: existing ? this.stmts.selectShots.all(projectId) : [],
          nextItems: shots,
          getId: (item) => Number(item.id),
          upsertFn: (_, id, order, serialized, ts) =>
            this.stmts.upsertShot.run(projectId, id, order, serialized, ts),
          deleteFn: (id) => this.stmts.deleteShot.run(projectId, id),
          now,
        });

        const tracks = Array.isArray(document.storyboard?.timeline?.tracks)
          ? document.storyboard.timeline.tracks
          : [];
        entityChanges += this.#syncArrayCollection({
          existingRows: existing ? this.stmts.selectTracks.all(projectId) : [],
          nextItems: tracks,
          getId: (item) => String(item.id),
          upsertFn: (_, id, order, serialized, ts) =>
            this.stmts.upsertTrack.run(projectId, id, order, serialized, ts),
          deleteFn: (id) => this.stmts.deleteTrack.run(projectId, id),
          now,
        });

        const clips = Array.isArray(document.storyboard?.timeline?.clips)
          ? document.storyboard.timeline.clips
          : [];
        entityChanges += this.#syncArrayCollection({
          existingRows: existing ? this.stmts.selectClips.all(projectId) : [],
          nextItems: clips,
          getId: (item) => String(item.id),
          upsertFn: (clip, id, order, serialized, ts) =>
            this.stmts.upsertClip.run(
              projectId,
              id,
              String(clip.trackId || 'video_main'),
              order,
              serialized,
              ts,
            ),
          deleteFn: (id) => this.stmts.deleteClip.run(projectId, id),
          now,
        });

        const assetItems = Array.isArray(document.assets) ? document.assets : [];
        const existingAssetRows = existing
          ? this.stmts.selectAssets
              .all(projectId)
              .map((row) => ({ id: row.id, data_json: row.meta_json }))
          : [];
        entityChanges += this.#syncArrayCollection({
          existingRows: existingAssetRows,
          nextItems: assetItems,
          getId: (item) => String(item.id),
          upsertFn: (asset, id, _order, serialized, ts) =>
            this.stmts.upsertAsset.run(
              projectId,
              id,
              asset.storageKey ? String(asset.storageKey) : null,
              asset.sha256 ? String(asset.sha256) : null,
              serialized,
              ts,
            ),
          deleteFn: (id) => this.stmts.deleteAsset.run(projectId, id),
          now,
        });

        const runs = Array.isArray(document.productionRuns) ? document.productionRuns : [];
        entityChanges += this.#syncArrayCollection({
          existingRows: existing ? this.stmts.selectRuns.all(projectId) : [],
          nextItems: runs,
          getId: (item) => String(item.id),
          upsertFn: (_, id, order, serialized, ts) =>
            this.stmts.upsertRun.run(projectId, id, order, serialized, ts),
          deleteFn: (id) => this.stmts.deleteRun.run(projectId, id),
          now,
        });
      } else if (delta) {
        if (Array.isArray(delta.upsertedShots)) {
          delta.upsertedShots.forEach((shot, index) => {
            this.stmts.upsertShot.run(
              projectId,
              Number(shot.id),
              Number(shot.sortOrder ?? index),
              JSON.stringify(shot),
              now,
            );
            entityChanges += 1;
          });
        }
        if (Array.isArray(delta.deletedShotIds)) {
          delta.deletedShotIds.forEach((id) => {
            this.stmts.deleteShot.run(projectId, Number(id));
            entityChanges += 1;
          });
        }
        if (Array.isArray(delta.upsertedTracks)) {
          delta.upsertedTracks.forEach((track, index) => {
            this.stmts.upsertTrack.run(
              projectId,
              String(track.id),
              Number(track.zIndex ?? index),
              JSON.stringify(track),
              now,
            );
            entityChanges += 1;
          });
        }
        if (Array.isArray(delta.deletedTrackIds)) {
          delta.deletedTrackIds.forEach((id) => {
            this.stmts.deleteTrack.run(projectId, String(id));
            entityChanges += 1;
          });
        }
        if (Array.isArray(delta.upsertedClips)) {
          delta.upsertedClips.forEach((clip, index) => {
            this.stmts.upsertClip.run(
              projectId,
              String(clip.id),
              String(clip.trackId || 'video_main'),
              Number(clip.sortOrder ?? index),
              JSON.stringify(clip),
              now,
            );
            entityChanges += 1;
          });
        }
        if (Array.isArray(delta.deletedClipIds)) {
          delta.deletedClipIds.forEach((id) => {
            this.stmts.deleteClip.run(projectId, String(id));
            entityChanges += 1;
          });
        }
        if (Array.isArray(delta.upsertedAssets)) {
          delta.upsertedAssets.forEach((asset) => {
            this.stmts.upsertAsset.run(
              projectId,
              String(asset.id),
              asset.storageKey ? String(asset.storageKey) : null,
              asset.sha256 ? String(asset.sha256) : null,
              JSON.stringify(asset),
              now,
            );
            entityChanges += 1;
          });
        }
        if (Array.isArray(delta.deletedAssetIds)) {
          delta.deletedAssetIds.forEach((id) => {
            this.stmts.deleteAsset.run(projectId, String(id));
            entityChanges += 1;
          });
        }
      }

      db.exec('COMMIT;');
      return {
        projectId,
        documentRevision: nextRevision,
        schemaVersion,
        entityChanges,
        updatedAt: now,
      };
    } catch (error) {
      try {
        db.exec('ROLLBACK;');
      } catch {
        // Ignore rollback failure
      }
      throw error;
    }
  }

  upsertPaidJob(job) {
    this.#ensureOpen();
    if (!job || typeof job.id !== 'string' || !job.id.trim()) {
      throw new Error('Paid job id is required.');
    }
    const now = Date.now();
    this.stmts.upsertPaidJob.run(
      job.id,
      job.projectId ? String(job.projectId) : null,
      String(job.fsmState || job.status || 'DRAFT'),
      JSON.stringify(job),
      now,
    );
  }

  listPaidJobs(projectId) {
    this.#ensureOpen();
    const rows = projectId
      ? this.stmts.listPaidJobsByProject.all(String(projectId))
      : this.stmts.listAllPaidJobs.all();
    return rows.map((row) => JSON.parse(row.payload_json));
  }

  async snapshotBackup({ backupDir, projectId, retention = 5 }) {
    const db = this.#ensureOpen();
    const safeId = projectId ? assertSafeProjectId(projectId) : 'workspace';
    const targetDir = path.join(backupDir, safeId);
    await fs.promises.mkdir(targetDir, { recursive: true, mode: 0o700 });
    const filename = `${String(Date.now()).padStart(16, '0')}-${crypto.randomBytes(3).toString('hex')}.sqlite`;
    const destPath = path.join(targetDir, filename);

    db.exec('PRAGMA wal_checkpoint(PASSIVE);');
    db.exec(`VACUUM INTO '${escapeSqlLiteral(destPath)}';`);

    const files = (await fs.promises.readdir(targetDir))
      .filter((entry) => entry.endsWith('.sqlite'))
      .sort()
      .reverse();
    for (const stale of files.slice(Math.max(2, retention))) {
      await fs.promises.rm(path.join(targetDir, stale), { force: true });
    }

    const stat = await fs.promises.stat(destPath);
    return {
      id: filename,
      path: destPath,
      sizeBytes: stat.size,
      createdAt: Date.now(),
    };
  }

  async migrateLegacyJsonDirectory({ backupsRoot, legacyPaidJobsPath }) {
    this.#ensureOpen();
    const migratedProjects = [];

    if (backupsRoot) {
      let entries = [];
      try {
        entries = await fs.promises.readdir(backupsRoot, { withFileTypes: true });
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }

      for (const entry of entries) {
        if (!entry.isDirectory() || !SAFE_PROJECT_ID.test(entry.name)) continue;
        const projectId = entry.name;
        if (this.stmts.getProjectRow.get(projectId)) continue;

        const dir = path.join(backupsRoot, projectId);
        const primary = path.join(dir, 'project.json');
        const preSqliteMarker = `${primary}.pre-sqlite.bak`;
        let rawRecord = null;
        try {
          rawRecord = JSON.parse(await fs.promises.readFile(primary, 'utf8'));
        } catch {
          rawRecord = null;
        }
        if (!rawRecord?.payload) continue;

        const snapshot = JSON.parse(rawRecord.payload);
        if (!snapshot || typeof snapshot !== 'object') continue;
        if (!fs.existsSync(preSqliteMarker)) {
          await fs.promises.copyFile(primary, preSqliteMarker);
        }

        const rev = Number(snapshot.documentRevision ?? 0);
        this.commitDelta({
          projectId,
          expectedRevision: Math.max(0, rev),
          preserveRevision: true,
          document: snapshot,
        });
        migratedProjects.push(projectId);
      }
    }

    let migratedJobs = 0;
    if (legacyPaidJobsPath) {
      try {
        const jobs = JSON.parse(await fs.promises.readFile(legacyPaidJobsPath, 'utf8'));
        if (Array.isArray(jobs)) {
          const bakPath = `${legacyPaidJobsPath}.pre-sqlite.bak`;
          if (!fs.existsSync(bakPath)) {
            await fs.promises.copyFile(legacyPaidJobsPath, bakPath);
          }
          for (const job of jobs) {
            if (job && typeof job.id === 'string') {
              this.upsertPaidJob(job);
              migratedJobs += 1;
            }
          }
        }
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }

    return { migratedProjects, migratedJobs };
  }
}

module.exports = {
  ProjectDatabase,
  ProjectConflictDbError,
  assertSafeProjectId,
};
