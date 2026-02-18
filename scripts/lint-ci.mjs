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

const result = spawnSync('npx', ['eslint', ...args], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
