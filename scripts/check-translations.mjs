#!/usr/bin/env node
/**
 * Translation Coverage Checker
 * Compares each language's JSON namespace files against EN (reference).
 * Reports missing keys per namespace/language.
 *
 * Usage: node scripts/check-translations.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '..', 'public', 'locales');

const NAMESPACES = [
  'common',
  'prompt',
  'history',
  'templates',
  'studios',
  'wizard',
  'tutorial',
  'tooltips',
  'errors',
  'project',
  'search',
  'settings',
  'toasts',
];

const LANGUAGES = ['es', 'fr', 'ja'];

/**
 * Recursively collect all leaf-level key paths from a JSON object.
 * @param {Record<string, unknown>} obj
 * @param {string} prefix
 * @returns {string[]}
 */
function getKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getKeys(/** @type {Record<string, unknown>} */ (value), path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

/**
 * Load and parse a JSON file, returning an empty object if missing.
 * @param {string} filePath
 * @returns {Record<string, unknown>}
 */
function loadJSON(filePath) {
  if (!existsSync(filePath)) return {};
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    console.error(`  ⚠ Failed to parse: ${filePath}`);
    return {};
  }
}

let totalMissing = 0;
let totalKeys = 0;

console.log('Translation Coverage Report');
console.log('===========================\n');

for (const ns of NAMESPACES) {
  const enFile = join(LOCALES_DIR, 'en', `${ns}.json`);
  const enData = loadJSON(enFile);
  const enKeys = getKeys(enData);
  totalKeys += enKeys.length;

  for (const lang of LANGUAGES) {
    const langFile = join(LOCALES_DIR, lang, `${ns}.json`);
    const langData = loadJSON(langFile);
    const langKeys = new Set(getKeys(langData));

    const missing = enKeys.filter((k) => !langKeys.has(k));

    if (missing.length > 0) {
      totalMissing += missing.length;
      console.log(`[${lang}/${ns}] Missing ${missing.length}/${enKeys.length} keys:`);
      for (const key of missing.slice(0, 10)) {
        console.log(`  - ${key}`);
      }
      if (missing.length > 10) {
        console.log(`  ... and ${missing.length - 10} more`);
      }
      console.log();
    }
  }
}

console.log('---');
console.log(`Total EN keys (across all namespaces): ${totalKeys}`);
console.log(`Total missing translations: ${totalMissing}`);
console.log(
  `Coverage: ${totalKeys > 0 ? (((totalKeys * LANGUAGES.length - totalMissing) / (totalKeys * LANGUAGES.length)) * 100).toFixed(1) : 100}%`,
);

if (totalMissing > 0) {
  console.log('\nRun translations for missing keys to reach full coverage.');
}
