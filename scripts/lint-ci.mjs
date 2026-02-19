#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const DEFAULT_THRESHOLD = 0;

function getThreshold() {
  try {
    const raw = readFileSync('.lint-threshold', 'utf8').trim();
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : DEFAULT_THRESHOLD;
  } catch {
    return DEFAULT_THRESHOLD;
  }
}

const threshold = getThreshold();
const args = [
  '.',
  `--max-warnings=${threshold}`,
  '--no-warn-ignored',
  '--ignore-pattern',
  'dist/**',
  '--ignore-pattern',
  'release/**',
];

const result = spawnSync('node', ['node_modules/eslint/bin/eslint.js', ...args], {
  shell: false,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Failed to run lint command: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
