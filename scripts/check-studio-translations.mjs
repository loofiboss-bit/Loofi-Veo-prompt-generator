import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core', 'locales');
const flatten = (object, prefix = '', result = new Map()) => {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, result);
    else result.set(path, String(value));
  }
  return result;
};
const load = (language) =>
  flatten(JSON.parse(readFileSync(join(root, language, 'studio.json'), 'utf8')));
const tokens = (value) =>
  [...value.matchAll(/{{\s*([\w.-]+)\s*}}/g)]
    .map((match) => match[1])
    .sort()
    .join(',');
const english = load('en');
const errors = [];
for (const language of ['es', 'fr', 'ja', 'ar']) {
  const translated = load(language);
  for (const [key, value] of english) {
    if (!translated.get(key)) errors.push(`${language}: missing ${key}`);
    else if (tokens(value) !== tokens(translated.get(key)))
      errors.push(`${language}: placeholder mismatch at ${key}`);
  }
  for (const key of translated.keys())
    if (!english.has(key)) errors.push(`${language}: unknown ${key}`);
}
if (errors.length) {
  console.error(`Studio translation gate failed:\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`Studio translation gate passed (${english.size} keys x 5 languages).`);
