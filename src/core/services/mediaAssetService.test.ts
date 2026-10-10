import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  afterEach(() => vi.useRealTimers());
  const verifiedDesktop = () => ({
    importDesktopMedia: vi.fn(async ({ key, bytes }: { key: string; bytes: ArrayBuffer }) => ({
      key,
      localUrl: 'file:///projects/original.mp4',
      sizeBytes: bytes.byteLength,
      sha256: [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join(''),
    })),
    inspectTimelineRenderMedia: vi
      .fn()
      .mockResolvedValue({ available: true, durationSeconds: 12, streamTypes: ['video'] }),
  });
  const browserMetadata = (event: 'loadedmetadata' | 'error') => {
    const create = document.createElement.bind(document);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = create(tagName);
      if (tagName === 'video' || tagName === 'audio') {
        Object.defineProperty(element, 'duration', { value: 3 });
        queueMicrotask(() => element.dispatchEvent(new Event(event)));
      }
      return element;
    });
  };
  beforeEach(() => {
    mediaAssetService.revokeAllObjectUrls();
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

  it('imports images durably without placing base64 data in the asset', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-image');
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    const asset = await mediaAssetService.importLocalFile(file);
    expect(asset).toMatchObject({
      type: 'image',
      data: '',
      name: 'photo.png',
      url: 'blob:local-image',
    });
    expect((await mediaAssetService.getRecord(asset.storageKey!))?.blob).toBe(file);
  });
  it('rejects empty and unsupported files before registering an asset', async () => {
    await expect(
      mediaAssetService.importLocalFile(new File([], 'empty.mp4', { type: 'video/mp4' })),
    ).rejects.toThrow('non-empty');
    await expect(
      mediaAssetService.importLocalFile(new File(['x'], 'file.txt', { type: 'text/plain' })),
    ).rejects.toThrow('non-empty');
    expect(records.size).toBe(0);
  });
  it('rejects an unverified desktop import instead of exposing media', async () => {
    window.electron = {
      importDesktopMedia: vi.fn().mockResolvedValue({ sha256: 'wrong', sizeBytes: 1 }),
    } as unknown as NonNullable<typeof window.electron>;
    await expect(
      mediaAssetService.importLocalFile(new File(['image'], 'photo.png', { type: 'image/png' })),
    ).rejects.toThrow('did not match');
  });

  it('imports verified desktop video with native duration and original identity', async () => {
    const bridge = verifiedDesktop();
    window.electron = bridge as unknown as NonNullable<typeof window.electron>;
    const asset = await mediaAssetService.importLocalFile(
      new File(['video'], 'source.mp4', { type: 'video/mp4' }),
    );
    expect(asset).toMatchObject({
      durationSeconds: 12,
      data: '',
      url: 'file:///projects/original.mp4',
    });
    expect(asset.storageKey).toBe(asset.id);
    expect(bridge.inspectTimelineRenderMedia).toHaveBeenCalledWith(asset.id);
  });
  it.each([
    [{ available: false }, 'decoded'],
    [{ available: true, streamTypes: ['audio'], durationSeconds: 12 }, 'video stream'],
    [{ available: true, streamTypes: ['video'], durationSeconds: 0 }, 'valid duration'],
  ])('rejects invalid native metadata before exposing an asset', async (metadata, message) => {
    const bridge = verifiedDesktop();
    bridge.inspectTimelineRenderMedia.mockResolvedValue(metadata);
    window.electron = bridge as unknown as NonNullable<typeof window.electron>;
    await expect(
      mediaAssetService.importLocalFile(new File(['video'], 'source.mp4', { type: 'video/mp4' })),
    ).rejects.toThrow(message);
  });
  it.each(['audio', 'video'] as const)(
    'reads durable browser %s duration without retaining base64',
    async (type) => {
      browserMetadata('loadedmetadata');
      const asset = await mediaAssetService.importLocalFile(
        new File(['media'], 'source', { type: `${type}/mp4` }),
      );
      expect(asset).toMatchObject({ type, durationSeconds: 3, data: '' });
      expect(await mediaAssetService.getRecord(asset.storageKey!)).not.toBeNull();
    },
  );
  it('rejects browser decode errors', async () => {
    browserMetadata('error');
    await expect(
      mediaAssetService.importLocalFile(
        new File(['broken'], 'broken.webm', { type: 'video/webm' }),
      ),
    ).rejects.toThrow('decoded');
  });
  it('bounds a browser metadata read that never completes', async () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const failure = expect(
      mediaAssetService.importLocalFile(new File(['media'], 'source.webm', { type: 'video/webm' })),
    ).rejects.toThrow('metadata');
    await vi.advanceTimersByTimeAsync(15_001);
    await failure;
  });
  it('uses a desktop editing proxy while preserving the original for export', async () => {
    window.electron = {
      createDesktopMediaProxy: vi.fn().mockResolvedValue({ url: 'file:///projects/proxy.mp4' }),
    } as unknown as NonNullable<typeof window.electron>;
    const original = {
      id: 'original',
      type: 'video',
      url: 'file:///projects/original.mp4',
      storageKey: 'original',
    } as import('@core/types').Asset;
    const prepared = await mediaAssetService.prepareDesktopProxy(original);
    expect(prepared).toMatchObject({
      url: original.url,
      storageKey: original.storageKey,
      proxyUrl: 'file:///projects/proxy.mp4',
      isProxyReady: true,
    });
    expect(original.proxyUrl).toBeUndefined();
    expect(
      await mediaAssetService.prepareDesktopProxy({ ...original, type: 'image' }),
    ).toMatchObject({ url: original.url });
    expect(
      await mediaAssetService.prepareDesktopProxy({ ...original, storageKey: undefined }),
    ).toMatchObject({ url: original.url });
    delete window.electron;
    expect(await mediaAssetService.prepareDesktopProxy(original)).toBe(original);
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

  it('caches object URLs and revokes them on removal', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:media-4');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    await mediaAssetService.storeBlob('media-4', new Blob(['video'], { type: 'video/mp4' }));
    expect(await mediaAssetService.getObjectUrl('media-4')).toBe('blob:media-4');
    expect(await mediaAssetService.getObjectUrl('media-4')).toBe('blob:media-4');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    await mediaAssetService.remove('media-4');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:media-4');
  });

  it('returns null for an unknown object URL and can revoke all cached URLs', async () => {
    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    expect(await mediaAssetService.getObjectUrl('missing')).toBeNull();
    await mediaAssetService.storeBlob('first', new Blob(['1']));
    await mediaAssetService.storeBlob('second', new Blob(['2']));
    await mediaAssetService.getObjectUrl('first');
    await mediaAssetService.getObjectUrl('second');
    mediaAssetService.revokeAllObjectUrls();
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
