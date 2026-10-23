import { describe, it, expect, vi } from 'vitest';
import { mediaAssetService } from '@core/services/mediaAssetService';

describe('EditorMediaPanel Import Performance Benchmark', () => {
  it('measures performance difference between sequential and parallel imports', async () => {
    // Mock importLocalFile to simulate I/O or async work (e.g. 20ms delay per file)
    const mockImportLocalFile = vi.spyOn(mediaAssetService, 'importLocalFile').mockImplementation(async (file: File) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        id: `mock-id-${file.name}`,
        storageKey: `key-${file.name}`,
        name: file.name,
        type: 'image',
        mimeType: file.type,
        data: '',
        url: 'blob:mock-url',
        groupId: 'group-1',
        version: 1,
        tags: [],
      };
    });

    const mockPrepareProxy = vi.spyOn(mediaAssetService, 'prepareDesktopProxy').mockImplementation(async (asset) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { ...asset, proxyUrl: 'proxy-url', isProxyReady: true };
    });

    const fileCount = 10;
    const files = Array.from({ length: fileCount }, (_, i) => new File(['content'], `file-${i}.png`, { type: 'image/png' }));

    // Sequential execution (baseline)
    const seqStart = performance.now();
    const importedSeq = [];
    for (const file of files) {
      importedSeq.push(await mediaAssetService.importLocalFile(file));
    }
    for (const asset of importedSeq) {
      await mediaAssetService.prepareDesktopProxy(asset);
    }
    const seqDuration = performance.now() - seqStart;

    // Parallel execution (optimized)
    const parStart = performance.now();
    const importedPar = await Promise.all(files.map((file) => mediaAssetService.importLocalFile(file)));
    await Promise.all(
      importedPar.map(async (asset) => {
        try {
          const prepared = await mediaAssetService.prepareDesktopProxy(asset);
          return prepared;
        } catch {
          return asset;
        }
      })
    );
    const parDuration = performance.now() - parStart;

    console.log(`[BENCHMARK] Sequential Import (${fileCount} files): ${seqDuration.toFixed(2)} ms`);
    console.log(`[BENCHMARK] Parallel Import (${fileCount} files): ${parDuration.toFixed(2)} ms`);
    console.log(`[BENCHMARK] Speedup: ${(seqDuration / parDuration).toFixed(2)}x`);

    expect(parDuration).toBeLessThan(seqDuration);

    mockImportLocalFile.mockRestore();
    mockPrepareProxy.mockRestore();
  });
});
