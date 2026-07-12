'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const SAFE_KEY = /^[a-zA-Z0-9._:-]{1,180}$/;
const ALLOWED_MEDIA_HOSTS = [
  'generativelanguage.googleapis.com',
  'storage.googleapis.com',
  'googleusercontent.com',
];

function validateMediaUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Provider media URL must use HTTPS.');
  if (!ALLOWED_MEDIA_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)))
    throw new Error('Provider media host is not allowed.');
  url.searchParams.delete('key');
  return url;
}

function extensionForMime(mimeType) {
  if (mimeType?.includes('webm')) return '.webm';
  if (mimeType?.includes('quicktime')) return '.mov';
  return '.mp4';
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

class DesktopMediaStore {
  constructor(rootPath, fetchImpl = fetch) {
    this.rootPath = rootPath;
    this.fetchImpl = fetchImpl;
  }

  async cacheRemote({ key, url, apiKey, metadata = {} }) {
    if (!SAFE_KEY.test(String(key || ''))) throw new Error('Invalid media key.');
    const providerUrl = validateMediaUrl(url);
    const response = await this.fetchImpl(providerUrl, {
      headers: apiKey ? { 'x-goog-api-key': apiKey } : {},
    });
    if (!response.ok) throw new Error(`Media download failed (${response.status}).`);
    const mimeType = response.headers.get('content-type') || 'video/mp4';
    const directory = path.join(this.rootPath, 'media');
    await fs.promises.mkdir(directory, { recursive: true });
    const fileStem = crypto.createHash('sha256').update(key).digest('hex');
    const finalPath = path.join(directory, `${fileStem}${extensionForMime(mimeType)}`);
    const temporaryPath = `${finalPath}.${process.pid}.${Date.now()}.partial`;
    const hash = crypto.createHash('sha256');
    let sizeBytes = 0;
    const handle = await fs.promises.open(temporaryPath, 'wx', 0o600);
    try {
      for await (const chunk of response.body) {
        const buffer = Buffer.from(chunk);
        hash.update(buffer);
        sizeBytes += buffer.length;
        await handle.write(buffer);
      }
      await handle.sync();
    } catch (error) {
      await handle.close();
      await fs.promises.rm(temporaryPath, { force: true });
      throw error;
    }
    await handle.close();
    await fs.promises.rename(temporaryPath, finalPath);
    const record = {
      schemaVersion: 1,
      key,
      path: finalPath,
      localUrl: pathToFileURL(finalPath).href,
      sha256: hash.digest('hex'),
      sizeBytes,
      mimeType,
      providerUrl: providerUrl.href,
      cachedAt: Date.now(),
      accepted: metadata.accepted === true,
      dimensions: metadata.dimensions,
      durationSeconds: metadata.durationSeconds,
      modelId: metadata.modelId,
      promptRevision: metadata.promptRevision,
      operationId: metadata.operationId,
      sourceAssetId: metadata.sourceAssetId,
    };
    const metadataPath = `${finalPath}.json`;
    const metadataTemp = `${metadataPath}.${process.pid}.tmp`;
    await fs.promises.writeFile(metadataTemp, JSON.stringify(record, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
    await fs.promises.rename(metadataTemp, metadataPath);
    return record;
  }

  async verify(record) {
    try {
      return (await sha256File(record.path)) === record.sha256;
    } catch {
      return false;
    }
  }

  async records() {
    const directory = path.join(this.rootPath, 'media');
    let names;
    try {
      names = await fs.promises.readdir(directory);
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
    const records = [];
    for (const name of names.filter((entry) => entry.endsWith('.json'))) {
      try {
        const record = JSON.parse(await fs.promises.readFile(path.join(directory, name), 'utf8'));
        if (record?.schemaVersion === 1 && SAFE_KEY.test(String(record.key || ''))) records.push(record);
      } catch {
        // Corrupt metadata is surfaced as an orphan by cleanupPreview.
      }
    }
    return records;
  }

  async health() {
    const results = [];
    for (const record of await this.records()) {
      let status = 'healthy';
      try {
        await fs.promises.access(record.path, fs.constants.R_OK);
        if (!(await this.verify(record))) status = 'corrupt';
      } catch {
        status = 'missing';
      }
      results.push({ key: record.key, path: record.path, accepted: record.accepted === true, status });
    }
    return results;
  }

  async relink(key, candidatePath) {
    if (!SAFE_KEY.test(String(key || ''))) throw new Error('Invalid media key.');
    const record = (await this.records()).find((item) => item.key === key);
    if (!record) throw new Error('Media record was not found.');
    const candidate = path.resolve(String(candidatePath || ''));
    const stat = await fs.promises.stat(candidate);
    if (!stat.isFile()) throw new Error('Relink target is not a file.');
    if ((await sha256File(candidate)) !== record.sha256)
      throw new Error('Relink target checksum does not match the accepted media.');
    const updated = { ...record, path: candidate, localUrl: pathToFileURL(candidate).href, relinkedAt: Date.now() };
    const metadataPath = path.join(
      this.rootPath,
      'media',
      `${crypto.createHash('sha256').update(key).digest('hex')}${extensionForMime(record.mimeType)}.json`,
    );
    const temporary = `${metadataPath}.${process.pid}.tmp`;
    await fs.promises.writeFile(temporary, JSON.stringify(updated, null, 2), { mode: 0o600 });
    await fs.promises.rename(temporary, metadataPath);
    return updated;
  }

  async setAccepted(key, accepted = true) {
    if (!SAFE_KEY.test(String(key || ''))) throw new Error('Invalid media key.');
    const record = (await this.records()).find((item) => item.key === key);
    if (!record) throw new Error('Media record was not found.');
    const updated = { ...record, accepted: accepted === true, acceptedAt: accepted ? Date.now() : undefined };
    const metadataPath = `${record.path}.json`;
    const inRepository = path.dirname(record.path) === path.join(this.rootPath, 'media');
    const target = inRepository
      ? metadataPath
      : path.join(
          this.rootPath,
          'media',
          `${crypto.createHash('sha256').update(key).digest('hex')}${extensionForMime(record.mimeType)}.json`,
        );
    const temporary = `${target}.${process.pid}.tmp`;
    await fs.promises.writeFile(temporary, JSON.stringify(updated, null, 2), { mode: 0o600 });
    await fs.promises.rename(temporary, target);
    return updated;
  }

  async cleanupPreview({ referencedKeys = [], retentionDays = 30 } = {}) {
    const referenced = new Set(referencedKeys);
    const cutoff = Date.now() - Math.max(0, retentionDays) * 86_400_000;
    const records = await this.records();
    const candidates = records.filter(
      (record) =>
        record.accepted !== true &&
        !referenced.has(record.key) &&
        Number(record.cachedAt || 0) <= cutoff,
    );
    const knownPaths = new Set(records.flatMap((record) => [record.path, `${record.path}.json`]));
    const directory = path.join(this.rootPath, 'media');
    let diskEntries = [];
    try {
      diskEntries = (await fs.promises.readdir(directory)).map((name) => path.join(directory, name));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const orphanPaths = diskEntries.filter(
      (filePath) => !knownPaths.has(filePath) && !filePath.includes('.partial'),
    );
    return {
      candidates: candidates.map((record) => ({
        key: record.key,
        path: record.path,
        sizeBytes: record.sizeBytes,
        reason: 'unreferenced-expired',
      })),
      orphanPaths,
      protectedAccepted: records.filter((record) => record.accepted === true).map((record) => record.key),
      reclaimableBytes: candidates.reduce((sum, record) => sum + Number(record.sizeBytes || 0), 0),
    };
  }

  async storageUsage() {
    const directory = path.join(this.rootPath, 'media');
    let entries;
    try {
      entries = await fs.promises.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return { bytes: 0, files: 0 };
      throw error;
    }
    let bytes = 0;
    let files = 0;
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.endsWith('.json') || entry.name.includes('.partial')) continue;
      bytes += (await fs.promises.stat(path.join(directory, entry.name))).size;
      files += 1;
    }
    return { bytes, files };
  }
}

module.exports = { DesktopMediaStore, extensionForMime, sha256File, validateMediaUrl };
