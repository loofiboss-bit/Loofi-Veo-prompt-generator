import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMediaRuntime } from './check-media-runtime.mjs';
const source = process.argv[2];
if (!source || !path.isAbsolute(source))
  throw new Error('Supply an absolute reviewed runtime bundle directory.');
const platforms = ['linux-x64'];
try {
  await fs.access(path.join(source, 'win32-x64'));
  platforms.push('win32-x64');
} catch {}
await checkMediaRuntime(source, platforms);
const target = fileURLToPath(new URL('../packaging/media-runtime', import.meta.url));
for (const platform of platforms) {
  await fs.cp(path.join(source, platform), path.join(target, platform), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
}
await checkMediaRuntime(target, platforms);
console.log('Provisioned reviewed offline rendering bundle.');
