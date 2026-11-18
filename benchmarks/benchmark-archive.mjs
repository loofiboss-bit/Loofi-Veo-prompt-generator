import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import JSZip from 'jszip';
import { createServer } from 'vite';
import { measure, summary } from './measure.mjs';

const require = createRequire(import.meta.url);
const { writeStreamingZipArchive } = require('../electron/ipc/archive-ipc.cjs');

export async function runArchiveBenchmark({ runs = 5, payloadBytes = 8 * 1024 * 1024 } = {}) {
  const randomPayload = randomBytes(payloadBytes);
  const expectedSha256 = createHash('sha256').update(randomPayload).digest('hex');

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'loofi-bench-archive-'));
  const diskAssetPath = path.join(tmpRoot, 'incompressible-media.mp4');
  const outZipPath = path.join(tmpRoot, 'streamed.loofi-project');
  await fs.writeFile(diskAssetPath, randomPayload);

  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
  try {
    const { exportProjectToZip } = await server.ssrLoadModule('/src/core/utils/projectArchiver.ts');
    const blob = new Blob([randomPayload], { type: 'video/mp4' });
    const project = { id: 'benchmark', name: 'Benchmark archive' };
    const asset = {
      id: 'benchmark-media',
      type: 'video',
      name: 'Benchmark',
      url: 'blob:benchmark',
      mimeType: 'video/mp4',
      data: '',
    };
    const records = [];
    const streamingRecords = [];
    for (let index = 0; index < runs; index++) {
      let exported;
      const measured = await measure(async () => {
        exported = await exportProjectToZip(project, [asset], {
          resolveAssetBlob: async () => blob,
        });
        return { outputBytes: exported.size };
      });
      const zip = await JSZip.loadAsync(await exported.arrayBuffer());
      const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
      const media = await zip.file(manifest.assets[0].path).async('nodebuffer');
      assert.equal(createHash('sha256').update(media).digest('hex'), expectedSha256);
      assert.equal(manifest.assets[0].sha256, expectedSha256);
      records.push({ run: index + 1, ...measured });

      const streamedMeasured = await measure(async () =>
        writeStreamingZipArchive({
          destinationPath: outZipPath,
          entries: [
            { archivePath: 'assets/benchmark-media.mp4', filePath: diskAssetPath },
            { archivePath: 'project.json', data: JSON.stringify({ project }) },
            { archivePath: 'manifest.json', data: JSON.stringify(manifest) },
          ],
        }),
      );
      assert.equal(streamedMeasured.result.checksums['assets/benchmark-media.mp4'], expectedSha256);
      streamingRecords.push({ run: index + 1, ...streamedMeasured });
    }
    return {
      scenario:
        'Production exportProjectToZip + Main streaming ZIP with incompressible randomBytes',
      payloadBytes,
      payloadSha256: expectedSha256,
      records,
      medians: summary(records),
      streamingMain: {
        records: streamingRecords,
        medians: summary(streamingRecords),
      },
    };
  } finally {
    await server.close();
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
}
