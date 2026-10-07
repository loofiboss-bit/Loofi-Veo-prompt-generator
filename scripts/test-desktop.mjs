#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

async function discover(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) return discover(filename);
      return entry.isFile() && entry.name.endsWith('.test.mjs') ? [filename] : [];
    }),
  );
  return nested.flat().sort();
}

const files = await discover(path.join(root, 'electron'));
if (files.length === 0) throw new Error('No native desktop tests were discovered.');

const child = spawn(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) console.error(`Native desktop tests terminated by ${signal}.`);
  process.exitCode = code ?? 1;
});
