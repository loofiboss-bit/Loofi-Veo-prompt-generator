'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Precompute IEEE 802.3 CRC-32 lookup table
const CRC32_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[n] = c >>> 0;
}

function updateCrc32(crc, chunk) {
  let next = (crc ^ 0xffffffff) >>> 0;
  for (let i = 0; i < chunk.length; i += 1) {
    next = (CRC32_TABLE[(next ^ chunk[i]) & 0xff] ^ (next >>> 8)) >>> 0;
  }
  return (next ^ 0xffffffff) >>> 0;
}

function toDosTimeDate(timestampMs) {
  const date = new Date(timestampMs);
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((year - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
  return { dosTime, dosDate };
}

function writeBufferToStream(stream, buf) {
  return new Promise((resolve, reject) => {
    const ok = stream.write(buf);
    if (ok) {
      resolve();
      return;
    }
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      stream.off('drain', onDrain);
      stream.off('error', onError);
    };
    stream.once('drain', onDrain);
    stream.once('error', onError);
  });
}

function normalizeArchiveEntryName(name) {
  const normalized = String(name || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) {
    throw new Error(`Unsafe ZIP entry path: ${name}`);
  }
  return normalized;
}

function createLocalFileHeader({
  nameBytes,
  flags,
  compressionMethod,
  dosTime,
  dosDate,
  crc32,
  compressedSize,
  uncompressedSize,
}) {
  const buf = Buffer.allocUnsafe(30 + nameBytes.length);
  buf.writeUInt32LE(0x04034b50, 0); // Local file header signature
  buf.writeUInt16LE(20, 4); // Version needed to extract (2.0)
  buf.writeUInt16LE(flags, 6);
  buf.writeUInt16LE(compressionMethod, 8);
  buf.writeUInt16LE(dosTime, 10);
  buf.writeUInt16LE(dosDate, 12);
  buf.writeUInt32LE(crc32 >>> 0, 14);
  buf.writeUInt32LE(compressedSize >>> 0, 18);
  buf.writeUInt32LE(uncompressedSize >>> 0, 22);
  buf.writeUInt16LE(nameBytes.length, 26);
  buf.writeUInt16LE(0, 28); // Extra field length
  nameBytes.copy(buf, 30);
  return buf;
}

function createDataDescriptor({ crc32, compressedSize, uncompressedSize }) {
  const buf = Buffer.allocUnsafe(16);
  buf.writeUInt32LE(0x08074b50, 0); // Data descriptor signature
  buf.writeUInt32LE(crc32 >>> 0, 4);
  buf.writeUInt32LE(compressedSize >>> 0, 8);
  buf.writeUInt32LE(uncompressedSize >>> 0, 12);
  return buf;
}

function createCentralDirectoryHeader(entry) {
  const buf = Buffer.allocUnsafe(46 + entry.nameBytes.length);
  buf.writeUInt32LE(0x02014b50, 0); // Central directory signature
  buf.writeUInt16LE(20, 4); // Version made by
  buf.writeUInt16LE(20, 6); // Version needed
  buf.writeUInt16LE(entry.flags, 8);
  buf.writeUInt16LE(entry.compressionMethod, 10);
  buf.writeUInt16LE(entry.dosTime, 12);
  buf.writeUInt16LE(entry.dosDate, 14);
  buf.writeUInt32LE(entry.crc32 >>> 0, 16);
  buf.writeUInt32LE(entry.compressedSize >>> 0, 20);
  buf.writeUInt32LE(entry.uncompressedSize >>> 0, 24);
  buf.writeUInt16LE(entry.nameBytes.length, 28);
  buf.writeUInt16LE(0, 30); // Extra length
  buf.writeUInt16LE(0, 32); // Comment length
  buf.writeUInt16LE(0, 34); // Disk start
  buf.writeUInt16LE(0, 36); // Internal attrs
  buf.writeUInt32LE(0, 38); // External attrs
  buf.writeUInt32LE(entry.localHeaderOffset >>> 0, 42);
  entry.nameBytes.copy(buf, 46);
  return buf;
}

function createEndOfCentralDirectory({ entryCount, centralSize, centralOffset }) {
  const buf = Buffer.allocUnsafe(22);
  buf.writeUInt32LE(0x06054b50, 0);
  buf.writeUInt16LE(0, 4); // Disk number
  buf.writeUInt16LE(0, 6); // CD start disk
  buf.writeUInt16LE(entryCount, 8);
  buf.writeUInt16LE(entryCount, 10);
  buf.writeUInt32LE(centralSize >>> 0, 12);
  buf.writeUInt32LE(centralOffset >>> 0, 16);
  buf.writeUInt16LE(0, 20); // Comment length
  return buf;
}

/**
 * Stream files + metadata entries directly to a destination ZIP file using constant RAM (~256 KB buffer).
 * Large media streams use zero-copy STORE (method 0) with IEEE CRC32 + SHA-256 verification.
 * Text/JSON entries use raw DEFLATE (method 8).
 */
async function writeStreamingZipArchive({
  destinationPath,
  entries,
  onProgress,
  mtimeMs = Date.now(),
}) {
  if (!destinationPath || typeof destinationPath !== 'string') {
    throw new Error('Archive destinationPath is required.');
  }
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true, mode: 0o700 });
  const tempPath = `${destinationPath}.${process.pid}.${Date.now()}.tmp`;
  const { dosTime, dosDate } = toDosTimeDate(mtimeMs);

  let totalInputBytes = 0;
  for (const item of entries) {
    if (typeof item.sizeBytes === 'number') {
      totalInputBytes += item.sizeBytes;
    } else if (item.filePath) {
      const stat = await fs.promises.stat(item.filePath);
      item.sizeBytes = stat.size;
      totalInputBytes += stat.size;
    } else if (item.data !== undefined) {
      const raw = Buffer.isBuffer(item.data) ? item.data : Buffer.from(String(item.data), 'utf8');
      item._buffer = raw;
      totalInputBytes += raw.length;
    }
  }

  const outStream = fs.createWriteStream(tempPath, { flags: 'w', mode: 0o600 });
  const centralEntries = [];
  const assetChecksums = {};
  let offset = 0;
  let processedBytes = 0;
  let lastProgressAt = 0;

  const emitProgress = (force = false, phase = 'streaming') => {
    if (typeof onProgress !== 'function') return;
    const now = Date.now();
    if (!force && now - lastProgressAt < 100) return;
    lastProgressAt = now;
    const percent =
      totalInputBytes > 0 ? Math.min(99, Math.floor((processedBytes / totalInputBytes) * 100)) : 50;
    onProgress({
      phase,
      percent: force && phase === 'complete' ? 100 : percent,
      processedBytes,
      totalBytes: totalInputBytes,
    });
  };

  try {
    for (const item of entries) {
      const entryName = normalizeArchiveEntryName(item.archivePath);
      const nameBytes = Buffer.from(entryName, 'utf8');
      const localHeaderOffset = offset;

      if (item.filePath) {
        // Stream binary file via STORE (method 0) + bit 3 data descriptor so RAM stays O(chunkSize)
        const flags = 0x0800 | 0x0008; // UTF-8 + Data Descriptor
        const header = createLocalFileHeader({
          nameBytes,
          flags,
          compressionMethod: 0,
          dosTime,
          dosDate,
          crc32: 0,
          compressedSize: 0,
          uncompressedSize: 0,
        });
        await writeBufferToStream(outStream, header);
        offset += header.length;

        const hash = crypto.createHash('sha256');
        let crc = 0;
        let byteLength = 0;
        const readStream = fs.createReadStream(item.filePath, { highWaterMark: 256 * 1024 });
        for await (const chunk of readStream) {
          crc = updateCrc32(crc, chunk);
          hash.update(chunk);
          byteLength += chunk.length;
          processedBytes += chunk.length;
          await writeBufferToStream(outStream, chunk);
          emitProgress(false, 'streaming');
        }
        if (offset + byteLength > 0xffffffff) {
          throw new Error('Archive exceeds 4 GiB standard ZIP offset limit.');
        }
        offset += byteLength;

        const descriptor = createDataDescriptor({
          crc32: crc,
          compressedSize: byteLength,
          uncompressedSize: byteLength,
        });
        await writeBufferToStream(outStream, descriptor);
        offset += descriptor.length;

        assetChecksums[entryName] = hash.digest('hex');
        centralEntries.push({
          nameBytes,
          flags,
          compressionMethod: 0,
          dosTime,
          dosDate,
          crc32: crc,
          compressedSize: byteLength,
          uncompressedSize: byteLength,
          localHeaderOffset,
        });
      } else {
        const raw = item._buffer ?? Buffer.from(String(item.data ?? ''), 'utf8');
        const crc = updateCrc32(0, raw);
        const compressed = zlib.deflateRawSync(raw);
        const useStore = compressed.length >= raw.length;
        const payload = useStore ? raw : compressed;
        const method = useStore ? 0 : 8;
        const flags = 0x0800; // UTF-8

        const header = createLocalFileHeader({
          nameBytes,
          flags,
          compressionMethod: method,
          dosTime,
          dosDate,
          crc32: crc,
          compressedSize: payload.length,
          uncompressedSize: raw.length,
        });
        await writeBufferToStream(outStream, header);
        offset += header.length;
        await writeBufferToStream(outStream, payload);
        offset += payload.length;
        processedBytes += raw.length;

        assetChecksums[entryName] = crypto.createHash('sha256').update(raw).digest('hex');
        centralEntries.push({
          nameBytes,
          flags,
          compressionMethod: method,
          dosTime,
          dosDate,
          crc32: crc,
          compressedSize: payload.length,
          uncompressedSize: raw.length,
          localHeaderOffset,
        });
      }
    }

    const centralOffset = offset;
    let centralSize = 0;
    for (const entry of centralEntries) {
      const cdHeader = createCentralDirectoryHeader(entry);
      await writeBufferToStream(outStream, cdHeader);
      centralSize += cdHeader.length;
    }

    const eocd = createEndOfCentralDirectory({
      entryCount: centralEntries.length,
      centralSize,
      centralOffset,
    });
    await writeBufferToStream(outStream, eocd);

    await new Promise((resolve, reject) => {
      outStream.once('error', reject);
      outStream.end(resolve);
    });

    await fs.promises.rename(tempPath, destinationPath);
    const stat = await fs.promises.stat(destinationPath);
    emitProgress(true, 'complete');

    return {
      path: destinationPath,
      sizeBytes: stat.size,
      entryCount: centralEntries.length,
      checksums: assetChecksums,
    };
  } catch (error) {
    outStream.destroy();
    await fs.promises.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function validateArchiveExportInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid archive export payload: expected an object.');
  }
  if (!input.archive || typeof input.archive !== 'object') {
    throw new Error('Invalid archive export payload: archive object is required.');
  }
  if (!input.manifest || typeof input.manifest !== 'object') {
    throw new Error('Invalid archive export payload: manifest object is required.');
  }
  if (!Array.isArray(input.diskAssets)) {
    throw new Error('Invalid archive export payload: diskAssets array is required.');
  }
  return input;
}

function registerArchiveIpc({ ipcMain, dialog, getMainWindow, getMediaStore }) {
  ipcMain.handle('project-archive-export', async (_, rawInput) => {
    const input = validateArchiveExportInput(rawInput);
    const store = typeof getMediaStore === 'function' ? getMediaStore() : null;

    let destinationPath =
      typeof input.outputPath === 'string' && input.outputPath.trim()
        ? path.resolve(input.outputPath.trim())
        : null;

    if (!destinationPath) {
      const saveResult = await dialog.showSaveDialog(getMainWindow?.() ?? null, {
        title: 'Export Loofi Project Archive',
        defaultPath: input.defaultFileName || 'project.loofi-project',
        filters: [{ name: 'Loofi Project Archive', extensions: ['loofi-project', 'zip'] }],
      });
      if (saveResult.canceled || !saveResult.filePath) {
        return { canceled: true };
      }
      destinationPath = saveResult.filePath;
    }

    const entries = [];
    const manifestAssets = [];

    for (const item of input.diskAssets) {
      const archivePath = normalizeArchiveEntryName(item.archivePath);
      if (item.storageKey) {
        if (!store) throw new Error('Desktop media store is not ready.');
        const resolved = await store.resolve(String(item.storageKey));
        if (!resolved?.path) {
          throw new Error(`Missing local media on disk for key: ${item.storageKey}`);
        }
        entries.push({ archivePath, filePath: resolved.path });
        manifestAssets.push({
          id: String(item.id),
          path: archivePath,
          sha256: resolved.sha256,
        });
      } else if (typeof item.base64Data === 'string' && item.base64Data.length > 0) {
        const buffer = Buffer.from(item.base64Data, 'base64');
        entries.push({ archivePath, data: buffer });
        manifestAssets.push({
          id: String(item.id),
          path: archivePath,
          sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
        });
      } else {
        throw new Error(`Archive asset lacks disk key or inline data: ${item.id}`);
      }
    }

    for (const [extraPath, content] of Object.entries(input.extraFiles || {})) {
      entries.push({ archivePath: normalizeArchiveEntryName(extraPath), data: String(content) });
    }

    const projectJson = JSON.stringify(input.archive, null, 2);
    entries.push({ archivePath: 'project.json', data: projectJson });

    const manifest = {
      ...input.manifest,
      assets: manifestAssets,
    };
    entries.push({ archivePath: 'manifest.json', data: JSON.stringify(manifest, null, 2) });

    const result = await writeStreamingZipArchive({
      destinationPath,
      entries,
      onProgress: (progress) => {
        const win = getMainWindow?.();
        if (win && !win.isDestroyed()) {
          win.webContents.send('project-archive-progress', progress);
        }
      },
    });

    return {
      canceled: false,
      ...result,
    };
  });
}

module.exports = {
  writeStreamingZipArchive,
  registerArchiveIpc,
  validateArchiveExportInput,
};
