/**
 * API Health Monitor Service
 * Tracks per-endpoint health (latency, error rates, reachability).
 * Integrates with the circuit breaker for unified resilience status.
 * Persists health snapshots to IndexedDB.
 *
 * Follows ADR-002: Singleton pattern with getInstance()
 *
 * @module apiHealthMonitorService
 * @since v2.5.0
 */

import { createStore, get, set } from 'idb-keyval';
import { logger } from './loggerService';
import { circuitBreakerService } from './circuitBreakerService';
import type { EndpointHealth, EndpointHealthStatus, ApiHealthState } from '@core/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IDB_STORE = createStore('veo-db', 'api-health');
const IDB_KEY = 'api-health-state-v1';
const ROLLING_WINDOW_MS = 60_000; // 1 minute
const HEALTH_CHECK_INTERVAL_MS = 30_000; // 30 seconds
const MAX_LATENCY_SAMPLES = 50;

// Thresholds for health status classification
const DEGRADED_ERROR_RATE = 0.1; // 10%
const UNHEALTHY_ERROR_RATE = 0.5; // 50%
const DEGRADED_LATENCY_MS = 5_000; // 5 seconds
const UNHEALTHY_LATENCY_MS = 15_000; // 15 seconds

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LatencyRecord {
  timestamp: number;
  durationMs: number;
  success: boolean;
}

type HealthListener = (state: ApiHealthState) => void;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class ApiHealthMonitorService {
  private static instance: ApiHealthMonitorService;

  private latencyRecords = new Map<string, LatencyRecord[]>();
  private endpoints = new Map<string, EndpointHealth>();
  private listeners = new Set<HealthListener>();
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private hydrated = false;

  private onlineHandler = () => this.handleOnlineChange(true);
  private offlineHandler = () => this.handleOnlineChange(false);

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }
  }

  static getInstance(): ApiHealthMonitorService {
    if (!ApiHealthMonitorService.instance) {
      ApiHealthMonitorService.instance = new ApiHealthMonitorService();
    }
    return ApiHealthMonitorService.instance;
  }

  // ── Hydration ────────────────────────────────────────────────────────

  /** Restore persisted state and start monitoring */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    try {
      const stored = await get<ApiHealthState>(IDB_KEY, IDB_STORE);
      if (stored?.endpoints) {
        for (const [id, health] of Object.entries(stored.endpoints)) {
          this.endpoints.set(id, health);
        }
        logger.info(`[HealthMonitor] Hydrated ${this.endpoints.size} endpoint(s)`);
      }
    } catch (err) {
      logger.warn('[HealthMonitor] Failed to hydrate from IDB', err);
    }
    this.hydrated = true;
    this.startPeriodicCheck();
  }

  /** Stop monitoring (cleanup) */
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
    }
  }

  // ── Registration ─────────────────────────────────────────────────────

  /** Register an endpoint for health tracking */
  registerEndpoint(endpointId: string): void {
    if (!this.endpoints.has(endpointId)) {
      this.endpoints.set(endpointId, {
        endpointId,
        status: 'unknown',
        avgLatencyMs: 0,
        errorRate: 0,
        totalRequests: 0,
        lastCheckedAt: 0,
        isReachable: this.isOnline,
      });
      this.latencyRecords.set(endpointId, []);
    }
  }

  // ── Recording ────────────────────────────────────────────────────────

  /** Record the start of a request (returns a function to call on completion) */
  startRequest(endpointId: string): (success: boolean) => void {
    this.registerEndpoint(endpointId);
    const startTime = performance.now();

    return (success: boolean) => {
      const durationMs = performance.now() - startTime;
      this.recordLatency(endpointId, durationMs, success);
    };
  }

  /** Record a completed request with known duration */
  recordLatency(endpointId: string, durationMs: number, success: boolean): void {
    this.registerEndpoint(endpointId);

    const records = this.latencyRecords.get(endpointId) ?? [];
    records.push({ timestamp: Date.now(), durationMs, success });

    // Prune old records
    const cutoff = Date.now() - ROLLING_WINDOW_MS;
    const pruned = records.filter((r) => r.timestamp >= cutoff);

    // Limit records to prevent unbounded growth
    if (pruned.length > MAX_LATENCY_SAMPLES) {
      pruned.splice(0, pruned.length - MAX_LATENCY_SAMPLES);
    }

    this.latencyRecords.set(endpointId, pruned);
    this.recalculateHealth(endpointId, pruned);
  }

  // ── Queries ──────────────────────────────────────────────────────────

  /** Get health for a specific endpoint */
  getEndpointHealth(endpointId: string): EndpointHealth | undefined {
    return this.endpoints.get(endpointId);
  }

  /** Get the full health state */
  getState(): ApiHealthState {
    const endpoints: Record<string, EndpointHealth> = {};
    for (const [id, health] of this.endpoints) {
      endpoints[id] = health;
    }
    return {
      isOnline: this.isOnline,
      endpoints,
      lastGlobalCheckAt: Date.now(),
    };
  }

  /** Check if the application is online */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  // ── Event System ─────────────────────────────────────────────────────

  /** Subscribe to health state changes */
  subscribe(listener: HealthListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Internals ────────────────────────────────────────────────────────

  private recalculateHealth(endpointId: string, records: LatencyRecord[]): void {
    const health = this.endpoints.get(endpointId);
    if (!health) return;

    const total = records.length;
    const failures = records.filter((r) => !r.success).length;
    const successRecords = records.filter((r) => r.success);

    health.totalRequests = total;
    health.errorRate = total > 0 ? failures / total : 0;
    health.avgLatencyMs =
      successRecords.length > 0
        ? successRecords.reduce((sum, r) => sum + r.durationMs, 0) / successRecords.length
        : 0;
    health.lastCheckedAt = Date.now();
    health.isReachable = this.isOnline;

    // Determine status from circuit breaker state + metrics
    health.status = this.classifyHealth(endpointId, health);

    this.notifyListeners();
    this.persist();
  }

  private classifyHealth(endpointId: string, health: EndpointHealth): EndpointHealthStatus {
    // Check circuit breaker state
    const cbState = circuitBreakerService.getState(endpointId);
    if (cbState === 'open') return 'unhealthy';
    if (cbState === 'half-open') return 'degraded';

    if (!this.isOnline) return 'unhealthy';

    // Check error rate
    if (health.errorRate >= UNHEALTHY_ERROR_RATE) return 'unhealthy';
    if (health.errorRate >= DEGRADED_ERROR_RATE) return 'degraded';

    // Check latency
    if (health.avgLatencyMs >= UNHEALTHY_LATENCY_MS) return 'unhealthy';
    if (health.avgLatencyMs >= DEGRADED_LATENCY_MS) return 'degraded';

    if (health.totalRequests === 0) return 'unknown';

    return 'healthy';
  }

  private handleOnlineChange(online: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = online;

    if (wasOnline !== online) {
      logger.info(`[HealthMonitor] Network status: ${online ? 'online' : 'offline'}`);

      // Update all endpoint reachability
      for (const health of this.endpoints.values()) {
        health.isReachable = online;
        if (!online) {
          health.status = 'unhealthy';
        }
      }

      this.notifyListeners();
      this.persist();
    }
  }

  private startPeriodicCheck(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      // Prune stale records and recalculate health for all endpoints
      const cutoff = Date.now() - ROLLING_WINDOW_MS;
      for (const [id, records] of this.latencyRecords) {
        const pruned = records.filter((r) => r.timestamp >= cutoff);
        this.latencyRecords.set(id, pruned);
        this.recalculateHealth(id, pruned);
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        logger.warn('[HealthMonitor] Listener error', err);
      }
    }
  }

  private async persist(): Promise<void> {
    try {
      await set(IDB_KEY, this.getState(), IDB_STORE);
    } catch (err) {
      logger.warn('[HealthMonitor] Failed to persist state', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const apiHealthMonitorService = ApiHealthMonitorService.getInstance();
