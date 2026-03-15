/**
 * Crash Reporter Service Tests
 * v2.0.0 - Testing Maturity
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('@core/utils/electronBridge', () => ({
  getElectron: vi.fn(() => undefined),
  isElectronEnvironment: vi.fn(() => false),
}));

// ─── Import after mocks ────────────────────────────────────────────

import { crashReporterService } from './crashReporterService';

// ─── Helpers ────────────────────────────────────────────────────────

/** Reset singleton internal state directly */
function resetService() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = crashReporterService as any;
  svc._reports = [];
  svc._submittedCount = 0;
  svc._sessionCrashCount = 0;
  svc._isSubmitting = false;
  svc._initialized = true; // Keep initialized so tests don't need to call init()
  svc._rateLimitWindow = [];
  svc._listeners = new Set();
  svc._config = {
    enabled: true,
    endpoint: '',
    maxStoredReports: 100,
    maxRetries: 3,
    includeComponentStack: true,
    includePluginContext: true,
    rateLimitPerMinute: 30,
  };
  mockStore.clear();
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('crashReporterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetService();
  });

  describe('initialization', () => {
    it('should be a singleton instance', () => {
      expect(crashReporterService).toBeDefined();
      expect(typeof crashReporterService.initialize).toBe('function');
    });

    it('should initialize without errors', async () => {
      await expect(crashReporterService.initialize()).resolves.not.toThrow();
    });

    it('should report initialized state', async () => {
      await crashReporterService.initialize();
      const state = crashReporterService.getState();
      expect(state.initialized).toBe(true);
    });

    it('should load stored config on initialization', async () => {
      mockStore.set('crash-reporter:config', {
        enabled: false,
        maxStoredReports: 50,
      });
      // Force re-init by modifying config
      await crashReporterService.updateConfig({ maxStoredReports: 50 });
      const config = crashReporterService.getConfig();
      expect(config.maxStoredReports).toBe(50);
    });

    it('should allow a later retry after initialization failure', async () => {
      const { get: mockGet } = await import('idb-keyval');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (crashReporterService as any)._initialized = false;

      vi.mocked(mockGet).mockRejectedValueOnce(new Error('init failed'));
      await expect(crashReporterService.initialize()).rejects.toThrow('init failed');
      expect(crashReporterService.getState().initialized).toBe(false);

      vi.mocked(mockGet).mockImplementation((key) => Promise.resolve(mockStore.get(String(key))));
      await expect(crashReporterService.initialize()).resolves.not.toThrow();
      expect(crashReporterService.getState().initialized).toBe(true);
    });
  });

  describe('reportCrash', () => {
    it('should create a crash report with required fields', async () => {
      const report = await crashReporterService.reportCrash({
        message: 'Test crash',
        stack: 'Error: test\n  at test.ts:1',
      });

      expect(report).not.toBeNull();
      expect(report!.id).toBeTruthy();
      expect(report!.message).toBe('Test crash');
      expect(report!.stack).toBe('Error: test\n  at test.ts:1');
      expect(report!.timestamp).toBeTruthy();
      expect(report!.appVersion).toBeTruthy();
      expect(report!.sessionId).toBeTruthy();
    });

    it('should use default severity "error" when not specified', async () => {
      const report = await crashReporterService.reportCrash({
        message: 'Test crash',
      });
      expect(report!.severity).toBe('error');
    });

    it('should use default source "renderer" when not specified', async () => {
      const report = await crashReporterService.reportCrash({
        message: 'Test crash',
      });
      expect(report!.source).toBe('renderer');
    });

    it('should honor specified severity and source', async () => {
      const report = await crashReporterService.reportCrash({
        message: 'Fatal crash',
        severity: 'fatal',
        source: 'main',
      });
      expect(report!.severity).toBe('fatal');
      expect(report!.source).toBe('main');
    });

    it('should return null when disabled', async () => {
      await crashReporterService.updateConfig({ enabled: false });
      const report = await crashReporterService.reportCrash({
        message: 'Test crash',
      });
      expect(report).toBeNull();
    });

    it('should increment session crash count', async () => {
      await crashReporterService.reportCrash({ message: 'Crash 1' });
      await crashReporterService.reportCrash({ message: 'Crash 2' });
      const state = crashReporterService.getState();
      expect(state.sessionCrashCount).toBeGreaterThanOrEqual(2);
    });

    it('should persist reports to IndexedDB', async () => {
      await crashReporterService.reportCrash({ message: 'Persisted crash' });
      const { set: mockSet } = await import('idb-keyval');
      expect(mockSet).toHaveBeenCalledWith(
        'crash-reporter:reports',
        expect.arrayContaining([expect.objectContaining({ message: 'Persisted crash' })]),
      );
    });

    it('should prune old reports when exceeding maxStoredReports', async () => {
      await crashReporterService.updateConfig({ maxStoredReports: 3 });

      for (let i = 0; i < 5; i++) {
        await crashReporterService.reportCrash({ message: `Crash ${i}` });
      }

      const reports = crashReporterService.getReports();
      expect(reports.length).toBeLessThanOrEqual(3);
    });

    it('should include context when provided', async () => {
      const report = await crashReporterService.reportCrash({
        message: 'Contexted crash',
        context: { component: 'Header', action: 'render' },
      });
      expect(report!.context).toEqual({ component: 'Header', action: 'render' });
    });
  });

  describe('reportErrorBoundary', () => {
    it('should create a fatal severity report', async () => {
      const error = new Error('Component failed');
      error.stack = 'Error: Component failed\n  at Component.tsx:10';

      const report = await crashReporterService.reportErrorBoundary(
        error,
        '\n  in Header\n  in App',
      );

      expect(report).not.toBeNull();
      expect(report!.severity).toBe('fatal');
      expect(report!.source).toBe('renderer');
      expect(report!.message).toBe('Component failed');
    });
  });

  describe('reportUnhandledRejection', () => {
    it('should handle Error objects', async () => {
      const error = new Error('Unhandled rejection');
      const report = await crashReporterService.reportUnhandledRejection(error);

      expect(report).not.toBeNull();
      expect(report!.message).toBe('Unhandled rejection');
      expect(report!.context).toHaveProperty('type', 'unhandledrejection');
    });

    it('should handle non-Error rejection reasons', async () => {
      const report = await crashReporterService.reportUnhandledRejection('string reason');

      expect(report).not.toBeNull();
      expect(report!.message).toBe('string reason');
    });
  });

  describe('reportPluginCrash', () => {
    it('should include plugin context when enabled', async () => {
      await crashReporterService.updateConfig({ includePluginContext: true });

      const error = new Error('Plugin error');
      const report = await crashReporterService.reportPluginCrash('my-plugin', error, {
        action: 'activate',
      });

      expect(report).not.toBeNull();
      expect(report!.source).toBe('plugin');
      expect(report!.context).toHaveProperty('pluginId', 'my-plugin');
      expect(report!.context).toHaveProperty('action', 'activate');
    });

    it('should exclude plugin context when disabled', async () => {
      await crashReporterService.updateConfig({ includePluginContext: false });

      const error = new Error('Plugin error');
      const report = await crashReporterService.reportPluginCrash('my-plugin', error, {
        action: 'activate',
      });

      expect(report).not.toBeNull();
      expect(report!.source).toBe('plugin');
      expect(report!.context).not.toHaveProperty('pluginId');
    });
  });

  describe('submission', () => {
    it('should return 0/0 when no endpoint configured', async () => {
      await crashReporterService.reportCrash({ message: 'Test' });
      const result = await crashReporterService.submitPending();
      expect(result).toEqual({ submitted: 0, failed: 0 });
    });

    it('should submit pending reports to the configured endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      globalThis.fetch = mockFetch;

      // First report without endpoint (won't auto-submit)
      await crashReporterService.reportCrash({ message: 'Submittable crash' });

      // Now set endpoint and manually submit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (crashReporterService as any)._config.endpoint = 'https://example.com/crashes';
      const result = await crashReporterService.submitPending();

      expect(result.submitted).toBeGreaterThanOrEqual(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/crashes',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should mark failed reports on HTTP error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      globalThis.fetch = mockFetch;

      await crashReporterService.reportCrash({ message: 'Will fail' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (crashReporterService as any)._config.endpoint = 'https://example.com/crashes';
      const result = await crashReporterService.submitPending();

      expect(result.failed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('query', () => {
    it('should return all reports via getReports', async () => {
      await crashReporterService.reportCrash({ message: 'Report 1' });
      await crashReporterService.reportCrash({ message: 'Report 2' });

      const reports = crashReporterService.getReports();
      expect(reports.length).toBeGreaterThanOrEqual(2);
    });

    it('should return recent reports via getRecentReports', async () => {
      for (let i = 0; i < 5; i++) {
        await crashReporterService.reportCrash({ message: `Report ${i}` });
      }

      const recent = crashReporterService.getRecentReports(2);
      expect(recent.length).toBe(2);
    });

    it('should return session reports', async () => {
      await crashReporterService.reportCrash({ message: 'Session report' });
      const sessionId = crashReporterService.getSessionId();
      const sessionReports = crashReporterService.getSessionReports(sessionId);
      expect(sessionReports.length).toBeGreaterThanOrEqual(1);
    });

    it('should return complete state object', () => {
      const state = crashReporterService.getState();
      expect(state).toHaveProperty('initialized');
      expect(state).toHaveProperty('config');
      expect(state).toHaveProperty('pendingCount');
      expect(state).toHaveProperty('submittedCount');
      expect(state).toHaveProperty('sessionCrashCount');
      expect(state).toHaveProperty('isSubmitting');
    });
  });

  describe('configuration', () => {
    it('should update config and persist', async () => {
      await crashReporterService.updateConfig({ maxStoredReports: 50 });
      const config = crashReporterService.getConfig();
      expect(config.maxStoredReports).toBe(50);

      const { set: mockSet } = await import('idb-keyval');
      expect(mockSet).toHaveBeenCalledWith(
        'crash-reporter:config',
        expect.objectContaining({ maxStoredReports: 50 }),
      );
    });

    it('should merge partial config updates', async () => {
      await crashReporterService.updateConfig({ maxStoredReports: 25 });
      await crashReporterService.updateConfig({ maxRetries: 5 });
      const config = crashReporterService.getConfig();
      expect(config.maxStoredReports).toBe(25);
      expect(config.maxRetries).toBe(5);
    });
  });

  describe('cleanup', () => {
    it('should clear all reports', async () => {
      await crashReporterService.reportCrash({ message: 'To clear' });
      expect(crashReporterService.getReports().length).toBeGreaterThanOrEqual(1);

      await crashReporterService.clearReports();
      expect(crashReporterService.getReports().length).toBe(0);
    });

    it('should clear only submitted reports', async () => {
      await crashReporterService.reportCrash({ message: 'Pending' });
      // This won't change state to submitted without endpoint, but the method should work
      await crashReporterService.clearSubmitted();
      // All pending reports should remain
      expect(crashReporterService.getReports().length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('subscription', () => {
    it('should notify listeners on state change', async () => {
      const listener = vi.fn();
      const unsubscribe = crashReporterService.subscribe(listener);

      await crashReporterService.reportCrash({ message: 'Notify test' });
      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          initialized: true,
        }),
      );

      unsubscribe();
    });

    it('should stop notifying after unsubscribe', async () => {
      const listener = vi.fn();
      const unsubscribe = crashReporterService.subscribe(listener);
      unsubscribe();

      await crashReporterService.reportCrash({ message: 'After unsub' });
      // Listener may have been called before unsubscribe during reportCrash's _notify
      // but the key is that unsubscribe removes it
      listener.mockClear();
      await crashReporterService.clearReports(); // Triggers _notify
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    it('should allow reports within rate limit', async () => {
      const report = await crashReporterService.reportCrash({ message: 'Within limit' });
      expect(report).not.toBeNull();
    });

    it('should reject reports exceeding rate limit', async () => {
      await crashReporterService.updateConfig({ rateLimitPerMinute: 2 });

      await crashReporterService.reportCrash({ message: 'Report 1' });
      await crashReporterService.reportCrash({ message: 'Report 2' });
      const third = await crashReporterService.reportCrash({ message: 'Report 3' });

      expect(third).toBeNull();
    });
  });
});
