import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMediaRuntime } from './check-media-runtime.mjs';
const source = process.argv[2];
if (!source || !path.isAbsolute(source))
  throw new Error('Supply an absolute reviewed runtime bundle directory.');
await checkMediaRuntime(source);
const target = fileURLToPath(new URL('../packaging/media-runtime', import.meta.url));
for (const platform of ['linux-x64', 'win32-x64']) {
  await fs.cp(path.join(source, platform), path.join(target, platform), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
}
await checkMediaRuntime(target);
console.log('Provisioned reviewed offline rendering bundle.');
