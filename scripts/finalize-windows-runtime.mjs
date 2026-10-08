import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);
const root =
  process.argv[2] ||
  fileURLToPath(new URL('../packaging/media-runtime/win32-x64', import.meta.url));
const tools = process.env.CREATOR_WINDOWS_TOOLS || '/tmp/loofi-v15-runtime';
const sourceDirectory = path.join(root, 'sources');
for (const filename of [
  'llvm-runtime-23.1.3.tar.xz',
  'mingw-runtime-sources.tar.gz',
  'llvm-mingw-20261006-source.tar.gz',
])
  await fs.copyFile(path.join(tools, filename), path.join(sourceDirectory, filename));
for (const filename of ['prepare-windows-toolchain.sh', 'finalize-windows-runtime.mjs'])
  await fs.copyFile(
    fileURLToPath(new URL(filename, import.meta.url)),
    path.join(sourceDirectory, filename),
  );
const digest = async (filename) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(filename))
    .digest('hex');
const provenance = {
  toolchain: 'llvm-mingw-20261006',
  toolchainSha256: '5f9c6ed95b2d4bdb2869a488c5fd5857fbdabcf288a0aa3eb1da43f6a08d8ab4',
  llvmCommit: '0d261d1ca552c95a8f007e061c787ac7132fbcbc',
  mingwCommit: 'a3d93999ef0521681d45e445c39964a7af0f593f',
  sourceNotes:
    'LLVM archive contains corresponding compiler-rt, libcxx, libcxxabi, libunwind, cmake and license; LLVM compiler itself is not redistributed.',
};
await fs.writeFile(
  path.join(sourceDirectory, 'runtime-source-provenance.json'),
  JSON.stringify(provenance, null, 2),
);
const env = { ...process.env, WINEDEBUG: '-all', WINEPREFIX: path.join(tools, 'wine-prefix') };
let configuration;
for (const program of ['ffmpeg', 'ffprobe']) {
  const binary = path.join(root, `${program}.exe`);
  const { stdout } = await exec(
    process.platform === 'win32' ? binary : 'wine',
    process.platform === 'win32' ? ['-version'] : [binary, '-version'],
    { timeout: 120000, env, maxBuffer: 2000000 },
  );
  if (!stdout.startsWith(`${program} version 9.0.2 `) || stdout.includes('--enable-nonfree'))
    throw new Error('Windows runtime version verification failed.');
  if (program === 'ffmpeg') configuration = stdout;
}
const featureBinary = path.join(root, 'ffmpeg.exe');
const runFeature = async (arg) =>
  exec(
    process.platform === 'win32' ? featureBinary : 'wine',
    process.platform === 'win32' ? [arg] : [featureBinary, arg],
    { timeout: 120000, env, maxBuffer: 2000000 },
  );
const encoders = await runFeature('-encoders');
const filters = await runFeature('-filters');
if (
  !encoders.stdout.includes('libx264') ||
  !encoders.stdout.includes(' png ') ||
  !encoders.stdout.includes(' aac ') ||
  !filters.stdout.includes(' subtitles ')
)
  throw new Error('Windows runtime is missing required offline rendering capabilities.');
const files = {
  ffmpeg: await digest(path.join(root, 'ffmpeg.exe')),
  ffprobe: await digest(path.join(root, 'ffprobe.exe')),
};
const sources = await Promise.all(
  (await fs.readdir(sourceDirectory)).sort().map(async (filename) => ({
    path: `sources/${filename}`,
    sha256: await digest(path.join(sourceDirectory, filename)),
  })),
);
await fs.writeFile(
  path.join(root, 'manifest.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      version: '9.0.2',
      license: 'GPL-3.0-or-later',
      distributionReady: true,
      platform: 'win32-x64',
      files,
      sources,
      build: {
        configuration,
        dependencies: {
          x264: '0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee',
          libass: '0.17.5',
          harfbuzz: '14.6.0',
          fribidi: '1.0.17',
          freetype: '2.14.1',
          zlib: '1.3.1',
        },
        verification: process.platform === 'win32' ? 'native-windows' : 'wine-on-linux',
      },
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Verified exact Windows x64 FFmpeg/ffprobe and archived corresponding dependency sources.',
);
