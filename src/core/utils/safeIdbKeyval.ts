import {
  get as idbGet,
  set as idbSet,
  del as idbDel,
  keys as idbKeys,
  clear as idbClear,
  createStore,
  type UseStore,
} from 'idb-keyval';
import { logger } from '@core/services/loggerService';

const fallbackStore = new Map<IDBValidKey, unknown>();
let idbAvailable: boolean | null = null;

async function isIdbAvailable(): Promise<boolean> {
  if (idbAvailable !== null) return idbAvailable;
  try {
    const testKey = '__idb_probe__';
    await idbSet(testKey, 1);
    await idbDel(testKey);
    idbAvailable = true;
  } catch {
    logger.warn('IndexedDB unavailable — using in-memory fallback', 'safeIdbKeyval');
    idbAvailable = false;
  }
  return idbAvailable;
}

export async function safeGet<T>(key: IDBValidKey, store?: UseStore): Promise<T | undefined> {
  try {
    if (await isIdbAvailable()) {
      return await idbGet<T>(key, store);
    }
  } catch (error) {
    logger.warn(
      `IndexedDB get("${String(key)}") failed, using fallback: ${error}`,
      'safeIdbKeyval',
    );
  }
  return fallbackStore.get(key) as T | undefined;
}

export async function safeSet(key: IDBValidKey, value: unknown, store?: UseStore): Promise<void> {
  try {
    if (await isIdbAvailable()) {
      await idbSet(key, value, store);
      return;
    }
  } catch (error) {
    logger.warn(
      `IndexedDB set("${String(key)}") failed, using fallback: ${error}`,
      'safeIdbKeyval',
    );
  }
  fallbackStore.set(key, value);
}

export async function safeDel(key: IDBValidKey, store?: UseStore): Promise<void> {
  try {
    if (await isIdbAvailable()) {
      await idbDel(key, store);
      return;
    }
  } catch (error) {
    logger.warn(
      `IndexedDB del("${String(key)}") failed, using fallback: ${error}`,
      'safeIdbKeyval',
    );
  }
  fallbackStore.delete(key);
}

export async function safeKeys(store?: UseStore): Promise<IDBValidKey[]> {
  try {
    if (await isIdbAvailable()) {
      return await idbKeys(store);
    }
  } catch (error) {
    logger.warn(`IndexedDB keys() failed, using fallback: ${error}`, 'safeIdbKeyval');
  }
  return Array.from(fallbackStore.keys());
}

export async function safeClear(store?: UseStore): Promise<void> {
  try {
    if (await isIdbAvailable()) {
      await idbClear(store);
      return;
    }
  } catch (error) {
    logger.warn(`IndexedDB clear() failed, using fallback: ${error}`, 'safeIdbKeyval');
  }
  fallbackStore.clear();
}

export { createStore, type UseStore };
