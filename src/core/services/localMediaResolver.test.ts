import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Asset, ProductionTake } from '@core/types';
const { getRecord } = vi.hoisted(() => ({ getRecord: vi.fn() }));
vi.mock('./mediaAssetService', () => ({ mediaAssetService: { getRecord } }));
import { localMediaResolver, resolveProductionReviewMedia } from './localMediaResolver';

afterEach(() => {
  delete window.electron;
  vi.restoreAllMocks();
  getRecord.mockReset();
});
describe('local media for explicit AI review', () => {
  it('reads registered native bytes including desktop aliases without a URL request', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const readDesktopMedia = vi
      .fn()
      .mockResolvedValue({ bytes, mimeType: 'video/mp4', localUrl: 'file:local' });
    window.electron = { readDesktopMedia } as unknown as NonNullable<typeof window.electron>;
    await expect(
      localMediaResolver.resolve({ storageKey: 'desktop:/registered/video' }),
    ).resolves.toMatchObject({ bytes, mimeType: 'video/mp4' });
    expect(readDesktopMedia).toHaveBeenCalledWith('desktop:/registered/video');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses retained IDB bytes after desktop copy loss', async () => {
    window.electron = {
      readDesktopMedia: vi.fn().mockRejectedValue(new Error('missing desktop')),
    } as unknown as NonNullable<typeof window.electron>;
    getRecord.mockResolvedValue({
      blob: new Blob(['video'], { type: 'video/mp4' }),
      mimeType: 'video/mp4',
    });
    const result = await localMediaResolver.resolve({ storageKey: 'media' });
    expect(new TextDecoder().decode(result.bytes)).toBe('video');
  });
  it('resolves inline references and fails instead of omitting a frozen reference', async () => {
    window.electron = {
      readDesktopMedia: vi
        .fn()
        .mockResolvedValue({ bytes: new Uint8Array([1]).buffer, mimeType: 'video/mp4' }),
    } as unknown as NonNullable<typeof window.electron>;
    const take = {
      localMediaKey: 'video',
      continuitySnapshot: { referenceAssetIds: ['ref'] },
    } as ProductionTake;
    const asset = { id: 'ref', type: 'image', data: 'aW1hZ2U=', mimeType: 'image/png' } as Asset;
    expect((await resolveProductionReviewMedia(take, [asset])).referenceImages).toEqual([
      { data: 'aW1hZ2U=', mimeType: 'image/png' },
    ]);
    await expect(resolveProductionReviewMedia(take, [])).rejects.toThrow('reference is missing');
  });
  it('never downloads a provider URL as a substitute for missing local video', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    await expect(
      localMediaResolver.resolve({ url: 'https://provider.example/result' }),
    ).rejects.toThrow('Readable local media');
    expect(fetch).not.toHaveBeenCalled();
  });
});
