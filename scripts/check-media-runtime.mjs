import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);
export async function checkMediaRuntime(root, platforms = ['linux-x64', 'win32-x64']) {
  for (const platform of platforms) {
    const directory = path.join(root, platform);
    const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));
    if (
      manifest.version !== '9.0.2' ||
      manifest.license !== 'GPL-3.0-or-later' ||
      manifest.distributionReady !== true ||
      !Array.isArray(manifest.sources) ||
      !manifest.sources.length
    )
      throw new Error(`Unreviewed runtime manifest: ${platform}.`);
    const artifacts = [
      ...['ffmpeg', 'ffprobe'].map((name) => ({
        path: name + (platform.startsWith('win32') ? '.exe' : ''),
        sha256: manifest.files?.[name],
      })),
      ...manifest.sources,
    ];
    for (const artifact of artifacts) {
      if (
        typeof artifact.path !== 'string' ||
        !/^[a-zA-Z0-9._/-]+$/.test(artifact.path) ||
        artifact.path.split('/').includes('..') ||
        !/^[a-f0-9]{64}$/.test(artifact.sha256)
      )
        throw new Error('Invalid runtime artifact manifest.');
      const resolved = await fs.realpath(path.join(directory, artifact.path));
      if (!resolved.startsWith(`${await fs.realpath(directory)}${path.sep}`))
        throw new Error('Runtime artifact escapes bundle.');
      const hash = crypto
        .createHash('sha256')
        .update(await fs.readFile(resolved))
        .digest('hex');
      if (hash !== artifact.sha256)
        throw new Error(`Runtime artifact checksum mismatch: ${platform}/${artifact.path}.`);
    }
    if (platform === `${process.platform}-${process.arch}`) {
      for (const name of ['ffmpeg', 'ffprobe']) {
        const binary = path.join(directory, name + (process.platform === 'win32' ? '.exe' : ''));
        const { stdout } = await exec(binary, ['-version'], { timeout: 30000 });
        if (
          (!stdout.startsWith(`${name} version 9.0.2 `) &&
            !stdout.startsWith(`${name} version n9.0.2 `)) ||
          stdout.includes('--enable-nonfree')
        )
          throw new Error('Runtime must be exact 9.0.2 and GPL-compatible.');
      }
      const binary = path.join(directory, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
      const encoders = await exec(binary, ['-encoders'], { timeout: 30000 });
      const filters = await exec(binary, ['-filters'], { timeout: 30000 });
      if (
        !encoders.stdout.includes('libx264') ||
        !encoders.stdout.includes(' aac ') ||
        !encoders.stdout.includes(' png ') ||
        !filters.stdout.includes(' subtitles ')
      )
        throw new Error('Runtime lacks required rendering capabilities.');
    }
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root =
    process.argv[2] || fileURLToPath(new URL('../packaging/media-runtime', import.meta.url));
  await checkMediaRuntime(root);
  console.log('Verified offline rendering bundle: Linux x64 and Windows x64.');
}
