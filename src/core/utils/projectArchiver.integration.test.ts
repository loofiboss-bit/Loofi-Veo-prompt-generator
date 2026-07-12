import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import type { Asset, Project } from '@core/types';
import { exportProjectToZip, importProjectFromZip } from './projectArchiver';

const project = {
  id: 'project-v7',
  name: 'Portable Project',
  futureExtension: { preserved: true },
} as unknown as Project;

const asset = {
  id: 'asset-1',
  type: 'image',
  name: 'Reference',
  url: 'blob:reference',
  data: btoa('image-bytes'),
  mimeType: 'image/png',
} as Asset;

const asFile = async (blob: Blob): Promise<File> =>
  new File([await blob.arrayBuffer()], 'project.loofi-project', { type: 'application/zip' });

describe('v8 .loofi-project bundle', () => {
  it('round-trips project, assets, provenance, catalog snapshot, and migration history', async () => {
    const blob = await exportProjectToZip(project, [asset], {
      migrationHistory: [{ from: '7', to: '8', migratedAt: 123 }],
    });
    const zip = await JSZip.loadAsync(blob);
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    expect(manifest).toMatchObject({
      format: 'loofi-project',
      schemaVersion: 8,
      pricingEffectiveDates: ['2026-07-11'],
      migrationHistory: [{ from: '7', to: '8', migratedAt: 123 }],
    });
    expect(manifest.modelCatalogSnapshot.length).toBeGreaterThanOrEqual(10);
    expect(manifest.checksums['project.json']).toMatch(/^[a-f0-9]{64}$/);

    const restored = await importProjectFromZip(await asFile(blob));
    expect(restored.project).toMatchObject({
      id: 'project-v7',
      futureExtension: { preserved: true },
    });
    expect(restored.assets[0]).toMatchObject({ id: 'asset-1', data: asset.data });
    expect(restored.migrationHistory).toEqual([{ from: '7', to: '8', migratedAt: 123 }]);
  });

  it.each([
    ['5.4.0', 'gemini-2.0-flash', 'quality', 'gemini-3.1-flash-lite'],
    ['6.2.0', 'gemini-3-pro-preview', 'fast', 'gemini-3.5-flash'],
    ['7.0.1', 'future-provider-model', undefined, 'future-provider-model'],
  ])(
    'migrates a representative v%s archive without dropping unknown fields',
    async (version, model, veoModel, resolvedModelId) => {
      const zip = new JSZip();
      zip.file(
        'project.json',
        JSON.stringify({
          version,
          timestamp: 1,
          project: {
            id: `project-v${version}`,
            name: 'Historical project',
            promptState: { model, veoModel, historicalPromptField: 'keep-me' },
            historicalRootField: { preserved: true },
            productionRuns: [{ schemaVersion: 1, id: 'run-1', futureRunField: 42 }],
          },
          assets: [],
        }),
      );
      const file = await asFile(await zip.generateAsync({ type: 'blob' }));
      const restored = await importProjectFromZip(file);
      expect(restored.project).toMatchObject({
        historicalRootField: { preserved: true },
        promptState: { historicalPromptField: 'keep-me' },
        modelPreference: { requestedModelId: model, resolvedModelId },
        productionRuns: [
          {
            schemaVersion: 2,
            provider: 'gemini-api',
            apiSurface: 'google-ai-v1beta',
            futureRunField: 42,
          },
        ],
      });
      expect(restored.migrationHistory?.[0]).toMatchObject({
        from: version.split('.')[0],
        to: '8',
      });
    },
  );

  it('rejects an asset modified after manifest creation', async () => {
    const zip = await JSZip.loadAsync(await exportProjectToZip(project, [asset]));
    zip.file('assets/asset-1.png', 'tampered');
    const corrupt = await zip.generateAsync({ type: 'blob' });
    await expect(importProjectFromZip(await asFile(corrupt))).rejects.toThrow(
      'checksum mismatch: assets/asset-1.png',
    );
  });
});
