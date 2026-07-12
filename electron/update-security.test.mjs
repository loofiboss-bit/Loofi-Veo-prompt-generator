import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  checksumFromManifest,
  sha256File,
  validateReleaseAssetUrl,
} = require('./update-security.cjs');

test('only accepts assets from the canonical GitHub release channel', () => {
  const accepted = validateReleaseAssetUrl(
    'https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/download/v8.0.0/Loofi-8.0.0.AppImage',
  );
  assert.equal(accepted.fileName, 'Loofi-8.0.0.AppImage');
  assert.throws(() => validateReleaseAssetUrl('https://example.com/Loofi-8.0.0.AppImage'));
  assert.throws(() =>
    validateReleaseAssetUrl('https://github.com/other/repo/releases/download/v8/evil.exe'),
  );
  assert.throws(() =>
    validateReleaseAssetUrl(
      'https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/download/v8/payload.sh',
    ),
  );
});

test('parses exact checksum entries and verifies files', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'veo-update-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'update.exe');
  await fs.writeFile(filePath, 'trusted artifact');
  const hash = await sha256File(filePath);
  assert.equal(checksumFromManifest(`${hash}  update.exe\n`, 'update.exe'), hash);
  assert.throws(() => checksumFromManifest(`${hash}  other.exe\n`, 'update.exe'));
});
