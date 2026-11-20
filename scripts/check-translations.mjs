#!/usr/bin/env node
/**
 * check-translations.mjs
 * Validates 100% i18n key parity across all 17 namespaces and all 6 supported locales.
 *
 * Usage: node scripts/check-translations.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, '../src/core/locales');
const BASE_LANG = 'en';
const TARGET_LANGS = ['sv', 'es', 'fr', 'ja', 'ar'];

function collectLeafKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...collectLeafKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enDir = path.join(LOCALES_DIR, BASE_LANG);
const namespaceFiles = fs
  .readdirSync(enDir)
  .filter((file) => file.endsWith('.json'))
  .sort();

if (namespaceFiles.length !== 17) {
  console.error(`Expected 17 namespaces in ${BASE_LANG}, found ${namespaceFiles.length}.`);
  process.exit(1);
}

let failures = 0;

for (const lang of TARGET_LANGS) {
  const langDir = path.join(LOCALES_DIR, lang);
  let langMissing = 0;
  let langExtra = 0;

  for (const file of namespaceFiles) {
    const enJson = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf8'));
    const enKeys = new Set(collectLeafKeys(enJson));
    const targetPath = path.join(langDir, file);

    if (!fs.existsSync(targetPath)) {
      console.error(`✗ [${lang}] Missing namespace file: ${file} (${enKeys.size} keys)`);
      langMissing += enKeys.size;
      failures++;
      continue;
    }

    const targetJson = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    const targetKeys = new Set(collectLeafKeys(targetJson));

    const missing = [...enKeys].filter((k) => !targetKeys.has(k));
    const extra = [...targetKeys].filter((k) => !enKeys.has(k));

    if (missing.length > 0 || extra.length > 0) {
      failures++;
      langMissing += missing.length;
      langExtra += extra.length;
      console.error(
        `✗ [${lang}/${file}] missing=${missing.length} extra=${extra.length}` +
          (missing.length ? ` (e.g. ${missing.slice(0, 5).join(', ')})` : '') +
          (extra.length ? ` (extra: ${extra.slice(0, 5).join(', ')})` : ''),
      );
    }
  }

  if (langMissing === 0 && langExtra === 0) {
    console.log(
      `✓ [${lang}] All ${namespaceFiles.length} namespaces match ${BASE_LANG} (0 missing, 0 extra)`,
    );
  }
}

if (failures > 0) {
  console.error(`\ni18n parity check failed across ${failures} namespace check(s).`);
  process.exit(1);
}

console.log(
  `\nPASS: All ${TARGET_LANGS.length} locales x ${namespaceFiles.length} namespaces have 100% key parity.`,
);
