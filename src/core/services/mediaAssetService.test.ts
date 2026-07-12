import { beforeEach, describe, expect, it, vi } from 'vitest';

const records = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'media-store'),
  get: vi.fn(async (key: string) => records.get(key)),
  set: vi.fn(async (key: string, value: unknown) => records.set(key, value)),
  del: vi.fn(async (key: string) => records.delete(key)),
  keys: vi.fn(async () => [...records.keys()]),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { mediaAssetService } from './mediaAssetService';

describe('mediaAssetService', () => {
  beforeEach(() => {
    records.clear();
    delete window.electron;
    vi.restoreAllMocks();
  });

  it('dry-runs legacy media migration without copying or deleting', async () => {
    await mediaAssetService.storeBlob('legacy-dry', new Blob(['video'], { type: 'video/mp4' }));
    const result = await mediaAssetService.migrateToDesktop({ dryRun: true });
    expect(result).toMatchObject({ discovered: 1, migrated: 0, deletedAfterVerification: 0 });
    expect(await mediaAssetService.getRecord('legacy-dry')).not.toBeNull();
  });

  it('deletes an IndexedDB Blob only after desktop checksum verification', async () => {
    const blob = new Blob(['verified-video'], { type: 'video/mp4' });
    await mediaAssetService.storeBlob('legacy-verified', blob);
    const bytes = await blob.arrayBuffer();
    const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    window.electron = {
      importDesktopMedia: vi.fn(async () => ({
        key: 'legacy-verified',
        path: '/projects/media/video.mp4',
        localUrl: 'file:///projects/media/video.mp4',
        sha256,
        sizeBytes: blob.size,
        migratedFrom: 'indexeddb-v1' as const,
      })),
    } as unknown as NonNullable<typeof window.electron>;
    const result = await mediaAssetService.migrateToDesktop();
    expect(result).toMatchObject({ discovered: 1, migrated: 1, deletedAfterVerification: 1 });
    expect(await mediaAssetService.getRecord('legacy-verified')).toBeNull();
  });

  it('keeps the source Blob when desktop verification does not match', async () => {
    const blob = new Blob(['keep-me'], { type: 'video/mp4' });
    await mediaAssetService.storeBlob('legacy-mismatch', blob);
    window.electron = {
      importDesktopMedia: vi.fn(async () => ({
        key: 'legacy-mismatch',
        path: '/projects/media/video.mp4',
        localUrl: 'file:///projects/media/video.mp4',
        sha256: 'wrong',
        sizeBytes: blob.size,
        migratedFrom: 'indexeddb-v1' as const,
      })),
    } as unknown as NonNullable<typeof window.electron>;
    const result = await mediaAssetService.migrateToDesktop();
    expect(result.failures).toHaveLength(1);
    expect(await mediaAssetService.getRecord('legacy-mismatch')).not.toBeNull();
  });

  it('stores and restores Blob media records', async () => {
    const blob = new Blob(['video'], { type: 'video/mp4' });
    await mediaAssetService.storeBlob('media-1', blob);
    const record = await mediaAssetService.getRecord('media-1');

    expect(record?.blob).toBe(blob);
    expect(record?.size).toBe(blob.size);
  });

  it('downloads provider media with authenticated URL and stores it', async () => {
    const blob = new Blob(['video'], { type: 'video/mp4' });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      blob: vi.fn().mockResolvedValue(blob),
    } as unknown as Response);

    const record = await mediaAssetService.cacheRemoteMedia({
      key: 'media-2',
      url: 'https://example.com/video.mp4',
      apiKey: 'secret',
    });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('key=secret'));
    expect(record.providerUri).toBe('https://example.com/video.mp4');
  });

  it('throws when provider media cannot be downloaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);
    await expect(
      mediaAssetService.cacheRemoteMedia({ key: 'media-3', url: 'https://example.com/video.mp4' }),
    ).rejects.toThrow('status 403');
  });
});
