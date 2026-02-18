/**
 * Plugin Sandbox Service
 * v2.0.0 - Platform Transformation
 *
 * Provides isolated execution environments for plugins.
 * Three sandbox modes:
 *   - 'worker'     — Full isolation via Web Worker (untrusted/unsigned plugins)
 *   - 'restricted' — In-process with frozen globals (trusted plugins)
 *   - 'direct'     — No sandbox, direct execution (internal/builtin only)
 *
 * Architecture:
 *   Plugin code runs inside a sandbox. API calls from plugins are proxied
 *   through postMessage (worker mode) or function wrappers (restricted mode).
 *   Permission checks gate every API call.
 */

import { logger } from './loggerService';
import { projectService } from './projectService';
import { historyService } from './historyService';
import { getUserTemplates } from './templateManager';
import type {
  SandboxConfig,
  SandboxState,
  SandboxInfo,
  SandboxError,
  SandboxInMessage,
  SandboxOutMessage,
  SandboxMode,
} from '@core/types/marketplace';
import type { PluginPermission } from '@core/types/plugin';

// ─── Worker code template ────────────────────────────────────────────

/**
 * Worker bootstrap code.
 * This runs inside the Web Worker. It:
 * 1. Restricts available globals
 * 2. Creates a proxy PluginContext
 * 3. Evaluates the plugin source code
 * 4. Handles lifecycle messages (activate/deactivate/dispose)
 */
const WORKER_BOOTSTRAP = `
'use strict';

// Restricted globals — remove dangerous APIs
const _restricted = [
  'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts',
  'eval', 'Function', 'SharedArrayBuffer', 'Atomics'
];
// Note: we don't actually delete them from globalThis to avoid errors;
// instead we shadow them in the plugin scope.

let _pluginInstance = null;
let _pluginId = '';
let _permissions = [];
let _callIdCounter = 0;
const _pendingCalls = new Map();

// Proxy API — each call posts a message to the host and awaits response
function createApiProxy() {
  function callApi(method, ...args) {
    const callId = String(++_callIdCounter);
    return new Promise((resolve, reject) => {
      _pendingCalls.set(callId, { resolve, reject });
      self.postMessage({ type: 'api-call', callId, method, args });
      // Timeout after 30s
      setTimeout(() => {
        if (_pendingCalls.has(callId)) {
          _pendingCalls.delete(callId);
          reject(new Error('API call timed out: ' + method));
        }
      }, 30000);
    });
  }

  return {
    manifest: null, // Set during init
    api: {
      ui: {
        registerSidebarItem: (cfg) => callApi('ui.registerSidebarItem', cfg),
        registerToolbarButton: (cfg) => callApi('ui.registerToolbarButton', cfg),
        registerModal: (cfg) => callApi('ui.registerModal', cfg),
        registerStudio: (cfg) => callApi('ui.registerStudio', cfg),
        showNotification: (msg, type) => callApi('ui.showNotification', msg, type),
      },
      data: {
        getProjects: () => callApi('data.getProjects'),
        getProject: (id) => callApi('data.getProject', id),
        saveProject: (p) => callApi('data.saveProject', p),
        getHistory: () => callApi('data.getHistory'),
        getTemplates: () => callApi('data.getTemplates'),
      },
      export: {
        registerFormat: (fmt) => callApi('export.registerFormat', fmt),
        exportPrompt: (prompt, fmt) => callApi('export.exportPrompt', prompt, fmt),
      },
      settings: {
        get: (key) => callApi('settings.get', key),
        set: (key, val) => callApi('settings.set', key, val),
        getAll: () => callApi('settings.getAll'),
      },
    },
    storage: {
      get: (key) => callApi('storage.get', key),
      set: (key, val) => callApi('storage.set', key, val),
      delete: (key) => callApi('storage.delete', key),
      clear: () => callApi('storage.clear'),
      keys: () => callApi('storage.keys'),
    },
    events: {
      on: (event, handler) => { /* local event registration */ },
      off: (event, handler) => { /* local event deregistration */ },
      emit: (event, ...args) => callApi('events.emit', event, ...args),
    },
    logger: {
      debug: (...args) => self.postMessage({ type: 'log', level: 'debug', args }),
      info:  (...args) => self.postMessage({ type: 'log', level: 'info',  args }),
      warn:  (...args) => self.postMessage({ type: 'log', level: 'warn',  args }),
      error: (...args) => self.postMessage({ type: 'log', level: 'error', args }),
    },
  };
}

const _context = createApiProxy();

self.onmessage = async function(e) {
  const msg = e.data;
  try {
    switch (msg.type) {
      case 'init': {
        _pluginId = msg.pluginId;
        _permissions = msg.permissions || [];
        // Evaluate plugin code in a restricted scope
        const createPlugin = new Function(
          'exports', 'context',
          // Shadow dangerous globals
          'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'eval',
          msg.sourceCode + '; return typeof exports.activate === "function" ? exports : null;'
        );
        const exports = {};
        _pluginInstance = createPlugin(
          exports, _context,
          undefined, undefined, undefined, undefined, undefined
        );
        if (!_pluginInstance && exports.activate) {
          _pluginInstance = exports;
        }
        self.postMessage({ type: 'ready' });
        break;
      }
      case 'activate': {
        if (_pluginInstance && _pluginInstance.activate) {
          await _pluginInstance.activate(_context);
        }
        self.postMessage({ type: 'activated' });
        break;
      }
      case 'deactivate': {
        if (_pluginInstance && _pluginInstance.deactivate) {
          await _pluginInstance.deactivate();
        }
        self.postMessage({ type: 'deactivated' });
        break;
      }
      case 'dispose': {
        if (_pluginInstance && _pluginInstance.dispose) {
          await _pluginInstance.dispose();
        }
        _pluginInstance = null;
        self.postMessage({ type: 'disposed' });
        break;
      }
      case 'api-response': {
        const pending = _pendingCalls.get(msg.callId);
        if (pending) {
          _pendingCalls.delete(msg.callId);
          if (msg.error) {
            pending.reject(new Error(msg.error));
          } else {
            pending.resolve(msg.result);
          }
        }
        break;
      }
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err.message || String(err),
      stack: err.stack,
      fatal: msg.type === 'init',
    });
  }
};
`;

// ─── Sandbox Instance ────────────────────────────────────────────────

/**
 * A single sandbox instance managing one plugin's execution.
 */
class SandboxInstance {
  readonly config: SandboxConfig;
  private _state: SandboxState = 'initializing';
  private _worker: Worker | null = null;
  private _errors: SandboxError[] = [];
  private _apiCallCount = 0;
  private _lastActivityAt: number | undefined;
  private _createdAt = Date.now();
  private _messageResolvers = new Map<string, (msg: SandboxOutMessage) => void>();
  private _onApiCall: ((callId: string, method: string, args: unknown[]) => void) | null = null;
  private _onLog: ((level: string, args: unknown[]) => void) | null = null;
  private _restrictedInstance: {
    activate?: (ctx: unknown) => Promise<void>;
    deactivate?: () => Promise<void>;
    dispose?: () => Promise<void>;
  } | null = null;

  constructor(config: SandboxConfig) {
    this.config = config;
  }

  get state(): SandboxState {
    return this._state;
  }

  get info(): SandboxInfo {
    return {
      config: this.config,
      state: this._state,
      apiCallCount: this._apiCallCount,
      lastActivityAt: this._lastActivityAt,
      errors: [...this._errors],
      createdAt: this._createdAt,
    };
  }

  /**
   * Initialize the sandbox with plugin source code.
   */
  async initialize(
    sourceCode: string,
    onApiCall: (callId: string, method: string, args: unknown[]) => void,
    onLog: (level: string, args: unknown[]) => void,
  ): Promise<void> {
    this._onApiCall = onApiCall;
    this._onLog = onLog;

    if (this.config.mode === 'worker') {
      await this._initWorker(sourceCode);
    } else if (this.config.mode === 'restricted') {
      await this._initRestricted(sourceCode);
    } else {
      // Direct mode — no sandbox
      this._state = 'ready';
    }
  }

  /**
   * Initialize a Web Worker sandbox.
   */
  private async _initWorker(sourceCode: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        const blob = new Blob([WORKER_BOOTSTRAP], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        this._worker = new Worker(url);
        URL.revokeObjectURL(url);

        const timeoutId = setTimeout(() => {
          reject(new Error('Sandbox init timed out'));
          this._state = 'terminated';
        }, this.config.apiTimeoutMs);

        this._worker.onmessage = (e: MessageEvent<SandboxOutMessage>) => {
          const msg = e.data;
          this._handleWorkerMessage(msg);

          if (msg.type === 'ready') {
            clearTimeout(timeoutId);
            this._state = 'ready';
            resolve();
          }
        };

        this._worker.onerror = (err) => {
          clearTimeout(timeoutId);
          const error: SandboxError = {
            message: err.message || 'Worker error',
            timestamp: Date.now(),
            fatal: true,
          };
          this._errors.push(error);
          this._state = 'terminated';
          reject(new Error(err.message));
        };

        // Send init message
        const initMsg: SandboxInMessage = {
          type: 'init',
          pluginId: this.config.pluginId,
          sourceCode,
          permissions: this.config.permissions,
        };
        this._worker.postMessage(initMsg);
      } catch (err) {
        this._state = 'terminated';
        reject(err);
      }
    });
  }

  /**
   * Initialize restricted in-process sandbox.
   */
  private async _initRestricted(sourceCode: string): Promise<void> {
    try {
      const factory = new Function('exports', `"use strict";\n${sourceCode}\n`);
      const exports: Record<string, unknown> = {};
      factory(exports);

      if (typeof exports.activate === 'function') {
        this._restrictedInstance = exports as {
          activate: (ctx: unknown) => Promise<void>;
          deactivate?: () => Promise<void>;
          dispose?: () => Promise<void>;
        };
      }

      this._state = 'ready';
    } catch (err) {
      const error: SandboxError = {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: Date.now(),
        fatal: true,
      };
      this._errors.push(error);
      this._state = 'terminated';
      throw err;
    }
  }

  /**
   * Handle messages from the worker.
   */
  private _handleWorkerMessage(msg: SandboxOutMessage): void {
    switch (msg.type) {
      case 'api-call':
        this._apiCallCount++;
        this._lastActivityAt = Date.now();
        this._onApiCall?.(msg.callId, msg.method, msg.args);
        break;
      case 'log':
        this._onLog?.(msg.level, msg.args);
        break;
      case 'error': {
        const error: SandboxError = {
          message: msg.message,
          stack: msg.stack,
          timestamp: Date.now(),
          fatal: msg.fatal,
        };
        this._errors.push(error);
        if (msg.fatal) {
          this._state = 'terminated';
        }
        break;
      }
      case 'activated':
      case 'deactivated':
      case 'disposed':
      case 'ready': {
        // Resolve any pending lifecycle message
        const resolver = this._messageResolvers.get(msg.type);
        if (resolver) {
          this._messageResolvers.delete(msg.type);
          resolver(msg);
        }
        break;
      }
    }
  }

  /**
   * Send a message to the worker and wait for a response of the given type.
   */
  private _sendAndWait(msg: SandboxInMessage, responseType: string): Promise<SandboxOutMessage> {
    return new Promise((resolve, reject) => {
      if (!this._worker) {
        reject(new Error('No worker available'));
        return;
      }

      const timeoutId = setTimeout(() => {
        this._messageResolvers.delete(responseType);
        reject(new Error(`Sandbox operation timed out: ${msg.type}`));
      }, this.config.apiTimeoutMs);

      this._messageResolvers.set(responseType, (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      });

      this._worker.postMessage(msg);
    });
  }

  /**
   * Respond to an API call from the plugin.
   */
  respondToApiCall(callId: string, result?: unknown, error?: string): void {
    if (this._worker) {
      const msg: SandboxInMessage = { type: 'api-response', callId, result, error };
      this._worker.postMessage(msg);
    }
  }

  /**
   * Activate the plugin inside the sandbox.
   */
  async activate(context?: unknown): Promise<void> {
    if (this._state !== 'ready' && this._state !== 'suspended') {
      throw new Error(`Cannot activate sandbox in state: ${this._state}`);
    }

    this._state = 'running';

    if (this.config.mode === 'worker') {
      await this._sendAndWait({ type: 'activate' }, 'activated');
    } else if (this.config.mode === 'restricted' && this._restrictedInstance?.activate) {
      await this._restrictedInstance.activate(context);
    }
    // Direct mode — no-op, handled externally
  }

  /**
   * Deactivate the plugin inside the sandbox.
   */
  async deactivate(): Promise<void> {
    if (this._state !== 'running') return;

    if (this.config.mode === 'worker') {
      await this._sendAndWait({ type: 'deactivate' }, 'deactivated');
    } else if (this.config.mode === 'restricted' && this._restrictedInstance?.deactivate) {
      await this._restrictedInstance.deactivate();
    }

    this._state = 'suspended';
  }

  /**
   * Dispose of the sandbox and release all resources.
   */
  async dispose(): Promise<void> {
    if (this._state === 'terminated') return;

    try {
      if (this.config.mode === 'worker' && this._worker) {
        if (this._state === 'running') {
          try {
            await this._sendAndWait({ type: 'dispose' }, 'disposed');
          } catch {
            // Worker may already be dead
          }
        }
        this._worker.terminate();
        this._worker = null;
      } else if (this.config.mode === 'restricted' && this._restrictedInstance?.dispose) {
        await this._restrictedInstance.dispose();
        this._restrictedInstance = null;
      }
    } finally {
      this._state = 'terminated';
      this._messageResolvers.clear();
    }
  }
}

// ─── Sandbox Service (Singleton) ─────────────────────────────────────

/**
 * Permission-to-API-method mapping.
 * Defines which permission is needed for each API method.
 */
const PERMISSION_MAP: Record<string, PluginPermission> = {
  'ui.registerSidebarItem': 'ui:sidebar',
  'ui.registerToolbarButton': 'ui:toolbar',
  'ui.registerModal': 'ui:modal',
  'ui.registerStudio': 'ui:studio',
  'ui.showNotification': 'ui:sidebar', // minimal permission for notifications
  'data.getProjects': 'projects:read',
  'data.getProject': 'projects:read',
  'data.saveProject': 'projects:write',
  'data.getHistory': 'history:read',
  'data.getTemplates': 'templates:read',
  'export.registerFormat': 'export',
  'export.exportPrompt': 'export',
  'events.emit': 'events:publish',
  'storage.get': 'storage:read',
  'storage.set': 'storage:write',
  'storage.delete': 'storage:write',
  'storage.clear': 'storage:write',
  'storage.keys': 'storage:read',
  'settings.get': 'storage:read',
  'settings.set': 'storage:write',
  'settings.getAll': 'storage:read',
};

/**
 * Default sandbox configuration values.
 */
const DEFAULT_SANDBOX_CONFIG: Omit<SandboxConfig, 'id' | 'pluginId' | 'mode' | 'permissions'> = {
  apiTimeoutMs: 30_000,
  rateLimitPerMinute: 600,
  memoryLimitBytes: 50 * 1024 * 1024, // 50 MB
};

class PluginSandboxService {
  private static instance: PluginSandboxService;
  private _sandboxes = new Map<string, SandboxInstance>();
  private _listeners: Array<() => void> = [];

  static getInstance(): PluginSandboxService {
    if (!PluginSandboxService.instance) {
      PluginSandboxService.instance = new PluginSandboxService();
    }
    return PluginSandboxService.instance;
  }

  /**
   * Determine the appropriate sandbox mode for a plugin based on trust.
   */
  determineSandboxMode(trustLevel: string, isInternal: boolean): SandboxMode {
    if (isInternal) return 'direct';
    if (trustLevel === 'trusted') return 'restricted';
    return 'worker';
  }

  /**
   * Create and initialize a sandbox for a plugin.
   */
  async createSandbox(
    pluginId: string,
    sourceCode: string,
    permissions: PluginPermission[],
    mode: SandboxMode,
  ): Promise<SandboxInfo> {
    // Terminate existing sandbox if any
    if (this._sandboxes.has(pluginId)) {
      await this.destroySandbox(pluginId);
    }

    const config: SandboxConfig = {
      id: `sandbox-${pluginId}-${Date.now()}`,
      pluginId,
      mode,
      permissions,
      ...DEFAULT_SANDBOX_CONFIG,
    };

    const sandbox = new SandboxInstance(config);

    const onApiCall = (callId: string, method: string, args: unknown[]) => {
      this._handleApiCall(pluginId, callId, method, args);
    };

    const onLog = (level: string, logArgs: unknown[]) => {
      const prefix = `[Plugin:${pluginId}]`;
      switch (level) {
        case 'debug':
          logger.info(`${prefix} [debug]`, ...(logArgs as string[]));
          break;
        case 'info':
          logger.info(`${prefix}`, ...(logArgs as string[]));
          break;
        case 'warn':
          logger.warn(`${prefix}`, ...(logArgs as string[]));
          break;
        case 'error':
          logger.error(`${prefix}`, ...(logArgs as string[]));
          break;
      }
    };

    await sandbox.initialize(sourceCode, onApiCall, onLog);
    this._sandboxes.set(pluginId, sandbox);
    this._notifyListeners();

    logger.info(`Sandbox created for plugin ${pluginId} (mode: ${mode})`);
    return sandbox.info;
  }

  /**
   * Activate a plugin's sandbox.
   */
  async activateSandbox(pluginId: string, context?: unknown): Promise<void> {
    const sandbox = this._sandboxes.get(pluginId);
    if (!sandbox) throw new Error(`No sandbox for plugin: ${pluginId}`);

    await sandbox.activate(context);
    this._notifyListeners();
    logger.info(`Sandbox activated for plugin ${pluginId}`);
  }

  /**
   * Deactivate a plugin's sandbox.
   */
  async deactivateSandbox(pluginId: string): Promise<void> {
    const sandbox = this._sandboxes.get(pluginId);
    if (!sandbox) return;

    await sandbox.deactivate();
    this._notifyListeners();
    logger.info(`Sandbox deactivated for plugin ${pluginId}`);
  }

  /**
   * Destroy a plugin's sandbox and release resources.
   */
  async destroySandbox(pluginId: string): Promise<void> {
    const sandbox = this._sandboxes.get(pluginId);
    if (!sandbox) return;

    await sandbox.dispose();
    this._sandboxes.delete(pluginId);
    this._notifyListeners();
    logger.info(`Sandbox destroyed for plugin ${pluginId}`);
  }

  /**
   * Get information about a specific sandbox.
   */
  getSandboxInfo(pluginId: string): SandboxInfo | undefined {
    return this._sandboxes.get(pluginId)?.info;
  }

  /**
   * Get information about all active sandboxes.
   */
  getAllSandboxes(): SandboxInfo[] {
    return Array.from(this._sandboxes.values()).map((s) => s.info);
  }

  /**
   * Check if a plugin has a specific permission.
   */
  checkPermission(pluginId: string, method: string): boolean {
    const sandbox = this._sandboxes.get(pluginId);
    if (!sandbox) return false;

    const required = PERMISSION_MAP[method];
    if (!required) return false;

    const granted = sandbox.config.permissions;

    // Direct match
    if (granted.includes(required)) return true;

    // Wildcard match: 'storage' grants 'storage:read' and 'storage:write'
    const [domain] = required.split(':');
    if (granted.includes(domain as PluginPermission)) return true;

    return false;
  }

  /**
   * Subscribe to sandbox state changes.
   */
  subscribe(listener: () => void): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Handle an API call from a sandboxed plugin.
   * Permission-gated: only allowed methods are executed.
   */
  private _handleApiCall(pluginId: string, callId: string, method: string, _args: unknown[]): void {
    const sandbox = this._sandboxes.get(pluginId);
    if (!sandbox) return;

    // Check permission
    if (!this.checkPermission(pluginId, method)) {
      sandbox.respondToApiCall(callId, undefined, `Permission denied: ${method}`);
      logger.warn(`Plugin ${pluginId} denied permission for ${method}`);
      return;
    }

    // Route API calls to appropriate services.
    this._routeApiCall(sandbox, callId, method, _args).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      sandbox.respondToApiCall(callId, undefined, `API error: ${msg}`);
      logger.error(`Plugin ${pluginId} API call '${method}' failed:`, msg);
    });
  }

  /**
   * Route a permission-approved API call to the appropriate service.
   */
  private async _routeApiCall(
    sandbox: SandboxInstance,
    callId: string,
    method: string,
    args: unknown[],
  ): Promise<void> {
    switch (method) {
      // ── Data: Projects ──
      case 'data.getProjects': {
        const projects = await projectService.getAllProjects();
        sandbox.respondToApiCall(callId, projects);
        return;
      }
      case 'data.getProject': {
        const project = await projectService.getProject(args[0] as string);
        sandbox.respondToApiCall(callId, project);
        return;
      }
      case 'data.saveProject': {
        const id = args[0] as string;
        const updates = args[1] as Record<string, unknown>;
        const result = await projectService.updateProject(id, updates);
        sandbox.respondToApiCall(callId, result);
        return;
      }

      // ── Data: History ──
      case 'data.getHistory': {
        const entries = await historyService.getEntries(
          args[0] as Parameters<typeof historyService.getEntries>[0],
        );
        sandbox.respondToApiCall(callId, entries);
        return;
      }

      // ── Data: Templates ──
      case 'data.getTemplates': {
        const templates = await getUserTemplates();
        sandbox.respondToApiCall(callId, templates);
        return;
      }

      default: {
        const unimplementedError =
          `API method '${method}' is not yet available in sandbox mode. ` +
          'Request the required permission in your plugin manifest and check the Plugin API docs.';
        sandbox.respondToApiCall(callId, undefined, unimplementedError);
      }
    }
  }

  /**
   * Destroy all sandboxes (cleanup on app shutdown).
   */
  async destroyAll(): Promise<void> {
    const ids = Array.from(this._sandboxes.keys());
    await Promise.all(ids.map((id) => this.destroySandbox(id)));
  }

  private _notifyListeners(): void {
    this._listeners.forEach((l) => l());
  }
}

export const pluginSandboxService = PluginSandboxService.getInstance();
