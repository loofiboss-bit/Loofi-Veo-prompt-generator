/**
 * Circuit Breaker Service
 * Implements the circuit breaker pattern (closed → open → half-open → closed)
 * for resilient API calls. Tracks per-endpoint failure/success metrics and
 * persists state to IndexedDB.
 *
 * Follows ADR-002: Singleton pattern with getInstance()
 *
 * @module circuitBreakerService
 * @since v2.5.0
 */

import { createStore, get, set } from 'idb-keyval';
import { logger } from './loggerService';
import type {
  CircuitBreakerConfig,
  CircuitBreakerEntry,
  CircuitBreakerEvent,
  CircuitBreakerEventType,
  CircuitBreakerListener,
  CircuitBreakerMetrics,
  CircuitBreakerState,
  FailureRecord,
} from '@core/types';
import { DEFAULT_CIRCUIT_BREAKER_CONFIG } from '@core/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IDB_STORE = createStore('veo-db', 'circuit-breaker');
const IDB_KEY = 'circuit-breaker-state-v1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEmptyMetrics(): CircuitBreakerMetrics {
  return {
    failureCount: 0,
    successCount: 0,
    consecutiveSuccesses: 0,
    recentFailures: [],
    lastFailureAt: null,
    lastSuccessAt: null,
  };
}

function createEntry(
  endpointId: string,
  config: Partial<CircuitBreakerConfig> = {},
): CircuitBreakerEntry {
  return {
    endpointId,
    state: 'closed',
    stateChangedAt: Date.now(),
    metrics: createEmptyMetrics(),
    config: { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config },
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class CircuitBreakerService {
  private static instance: CircuitBreakerService;

  private entries = new Map<string, CircuitBreakerEntry>();
  private listeners = new Set<CircuitBreakerListener>();
  private hydrated = false;

  private constructor() {
    // Intentionally empty — call hydrate() after construction
  }

  static getInstance(): CircuitBreakerService {
    if (!CircuitBreakerService.instance) {
      CircuitBreakerService.instance = new CircuitBreakerService();
    }
    return CircuitBreakerService.instance;
  }

  // ── Hydration ────────────────────────────────────────────────────────

  /** Restore persisted state from IndexedDB */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    try {
      const stored = await get<Record<string, CircuitBreakerEntry>>(IDB_KEY, IDB_STORE);
      if (stored) {
        for (const [id, entry] of Object.entries(stored)) {
          this.entries.set(id, entry);
        }
        logger.info(`[CircuitBreaker] Hydrated ${this.entries.size} endpoint(s)`);
      }
    } catch (err) {
      logger.warn('[CircuitBreaker] Failed to hydrate from IDB', err);
    }
    this.hydrated = true;
  }

  // ── Registration ─────────────────────────────────────────────────────

  /** Register an endpoint with optional config overrides */
  registerEndpoint(endpointId: string, config: Partial<CircuitBreakerConfig> = {}): void {
    if (!this.entries.has(endpointId)) {
      this.entries.set(endpointId, createEntry(endpointId, config));
      logger.debug(`[CircuitBreaker] Registered endpoint: ${endpointId}`);
    }
  }

  // ── State Queries ────────────────────────────────────────────────────

  /** Get the current state of a circuit breaker */
  getState(endpointId: string): CircuitBreakerState {
    const entry = this.getOrCreateEntry(endpointId);
    // Check if an open circuit should transition to half-open
    if (entry.state === 'open') {
      const elapsed = Date.now() - entry.stateChangedAt;
      if (elapsed >= entry.config.cooldownMs) {
        this.transitionState(entry, 'half-open');
      }
    }
    return entry.state;
  }

  /** Check if requests can proceed through the circuit */
  canExecute(endpointId: string): boolean {
    const state = this.getState(endpointId);
    if (state === 'closed') return true;
    if (state === 'open') return false;
    // half-open: allow limited probes
    const entry = this.entries.get(endpointId)!;
    return entry.metrics.consecutiveSuccesses < entry.config.halfOpenMaxProbes;
  }

  /** Get the full entry for an endpoint */
  getEntry(endpointId: string): CircuitBreakerEntry | undefined {
    return this.entries.get(endpointId);
  }

  /** Get all registered entries */
  getAllEntries(): CircuitBreakerEntry[] {
    return Array.from(this.entries.values());
  }

  // ── Recording ────────────────────────────────────────────────────────

  /** Record a successful request */
  recordSuccess(endpointId: string): void {
    const entry = this.getOrCreateEntry(endpointId);
    const now = Date.now();

    entry.metrics.successCount++;
    entry.metrics.lastSuccessAt = now;
    entry.metrics.consecutiveSuccesses++;

    if (entry.state === 'half-open') {
      if (entry.metrics.consecutiveSuccesses >= entry.config.successThreshold) {
        this.transitionState(entry, 'closed');
        // Reset metrics on close
        entry.metrics = createEmptyMetrics();
        entry.metrics.lastSuccessAt = now;
      }
    }

    this.emit('success-recorded', entry);
    this.persist();
  }

  /** Record a failed request */
  recordFailure(endpointId: string, error: string, errorType?: string): void {
    const entry = this.getOrCreateEntry(endpointId);
    const now = Date.now();

    // Prune failures outside the rolling window
    this.pruneWindow(entry);

    const record: FailureRecord = { timestamp: now, error, errorType };
    entry.metrics.recentFailures.push(record);
    entry.metrics.failureCount = entry.metrics.recentFailures.length;
    entry.metrics.lastFailureAt = now;
    entry.metrics.consecutiveSuccesses = 0;

    if (entry.state === 'half-open') {
      // Any failure in half-open trips back to open
      this.transitionState(entry, 'open');
    } else if (entry.state === 'closed') {
      if (entry.metrics.failureCount >= entry.config.failureThreshold) {
        this.transitionState(entry, 'open');
      }
    }

    this.emit('failure-recorded', entry);
    this.persist();
  }

  // ── Manual Controls ──────────────────────────────────────────────────

  /** Force-reset a circuit breaker to closed */
  reset(endpointId: string): void {
    const entry = this.entries.get(endpointId);
    if (!entry) return;

    const previousState = entry.state;
    entry.state = 'closed';
    entry.stateChangedAt = Date.now();
    entry.metrics = createEmptyMetrics();

    this.emit('reset', entry, previousState);
    this.persist();
    logger.info(`[CircuitBreaker] Reset endpoint: ${endpointId}`);
  }

  /** Reset all circuit breakers */
  resetAll(): void {
    for (const endpointId of this.entries.keys()) {
      this.reset(endpointId);
    }
  }

  // ── Event System ─────────────────────────────────────────────────────

  /** Subscribe to circuit breaker events */
  subscribe(listener: CircuitBreakerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Internals ────────────────────────────────────────────────────────

  private getOrCreateEntry(endpointId: string): CircuitBreakerEntry {
    let entry = this.entries.get(endpointId);
    if (!entry) {
      entry = createEntry(endpointId);
      this.entries.set(endpointId, entry);
    }
    return entry;
  }

  private transitionState(entry: CircuitBreakerEntry, newState: CircuitBreakerState): void {
    const previousState = entry.state;
    if (previousState === newState) return;

    entry.state = newState;
    entry.stateChangedAt = Date.now();

    if (newState === 'half-open') {
      entry.metrics.consecutiveSuccesses = 0;
    }

    logger.info(`[CircuitBreaker] ${entry.endpointId}: ${previousState} → ${newState}`);

    this.emit('state-change', entry, previousState);
  }

  private pruneWindow(entry: CircuitBreakerEntry): void {
    const cutoff = Date.now() - entry.config.rollingWindowMs;
    entry.metrics.recentFailures = entry.metrics.recentFailures.filter(
      (f) => f.timestamp >= cutoff,
    );
    entry.metrics.failureCount = entry.metrics.recentFailures.length;
  }

  private emit(
    type: CircuitBreakerEventType,
    entry: CircuitBreakerEntry,
    previousState?: CircuitBreakerState,
  ): void {
    const event: CircuitBreakerEvent = {
      type,
      endpointId: entry.endpointId,
      previousState,
      currentState: entry.state,
      metrics: { ...entry.metrics },
      timestamp: Date.now(),
    };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        logger.warn('[CircuitBreaker] Listener error', err);
      }
    }
  }

  private async persist(): Promise<void> {
    try {
      const data: Record<string, CircuitBreakerEntry> = {};
      for (const [id, entry] of this.entries) {
        data[id] = entry;
      }
      await set(IDB_KEY, data, IDB_STORE);
    } catch (err) {
      logger.warn('[CircuitBreaker] Failed to persist state', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const circuitBreakerService = CircuitBreakerService.getInstance();
