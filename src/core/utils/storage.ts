import { createStore, get, set, del } from 'idb-keyval';
import { Asset } from '@core/types';
import { logger } from '@core/services/loggerService';

// Define two separate stores:
// 1. For the lightweight application state (JSON)
const stateStore = createStore('veo-db', 'app-state');
// 2. For heavy binary assets (Base64 strings)
const assetStore = createStore('veo-db', 'assets');

/**
 * Strips heavy assets from the application state and saves them to the 'assets' store.
 * Returns a lightweight version of the state.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dehydrateAssets = async (fullState: any): Promise<any> => {
  const clone = JSON.parse(JSON.stringify(fullState));

  // 1. Handle Global Asset Library
  if (clone.assets && Array.isArray(clone.assets)) {
    const lightweightAssets: Asset[] = [];

    for (const asset of clone.assets) {
      if (asset.data) {
        // Save the heavy data to the asset store using the asset ID as key
        await set(asset.id, asset.data, assetStore);

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
    await set(imgKey, clone.promptState.uploadedImage.data, assetStore);
    clone.promptState.uploadedImage.data = 'STORED_IN_IDB';
  }

  // 3. Handle PromptState Uploads (Audio)
  if (clone.promptState?.uploadedAudio?.data) {
    const audKey = 'prompt_uploaded_audio';
    await set(audKey, clone.promptState.uploadedAudio.data, assetStore);
    clone.promptState.uploadedAudio.data = 'STORED_IN_IDB';
  }

  return clone;
};

/**
 * Reattaches heavy assets from the 'assets' store back into the application state.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rehydrateAssets = async (lightweightState: any): Promise<any> => {
  if (!lightweightState) return lightweightState;

  const state = { ...lightweightState };

  // 1. Rehydrate Global Asset Library
  if (state.assets && Array.isArray(state.assets)) {
    const fullAssets: Asset[] = [];
    // We load assets in parallel for speed
    const promises = state.assets.map(async (asset: Asset) => {
      if (asset.data === '') {
        try {
          const data = await get(asset.id, assetStore);
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
  if (state.promptState?.uploadedImage?.data === 'STORED_IN_IDB') {
    const data = await get('prompt_uploaded_image', assetStore);
    if (data) state.promptState.uploadedImage.data = data;
    else state.promptState.uploadedImage = null; // Clean up if missing
  }

  // 3. Rehydrate PromptState Audio
  if (state.promptState?.uploadedAudio?.data === 'STORED_IN_IDB') {
    const data = await get('prompt_uploaded_audio', assetStore);
    if (data) state.promptState.uploadedAudio.data = data;
    else state.promptState.uploadedAudio = null;
  }

  return state;
};

/**
 * Main Storage Interface compatible with Zustand Persist
 */
export const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await get(name, stateStore);
    if (!value) return null;

    // Deserialize and rehydrate
    try {
      const parsed = JSON.parse(value);
      const rehydrated = await rehydrateAssets(parsed);
      // Zustand expects a string for the full state object in JSON storage mode
      // We return the rehydrated object stringified, so Zustand parses it again.
      // It's a double parse but ensures compatibility with the standard createJSONStorage flow.
      return JSON.stringify(rehydrated);
    } catch (e) {
      logger.error('Storage load failed', e);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value);
      // Dehydrate (move large blobs to separate store)
      const lightweight = await dehydrateAssets(parsed);
      // Save lightweight state
      await set(name, JSON.stringify(lightweight), stateStore);
    } catch (e) {
      logger.error('Storage save failed', e);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    await del(name, stateStore);
    // Note: We don't automatically delete assets here as they might be shared or simply orphaned.
    // A garbage collection routine could be implemented separately.
  },
};
