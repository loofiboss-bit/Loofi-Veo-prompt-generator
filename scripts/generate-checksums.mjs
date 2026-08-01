import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const releaseDir = path.join(process.cwd(), 'release');
const checksumFile = path.join(releaseDir, 'SHA256SUMS.txt');
const { version } = JSON.parse(await readFile(path.join(process.cwd(), 'package.json'), 'utf8'));
const artifactExtensions = new Set(['.AppImage', '.rpm', '.exe', '.dmg', '.zip', '.blockmap']);

const hashFile = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });

const releaseStat = await stat(releaseDir).catch(() => null);
if (!releaseStat?.isDirectory()) {
  throw new Error('release directory does not exist. Run npm run dist first.');
}

const candidates = (await readdir(releaseDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => path.join(releaseDir, entry.name))
  .filter(
    (filePath) =>
      artifactExtensions.has(path.extname(filePath)) ||
      /^latest.*\.ya?ml$/i.test(path.basename(filePath)),
  )
  .sort();

const artifacts = [];
for (const filePath of candidates) {
  if (path.basename(filePath).includes(`-${version}-`)) {
    artifacts.push(filePath);
    continue;
  }
  if (
    /^latest.*\.ya?ml$/i.test(path.basename(filePath)) &&
    (await readFile(filePath, 'utf8')).includes(`version: ${version}`)
  ) {
    artifacts.push(filePath);
  }
}

if (artifacts.length === 0) {
  throw new Error('No release artifacts found for checksum generation.');
}

const lines = [];
for (const artifact of artifacts) {
  const hash = await hashFile(artifact);
  lines.push(`${hash}  ${path.basename(artifact)}`);
}

await writeFile(checksumFile, `${lines.join('\n')}\n`);
console.log(`Wrote ${checksumFile}`);
