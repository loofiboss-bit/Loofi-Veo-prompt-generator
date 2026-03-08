#!/usr/bin/env node
/**
 * check-theme-classes.mjs
 *
 * Guards against regressing to the old `.light` CSS class selector pattern.
 * All light-theme overrides must use [data-theme='light'] attribute selectors.
 *
 * Exits 1 (CI failure) if any `.light {` or `.light ` selectors are found.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Matches `.light` used as a CSS class selector at the start of a line
const FORBIDDEN = /^\s*\.light[\s{,]/m;

function findCssFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findCssFiles(full));
    } else if (extname(entry) === '.css') {
      results.push(full);
    }
  }
  return results;
}

const srcDir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');
const files = findCssFiles(srcDir);
let found = 0;

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  if (FORBIDDEN.test(content)) {
    console.error(`\x1b[31m✗ Forbidden .light selector found in: ${file}\x1b[0m`);
    console.error("  Use [data-theme='light'] instead.");
    found++;
  }
}

if (found > 0) {
  console.error(`\n${found} file(s) use forbidden .light class selectors.`);
  process.exit(1);
} else {
  console.log('\x1b[32m✓ No forbidden .light class selectors found.\x1b[0m');
}
