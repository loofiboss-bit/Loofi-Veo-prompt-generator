import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../src/core/locales/', import.meta.url));
function leaves(value, prefix = '', result = new Map()) {
  for (const [key, item] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === 'object') leaves(item, name, result);
    else result.set(name, item);
  }
  return result;
}
const read = (language, namespace) =>
  leaves(JSON.parse(readFileSync(path.join(root, language, `${namespace}.json`), 'utf8')));
const tokens = (value) =>
  [...String(value).matchAll(/{{\s*([\w.-]+)\s*}}/g)]
    .map((match) => match[1])
    .sort()
    .join(',');
const errors = [];
function compare(language, namespace) {
  const english = read('en', namespace);
  const translated = read(language, namespace);
  for (const [key, value] of english) {
    const text = translated.get(key);
    if (typeof text !== 'string' || !text.trim())
      errors.push(`${language}/${namespace}: missing ${key}`);
    else if (tokens(value) !== tokens(text))
      errors.push(`${language}/${namespace}: interpolation mismatch at ${key}`);
  }
  for (const key of translated.keys())
    if (!english.has(key)) errors.push(`${language}/${namespace}: unknown ${key}`);
}
for (const language of ['sv', 'es', 'fr', 'ja', 'ar']) compare(language, 'creator');
const sharedCreatorKeys = [
  'closeModal',
  ...[
    'saveUnsaved',
    'saveSaving',
    'saveSaved',
    'saveError',
    'saveConflict',
    'saveNow',
    'remoteChange',
    'loadLatest',
    'saveCopy',
    'backupWarning',
    'allChangesSaved',
    'checkingSave',
    'saveStatusUnknown',
  ].map((key) => `projects.${key}`),
  ...[
    'filterAll',
    'filterVideo',
    'filterAudio',
    'filterImage',
    'filterReference',
    'filterGenerated',
    'filters',
  ].map((key) => `media.${key}`),
  ...['splitPlayhead', 'trimStart', 'trimEnd', 'remove'].map((key) => `timeline.${key}`),
];
const englishCommon = read('en', 'common');
for (const language of ['sv', 'es', 'fr', 'ja', 'ar']) {
  const translated = read(language, 'common');
  for (const key of sharedCreatorKeys) {
    const source = englishCommon.get(key);
    const value = translated.get(key);
    if (typeof source !== 'string' || typeof value !== 'string' || !value.trim())
      errors.push(`${language}/common: missing ${key}`);
    else if (tokens(source) !== tokens(value))
      errors.push(`${language}/common: interpolation mismatch at ${key}`);
  }
}
for (const namespace of [
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
  'optimization',
  'create',
  'studio',
])
  compare('sv', namespace);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Creator translations and complete Swedish resources verified.');
