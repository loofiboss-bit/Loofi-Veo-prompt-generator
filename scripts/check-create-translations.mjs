#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localeRoot = join(root, 'src', 'core', 'locales');
const languages = ['es', 'fr', 'ja', 'ar'];
const allowedIdentical = new Set(['brand', 'controls.mode']);

const flatten = (value, prefix = '', result = new Map()) => {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, result);
    else result.set(path, String(child));
  }
  return result;
};

const placeholders = (value) =>
  [...value.matchAll(/{{\s*([\w.-]+)\s*}}/g)].map((match) => match[1]).sort();
const load = (language) =>
  flatten(JSON.parse(readFileSync(join(localeRoot, language, 'create.json'), 'utf8')));

const english = load('en');
const failures = [];
for (const language of languages) {
  const translated = load(language);
  for (const [key, englishValue] of english) {
    const value = translated.get(key);
    if (!value) {
      failures.push(`${language}: missing ${key}`);
      continue;
    }
    if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(englishValue))) {
      failures.push(`${language}: placeholder mismatch at ${key}`);
    }
    if (value === englishValue && !allowedIdentical.has(key)) {
      failures.push(`${language}: untranslated English value at ${key}`);
    }
  }
}

if (failures.length) {
  console.error(
    `Create translation gate failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(
  `Create translation gate passed (${english.size} keys × ${languages.length + 1} languages).`,
);
