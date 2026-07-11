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

class DesktopMediaStore {
  constructor(rootPath, fetchImpl = fetch) {
    this.rootPath = rootPath;
    this.fetchImpl = fetchImpl;
  }

  async cacheRemote({ key, url, apiKey }) {
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
      const data = await fs.promises.readFile(record.path);
      return crypto.createHash('sha256').update(data).digest('hex') === record.sha256;
    } catch {
      return false;
    }
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

module.exports = { DesktopMediaStore, extensionForMime, validateMediaUrl };
