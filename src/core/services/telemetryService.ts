/**
 * Telemetry Service
 * v2.0.0 - Platform Transformation
 *
 * Privacy-first, opt-in usage analytics and event tracking.
 * All data stored locally by default. External sync only
 * with explicit user consent and a configured endpoint.
 *
 * No PII is ever collected. Events contain only:
 * - Feature usage patterns (e.g., "composer opened")
 * - Performance metrics (e.g., "build time 2.3s")
 * - Session lifecycle (start, end, duration)
 * - Platform info (os, arch, app version)
 */

import { get, set } from 'idb-keyval';
import { logger } from './loggerService';
import type {
  TelemetryEvent,
  TelemetryConfig,
  TelemetryState,
  TelemetryCategory,
} from '@core/types/desktopProduction';

// ─── Constants ──────────────────────────────────────────────────────

const IDB_KEY_EVENTS = 'telemetry:events';
const IDB_KEY_CONFIG = 'telemetry:config';
const IDB_KEY_SYNC_TS = 'telemetry:last-sync';

const APP_VERSION =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) || '2.0.0';

const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: false, // Opt-in by default
  endpoint: '',
  batchSize: 50,
  syncIntervalMs: 5 * 60 * 1000, // 5 minutes
  maxStoredEvents: 5000,
  enabledCategories: [],
  trackPerformance: true,
  trackFeatureUsage: true,
};

// ─── Helpers ────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getPlatform(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.platform ?? 'unknown';
  }
  return 'unknown';
}

const SESSION_ID = generateId();

// ─── Service ────────────────────────────────────────────────────────

class TelemetryService {
  private static instance: TelemetryService;

  private _config: TelemetryConfig = { ...DEFAULT_CONFIG };
  private _events: TelemetryEvent[] = [];
  private _sessionEventCount = 0;
  private _isSyncing = false;
  private _initialized = false;
  private _lastSyncTimestamp: number | null = null;
  private _lastSyncError: string | null = null;
  private _syncTimer: ReturnType<typeof setInterval> | null = null;
  private _listeners = new Set<(state: TelemetryState) => void>();
  private _sessionStartTime = Date.now();

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  // ─── Initialization ─────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this._initialized) return;

    try {
      // Load stored config
      const storedConfig = await get<TelemetryConfig>(IDB_KEY_CONFIG);
      if (storedConfig) {
        this._config = { ...DEFAULT_CONFIG, ...storedConfig };
      }

      // Load stored events
      const storedEvents = await get<TelemetryEvent[]>(IDB_KEY_EVENTS);
      if (storedEvents) {
        this._events = storedEvents;
      }

      // Load last sync timestamp
      const syncTs = await get<number>(IDB_KEY_SYNC_TS);
      if (typeof syncTs === 'number') {
        this._lastSyncTimestamp = syncTs;
      }

      this._initialized = true;

      // Start auto-sync timer if enabled and endpoint configured
      this._startSyncTimer();

      // Track session start
      if (this._config.enabled) {
        this.track('session:start', 'session', {
          platform: getPlatform(),
          appVersion: APP_VERSION,
        });
      }

      logger.info('[Telemetry] Initialized', 'telemetry', {
        enabled: this._config.enabled,
        storedEvents: this._events.length,
      });
    } catch (err) {
      logger.error('[Telemetry] Failed to initialize', String(err));
      this._initialized = true;
    }
  }

  // ─── Event Tracking ─────────────────────────────────────────────

  /**
   * Track a telemetry event.
   * No-op if telemetry is disabled or category is filtered out.
   */
  track(
    name: string,
    category: TelemetryCategory,
    properties: Record<string, string | number | boolean> = {},
  ): void {
    if (!this._config.enabled) return;

    // Check category filter
    if (
      this._config.enabledCategories.length > 0 &&
      !this._config.enabledCategories.includes(category)
    ) {
      return;
    }

    // Check feature-specific toggles
    if (category === 'performance' && !this._config.trackPerformance) return;
    if (category === 'feature' && !this._config.trackFeatureUsage) return;

    const event: TelemetryEvent = {
      id: generateId(),
      name,
      category,
      timestamp: new Date().toISOString(),
      appVersion: APP_VERSION,
      platform: getPlatform(),
      properties,
      sessionId: SESSION_ID,
      synced: false,
    };

    this._events.push(event);
    this._sessionEventCount++;

    // Prune old events if over limit
    if (this._events.length > this._config.maxStoredEvents) {
      // Remove oldest synced events first
      const synced = this._events.filter((e) => e.synced);
      if (synced.length > 0) {
        const toRemove = synced.length - Math.floor(this._config.maxStoredEvents * 0.8);
        if (toRemove > 0) {
          const syncedIds = new Set(synced.slice(0, toRemove).map((e) => e.id));
          this._events = this._events.filter((e) => !syncedIds.has(e.id));
        }
      }
      // Hard cap
      if (this._events.length > this._config.maxStoredEvents) {
        this._events = this._events.slice(-this._config.maxStoredEvents);
      }
    }

    // Persist asynchronously
    void this._persistEvents();
  }

  /**
   * Track a performance metric.
   */
  trackPerformance(
    name: string,
    durationMs: number,
    metadata?: Record<string, string | number | boolean>,
  ): void {
    this.track(`performance:${name}`, 'performance', {
      durationMs,
      ...metadata,
    });
  }

  /**
   * Track a feature usage event.
   */
  trackFeature(featureName: string, action: string = 'open'): void {
    this.track(`feature:${featureName}:${action}`, 'feature', {
      feature: featureName,
      action,
    });
  }

  /**
   * Track a plugin lifecycle event.
   */
  trackPlugin(pluginId: string, action: string): void {
    this.track(`plugin:${action}`, 'plugin', {
      pluginId,
      action,
    });
  }

  /**
   * Track an export event.
   */
  trackExport(format: string, success: boolean, durationMs?: number): void {
    this.track('export:complete', 'export', {
      format,
      success,
      ...(durationMs !== undefined ? { durationMs } : {}),
    });
  }

  /**
   * Track an update event.
   */
  trackUpdate(action: string, fromVersion?: string, toVersion?: string): void {
    this.track(`update:${action}`, 'update', {
      action,
      ...(fromVersion ? { fromVersion } : {}),
      ...(toVersion ? { toVersion } : {}),
    });
  }

  /**
   * End the current session (call on app close).
   */
  endSession(): void {
    if (!this._config.enabled) return;

    const durationMs = Date.now() - this._sessionStartTime;
    this.track('session:end', 'session', {
      durationMs,
      eventCount: this._sessionEventCount,
    });

    // Final persist
    void this._persistEvents();
  }

  // ─── Sync ───────────────────────────────────────────────────────

  /**
   * Sync un-synced events to the configured endpoint.
   */
  async sync(): Promise<{ synced: number; failed: number }> {
    if (!this._config.endpoint || this._isSyncing || !this._config.enabled) {
      return { synced: 0, failed: 0 };
    }

    this._isSyncing = true;
    this._notify();

    const unsynced = this._events.filter((e) => !e.synced);
    let synced = 0;
    let failed = 0;

    // Send in batches
    for (let i = 0; i < unsynced.length; i += this._config.batchSize) {
      const batch = unsynced.slice(i, i + this._config.batchSize);

      try {
        const response = await fetch(this._config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: batch.map((e) => this._sanitizeEvent(e)),
            sessionId: SESSION_ID,
            appVersion: APP_VERSION,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          batch.forEach((e) => {
            e.synced = true;
          });
          synced += batch.length;
        } else {
          failed += batch.length;
          this._lastSyncError = `HTTP ${response.status}`;
        }
      } catch (err) {
        failed += batch.length;
        this._lastSyncError = err instanceof Error ? err.message : String(err);
        break; // Stop batching on network error
      }
    }

    this._lastSyncTimestamp = Date.now();
    await set(IDB_KEY_SYNC_TS, this._lastSyncTimestamp);
    await this._persistEvents();

    this._isSyncing = false;
    this._notify();

    if (synced > 0) {
      logger.info('[Telemetry] Sync complete', `synced=${synced} failed=${failed}`);
    }

    return { synced, failed };
  }

  // ─── Query ──────────────────────────────────────────────────────

  /** Get all events. */
  getEvents(): readonly TelemetryEvent[] {
    return this._events;
  }

  /** Get events by category. */
  getEventsByCategory(category: TelemetryCategory): TelemetryEvent[] {
    return this._events.filter((e) => e.category === category);
  }

  /** Get session events. */
  getSessionEvents(): TelemetryEvent[] {
    return this._events.filter((e) => e.sessionId === SESSION_ID);
  }

  /** Get current telemetry state. */
  getState(): TelemetryState {
    return {
      initialized: this._initialized,
      config: { ...this._config },
      pendingCount: this._events.filter((e) => !e.synced).length,
      sessionEventCount: this._sessionEventCount,
      isSyncing: this._isSyncing,
      lastSyncTimestamp: this._lastSyncTimestamp,
      lastSyncError: this._lastSyncError,
    };
  }

  // ─── Configuration ─────────────────────────────────────────────

  /** Update telemetry configuration. */
  async updateConfig(config: Partial<TelemetryConfig>): Promise<void> {
    const wasEnabled = this._config.enabled;
    this._config = { ...this._config, ...config };
    await set(IDB_KEY_CONFIG, this._config);

    // Restart sync timer on config change
    this._startSyncTimer();

    // Track opt-in/opt-out
    if (!wasEnabled && this._config.enabled) {
      this.track('session:opt-in', 'session', { appVersion: APP_VERSION });
    }

    this._notify();
    logger.info('[Telemetry] Config updated', JSON.stringify(config));
  }

  /** Get current configuration. */
  getConfig(): TelemetryConfig {
    return { ...this._config };
  }

  // ─── Cleanup ────────────────────────────────────────────────────

  /** Clear all stored events. */
  async clearEvents(): Promise<void> {
    this._events = [];
    await this._persistEvents();
    this._notify();
    logger.info('[Telemetry] Events cleared');
  }

  /** Clear only synced events. */
  async clearSynced(): Promise<void> {
    this._events = this._events.filter((e) => !e.synced);
    await this._persistEvents();
    this._notify();
  }

  /** Destroy — stop sync timer and cleanup. */
  destroy(): void {
    this.endSession();
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }
    this._listeners.clear();
  }

  // ─── Subscription ──────────────────────────────────────────────

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: (state: TelemetryState) => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  // ─── Private ────────────────────────────────────────────────────

  private _notify(): void {
    const state = this.getState();
    this._listeners.forEach((listener) => {
      try {
        listener(state);
      } catch {
        // Swallow listener errors
      }
    });
  }

  private async _persistEvents(): Promise<void> {
    try {
      await set(IDB_KEY_EVENTS, this._events);
    } catch (err) {
      logger.error('[Telemetry] Failed to persist events', String(err));
    }
  }

  private _startSyncTimer(): void {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }

    if (this._config.enabled && this._config.endpoint && this._config.syncIntervalMs > 0) {
      this._syncTimer = setInterval(() => {
        void this.sync();
      }, this._config.syncIntervalMs);
    }
  }

  private _sanitizeEvent(event: TelemetryEvent): TelemetryEvent {
    // Ensure no PII leaks — strip any property keys with 'path', 'user', 'email', etc.
    const safeProps: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(event.properties)) {
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.includes('path') &&
        !lowerKey.includes('user') &&
        !lowerKey.includes('email') &&
        !lowerKey.includes('name') &&
        !lowerKey.includes('key') &&
        !lowerKey.includes('token')
      ) {
        safeProps[key] = value;
      }
    }
    return { ...event, properties: safeProps };
  }
}

export const telemetryService = TelemetryService.getInstance();
