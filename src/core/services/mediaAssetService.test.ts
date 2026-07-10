import { beforeEach, describe, expect, it, vi } from 'vitest';

const records = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'media-store'),
  get: vi.fn(async (key: string) => records.get(key)),
  set: vi.fn(async (key: string, value: unknown) => records.set(key, value)),
  del: vi.fn(async (key: string) => records.delete(key)),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { mediaAssetService } from './mediaAssetService';

describe('mediaAssetService', () => {
  beforeEach(() => {
    records.clear();
    vi.restoreAllMocks();
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
