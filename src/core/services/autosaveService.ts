/**
 * Autosave Service
 * Handles automatic saving and crash recovery
 */

import { get, set, del } from 'idb-keyval';
import { logger } from './loggerService';

const AUTOSAVE_KEY = 'autosave-current';
const AUTOSAVE_HISTORY_KEY = 'autosave-history';
const CRASH_DETECTION_KEY = 'app-running';
const MAX_HISTORY_ENTRIES = 5;

export interface AutosaveSnapshot {
  id: string;
  timestamp: number;
  data: any;
  label?: string;
}

export interface AutosaveConfig {
  enabled: boolean;
  intervalMs: number; // Autosave interval in milliseconds
  maxHistory: number;
}

let autosaveInterval: NodeJS.Timeout | null = null;
let isDirty = false;
let currentData: any = null;

/**
 * Initialize autosave system
 */
export async function initAutosave(config: AutosaveConfig): Promise<boolean> {
  try {
    // Check if app crashed last time
    const wasCrashed = await detectCrash();

    // Mark app as running
    await set(CRASH_DETECTION_KEY, true);

    // Start autosave if enabled
    if (config.enabled) {
      startAutosave(config.intervalMs);
    }

    logger.info('Autosave system initialized', undefined, { wasCrashed, config });
    return wasCrashed;
  } catch (error) {
    logger.error('Failed to initialize autosave', undefined, error);
    return false;
  }
}

/**
 * Detect if app crashed last time
 */
async function detectCrash(): Promise<boolean> {
  try {
    const wasRunning = await get<boolean>(CRASH_DETECTION_KEY);
    return wasRunning === true;
  } catch (error) {
    logger.error('Failed to detect crash', undefined, error);
    return false;
  }
}

/**
 * Mark app as cleanly closed
 */
export async function markCleanShutdown(): Promise<void> {
  try {
    await set(CRASH_DETECTION_KEY, false);
    logger.debug('Marked clean shutdown');
  } catch (error) {
    logger.error('Failed to mark clean shutdown', undefined, error);
  }
}

/**
 * Start autosave timer
 */
export function startAutosave(intervalMs: number): void {
  if (autosaveInterval) {
    clearInterval(autosaveInterval);
  }

  autosaveInterval = setInterval(async () => {
    if (isDirty && currentData) {
      await performAutosave(currentData);
      isDirty = false;
    }
  }, intervalMs);

  logger.info(`Autosave started with ${intervalMs}ms interval`);
}

/**
 * Stop autosave timer
 */
export function stopAutosave(): void {
  if (autosaveInterval) {
    clearInterval(autosaveInterval);
    autosaveInterval = null;
    logger.info('Autosave stopped');
  }
}

/**
 * Mark data as dirty (needs saving)
 */
export function markDirty(data: any): void {
  isDirty = true;
  currentData = data;
}

/**
 * Perform autosave
 */
async function performAutosave(data: any): Promise<void> {
  try {
    const snapshot: AutosaveSnapshot = {
      id: `autosave-${Date.now()}`,
      timestamp: Date.now(),
      data,
    };

    // Save current autosave
    await set(AUTOSAVE_KEY, snapshot);

    // Add to history
    await addToHistory(snapshot);

    logger.debug('Autosave completed', undefined, { timestamp: snapshot.timestamp });
  } catch (error) {
    logger.error('Autosave failed', undefined, error);
  }
}

/**
 * Manually save a snapshot
 */
export async function saveSnapshot(data: any, label?: string): Promise<void> {
  try {
    const snapshot: AutosaveSnapshot = {
      id: `manual-${Date.now()}`,
      timestamp: Date.now(),
      data,
      label,
    };

    await set(AUTOSAVE_KEY, snapshot);
    await addToHistory(snapshot);

    logger.info('Manual snapshot saved', undefined, { label });
  } catch (error) {
    logger.error('Failed to save snapshot', undefined, error);
    throw error;
  }
}

/**
 * Add snapshot to history
 */
async function addToHistory(snapshot: AutosaveSnapshot): Promise<void> {
  try {
    const history = (await get<AutosaveSnapshot[]>(AUTOSAVE_HISTORY_KEY)) || [];

    // Add new snapshot
    history.unshift(snapshot);

    // Keep only MAX_HISTORY_ENTRIES
    const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);

    await set(AUTOSAVE_HISTORY_KEY, trimmed);
  } catch (error) {
    logger.error('Failed to add to history', undefined, error);
  }
}

/**
 * Get latest autosave
 */
export async function getLatestAutosave(): Promise<AutosaveSnapshot | null> {
  try {
    const snapshot = await get<AutosaveSnapshot>(AUTOSAVE_KEY);
    return snapshot || null;
  } catch (error) {
    logger.error('Failed to get latest autosave', undefined, error);
    return null;
  }
}

/**
 * Get autosave history
 */
export async function getAutosaveHistory(): Promise<AutosaveSnapshot[]> {
  try {
    const history = (await get<AutosaveSnapshot[]>(AUTOSAVE_HISTORY_KEY)) || [];
    return history;
  } catch (error) {
    logger.error('Failed to get autosave history', undefined, error);
    return [];
  }
}

/**
 * Restore from snapshot
 */
export async function restoreFromSnapshot(snapshotId: string): Promise<any | null> {
  try {
    // Check current autosave
    const current = await getLatestAutosave();
    if (current && current.id === snapshotId) {
      return current.data;
    }

    // Check history
    const history = await getAutosaveHistory();
    const snapshot = history.find((s) => s.id === snapshotId);

    if (snapshot) {
      return snapshot.data;
    }

    logger.warn(`Snapshot ${snapshotId} not found`);
    return null;
  } catch (error) {
    logger.error('Failed to restore from snapshot', undefined, error);
    return null;
  }
}

/**
 * Clear autosave data
 */
export async function clearAutosave(): Promise<void> {
  try {
    await del(AUTOSAVE_KEY);
    await del(AUTOSAVE_HISTORY_KEY);
    isDirty = false;
    currentData = null;
    logger.info('Autosave data cleared');
  } catch (error) {
    logger.error('Failed to clear autosave', undefined, error);
    throw error;
  }
}

/**
 * Delete specific snapshot from history
 */
export async function deleteSnapshot(snapshotId: string): Promise<void> {
  try {
    const history = await getAutosaveHistory();
    const updated = history.filter((s) => s.id !== snapshotId);
    await set(AUTOSAVE_HISTORY_KEY, updated);
    logger.debug(`Deleted snapshot ${snapshotId}`);
  } catch (error) {
    logger.error('Failed to delete snapshot', undefined, error);
    throw error;
  }
}

/**
 * Get autosave status
 */
export function getAutosaveStatus(): {
  isRunning: boolean;
  isDirty: boolean;
  hasData: boolean;
} {
  return {
    isRunning: autosaveInterval !== null,
    isDirty,
    hasData: currentData !== null,
  };
}

/**
 * Force immediate autosave
 */
export async function forceAutosave(): Promise<void> {
  if (currentData) {
    await performAutosave(currentData);
    isDirty = false;
    logger.info('Forced autosave completed');
  }
}

/**
 * Update autosave interval
 */
export function updateAutosaveInterval(intervalMs: number): void {
  if (autosaveInterval) {
    stopAutosave();
    startAutosave(intervalMs);
    logger.info(`Autosave interval updated to ${intervalMs}ms`);
  }
}

/**
 * Export autosave data
 */
export async function exportAutosaveData(): Promise<string> {
  try {
    const current = await getLatestAutosave();
    const history = await getAutosaveHistory();

    const exportData = {
      version: '1.2.0',
      exportDate: new Date().toISOString(),
      current,
      history,
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    logger.error('Failed to export autosave data', undefined, error);
    throw error;
  }
}
