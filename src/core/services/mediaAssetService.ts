import { createStore, del, get, set } from 'idb-keyval';

import { logger } from '@core/services/loggerService';
import { appendApiKeyToMediaUrl } from '@core/utils/mediaUrlAuth';

const MEDIA_STORE = createStore('veo-generated-media', 'generated-media-v1');

export interface StoredMediaRecord {
  key: string;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: number;
  providerUri?: string;
  providerExpiresAt?: number;
}

class MediaAssetService {
  private static instance: MediaAssetService;
  private objectUrls = new Map<string, string>();

  static getInstance(): MediaAssetService {
    if (!MediaAssetService.instance) {
      MediaAssetService.instance = new MediaAssetService();
    }
    return MediaAssetService.instance;
  }

  async storeBlob(
    key: string,
    blob: Blob,
    provenance: Pick<StoredMediaRecord, 'providerUri' | 'providerExpiresAt'> = {},
  ): Promise<StoredMediaRecord> {
    const record: StoredMediaRecord = {
      key,
      blob,
      mimeType: blob.type || 'video/mp4',
      size: blob.size,
      createdAt: Date.now(),
      ...provenance,
    };
    await set(key, record, MEDIA_STORE);
    return record;
  }

  async cacheRemoteMedia(input: {
    key: string;
    url: string;
    apiKey?: string | null;
    providerExpiresAt?: number;
  }): Promise<StoredMediaRecord> {
    const authenticatedUrl = appendApiKeyToMediaUrl(input.url, input.apiKey ?? null) ?? input.url;
    const response = await fetch(authenticatedUrl);
    if (!response.ok) {
      throw new Error(`Media download failed with status ${response.status}.`);
    }
    const blob = await response.blob();
    return this.storeBlob(input.key, blob, {
      providerUri: input.url,
      providerExpiresAt: input.providerExpiresAt,
    });
  }

  async getRecord(key: string): Promise<StoredMediaRecord | null> {
    return (await get<StoredMediaRecord>(key, MEDIA_STORE)) ?? null;
  }

  async getObjectUrl(key: string): Promise<string | null> {
    const existing = this.objectUrls.get(key);
    if (existing) {
      return existing;
    }
    const record = await this.getRecord(key);
    if (!record) {
      return null;
    }
    const url = URL.createObjectURL(record.blob);
    this.objectUrls.set(key, url);
    return url;
  }

  async remove(key: string): Promise<void> {
    this.revokeObjectUrl(key);
    await del(key, MEDIA_STORE);
  }

  revokeObjectUrl(key: string): void {
    const url = this.objectUrls.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(key);
    }
  }

  revokeAllObjectUrls(): void {
    for (const key of this.objectUrls.keys()) {
      this.revokeObjectUrl(key);
    }
    logger.info('MediaAssetService', 'Revoked generated media object URLs');
  }
}

export const mediaAssetService = MediaAssetService.getInstance();
