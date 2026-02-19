#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const filePath = process.env.CLAUDE_FILE_PATH || '';

if (!/\.[jt]sx?$/i.test(filePath)) {
  process.exit(0);
}

spawnSync(
  'npx',
  ['eslint', '--no-warn-ignored', '--quiet', filePath],
  { stdio: 'ignore' },
);

process.exit(0);
