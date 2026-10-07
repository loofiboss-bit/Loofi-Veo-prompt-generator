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

const spec = await readFile(
  new URL('../packaging/copr/veo-prompt-generator.spec', import.meta.url),
  'utf8',
);
const filter = spec.match(/^%global __requires_exclude (.+)$/m)?.[1];
if (!filter) throw new Error('COPR must filter private bundled runtime dependencies.');
// RPM unescapes the spec macro before applying its dependency regular expression.
const exclude = new RegExp(filter.replaceAll('\\\\', '\\'));
for (const dependency of [
  'libc.musl-x86_64.so.1()(64bit)',
  'libvips-cpp.so.8.18.3()(64bit)',
  'libvips-cpp.so.8.18.7()(64bit)',
  'libvips-cpp.so.9.0.0()(64bit)',
]) {
  if (!exclude.test(dependency)) {
    throw new Error(`COPR exposes a private bundled dependency: ${dependency}`);
  }
}
for (const dependency of ['libc.so.6()(64bit)', 'libgtk-3.so.0()(64bit)', 'libnss3.so()(64bit)']) {
  if (exclude.test(dependency)) {
    throw new Error(`COPR hides a host dependency: ${dependency}`);
  }
}
console.log('COPR bundled runtime dependency filter is valid.');
