import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { createServer } from 'vite';
import { measure, summary } from './measure.mjs';

export async function runArchiveBenchmark({ runs = 5, payloadBytes = 8 * 1024 * 1024 } = {}) {
  // Vite resolves the production TypeScript path aliases and import.meta.env.
  // Module loading is deliberately outside the measurement.
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
  try {
    const { exportProjectToZip } = await server.ssrLoadModule('/src/core/utils/projectArchiver.ts');
    const blob = new Blob([Buffer.alloc(payloadBytes, 0x42)], { type: 'video/mp4' });
    const expectedSha256 = createHash('sha256')
      .update(Buffer.alloc(payloadBytes, 0x42))
      .digest('hex');
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
    }
    return {
      scenario: 'Production exportProjectToZip with binary resolveAssetBlob',
      payloadBytes,
      payloadSha256: expectedSha256,
      limitations:
        'Highly compressible deterministic bytes; this measures the binary project export path under Node/Vite SSR, not browser rendering, IndexedDB access or typical compressed video throughput.',
      records,
      medians: summary(records),
    };
  } finally {
    await server.close();
  }
}
