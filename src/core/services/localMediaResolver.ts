import type { Asset, ProductionTake } from '@core/types';
import { mediaAssetService } from './mediaAssetService';

export interface LocalMediaInput {
  storageKey?: string;
  data?: string;
  mimeType?: string;
  url?: string;
}

/** Read registered local media only. A provider URL never authorizes a download. */
export const localMediaResolver = {
  async resolve(input: LocalMediaInput): Promise<{ bytes: ArrayBuffer; mimeType: string }> {
    if (input.storageKey) {
      let desktopError: unknown;
      try {
        const desktop = await window.electron?.readDesktopMedia?.(input.storageKey);
        if (desktop?.bytes.byteLength) return desktop;
      } catch (error) {
        desktopError = error;
      }
      try {
        const stored = await mediaAssetService.getRecord(input.storageKey);
        if (stored?.blob.size)
          return { bytes: await readBlob(stored.blob), mimeType: stored.mimeType };
      } catch (error) {
        desktopError ??= error;
      }
      if (
        desktopError &&
        !input.data &&
        !input.url?.startsWith('data:') &&
        !input.url?.startsWith('blob:')
      )
        throw desktopError;
    }
    const inline = input.data || (input.url?.startsWith('data:') ? input.url : undefined);
    if (inline) {
      const match = inline.match(/^data:([^;,]+);base64,(.*)$/s);
      const mimeType = match?.[1] ?? input.mimeType;
      if (!mimeType) throw new Error('Local media has no MIME type.');
      const decoded = atob(match?.[2] ?? inline);
      if (!decoded.length) throw new Error('Local media is empty.');
      return { bytes: Uint8Array.from(decoded, (value) => value.charCodeAt(0)).buffer, mimeType };
    }
    if (input.url?.startsWith('blob:')) {
      const response = await fetch(input.url);
      if (!response.ok) throw new Error('Local media could not be read.');
      const blob = await response.blob();
      if (blob.size)
        return { bytes: await readBlob(blob), mimeType: blob.type || input.mimeType || '' };
    }
    throw new Error('Readable local media is required. Relink or reimport this file.');
  },
};

const readBlob = (blob: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Local media could not be read.'));
    reader.readAsArrayBuffer(blob);
  });

const toInline = async (input: LocalMediaInput) => {
  const { bytes, mimeType } = await localMediaResolver.resolve(input);
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Local media could not be read.'));
    reader.readAsDataURL(new Blob([bytes], { type: mimeType }));
  });
  return { data, mimeType };
};

/** Resolve every frozen reference; missing references must not silently disappear. */
export async function resolveProductionReviewMedia(take: ProductionTake, assets: Asset[]) {
  const video = await toInline({ storageKey: take.localMediaKey, url: take.localMediaUrl });
  if (!video.mimeType.startsWith('video/')) throw new Error('Review requires a local video file.');
  const referenceImages = await Promise.all(
    (take.continuitySnapshot?.referenceAssetIds ?? []).map(async (id) => {
      const asset = assets.find((item) => item.id === id && item.type === 'image');
      if (!asset) throw new Error('A frozen review reference is missing.');
      const image = await toInline(asset);
      if (!image.mimeType.startsWith('image/'))
        throw new Error('Review reference is not an image.');
      return image;
    }),
  );
  return { video, referenceImages };
}
