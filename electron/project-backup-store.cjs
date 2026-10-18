'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SAFE_PROJECT_ID = /^[a-zA-Z0-9_-]{1,160}$/;

/**
 * Atomic write pipeline for disk persistence:
 * 1. Write content to `<target>.tmp`
 * 2. `fsync` to flush filesystem buffers to physical disk
 * 3. Verify JSON parse integrity on written disk bytes
 * 4. If target exists, rotate existing file to `<target>.bak`
 * 5. Atomic `fs.rename` to target path
 */
async function atomicWriteJsonFile(targetPath, data) {
  const directory = path.dirname(targetPath);
  await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}-${crypto.randomBytes(3).toString('hex')}.tmp`;

  const handle = await fs.promises.open(tempPath, 'w', 0o600);
  try {
    await handle.writeFile(content, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }

  const readBack = await fs.promises.readFile(tempPath, 'utf8');
  try {
    JSON.parse(readBack);
  } catch (parseError) {
    await fs.promises.rm(tempPath, { force: true });
    throw new Error(`Atomic write failed JSON parse integrity check: ${parseError.message}`);
  }

  const bakPath = `${targetPath}.bak`;
  try {
    await fs.promises.access(targetPath, fs.constants.F_OK);
    await fs.promises.copyFile(targetPath, bakPath);
  } catch {
    // target does not exist yet; no rotation needed
  }

  await fs.promises.rename(tempPath, targetPath);
}

class ProjectBackupStore {
  constructor(rootPath, retention = 5) {
    this.rootPath = rootPath;
    this.retention = Math.max(2, Math.min(20, retention));
  }

  directory(projectId) {
    if (!SAFE_PROJECT_ID.test(String(projectId || '')))
      throw new Error('Invalid backup project ID.');
    return path.join(this.rootPath, projectId);
  }

  async save(projectId, snapshot) {
    if (!snapshot || typeof snapshot !== 'object')
      throw new Error('Invalid project backup snapshot.');
    const directory = this.directory(projectId);
    await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
    const payload = JSON.stringify(snapshot);
    const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
    const createdAt = Date.now();
    const record = { schemaVersion: 1, projectId, createdAt, sha256, payload };
    const filename = `${String(createdAt).padStart(16, '0')}-${crypto.randomBytes(3).toString('hex')}.backup.json`;
    const target = path.join(directory, filename);

    // 1. Atomic write of timestamped backup record
    await atomicWriteJsonFile(target, record);

    // 2. Atomic write of primary project snapshot with .bak rotation
    const primaryTarget = path.join(directory, 'project.json');
    await atomicWriteJsonFile(primaryTarget, record);

    await this.rotate(projectId);
    return { id: filename, projectId, createdAt, sha256 };
  }

  async list(projectId) {
    const directory = this.directory(projectId);
    let names;
    try {
      names = await fs.promises.readdir(directory);
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
    const summaries = [];
    for (const id of names
      .filter((name) => name.endsWith('.backup.json'))
      .sort()
      .reverse()) {
      try {
        const record = JSON.parse(await fs.promises.readFile(path.join(directory, id), 'utf8'));
        summaries.push({
          id,
          projectId: record.projectId,
          createdAt: record.createdAt,
          sha256: record.sha256,
        });
      } catch {
        summaries.push({ id, projectId, createdAt: 0, sha256: '', corrupt: true });
      }
    }
    return summaries;
  }

  async restore(projectId, id) {
    if (!/^[0-9a-f-]+\.backup\.json$/.test(String(id || ''))) throw new Error('Invalid backup ID.');
    const record = JSON.parse(
      await fs.promises.readFile(path.join(this.directory(projectId), id), 'utf8'),
    );
    if (record.projectId !== projectId) throw new Error('Project backup ownership mismatch.');
    const actual = crypto
      .createHash('sha256')
      .update(String(record.payload || ''))
      .digest('hex');
    if (!record.sha256 || actual !== record.sha256)
      throw new Error('Project backup checksum mismatch.');
    const snapshot = JSON.parse(record.payload);
    if (!snapshot || typeof snapshot !== 'object' || snapshot.id !== projectId)
      throw new Error('Project backup payload is invalid.');
    return { snapshot, verified: true, sha256: record.sha256, createdAt: record.createdAt };
  }

  async loadLatest(projectId) {
    const directory = this.directory(projectId);
    const primary = path.join(directory, 'project.json');
    const backup = path.join(directory, 'project.json.bak');

    try {
      const record = JSON.parse(await fs.promises.readFile(primary, 'utf8'));
      if (record && record.payload) {
        const snapshot = JSON.parse(record.payload);
        return { snapshot, source: 'primary', sha256: record.sha256 };
      }
    } catch {
      // Primary corrupted or missing; proceed to fallback
    }

    try {
      const record = JSON.parse(await fs.promises.readFile(backup, 'utf8'));
      if (record && record.payload) {
        const snapshot = JSON.parse(record.payload);
        return { snapshot, source: 'backup_copy', sha256: record.sha256 };
      }
    } catch {
      // Rotated backup corrupted or missing; proceed to rolling backups
    }

    const summaries = await this.list(projectId);
    const valid = summaries.find((s) => !s.corrupt);
    if (valid) {
      const restored = await this.restore(projectId, valid.id);
      return { snapshot: restored.snapshot, source: 'rolling_backup', sha256: restored.sha256 };
    }

    return null;
  }

  async rotate(projectId) {
    const backups = await this.list(projectId);
    for (const backup of backups.slice(this.retention)) {
      await fs.promises.rm(path.join(this.directory(projectId), backup.id), { force: true });
    }
  }
}

module.exports = { ProjectBackupStore, atomicWriteJsonFile, SAFE_PROJECT_ID };
