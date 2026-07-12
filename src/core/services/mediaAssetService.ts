import { createStore, del, get, keys, set } from 'idb-keyval';

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

  async migrateToDesktop(options: { dryRun?: boolean } = {}): Promise<{
    discovered: number;
    migrated: number;
    deletedAfterVerification: number;
    failures: Array<{ key: string; message: string }>;
  }> {
    const bridge = window.electron?.importDesktopMedia;
    const storedKeys = (await keys(MEDIA_STORE)).filter(
      (key): key is string => typeof key === 'string',
    );
    const result = {
      discovered: storedKeys.length,
      migrated: 0,
      deletedAfterVerification: 0,
      failures: [] as Array<{ key: string; message: string }>,
    };
    if (options.dryRun || !bridge) return result;

    for (const key of storedKeys) {
      try {
        const record = await this.getRecord(key);
        if (!record) continue;
        const bytes = await record.blob.arrayBuffer();
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');
        const imported = await bridge({ key, bytes, mimeType: record.mimeType });
        if (imported.sha256 !== digest || imported.sizeBytes !== record.size) {
          throw new Error('Desktop copy checksum/readback did not match IndexedDB source.');
        }
        result.migrated += 1;
        await this.remove(key);
        result.deletedAfterVerification += 1;
      } catch (error) {
        result.failures.push({
          key,
          message: error instanceof Error ? error.message : 'Unknown media migration failure.',
        });
      }
    }
    logger.info('MediaAssetService', 'Desktop media migration completed', result);
    return result;
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
