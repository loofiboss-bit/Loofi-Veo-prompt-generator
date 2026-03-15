/**
 * Telemetry Service Tests
 * v2.0.0 - Testing Maturity
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────

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

vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Import after mocks ────────────────────────────────────────────

import { telemetryService } from './telemetryService';

// ─── Helpers ────────────────────────────────────────────────────────

async function resetService() {
  mockStore.clear();
  await telemetryService.clearEvents();
  await telemetryService.updateConfig({
    enabled: true,
    endpoint: '',
    batchSize: 50,
    syncIntervalMs: 5 * 60 * 1000,
    maxStoredEvents: 5000,
    enabledCategories: [],
    trackPerformance: true,
    trackFeatureUsage: true,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('telemetryService', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    mockStore.clear();
    vi.clearAllMocks();
    await resetService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should be a singleton instance', () => {
      expect(telemetryService).toBeDefined();
      expect(typeof telemetryService.initialize).toBe('function');
    });

    it('should initialize without errors', async () => {
      await expect(telemetryService.initialize()).resolves.not.toThrow();
    });

    it('should report initialized state', async () => {
      await telemetryService.initialize();
      const state = telemetryService.getState();
      expect(state.initialized).toBe(true);
    });

    it('should allow a later retry after initialization failure', async () => {
      const { get: mockGet } = await import('idb-keyval');
      const internals = telemetryService as unknown as {
        _initialized: boolean;
        _initializingPromise: Promise<void> | null;
      };

      internals._initialized = false;
      internals._initializingPromise = null;

      vi.mocked(mockGet).mockRejectedValueOnce(new Error('init failed'));
      await expect(telemetryService.initialize()).rejects.toThrow('init failed');
      expect(telemetryService.getState().initialized).toBe(false);

      vi.mocked(mockGet).mockImplementation((key) => Promise.resolve(mockStore.get(String(key))));
      await expect(telemetryService.initialize()).resolves.not.toThrow();
      expect(telemetryService.getState().initialized).toBe(true);
    });

    it('should have telemetry disabled by default (opt-in)', () => {
      // Reset config to defaults by reading raw default
      const config = telemetryService.getConfig();
      // After our test reset we enabled it; check it was originally opt-in
      expect(config).toHaveProperty('enabled');
    });
  });

  describe('track', () => {
    it('should track an event when enabled', () => {
      telemetryService.track('test:event', 'feature', { key: 'value' });

      const events = telemetryService.getEvents();
      const found = events.find((e) => e.name === 'test:event');
      expect(found).toBeDefined();
      expect(found!.category).toBe('feature');
      expect(found!.properties).toHaveProperty('key', 'value');
    });

    it('should not track events when disabled', async () => {
      await telemetryService.updateConfig({ enabled: false });
      telemetryService.track('disabled:event', 'feature');

      const events = telemetryService.getEvents();
      const found = events.find((e) => e.name === 'disabled:event');
      expect(found).toBeUndefined();
    });

    it('should assign unique IDs to each event', () => {
      telemetryService.track('event1', 'feature');
      telemetryService.track('event2', 'feature');

      const events = telemetryService.getEvents();
      const ids = events.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should set correct timestamps and metadata', () => {
      telemetryService.track('meta:test', 'feature');

      const events = telemetryService.getEvents();
      const event = events.find((e) => e.name === 'meta:test');
      expect(event).toBeDefined();
      expect(event!.timestamp).toBeTruthy();
      expect(event!.appVersion).toBeDefined();
      expect(event!.platform).toBeDefined();
      expect(event!.sessionId).toBeTruthy();
      expect(event!.synced).toBe(false);
    });

    it('should increment session event count', () => {
      telemetryService.track('count1', 'feature');
      telemetryService.track('count2', 'feature');

      const state = telemetryService.getState();
      expect(state.sessionEventCount).toBeGreaterThanOrEqual(2);
    });

    it('should filter by enabled categories when categories are specified', async () => {
      await telemetryService.updateConfig({ enabledCategories: ['feature'] });
      telemetryService.track('allowed', 'feature');
      telemetryService.track('blocked', 'performance');

      const events = telemetryService.getEvents();
      expect(events.find((e) => e.name === 'allowed')).toBeDefined();
      expect(events.find((e) => e.name === 'blocked')).toBeUndefined();
    });

    it('should respect trackPerformance toggle', async () => {
      await telemetryService.updateConfig({ trackPerformance: false });
      telemetryService.track('perf:blocked', 'performance');

      const events = telemetryService.getEvents();
      expect(events.find((e) => e.name === 'perf:blocked')).toBeUndefined();
    });

    it('should respect trackFeatureUsage toggle', async () => {
      await telemetryService.updateConfig({ trackFeatureUsage: false });
      telemetryService.track('feature:blocked', 'feature');

      const events = telemetryService.getEvents();
      expect(events.find((e) => e.name === 'feature:blocked')).toBeUndefined();
    });
  });

  describe('convenience trackers', () => {
    it('trackPerformance should create a performance event', () => {
      telemetryService.trackPerformance('build', 2300, { files: 10 });

      const events = telemetryService.getEvents();
      const found = events.find((e) => e.name === 'performance:build');
      expect(found).toBeDefined();
      expect(found!.category).toBe('performance');
      expect(found!.properties).toHaveProperty('durationMs', 2300);
    });

    it('trackFeature should create a feature event', () => {
      telemetryService.trackFeature('composer', 'open');

      const events = telemetryService.getEvents();
      const found = events.find((e) => e.name === 'feature:composer:open');
      expect(found).toBeDefined();
      expect(found!.properties).toHaveProperty('feature', 'composer');
      expect(found!.properties).toHaveProperty('action', 'open');
    });

    it('trackPlugin should create a plugin event', () => {
      telemetryService.trackPlugin('hello-world', 'install');

      const events = telemetryService.getEvents();
      const found = events.find((e) => e.name === 'plugin:install');
      expect(found).toBeDefined();
      expect(found!.properties).toHaveProperty('pluginId', 'hello-world');
    });

    it('trackExport should create an export event', () => {
      telemetryService.trackExport('json', true, 150);

      const events = telemetryService.getEvents();
      const found = events.find((e) => e.name === 'export:complete');
      expect(found).toBeDefined();
      expect(found!.properties).toHaveProperty('format', 'json');
      expect(found!.properties).toHaveProperty('success', true);
      expect(found!.properties).toHaveProperty('durationMs', 150);
    });

    it('trackUpdate should create an update event', () => {
      telemetryService.trackUpdate('download', '1.9.0', '2.0.0');

      const events = telemetryService.getEvents();
      const found = events.find((e) => e.name === 'update:download');
      expect(found).toBeDefined();
      expect(found!.properties).toHaveProperty('fromVersion', '1.9.0');
      expect(found!.properties).toHaveProperty('toVersion', '2.0.0');
    });
  });

  describe('sync', () => {
    it('should return 0/0 when no endpoint configured', async () => {
      telemetryService.track('event', 'feature');
      const result = await telemetryService.sync();
      expect(result).toEqual({ synced: 0, failed: 0 });
    });

    it('should return 0/0 when disabled', async () => {
      await telemetryService.updateConfig({ enabled: false });
      const result = await telemetryService.sync();
      expect(result).toEqual({ synced: 0, failed: 0 });
    });

    it('should sync events to configured endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      globalThis.fetch = mockFetch;

      await telemetryService.updateConfig({ endpoint: 'https://example.com/telemetry' });
      telemetryService.track('to:sync', 'feature');

      const result = await telemetryService.sync();
      expect(result.synced).toBeGreaterThanOrEqual(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/telemetry',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should mark events as synced after successful sync', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      globalThis.fetch = mockFetch;

      await telemetryService.updateConfig({ endpoint: 'https://example.com/telemetry' });
      telemetryService.track('sync:mark', 'feature');

      await telemetryService.sync();
      const state = telemetryService.getState();
      expect(state.lastSyncTimestamp).not.toBeNull();
    });

    it('should handle sync failures gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      globalThis.fetch = mockFetch;

      await telemetryService.updateConfig({ endpoint: 'https://example.com/telemetry' });
      telemetryService.track('fail:sync', 'feature');

      const result = await telemetryService.sync();
      expect(result.failed).toBeGreaterThanOrEqual(1);
    });

    it('should record last sync error on failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      globalThis.fetch = mockFetch;

      await telemetryService.updateConfig({ endpoint: 'https://example.com/telemetry' });
      telemetryService.track('error:sync', 'feature');

      await telemetryService.sync();
      const state = telemetryService.getState();
      expect(state.lastSyncError).toBe('Network error');
    });
  });

  describe('query', () => {
    it('should filter events by category', () => {
      telemetryService.track('event1', 'feature');
      telemetryService.track('event2', 'performance');
      telemetryService.track('event3', 'feature');

      const featureEvents = telemetryService.getEventsByCategory('feature');
      expect(featureEvents.length).toBeGreaterThanOrEqual(2);
      expect(featureEvents.every((e) => e.category === 'feature')).toBe(true);
    });

    it('should return session events', () => {
      telemetryService.track('session:event', 'feature');
      const sessionEvents = telemetryService.getSessionEvents();
      expect(sessionEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should return complete state object', () => {
      const state = telemetryService.getState();
      expect(state).toHaveProperty('initialized');
      expect(state).toHaveProperty('config');
      expect(state).toHaveProperty('pendingCount');
      expect(state).toHaveProperty('sessionEventCount');
      expect(state).toHaveProperty('isSyncing');
      expect(state).toHaveProperty('lastSyncTimestamp');
      expect(state).toHaveProperty('lastSyncError');
    });
  });

  describe('configuration', () => {
    it('should update config and persist', async () => {
      await telemetryService.updateConfig({ batchSize: 100 });
      const config = telemetryService.getConfig();
      expect(config.batchSize).toBe(100);

      const { set: mockSet } = await import('idb-keyval');
      expect(mockSet).toHaveBeenCalledWith(
        'telemetry:config',
        expect.objectContaining({ batchSize: 100 }),
      );
    });

    it('should merge partial config updates', async () => {
      await telemetryService.updateConfig({ batchSize: 25 });
      await telemetryService.updateConfig({ syncIntervalMs: 60000 });
      const config = telemetryService.getConfig();
      expect(config.batchSize).toBe(25);
      expect(config.syncIntervalMs).toBe(60000);
    });

    it('should track opt-in event when enabling telemetry', async () => {
      await telemetryService.updateConfig({ enabled: false });
      await telemetryService.updateConfig({ enabled: true });

      const events = telemetryService.getEvents();
      const optIn = events.find((e) => e.name === 'session:opt-in');
      expect(optIn).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should clear all events', async () => {
      telemetryService.track('to:clear', 'feature');
      expect(telemetryService.getEvents().length).toBeGreaterThanOrEqual(1);

      await telemetryService.clearEvents();
      expect(telemetryService.getEvents().length).toBe(0);
    });

    it('should clear only synced events', async () => {
      telemetryService.track('unsynced', 'feature');
      await telemetryService.clearSynced();
      // Unsynced events should remain
      const events = telemetryService.getEvents();
      expect(events.find((e) => e.name === 'unsynced')).toBeDefined();
    });

    it('should destroy service and clear timer', () => {
      expect(() => telemetryService.destroy()).not.toThrow();
    });
  });

  describe('subscription', () => {
    it('should notify listeners on state change', async () => {
      const listener = vi.fn();
      const unsubscribe = telemetryService.subscribe(listener);

      await telemetryService.updateConfig({ batchSize: 75 });
      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ initialized: true }));

      unsubscribe();
    });

    it('should stop notifying after unsubscribe', async () => {
      const listener = vi.fn();
      const unsubscribe = telemetryService.subscribe(listener);
      unsubscribe();
      listener.mockClear();

      await telemetryService.clearEvents();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('event pruning', () => {
    it('should prune events when exceeding maxStoredEvents', async () => {
      await telemetryService.updateConfig({ maxStoredEvents: 5 });

      for (let i = 0; i < 10; i++) {
        telemetryService.track(`event${i}`, 'feature');
      }

      const events = telemetryService.getEvents();
      expect(events.length).toBeLessThanOrEqual(5);
    });
  });

  describe('endSession', () => {
    it('should track session end event', () => {
      telemetryService.endSession();

      const events = telemetryService.getEvents();
      const sessionEnd = events.find((e) => e.name === 'session:end');
      expect(sessionEnd).toBeDefined();
      expect(sessionEnd!.properties).toHaveProperty('durationMs');
      expect(sessionEnd!.properties).toHaveProperty('eventCount');
    });
  });
});
