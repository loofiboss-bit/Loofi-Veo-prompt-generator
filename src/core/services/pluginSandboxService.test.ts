import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────

vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Worker class
// Track all created workers
const createdWorkers: MockWorker[] = [];

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor(_url?: string | URL) {
    createdWorkers.push(this);
  }
}

vi.stubGlobal('Worker', MockWorker);

// Blob must be a real constructor-like function
vi.stubGlobal(
  'Blob',
  class MockBlob {
    parts: unknown[];
    options: unknown;
    constructor(parts: unknown[], options?: unknown) {
      this.parts = parts;
      this.options = options;
    }
  },
);

// Override URL.createObjectURL/revokeObjectURL to work with MockBlob
URL.createObjectURL = vi.fn(() => 'blob:mock-url');
URL.revokeObjectURL = vi.fn();

// ─── Import after mocks ────────────────────────────────────────────

import { pluginSandboxService } from './pluginSandboxService';

// ─── Helpers ────────────────────────────────────────────────────────

function resetService(): void {
  // Destroy all sandboxes to reset internal state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = pluginSandboxService as any;
  svc._sandboxes?.clear();
  svc._listeners = [];
  createdWorkers.length = 0;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('PluginSandboxService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetService();
  });

  // ── Singleton ──────────────────────────────────────────────────

  describe('singleton', () => {
    it('should export a singleton instance', () => {
      expect(pluginSandboxService).toBeDefined();
      expect(typeof pluginSandboxService.createSandbox).toBe('function');
    });
  });

  // ── determineSandboxMode ──────────────────────────────────────

  describe('determineSandboxMode', () => {
    it('should return "direct" for internal plugins', () => {
      expect(pluginSandboxService.determineSandboxMode('trusted', true)).toBe('direct');
      expect(pluginSandboxService.determineSandboxMode('untrusted', true)).toBe('direct');
    });

    it('should return "restricted" for trusted external plugins', () => {
      expect(pluginSandboxService.determineSandboxMode('trusted', false)).toBe('restricted');
    });

    it('should return "worker" for untrusted external plugins', () => {
      expect(pluginSandboxService.determineSandboxMode('untrusted', false)).toBe('worker');
      expect(pluginSandboxService.determineSandboxMode('unsigned', false)).toBe('worker');
    });
  });

  // ── createSandbox ─────────────────────────────────────────────

  describe('createSandbox', () => {
    it('should create a sandbox in direct mode and return info', async () => {
      const info = await pluginSandboxService.createSandbox(
        'test-plugin',
        'exports.activate = function() {}',
        ['ui:sidebar'],
        'direct',
      );

      expect(info).toBeDefined();
      expect(info.config.pluginId).toBe('test-plugin');
      expect(info.config.mode).toBe('direct');
      expect(info.state).toBe('ready');
      expect(info.config.permissions).toEqual(['ui:sidebar']);
    });

    it('should create a sandbox in restricted mode', async () => {
      const info = await pluginSandboxService.createSandbox(
        'restricted-plugin',
        'exports.activate = function(ctx) {}',
        ['storage:read'],
        'restricted',
      );

      expect(info.state).toBe('ready');
      expect(info.config.mode).toBe('restricted');
    });

    it('should create a sandbox in worker mode', async () => {
      // Worker mode requires the worker to post back 'ready'
      const createPromise = pluginSandboxService.createSandbox(
        'worker-plugin',
        'exports.activate = function() {}',
        ['ui:sidebar'],
        'worker',
      );

      // Wait for the Worker to be constructed and onmessage set
      await vi.waitFor(() => {
        expect(createdWorkers.length).toBeGreaterThan(0);
      });

      const worker = createdWorkers[createdWorkers.length - 1];

      // Wait for onmessage handler to be attached
      await vi.waitFor(() => {
        expect(worker.onmessage).toBeTruthy();
      });

      // Simulate worker responding with 'ready'
      worker.onmessage!(new MessageEvent('message', { data: { type: 'ready' } }));

      const info = await createPromise;
      expect(info.state).toBe('ready');
      expect(info.config.mode).toBe('worker');
    });

    it('should destroy existing sandbox before creating a new one', async () => {
      await pluginSandboxService.createSandbox('dup-plugin', '', ['ui:sidebar'], 'direct');
      const info2 = await pluginSandboxService.createSandbox(
        'dup-plugin',
        '',
        ['storage:read'],
        'direct',
      );

      expect(info2.config.permissions).toEqual(['storage:read']);
    });

    it('should apply default config values', async () => {
      const info = await pluginSandboxService.createSandbox('cfg-plugin', '', [], 'direct');

      expect(info.config.apiTimeoutMs).toBe(30_000);
      expect(info.config.rateLimitPerMinute).toBe(600);
      expect(info.config.memoryLimitBytes).toBe(50 * 1024 * 1024);
    });
  });

  // ── activateSandbox ───────────────────────────────────────────

  describe('activateSandbox', () => {
    it('should throw if no sandbox exists', async () => {
      await expect(pluginSandboxService.activateSandbox('nonexistent')).rejects.toThrow(
        'No sandbox for plugin: nonexistent',
      );
    });

    it('should activate a direct-mode sandbox', async () => {
      await pluginSandboxService.createSandbox('act-plugin', '', [], 'direct');
      await pluginSandboxService.activateSandbox('act-plugin');

      const info = pluginSandboxService.getSandboxInfo('act-plugin');
      expect(info?.state).toBe('running');
    });
  });

  // ── deactivateSandbox ─────────────────────────────────────────

  describe('deactivateSandbox', () => {
    it('should deactivate a running sandbox', async () => {
      await pluginSandboxService.createSandbox('deact-plugin', '', [], 'direct');
      await pluginSandboxService.activateSandbox('deact-plugin');
      await pluginSandboxService.deactivateSandbox('deact-plugin');

      const info = pluginSandboxService.getSandboxInfo('deact-plugin');
      expect(info?.state).toBe('suspended');
    });

    it('should be a no-op for non-existent sandbox', async () => {
      // Should not throw
      await pluginSandboxService.deactivateSandbox('nonexistent');
    });
  });

  // ── destroySandbox ────────────────────────────────────────────

  describe('destroySandbox', () => {
    it('should destroy a sandbox and remove it', async () => {
      await pluginSandboxService.createSandbox('destroy-plugin', '', [], 'direct');
      await pluginSandboxService.destroySandbox('destroy-plugin');

      expect(pluginSandboxService.getSandboxInfo('destroy-plugin')).toBeUndefined();
    });

    it('should be a no-op for non-existent sandbox', async () => {
      await pluginSandboxService.destroySandbox('nonexistent');
    });
  });

  // ── getSandboxInfo & getAllSandboxes ───────────────────────────

  describe('query methods', () => {
    it('should return undefined for non-existent sandbox', () => {
      expect(pluginSandboxService.getSandboxInfo('nope')).toBeUndefined();
    });

    it('should return info for an existing sandbox', async () => {
      await pluginSandboxService.createSandbox('info-plugin', '', ['ui:sidebar'], 'direct');

      const info = pluginSandboxService.getSandboxInfo('info-plugin');
      expect(info).toBeDefined();
      expect(info?.config.pluginId).toBe('info-plugin');
      expect(info?.apiCallCount).toBe(0);
    });

    it('should return all sandboxes', async () => {
      await pluginSandboxService.createSandbox('p1', '', [], 'direct');
      await pluginSandboxService.createSandbox('p2', '', [], 'direct');

      const all = pluginSandboxService.getAllSandboxes();
      expect(all).toHaveLength(2);
    });

    it('should return empty array when no sandboxes exist', () => {
      expect(pluginSandboxService.getAllSandboxes()).toEqual([]);
    });
  });

  // ── checkPermission ───────────────────────────────────────────

  describe('checkPermission', () => {
    it('should return false for non-existent sandbox', () => {
      expect(pluginSandboxService.checkPermission('nope', 'ui.registerSidebarItem')).toBe(false);
    });

    it('should return false for unknown API method', async () => {
      await pluginSandboxService.createSandbox('perm-plugin', '', ['ui:sidebar'], 'direct');
      expect(pluginSandboxService.checkPermission('perm-plugin', 'unknown.method')).toBe(false);
    });

    it('should return true when permission is granted', async () => {
      await pluginSandboxService.createSandbox('perm-plugin-ok', '', ['ui:sidebar'], 'direct');
      expect(pluginSandboxService.checkPermission('perm-plugin-ok', 'ui.registerSidebarItem')).toBe(
        true,
      );
    });

    it('should return false when permission is not granted', async () => {
      await pluginSandboxService.createSandbox('perm-plugin-deny', '', ['ui:sidebar'], 'direct');
      // storage.get requires 'storage:read'
      expect(pluginSandboxService.checkPermission('perm-plugin-deny', 'storage.get')).toBe(false);
    });

    it('should support wildcard domain permissions', async () => {
      // If plugin has 'storage' permission, it should match 'storage:read' and 'storage:write'
      await pluginSandboxService.createSandbox('perm-wildcard', '', ['storage' as never], 'direct');
      expect(pluginSandboxService.checkPermission('perm-wildcard', 'storage.get')).toBe(true);
      expect(pluginSandboxService.checkPermission('perm-wildcard', 'storage.set')).toBe(true);
    });
  });

  // ── subscribe ─────────────────────────────────────────────────

  describe('subscribe', () => {
    it('should notify listeners on sandbox creation', async () => {
      const listener = vi.fn();
      pluginSandboxService.subscribe(listener);

      await pluginSandboxService.createSandbox('sub-plugin', '', [], 'direct');

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', async () => {
      const listener = vi.fn();
      const unsub = pluginSandboxService.subscribe(listener);
      unsub();

      await pluginSandboxService.createSandbox('unsub-plugin', '', [], 'direct');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify on activate and deactivate', async () => {
      const listener = vi.fn();
      pluginSandboxService.subscribe(listener);

      await pluginSandboxService.createSandbox('lifecycle-plugin', '', [], 'direct');
      const countAfterCreate = listener.mock.calls.length;

      await pluginSandboxService.activateSandbox('lifecycle-plugin');
      expect(listener.mock.calls.length).toBeGreaterThan(countAfterCreate);

      const countAfterActivate = listener.mock.calls.length;
      await pluginSandboxService.deactivateSandbox('lifecycle-plugin');
      expect(listener.mock.calls.length).toBeGreaterThan(countAfterActivate);
    });
  });

  // ── destroyAll ────────────────────────────────────────────────

  describe('destroyAll', () => {
    it('should destroy all sandboxes', async () => {
      await pluginSandboxService.createSandbox('a', '', [], 'direct');
      await pluginSandboxService.createSandbox('b', '', [], 'direct');
      expect(pluginSandboxService.getAllSandboxes()).toHaveLength(2);

      await pluginSandboxService.destroyAll();
      expect(pluginSandboxService.getAllSandboxes()).toHaveLength(0);
    });
  });

  // ── Restricted mode lifecycle ────────────────────────────────

  describe('restricted mode lifecycle', () => {
    it('should activate a restricted sandbox with a context', async () => {
      await pluginSandboxService.createSandbox(
        'restr-act',
        'exports.activate = function(ctx) { }',
        [],
        'restricted',
      );

      await pluginSandboxService.activateSandbox('restr-act', { some: 'context' });

      const info = pluginSandboxService.getSandboxInfo('restr-act');
      expect(info?.state).toBe('running');
    });

    it('should deactivate a restricted sandbox', async () => {
      await pluginSandboxService.createSandbox(
        'restr-deact',
        'exports.activate = function() {}; exports.deactivate = function() {}',
        [],
        'restricted',
      );
      await pluginSandboxService.activateSandbox('restr-deact');
      await pluginSandboxService.deactivateSandbox('restr-deact');

      const info = pluginSandboxService.getSandboxInfo('restr-deact');
      expect(info?.state).toBe('suspended');
    });

    it('should destroy a restricted sandbox with dispose', async () => {
      await pluginSandboxService.createSandbox(
        'restr-dispose',
        'exports.activate = function() {}; exports.dispose = function() {}',
        [],
        'restricted',
      );
      await pluginSandboxService.destroySandbox('restr-dispose');

      expect(pluginSandboxService.getSandboxInfo('restr-dispose')).toBeUndefined();
    });

    it('should handle syntax errors in restricted source code', async () => {
      await expect(
        pluginSandboxService.createSandbox('bad-code', 'this is not valid js{{{', [], 'restricted'),
      ).rejects.toThrow();
    });
  });

  // ── Worker error handling ─────────────────────────────────────

  describe('worker error handling', () => {
    it('should handle worker onerror during init', async () => {
      const createPromise = pluginSandboxService.createSandbox('worker-err', 'code', [], 'worker');

      await vi.waitFor(() => {
        expect(createdWorkers.length).toBeGreaterThan(0);
      });

      const worker = createdWorkers[createdWorkers.length - 1];

      await vi.waitFor(() => {
        expect(worker.onerror).toBeTruthy();
      });

      // Simulate worker error
      worker.onerror!(
        new ErrorEvent('error', { message: 'Worker crashed' }) as unknown as ErrorEvent,
      );

      await expect(createPromise).rejects.toThrow('Worker crashed');
    });
  });

  // ── Worker message types ──────────────────────────────────────

  describe('worker message types', () => {
    async function createWorkerSandbox(pluginId: string) {
      const createPromise = pluginSandboxService.createSandbox(
        pluginId,
        'code',
        ['ui:sidebar', 'projects:read'],
        'worker',
      );

      await vi.waitFor(() => {
        expect(createdWorkers.length).toBeGreaterThan(0);
      });

      const worker = createdWorkers[createdWorkers.length - 1];

      await vi.waitFor(() => {
        expect(worker.onmessage).toBeTruthy();
      });

      // Simulate worker ready
      worker.onmessage!(new MessageEvent('message', { data: { type: 'ready' } }));

      await createPromise;
      return worker;
    }

    it('should handle log messages from worker', async () => {
      const { logger } = await import('./loggerService');
      const worker = await createWorkerSandbox('log-plugin');

      // Simulate log message
      worker.onmessage!(
        new MessageEvent('message', {
          data: { type: 'log', level: 'info', args: ['hello from plugin'] },
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Plugin:log-plugin]'),
        'hello from plugin',
      );
    });

    it('should handle error messages from worker as non-fatal', async () => {
      const worker = await createWorkerSandbox('err-plugin');

      worker.onmessage!(
        new MessageEvent('message', {
          data: { type: 'error', message: 'Something broke', fatal: false },
        }),
      );

      const info = pluginSandboxService.getSandboxInfo('err-plugin');
      expect(info?.errors).toHaveLength(1);
      expect(info?.errors[0].message).toBe('Something broke');
      expect(info?.state).not.toBe('terminated');
    });

    it('should handle fatal error messages from worker', async () => {
      const worker = await createWorkerSandbox('fatal-plugin');

      worker.onmessage!(
        new MessageEvent('message', {
          data: { type: 'error', message: 'Fatal crash', fatal: true },
        }),
      );

      const info = pluginSandboxService.getSandboxInfo('fatal-plugin');
      expect(info?.errors).toHaveLength(1);
      expect(info?.state).toBe('terminated');
    });

    it('should handle api-call messages and track activity', async () => {
      const worker = await createWorkerSandbox('api-plugin');

      // Activate — must respond to the 'activate' message from the worker
      const activatePromise = pluginSandboxService.activateSandbox('api-plugin');
      // Worker receives 'activate' postMessage, simulate 'activated' response
      await vi.waitFor(() => {
        const activateCall = worker.postMessage.mock.calls.find(
          (c: unknown[]) =>
            typeof c[0] === 'object' &&
            c[0] !== null &&
            (c[0] as { type: string }).type === 'activate',
        );
        expect(activateCall).toBeDefined();
      });
      worker.onmessage!(new MessageEvent('message', { data: { type: 'activated' } }));
      await activatePromise;

      // Simulate an API call from the worker
      worker.onmessage!(
        new MessageEvent('message', {
          data: {
            type: 'api-call',
            callId: 'c1',
            method: 'ui.registerSidebarItem',
            args: [{ title: 'Test' }],
          },
        }),
      );

      const info = pluginSandboxService.getSandboxInfo('api-plugin');
      expect(info?.apiCallCount).toBe(1);
      expect(info?.lastActivityAt).toBeDefined();
    });
  });

  // ── Worker dispose lifecycle ──────────────────────────────────

  describe('worker dispose lifecycle', () => {
    it('should terminate worker on destroy', async () => {
      const createPromise = pluginSandboxService.createSandbox(
        'worker-destroy',
        'code',
        [],
        'worker',
      );

      await vi.waitFor(() => {
        expect(createdWorkers.length).toBeGreaterThan(0);
      });

      const worker = createdWorkers[createdWorkers.length - 1];

      await vi.waitFor(() => {
        expect(worker.onmessage).toBeTruthy();
      });

      worker.onmessage!(new MessageEvent('message', { data: { type: 'ready' } }));
      await createPromise;

      await pluginSandboxService.destroySandbox('worker-destroy');

      expect(worker.terminate).toHaveBeenCalled();
      expect(pluginSandboxService.getSandboxInfo('worker-destroy')).toBeUndefined();
    });
  });

  // ── Permission checks for API routing ─────────────────────────

  describe('API routing permission denial', () => {
    it('should deny API calls without proper permissions', async () => {
      const createPromise = pluginSandboxService.createSandbox(
        'deny-plugin',
        'code',
        ['ui:sidebar'], // Only has ui:sidebar, not storage
        'worker',
      );

      await vi.waitFor(() => {
        expect(createdWorkers.length).toBeGreaterThan(0);
      });

      const worker = createdWorkers[createdWorkers.length - 1];

      await vi.waitFor(() => {
        expect(worker.onmessage).toBeTruthy();
      });

      worker.onmessage!(new MessageEvent('message', { data: { type: 'ready' } }));
      await createPromise;

      // Try to call storage.get without permission
      worker.onmessage!(
        new MessageEvent('message', {
          data: {
            type: 'api-call',
            callId: 'c1',
            method: 'storage.get',
            args: ['key'],
          },
        }),
      );

      // Should have responded with error
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'api-response',
          callId: 'c1',
          error: expect.stringContaining('Permission denied'),
        }),
      );
    });
  });
});
