import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopMediaStore } from '../electron/media-store.cjs';
import { measure, summary } from './measure.mjs';

export async function runMediaBenchmark({ runs = 5, payloadBytes = 40 * 1024 * 1024 } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-benchmark-media-'));
  const payload = Buffer.alloc(payloadBytes, 0x42);
  const expectedSha256 = createHash('sha256').update(payload).digest('hex');
  const records = [];
  try {
    const store = new DesktopMediaStore(directory);
    for (let index = 0; index < runs; index++) {
      const imported = await measure(async () => {
        const record = await store.importBytes({ key: `benchmark-${index}`, bytes: payload });
        assert.equal(record.sha256, expectedSha256);
        return { key: record.key, sha256: record.sha256, sizeBytes: record.sizeBytes };
      });
      const resolved = await measure(async () => {
        const record = await store.resolve(imported.result.key);
        assert.equal(record.sha256, expectedSha256);
        return { sha256: record.sha256, sizeBytes: record.sizeBytes };
      });
      records.push({ run: index + 1, importBytes: imported, resolve: resolved });
    }
    return {
      scenario:
        'DesktopMediaStore.importBytes and resolve (including production checksum readback)',
      payloadBytes,
      records,
      medians: {
        importBytes: summary(records.map((r) => r.importBytes)),
        resolve: summary(records.map((r) => r.resolve)),
      },
    };
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
