import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const releaseDir = path.join(process.cwd(), 'release');
const checksumFile = path.join(releaseDir, 'SHA256SUMS.txt');
const artifactExtensions = new Set([
  '.AppImage',
  '.rpm',
  '.exe',
  '.dmg',
  '.zip',
  '.blockmap',
  '.yml',
]);

const hashFile = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
};

const releaseStat = await stat(releaseDir).catch(() => null);
if (!releaseStat?.isDirectory()) {
  throw new Error('release directory does not exist. Run npm run dist first.');
}

const artifacts = (await walk(releaseDir))
  .filter((filePath) => artifactExtensions.has(path.extname(filePath)))
  .sort();

if (artifacts.length === 0) {
  throw new Error('No release artifacts found for checksum generation.');
}

const lines = [];
for (const artifact of artifacts) {
  const hash = await hashFile(artifact);
  lines.push(`${hash}  ${path.relative(releaseDir, artifact).replaceAll(path.sep, '/')}`);
}

await writeFile(checksumFile, `${lines.join('\n')}\n`);
console.log(`Wrote ${checksumFile}`);
