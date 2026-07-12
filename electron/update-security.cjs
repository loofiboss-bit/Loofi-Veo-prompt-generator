'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RELEASE_HOST = 'github.com';
const RELEASE_PREFIX = '/loofiboss-bit/Loofi-Veo-prompt-generator/releases/download/';
const ALLOWED_EXTENSIONS = ['.AppImage', '.rpm', '.exe', '.blockmap', '.yml'];

function validateReleaseAssetUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== RELEASE_HOST ||
    !url.pathname.startsWith(RELEASE_PREFIX)
  )
    throw new Error('Update URL is outside the allowlisted release channel.');
  const fileName = path.posix.basename(url.pathname);
  if (
    !fileName ||
    (!ALLOWED_EXTENSIONS.some((extension) => fileName.endsWith(extension)) &&
      fileName !== 'SHA256SUMS.txt')
  )
    throw new Error('Update asset type is not allowed.');
  return { url, fileName };
}

function checksumFromManifest(manifest, fileName) {
  for (const line of String(manifest).split(/\r?\n/)) {
    const match = line.trim().match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
    if (match && path.posix.basename(match[2]) === fileName) return match[1].toLowerCase();
  }
  throw new Error(`No SHA-256 checksum published for ${fileName}.`);
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return hash.digest('hex');
}

module.exports = { checksumFromManifest, sha256File, validateReleaseAssetUrl };
