#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const roots = ['src/core/services', 'src/core/store', 'src/features', 'src/shared', 'src/infrastructure', 'electron'];
const blocked = [
  'gemini-3-pro-preview',
  'gemini-2.0-flash',
  'gemini-2.5-flash-image',
  'gemini-2.5-flash-preview-tts',
];
const findings = [];

async function walk(relative) {
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      await walk(child);
    } else if (/\.(?:ts|tsx|js|mjs|cjs)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      const source = await readFile(path.join(root, child), 'utf8');
      for (const modelId of blocked) {
        if (source.includes(modelId)) findings.push(`${child}: blocked executable model ${modelId}`);
      }
    }
  }
}

for (const directory of roots) await walk(directory);
if (findings.length) {
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log('Executable model gate passed.');
