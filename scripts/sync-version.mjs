#!/usr/bin/env node

import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const versionArg = process.argv[2];

const readJson = async (relativePath) => {
  const content = await readFile(path.join(root, relativePath), 'utf8');
  return JSON.parse(content);
};

const writeJson = async (relativePath, data) => {
  await writeFile(path.join(root, relativePath), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const exists = async (relativePath) => {
  try {
    await stat(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
};

const run = async () => {
  const packageJson = await readJson('package.json');
  const version = versionArg ?? packageJson.version;

  console.log(`Syncing version: ${version}`);

  if (versionArg) {
    packageJson.version = version;
    await writeJson('package.json', packageJson);
    console.log(`  ✅ package.json → ${version}`);
  }

  if (await exists('metadata.json')) {
    const metadata = await readJson('metadata.json');
    metadata.version = version;
    await writeJson('metadata.json', metadata);
    console.log(`  ✅ metadata.json → ${version}`);
  }

  if (await exists('manifest.json')) {
    const manifest = await readJson('manifest.json');
    manifest.version = version;
    await writeJson('manifest.json', manifest);
    console.log(`  ✅ manifest.json → ${version}`);
  }

  console.log('');
  console.log(`Version sync complete: ${version}`);
  console.log('Files updated: package.json, metadata.json, manifest.json');
};

await run();
