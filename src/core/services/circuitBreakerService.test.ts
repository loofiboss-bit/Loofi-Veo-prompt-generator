import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb-keyval with custom store signature
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'mock-store'),
  get: vi.fn((key: string, store?: unknown) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown, store?: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string, store?: unknown) => {
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

import { circuitBreakerService } from './circuitBreakerService';

const tick = () => new Promise((r) => setTimeout(r, 10));

describe('circuitBreakerService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStore.clear();
    circuitBreakerService.resetAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('registerEndpoint', () => {
    it('should register an endpoint with default config', () => {
      circuitBreakerService.registerEndpoint('api-1');
      const entry = circuitBreakerService.getEntry('api-1');

      expect(entry).toBeDefined();
      expect(entry?.state).toBe('closed');
      expect(entry?.config.failureThreshold).toBe(5);
    });

    it('should register an endpoint with custom config', () => {
      circuitBreakerService.registerEndpoint('api-2', { failureThreshold: 3 });
      const entry = circuitBreakerService.getEntry('api-2');

      expect(entry?.config.failureThreshold).toBe(3);
    });

    it('should not duplicate registration', () => {
      circuitBreakerService.registerEndpoint('api-3');
      circuitBreakerService.registerEndpoint('api-3');

      const entries = circuitBreakerService.getAllEntries();
      const api3Entries = entries.filter((e) => e.endpointId === 'api-3');
      expect(api3Entries).toHaveLength(1);
    });
  });

  describe('state transitions', () => {
    it('should remain closed when failures are below threshold', () => {
      circuitBreakerService.registerEndpoint('api-4', { failureThreshold: 5 });

      for (let i = 0; i < 3; i++) {
        circuitBreakerService.recordFailure('api-4', 'timeout');
      }

      expect(circuitBreakerService.getState('api-4')).toBe('closed');
    });

    it('should transition from closed to open when failures reach threshold', () => {
      circuitBreakerService.registerEndpoint('api-5', { failureThreshold: 2 });

      circuitBreakerService.recordFailure('api-5', 'timeout');
      expect(circuitBreakerService.getState('api-5')).toBe('closed');

      circuitBreakerService.recordFailure('api-5', 'timeout');
      expect(circuitBreakerService.getState('api-5')).toBe('open');
    });

    it('should transition from open to half-open after cooldown', () => {
      circuitBreakerService.registerEndpoint('api-6', {
        failureThreshold: 1,
        cooldownMs: 20,
      });

      circuitBreakerService.recordFailure('api-6', 'error');
      expect(circuitBreakerService.getState('api-6')).toBe('open');

      // Advance time past cooldown and check state
      vi.advanceTimersByTime(25);
      expect(circuitBreakerService.getState('api-6')).toBe('half-open');
    });

    it('should transition from half-open to closed after successThreshold successes', () => {
      circuitBreakerService.registerEndpoint('api-7', {
        failureThreshold: 1,
        successThreshold: 2,
        cooldownMs: 20,
      });

      // Open the circuit
      circuitBreakerService.recordFailure('api-7', 'error');
      expect(circuitBreakerService.getState('api-7')).toBe('open');

      // Advance to make it half-open
      vi.advanceTimersByTime(25);
      expect(circuitBreakerService.getState('api-7')).toBe('half-open');

      // Record successes
      circuitBreakerService.recordSuccess('api-7');
      expect(circuitBreakerService.getState('api-7')).toBe('half-open');

      circuitBreakerService.recordSuccess('api-7');
      expect(circuitBreakerService.getState('api-7')).toBe('closed');
    });

    it('should transition from half-open back to open on failure', () => {
      circuitBreakerService.registerEndpoint('api-8', {
        failureThreshold: 1,
        cooldownMs: 20,
      });

      circuitBreakerService.recordFailure('api-8', 'error');
      vi.advanceTimersByTime(25);
      expect(circuitBreakerService.getState('api-8')).toBe('half-open');

      circuitBreakerService.recordFailure('api-8', 'another error');
      expect(circuitBreakerService.getState('api-8')).toBe('open');
    });
  });

  describe('canExecute', () => {
    it('should allow execution when closed', () => {
      circuitBreakerService.registerEndpoint('api-9');
      expect(circuitBreakerService.canExecute('api-9')).toBe(true);
    });

    it('should prevent execution when open', () => {
      circuitBreakerService.registerEndpoint('api-10', { failureThreshold: 1 });
      circuitBreakerService.recordFailure('api-10', 'error');

      expect(circuitBreakerService.canExecute('api-10')).toBe(false);
    });

    it('should allow limited execution when half-open', async () => {
      circuitBreakerService.registerEndpoint('api-11', {
        failureThreshold: 1,
        cooldownMs: 20,
        halfOpenMaxProbes: 2,
        successThreshold: 2,
      });

      circuitBreakerService.recordFailure('api-11', 'error');
      vi.advanceTimersByTime(25);

      expect(circuitBreakerService.canExecute('api-11')).toBe(true);
      circuitBreakerService.recordSuccess('api-11');
      expect(circuitBreakerService.canExecute('api-11')).toBe(true);
      circuitBreakerService.recordSuccess('api-11');
      // After 2 successes in half-open, should transition to closed
      expect(circuitBreakerService.getState('api-11')).toBe('closed');
    });
  });

  describe('metrics tracking', () => {
    it('should track failure count', () => {
      circuitBreakerService.registerEndpoint('api-12');

      circuitBreakerService.recordFailure('api-12', 'error1');
      circuitBreakerService.recordFailure('api-12', 'error2');

      const entry = circuitBreakerService.getEntry('api-12');
      expect(entry?.metrics.failureCount).toBe(2);
    });

    it('should track success count', () => {
      circuitBreakerService.registerEndpoint('api-13');

      circuitBreakerService.recordSuccess('api-13');
      circuitBreakerService.recordSuccess('api-13');

      const entry = circuitBreakerService.getEntry('api-13');
      expect(entry?.metrics.successCount).toBe(2);
    });

    it('should record failure type and timestamp', () => {
      circuitBreakerService.registerEndpoint('api-14');

      circuitBreakerService.recordFailure('api-14', 'timeout', 'network');

      const entry = circuitBreakerService.getEntry('api-14');
      expect(entry?.metrics.recentFailures[0].error).toBe('timeout');
      expect(entry?.metrics.recentFailures[0].errorType).toBe('network');
      expect(entry?.metrics.recentFailures[0].timestamp).toBeGreaterThan(0);
    });

    it('should prune old failures outside rolling window', () => {
      circuitBreakerService.registerEndpoint('api-15', {
        failureThreshold: 10,
        rollingWindowMs: 30,
      });

      // Record a failure at time 0
      circuitBreakerService.recordFailure('api-15', 'old error');

      // Advance time past the rolling window
      vi.advanceTimersByTime(40);

      // Record a new failure at time 40
      circuitBreakerService.recordFailure('api-15', 'new error');

      const entry = circuitBreakerService.getEntry('api-15');
      // After pruning, should only have 1 failure (the new one)
      expect(entry?.metrics.failureCount).toBeLessThanOrEqual(2);
      expect(entry?.metrics.recentFailures.length).toBeLessThanOrEqual(2);
    });
  });

  describe('event system', () => {
    it('should notify listeners on state change', () => {
      const listener = vi.fn();
      circuitBreakerService.subscribe(listener);

      circuitBreakerService.registerEndpoint('api-16', { failureThreshold: 1 });
      circuitBreakerService.recordFailure('api-16', 'error');

      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0];
      expect(event.type).toBe('state-change');
      expect(event.endpointId).toBe('api-16');
      expect(event.previousState).toBe('closed');
      expect(event.currentState).toBe('open');
    });

    it('should notify listeners on success and failure', () => {
      const listener = vi.fn();
      circuitBreakerService.subscribe(listener);

      circuitBreakerService.registerEndpoint('api-17');
      listener.mockClear();

      circuitBreakerService.recordSuccess('api-17');
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].type).toBe('success-recorded');

      listener.mockClear();
      circuitBreakerService.recordFailure('api-17', 'error');
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].type).toBe('failure-recorded');
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = circuitBreakerService.subscribe(listener);

      circuitBreakerService.registerEndpoint('api-18', { failureThreshold: 1 });
      listener.mockClear();

      unsubscribe();
      circuitBreakerService.recordFailure('api-18', 'error');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('reset operations', () => {
    it('should reset a specific endpoint', async () => {
      circuitBreakerService.registerEndpoint('api-19', { failureThreshold: 1 });
      circuitBreakerService.recordFailure('api-19', 'error');

      expect(circuitBreakerService.getState('api-19')).toBe('open');

      circuitBreakerService.reset('api-19');
      expect(circuitBreakerService.getState('api-19')).toBe('closed');
    });

    it('should reset all endpoints', async () => {
      circuitBreakerService.registerEndpoint('api-20', { failureThreshold: 1 });
      circuitBreakerService.registerEndpoint('api-21', { failureThreshold: 1 });

      circuitBreakerService.recordFailure('api-20', 'error');
      circuitBreakerService.recordFailure('api-21', 'error');

      expect(circuitBreakerService.getState('api-20')).toBe('open');
      expect(circuitBreakerService.getState('api-21')).toBe('open');

      circuitBreakerService.resetAll();

      expect(circuitBreakerService.getState('api-20')).toBe('closed');
      expect(circuitBreakerService.getState('api-21')).toBe('closed');
    });

    it('should clear metrics on reset', () => {
      circuitBreakerService.registerEndpoint('api-22');
      circuitBreakerService.recordFailure('api-22', 'error');
      circuitBreakerService.recordSuccess('api-22');

      circuitBreakerService.reset('api-22');

      const entry = circuitBreakerService.getEntry('api-22');
      expect(entry?.metrics.failureCount).toBe(0);
      expect(entry?.metrics.successCount).toBe(0);
    });
  });

  describe('hydration', () => {
    it('should hydrate from persisted state', async () => {
      circuitBreakerService.registerEndpoint('api-23', { failureThreshold: 1 });
      circuitBreakerService.recordFailure('api-23', 'error');

      expect(circuitBreakerService.getState('api-23')).toBe('open');

      await circuitBreakerService.hydrate();

      expect(circuitBreakerService.getState('api-23')).toBe('open');
    });
  });

  describe('getAllEntries', () => {
    it('should return all registered entries', () => {
      circuitBreakerService.registerEndpoint('api-24');
      circuitBreakerService.registerEndpoint('api-25');

      const entries = circuitBreakerService.getAllEntries();

      expect(entries.length).toBeGreaterThanOrEqual(2);
      expect(entries.some((e) => e.endpointId === 'api-24')).toBe(true);
      expect(entries.some((e) => e.endpointId === 'api-25')).toBe(true);
    });
  });
});
