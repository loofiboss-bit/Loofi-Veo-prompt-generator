import { createStore, get, set, del } from 'idb-keyval';
import { Asset } from '@core/types';
import { logger } from '@core/services/loggerService';

const STORAGE_OPERATION_TIMEOUT_MS = 5000;

function hasIndexedDbSupport(): boolean {
  return typeof indexedDB !== 'undefined';
}

// Define two separate stores:
// 1. For the lightweight application state (JSON)
const stateStore = createStore('veo-db', 'app-state');
// 2. For heavy binary assets (Base64 strings)
const assetStore = createStore('veo-db', 'assets');

async function withStorageTimeout<T>(
  operation: string,
  callback: () => Promise<T>,
  timeoutMs: number = STORAGE_OPERATION_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      callback(),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`IndexedDB ${operation} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Strips heavy assets from the application state and saves them to the 'assets' store.
 * Returns a lightweight version of the state.
 */
const dehydrateAssets = async (
  fullState: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const clone = JSON.parse(JSON.stringify(fullState));

  // 1. Handle Global Asset Library
  if (clone.assets && Array.isArray(clone.assets)) {
    const lightweightAssets: Asset[] = [];

    for (const asset of clone.assets) {
      if (asset.data) {
        // Save the heavy data to the asset store using the asset ID as key
        await withStorageTimeout(`write asset ${asset.id}`, () =>
          set(asset.id, asset.data, assetStore),
        );

        // Create a lightweight reference
        lightweightAssets.push({
          ...asset,
          data: '', // Strip data from main state
        });
      } else {
        lightweightAssets.push(asset);
      }
    }
    clone.assets = lightweightAssets;
  }

  // 2. Handle PromptState Uploads (Image)
  if (clone.promptState?.uploadedImage?.data) {
    const imgKey = 'prompt_uploaded_image';
    await withStorageTimeout('write uploaded image', () =>
      set(imgKey, clone.promptState.uploadedImage.data, assetStore),
    );
    clone.promptState.uploadedImage.data = 'STORED_IN_IDB';
  }

  // 3. Handle PromptState Uploads (Audio)
  if (clone.promptState?.uploadedAudio?.data) {
    const audKey = 'prompt_uploaded_audio';
    await withStorageTimeout('write uploaded audio', () =>
      set(audKey, clone.promptState.uploadedAudio.data, assetStore),
    );
    clone.promptState.uploadedAudio.data = 'STORED_IN_IDB';
  }

  return clone;
};

/**
 * Reattaches heavy assets from the 'assets' store back into the application state.
 */
interface PromptStateAssets {
  uploadedImage?: { data: string; mimeType: string } | null;
  uploadedAudio?: { data: string; mimeType: string; name: string } | null;
}

const rehydrateAssets = async (
  lightweightState: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> => {
  if (!lightweightState) return lightweightState;

  const state: Record<string, unknown> = { ...lightweightState };

  // 1. Rehydrate Global Asset Library
  if (state.assets && Array.isArray(state.assets)) {
    const fullAssets: Asset[] = [];
    // We load assets in parallel for speed
    const promises = state.assets.map(async (asset: Asset) => {
      if (asset.data === '') {
        try {
          const data = await withStorageTimeout(`read asset ${asset.id}`, () =>
            get(asset.id, assetStore),
          );
          return { ...asset, data: data || '' };
        } catch (e) {
          logger.error(`Failed to rehydrate asset ${asset.id}`, e);
          return asset;
        }
      }
      return asset;
    });

    fullAssets.push(...(await Promise.all(promises)));
    state.assets = fullAssets;
  }

  // 2. Rehydrate PromptState Image
  const promptAssets = state.promptState as PromptStateAssets | undefined;
  if (promptAssets?.uploadedImage?.data === 'STORED_IN_IDB') {
    const data = await withStorageTimeout('read uploaded image', () =>
      get('prompt_uploaded_image', assetStore),
    );
    if (data) {
      promptAssets.uploadedImage!.data = data;
    } else {
      promptAssets.uploadedImage = null;
    }
  }

  // 3. Rehydrate PromptState Audio
  if (promptAssets?.uploadedAudio?.data === 'STORED_IN_IDB') {
    const data = await withStorageTimeout('read uploaded audio', () =>
      get('prompt_uploaded_audio', assetStore),
    );
    if (data) {
      promptAssets.uploadedAudio!.data = data;
    } else {
      promptAssets.uploadedAudio = null;
    }
  }

  return state;
};

/**
 * Main Storage Interface compatible with Zustand Persist
 */
export const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!hasIndexedDbSupport()) {
      return null;
    }

    try {
      const value = await withStorageTimeout(`read state key ${name}`, () => get(name, stateStore));
      if (!value) return null;

      // Deserialize and rehydrate
      const parsed = JSON.parse(value);
      const rehydrated = await rehydrateAssets(parsed);
      // Zustand expects a string for the full state object in JSON storage mode
      // We return the rehydrated object stringified, so Zustand parses it again.
      // It's a double parse but ensures compatibility with the standard
      // createJSONStorage flow.
      return JSON.stringify(rehydrated);
    } catch (e) {
      logger.error('Storage load failed', e);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    if (!hasIndexedDbSupport()) {
      return;
    }

    try {
      const parsed = JSON.parse(value);
      // Dehydrate (move large blobs to separate store)
      const lightweight = await dehydrateAssets(parsed);
      // Save lightweight state
      await withStorageTimeout(`write state key ${name}`, () =>
        set(name, JSON.stringify(lightweight), stateStore),
      );
    } catch (e) {
      logger.error('Storage save failed', e);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    if (!hasIndexedDbSupport()) {
      return;
    }

    try {
      await withStorageTimeout(`delete state key ${name}`, () => del(name, stateStore));
      // Note: We don't automatically delete assets here as they might be shared
      // or simply orphaned.
      // A garbage collection routine could be implemented separately.
    } catch (e) {
      logger.error('Storage delete failed', e);
    }
  },
};
