'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SAFE_PROJECT_ID = /^[a-zA-Z0-9_-]{1,160}$/;

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
    const temporary = `${target}.${process.pid}.tmp`;
    await fs.promises.writeFile(temporary, JSON.stringify(record), { mode: 0o600, flag: 'wx' });
    await fs.promises.rename(temporary, target);
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

  async rotate(projectId) {
    const backups = await this.list(projectId);
    for (const backup of backups.slice(this.retention)) {
      await fs.promises.rm(path.join(this.directory(projectId), backup.id), { force: true });
    }
  }
}

module.exports = { ProjectBackupStore };
