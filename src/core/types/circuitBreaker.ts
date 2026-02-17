/**
 * Circuit Breaker Types
 * Defines interfaces for the circuit breaker pattern (open/half-open/closed).
 *
 * @module circuitBreaker
 * @since v2.5.0
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Circuit breaker state following the classic state machine pattern */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Configuration for a circuit breaker instance */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Duration in ms the circuit stays open before transitioning to half-open */
  cooldownMs: number;
  /** Number of successful probe requests in half-open to close the circuit */
  successThreshold: number;
  /** Rolling window duration in ms for tracking failures (default: 60_000) */
  rollingWindowMs: number;
  /** Maximum number of concurrent probe requests in half-open state */
  halfOpenMaxProbes: number;
}

/** Default circuit breaker configuration */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 30_000,
  successThreshold: 2,
  rollingWindowMs: 60_000,
  halfOpenMaxProbes: 1,
};

// ---------------------------------------------------------------------------
// Metrics & State
// ---------------------------------------------------------------------------

/** Timestamped failure record within the rolling window */
export interface FailureRecord {
  timestamp: number;
  error: string;
  errorType?: string;
}

/** Real-time metrics for a single circuit breaker */
export interface CircuitBreakerMetrics {
  /** Total failures within the rolling window */
  failureCount: number;
  /** Total successes within the rolling window */
  successCount: number;
  /** Consecutive successful probes in half-open state */
  consecutiveSuccesses: number;
  /** Rolling window failure records */
  recentFailures: FailureRecord[];
  /** Timestamp of the last failure */
  lastFailureAt: number | null;
  /** Timestamp of the last success */
  lastSuccessAt: number | null;
}

/** Persisted state for a single endpoint's circuit breaker */
export interface CircuitBreakerEntry {
  /** The endpoint identifier (e.g., 'gemini-prompt', 'veo-generate') */
  endpointId: string;
  /** Current state of the circuit */
  state: CircuitBreakerState;
  /** Timestamp when the circuit transitioned to the current state */
  stateChangedAt: number;
  /** Circuit breaker metrics */
  metrics: CircuitBreakerMetrics;
  /** Configuration overrides for this endpoint (merged with defaults) */
  config: CircuitBreakerConfig;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Event types emitted by the circuit breaker */
export type CircuitBreakerEventType =
  | 'state-change'
  | 'failure-recorded'
  | 'success-recorded'
  | 'probe-started'
  | 'reset';

/** Event payload for circuit breaker state transitions */
export interface CircuitBreakerEvent {
  type: CircuitBreakerEventType;
  endpointId: string;
  previousState?: CircuitBreakerState;
  currentState: CircuitBreakerState;
  metrics: CircuitBreakerMetrics;
  timestamp: number;
}

/** Listener callback type for circuit breaker events */
export type CircuitBreakerListener = (event: CircuitBreakerEvent) => void;
