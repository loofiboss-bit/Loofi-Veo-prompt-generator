#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const dependencies = packageJson.build?.rpm?.depends;
const expected = [
  'gtk3',
  'libnotify',
  'nss',
  'libXScrnSaver',
  'libXtst',
  'xdg-utils',
  'at-spi2-core',
  'libuuid',
];
const debianOnly = [
  'libgtk-3-0',
  'libnotify4',
  'libnss3',
  'libxss1',
  'libxtst6',
  'libatspi2.0-0',
  'libuuid1',
];

if (!Array.isArray(dependencies)) {
  throw new Error('Electron Builder RPM dependencies must be declared as an array.');
}

const missing = expected.filter((dependency) => !dependencies.includes(dependency));
const unsupported = debianOnly.filter((dependency) => dependencies.includes(dependency));

if (missing.length > 0 || unsupported.length > 0) {
  throw new Error(
    `Invalid Fedora/RHEL RPM dependencies. Missing: ${missing.join(', ') || 'none'}. ` +
      `Debian-only entries: ${unsupported.join(', ') || 'none'}.`,
  );
}

console.log('Fedora/RHEL RPM dependency metadata is valid.');
