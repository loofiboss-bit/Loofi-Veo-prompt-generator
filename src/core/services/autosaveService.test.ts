import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb-keyval before importing the service
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  initAutosave,
  markCleanShutdown,
  startAutosave,
  stopAutosave,
  markDirty,
  saveSnapshot,
  getLatestAutosave,
  getAutosaveHistory,
  restoreFromSnapshot,
  clearAutosave,
  deleteSnapshot,
  getAutosaveStatus,
  forceAutosave,
  updateAutosaveInterval,
  exportAutosaveData,
} from './autosaveService';

describe('autosaveService', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Ensure autosave is stopped
    stopAutosave();
  });

  afterEach(() => {
    stopAutosave();
    vi.useRealTimers();
  });

  describe('initAutosave', () => {
    it('should return false when no previous crash', async () => {
      const wasCrashed = await initAutosave({
        enabled: false,
        intervalMs: 5000,
        maxHistory: 5,
      });
      expect(wasCrashed).toBe(false);
    });

    it('should detect previous crash when app-running was true', async () => {
      mockStore.set('app-running', true);
      const wasCrashed = await initAutosave({
        enabled: false,
        intervalMs: 5000,
        maxHistory: 5,
      });
      expect(wasCrashed).toBe(true);
    });

    it('should mark app as running after init', async () => {
      await initAutosave({ enabled: false, intervalMs: 5000, maxHistory: 5 });
      expect(mockStore.get('app-running')).toBe(true);
    });

    it('should start autosave when enabled', async () => {
      await initAutosave({ enabled: true, intervalMs: 1000, maxHistory: 5 });
      const status = getAutosaveStatus();
      expect(status.isRunning).toBe(true);
    });
  });

  describe('markCleanShutdown', () => {
    it('should set crash detection to false', async () => {
      mockStore.set('app-running', true);
      await markCleanShutdown();
      expect(mockStore.get('app-running')).toBe(false);
    });
  });

  describe('startAutosave / stopAutosave', () => {
    it('should start and report running status', () => {
      startAutosave(1000);
      expect(getAutosaveStatus().isRunning).toBe(true);
    });

    it('should stop and report not running', () => {
      startAutosave(1000);
      stopAutosave();
      expect(getAutosaveStatus().isRunning).toBe(false);
    });
  });

  describe('markDirty', () => {
    it('should set dirty flag and store data', () => {
      markDirty({ test: 'data' });
      const status = getAutosaveStatus();
      expect(status.isDirty).toBe(true);
      expect(status.hasData).toBe(true);
    });
  });

  describe('saveSnapshot', () => {
    it('should save a manual snapshot', async () => {
      const data = { idea: 'Test prompt' };
      await saveSnapshot(data, 'My save');

      const latest = await getLatestAutosave();
      expect(latest).not.toBeNull();
      expect(latest!.data).toEqual(data);
      expect(latest!.label).toBe('My save');
      expect(latest!.id).toMatch(/^manual-/);
    });

    it('should add snapshot to history', async () => {
      await saveSnapshot({ v: 1 }, 'Save 1');
      const history = await getAutosaveHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getLatestAutosave', () => {
    it('should return null when no autosave exists', async () => {
      const result = await getLatestAutosave();
      expect(result).toBeNull();
    });

    it('should return the latest snapshot', async () => {
      await saveSnapshot({ test: true });
      const result = await getLatestAutosave();
      expect(result).not.toBeNull();
      expect(result!.data.test).toBe(true);
    });
  });

  describe('getAutosaveHistory', () => {
    it('should return empty array when no history', async () => {
      const history = await getAutosaveHistory();
      expect(history).toEqual([]);
    });

    it('should return saved snapshots', async () => {
      await saveSnapshot({ v: 1 });
      await saveSnapshot({ v: 2 });
      const history = await getAutosaveHistory();
      expect(history.length).toBe(2);
    });
  });

  describe('restoreFromSnapshot', () => {
    it('should restore from current autosave', async () => {
      await saveSnapshot({ restore: 'me' }, 'target');
      const latest = await getLatestAutosave();
      const data = await restoreFromSnapshot(latest!.id);
      expect(data).toEqual({ restore: 'me' });
    });

    it('should restore from history', async () => {
      await saveSnapshot({ v: 1 }, 'first');
      const firstSnapshot = await getLatestAutosave();
      // Advance time so second snapshot gets a different ID
      vi.advanceTimersByTime(100);
      await saveSnapshot({ v: 2 }, 'second');
      // First snapshot is now in history, not current
      const data = await restoreFromSnapshot(firstSnapshot!.id);
      expect(data).toEqual({ v: 1 });
    });

    it('should return null for non-existent snapshot', async () => {
      const data = await restoreFromSnapshot('non-existent');
      expect(data).toBeNull();
    });
  });

  describe('clearAutosave', () => {
    it('should clear all autosave data', async () => {
      await saveSnapshot({ data: true });
      markDirty({ more: true });
      await clearAutosave();

      const latest = await getLatestAutosave();
      const status = getAutosaveStatus();
      expect(latest).toBeNull();
      expect(status.isDirty).toBe(false);
      expect(status.hasData).toBe(false);
    });
  });

  describe('deleteSnapshot', () => {
    it('should remove a specific snapshot from history', async () => {
      await saveSnapshot({ v: 1 }, 'del-me');
      const latest = await getLatestAutosave();
      await deleteSnapshot(latest!.id);

      const history = await getAutosaveHistory();
      const found = history.find((s) => s.id === latest!.id);
      expect(found).toBeUndefined();
    });
  });

  describe('getAutosaveStatus', () => {
    it('should report initial state correctly', () => {
      const status = getAutosaveStatus();
      expect(status.isRunning).toBe(false);
      expect(status.isDirty).toBe(false);
    });
  });

  describe('forceAutosave', () => {
    it('should save when data is available', async () => {
      markDirty({ forced: true });
      await forceAutosave();

      const latest = await getLatestAutosave();
      expect(latest).not.toBeNull();
      expect(latest!.data).toEqual({ forced: true });
    });

    it('should clear dirty flag after saving', async () => {
      markDirty({ data: 1 });
      await forceAutosave();
      expect(getAutosaveStatus().isDirty).toBe(false);
    });
  });

  describe('updateAutosaveInterval', () => {
    it('should update interval when autosave is running', () => {
      startAutosave(5000);
      updateAutosaveInterval(1000);
      expect(getAutosaveStatus().isRunning).toBe(true);
    });

    it('should do nothing when autosave is not running', () => {
      updateAutosaveInterval(1000);
      expect(getAutosaveStatus().isRunning).toBe(false);
    });
  });

  describe('exportAutosaveData', () => {
    it('should export as valid JSON', async () => {
      await saveSnapshot({ test: 'export' });
      const json = await exportAutosaveData();
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.2.0');
      expect(parsed.exportDate).toBeDefined();
      expect(parsed.current).not.toBeNull();
    });

    it('should include history in export', async () => {
      await saveSnapshot({ v: 1 });
      const json = await exportAutosaveData();
      const parsed = JSON.parse(json);
      expect(parsed.history).toBeDefined();
      expect(Array.isArray(parsed.history)).toBe(true);
    });
  });
});
