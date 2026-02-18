#!/usr/bin/env node

import { execSync, spawnSync } from 'node:child_process';

const run = () => {
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    console.error('git is required for lint:changed:strict');
    process.exit(1);
  }

  let output = '';
  try {
    output = execSync(
      "git diff --name-only --diff-filter=ACMRTUXB HEAD -- '*.js' '*.jsx' '*.ts' '*.tsx'",
      { encoding: 'utf8' },
    );
  } catch {
    output = '';
  }

  const changedFiles = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (changedFiles.length === 0) {
    console.log('No changed JS/TS files to lint.');
    process.exit(0);
  }

  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(command, ['eslint', '--max-warnings=0', ...changedFiles], {
    stdio: 'inherit',
  });

  process.exit(result.status ?? 1);
};

run();
