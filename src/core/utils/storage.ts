import { createStore, get, set, del, update } from 'idb-keyval';
import type { Asset } from '@core/types';
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

const pendingWrites = new Map<string, Promise<void>>();
const writeErrors = new Map<string, unknown>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function payloadState(payload: Record<string, unknown>): Record<string, unknown> {
  return isRecord(payload.state) ? payload.state : payload;
}

function withPayloadState(
  payload: Record<string, unknown>,
  state: Record<string, unknown>,
): Record<string, unknown> {
  return isRecord(payload.state) ? { ...payload, state } : state;
}

function mergeAssetCatalogs(
  currentPayload: unknown,
  nextPayload: Record<string, unknown>,
): Record<string, unknown> {
  if (!isRecord(currentPayload)) return nextPayload;
  const current = payloadState(currentPayload);
  const next = payloadState(nextPayload);
  if (!Array.isArray(current.assets) || !Array.isArray(next.assets)) return nextPayload;
  const catalogSources: Array<{ assets: unknown[]; revisions: Record<string, number> }> = [
    { assets: current.assets, revisions: {} },
    { assets: next.assets, revisions: {} },
  ];

  const numberMap = (value: unknown): Record<string, number> =>
    isRecord(value)
      ? Object.fromEntries(
          Object.entries(value).filter(
            (entry): entry is [string, number] =>
              typeof entry[1] === 'number' && Number.isFinite(entry[1]),
          ),
        )
      : {};
  const currentVersions = numberMap(current.assetCatalogRevisions);
  const nextVersions = numberMap(next.assetCatalogRevisions);
  const currentTombstones = numberMap(current.assetCatalogTombstones);
  const nextTombstones = numberMap(next.assetCatalogTombstones);
  catalogSources[0].revisions = currentVersions;
  catalogSources[1].revisions = nextVersions;
  const revisions: Record<string, number> = { ...currentVersions, ...nextVersions };
  const tombstones: Record<string, number> = { ...currentTombstones, ...nextTombstones };
  for (const id of Object.keys(revisions))
    revisions[id] = Math.max(currentVersions[id] ?? 0, nextVersions[id] ?? 0);
  for (const id of Object.keys(tombstones))
    tombstones[id] = Math.max(currentTombstones[id] ?? 0, nextTombstones[id] ?? 0);

  const assets = new Map<string, { asset: Asset; revision: number }>();
  for (const source of catalogSources) {
    for (const item of source.assets) {
      if (!isRecord(item) || typeof item.id !== 'string') continue;
      const revision = source.revisions[item.id] ?? 0;
      const previous = assets.get(item.id);
      if (!previous || revision >= previous.revision)
        assets.set(item.id, { asset: item as unknown as Asset, revision });
    }
  }
  return withPayloadState(nextPayload, {
    ...next,
    assets: [...assets.entries()]
      .filter(([id, value]) => value.revision > (tombstones[id] ?? -1))
      .map(([, value]) => value.asset),
    assetCatalogRevisions: revisions,
    assetCatalogTombstones: tombstones,
  });
}

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
  fullPayload: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const clone = JSON.parse(JSON.stringify(fullPayload)) as Record<string, unknown>;
  const state = payloadState(clone);

  // 1. Handle Global Asset Library
  if (state.assets && Array.isArray(state.assets)) {
    const lightweightAssets: Asset[] = [];

    for (const asset of state.assets) {
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
    state.assets = lightweightAssets;
  }

  // 2. Handle PromptState Uploads (Image)
  const promptState = state.promptState as
    | { uploadedImage?: { data?: string }; uploadedAudio?: { data?: string } }
    | undefined;
  if (promptState?.uploadedImage?.data) {
    const imgKey = 'prompt_uploaded_image';
    await withStorageTimeout('write uploaded image', () =>
      set(imgKey, promptState.uploadedImage!.data!, assetStore),
    );
    promptState.uploadedImage.data = 'STORED_IN_IDB';
  }

  // 3. Handle PromptState Uploads (Audio)
  if (promptState?.uploadedAudio?.data) {
    const audKey = 'prompt_uploaded_audio';
    await withStorageTimeout('write uploaded audio', () =>
      set(audKey, promptState.uploadedAudio!.data!, assetStore),
    );
    promptState.uploadedAudio.data = 'STORED_IN_IDB';
  }

  return withPayloadState(clone, state);
};

/**
 * Reattaches heavy assets from the 'assets' store back into the application state.
 */
interface PromptStateAssets {
  uploadedImage?: { data: string; mimeType: string } | null;
  uploadedAudio?: { data: string; mimeType: string; name: string } | null;
}

const rehydrateAssets = async (
  lightweightPayload: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> => {
  if (!lightweightPayload) return lightweightPayload;

  const payload: Record<string, unknown> = { ...lightweightPayload };
  const state: Record<string, unknown> = { ...payloadState(payload) };

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

  return withPayloadState(payload, state);
};

async function persistPayload(name: string, payload: Record<string, unknown>): Promise<void> {
  try {
    if (!hasIndexedDbSupport()) throw new Error('IndexedDB is unavailable.');
    const lightweight = await dehydrateAssets(payload);
    await withStorageTimeout(`write state key ${name}`, () =>
      update<string>(
        name,
        (current) => {
          let parsedCurrent: unknown;
          if (current) {
            try {
              parsedCurrent = JSON.parse(current);
            } catch {
              parsedCurrent = undefined;
            }
          }
          return JSON.stringify(mergeAssetCatalogs(parsedCurrent, lightweight));
        },
        stateStore,
      ),
    );
    writeErrors.delete(name);
  } catch (error) {
    writeErrors.set(name, error);
    logger.error('Storage save failed', error);
  }
}

function enqueuePersist(name: string, payload: Record<string, unknown>): Promise<void> {
  const previous = pendingWrites.get(name) ?? Promise.resolve();
  const pending = previous.catch(() => undefined).then(() => persistPayload(name, payload));
  pendingWrites.set(name, pending);
  void pending.finally(() => {
    if (pendingWrites.get(name) === pending) pendingWrites.delete(name);
  });
  return pending;
}

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
    try {
      const parsed = JSON.parse(value);
      await enqueuePersist(name, parsed as Record<string, unknown>);
    } catch (e) {
      logger.error('Storage save failed', e);
      writeErrors.set(name, e);
    }
  },

  /** Wait for catalog/state writes and surface a failure to explicit save flows. */
  flush: async (name?: string): Promise<void> => {
    await Promise.all(
      [...pendingWrites.entries()]
        .filter(([key]) => name === undefined || key === name)
        .map(([, pending]) => pending),
    );
    const error = name === undefined ? writeErrors.values().next().value : writeErrors.get(name);
    if (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Local media catalog could not be saved: ${message}`);
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
