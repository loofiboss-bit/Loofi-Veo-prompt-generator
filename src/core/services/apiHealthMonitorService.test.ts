import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb-keyval
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'mock-store'),
  get: vi.fn((key: string, store?: unknown) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown, store?: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
}));

// Mock circuit breaker service
vi.mock('./circuitBreakerService', () => ({
  circuitBreakerService: {
    registerEndpoint: vi.fn(),
    getState: vi.fn(() => 'closed'),
    canExecute: vi.fn(() => true),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    reset: vi.fn(),
    resetAll: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    hydrate: vi.fn(),
  },
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

import { apiHealthMonitorService } from './apiHealthMonitorService';
import { circuitBreakerService } from './circuitBreakerService';

const tick = () => new Promise((r) => setTimeout(r, 10));

describe('apiHealthMonitorService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStore.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('registerEndpoint', () => {
    it('should register an endpoint for health tracking', () => {
      apiHealthMonitorService.registerEndpoint('api-1');
      const health = apiHealthMonitorService.getEndpointHealth('api-1');

      expect(health).toBeDefined();
      expect(health?.endpointId).toBe('api-1');
      expect(health?.status).toBe('unknown');
      expect(health?.avgLatencyMs).toBe(0);
      expect(health?.errorRate).toBe(0);
    });

    it('should not duplicate registrations', () => {
      apiHealthMonitorService.registerEndpoint('api-2');
      apiHealthMonitorService.registerEndpoint('api-2');

      const state = apiHealthMonitorService.getState();
      const count = Object.keys(state.endpoints).filter((k) => k === 'api-2').length;
      expect(count).toBe(1);
    });
  });

  describe('startRequest callback', () => {
    it('should return a callback function', () => {
      const callback = apiHealthMonitorService.startRequest('api-3');
      expect(typeof callback).toBe('function');
    });

    it('should register endpoint if not already registered', () => {
      apiHealthMonitorService.startRequest('api-4');
      const health = apiHealthMonitorService.getEndpointHealth('api-4');
      expect(health).toBeDefined();
    });

    it('should record latency when callback is invoked', () => {
      const callback = apiHealthMonitorService.startRequest('api-5');

      // Advance time to simulate actual request duration with fake timers
      vi.advanceTimersByTime(50);

      callback(true);

      const health = apiHealthMonitorService.getEndpointHealth('api-5');
      expect(health?.totalRequests).toBe(1);
      expect(health?.avgLatencyMs).toBeGreaterThanOrEqual(0);
      expect(health?.errorRate).toBe(0);
    });

    it('should record failure in callback', () => {
      const callback = apiHealthMonitorService.startRequest('api-6');

      callback(false);

      const health = apiHealthMonitorService.getEndpointHealth('api-6');
      expect(health?.totalRequests).toBe(1);
      expect(health?.errorRate).toBe(1);
    });
  });

  describe('recordLatency', () => {
    it('should record successful requests', () => {
      apiHealthMonitorService.registerEndpoint('api-7');
      apiHealthMonitorService.recordLatency('api-7', 100, true);

      const health = apiHealthMonitorService.getEndpointHealth('api-7');
      expect(health?.totalRequests).toBe(1);
      expect(health?.avgLatencyMs).toBe(100);
      expect(health?.errorRate).toBe(0);
    });

    it('should record failed requests', () => {
      apiHealthMonitorService.registerEndpoint('api-8');
      apiHealthMonitorService.recordLatency('api-8', 50, false);

      const health = apiHealthMonitorService.getEndpointHealth('api-8');
      expect(health?.totalRequests).toBe(1);
      expect(health?.errorRate).toBe(1);
    });

    it('should calculate average latency from successes', () => {
      apiHealthMonitorService.registerEndpoint('api-9');
      apiHealthMonitorService.recordLatency('api-9', 100, true);
      apiHealthMonitorService.recordLatency('api-9', 200, true);
      apiHealthMonitorService.recordLatency('api-9', 50, false);

      const health = apiHealthMonitorService.getEndpointHealth('api-9');
      expect(health?.avgLatencyMs).toBe(150); // Average of 100 and 200
      expect(health?.totalRequests).toBe(3);
    });

    it('should calculate error rate correctly', () => {
      apiHealthMonitorService.registerEndpoint('api-10');
      apiHealthMonitorService.recordLatency('api-10', 100, true);
      apiHealthMonitorService.recordLatency('api-10', 100, true);
      apiHealthMonitorService.recordLatency('api-10', 100, false);
      apiHealthMonitorService.recordLatency('api-10', 100, false);

      const health = apiHealthMonitorService.getEndpointHealth('api-10');
      expect(health?.errorRate).toBe(0.5); // 2 failures out of 4
    });

    it('should prune old records outside rolling window', () => {
      apiHealthMonitorService.registerEndpoint('api-11');
      apiHealthMonitorService.recordLatency('api-11', 100, true);

      // Advance time past rolling window (60s)
      vi.advanceTimersByTime(65_000);

      apiHealthMonitorService.recordLatency('api-11', 100, true);

      const health = apiHealthMonitorService.getEndpointHealth('api-11');
      expect(health?.totalRequests).toBe(1);
    });
  });

  describe('health status classification', () => {
    it('should classify as healthy with low latency and error rate', () => {
      apiHealthMonitorService.registerEndpoint('api-12');
      apiHealthMonitorService.recordLatency('api-12', 500, true);
      apiHealthMonitorService.recordLatency('api-12', 400, true);

      const health = apiHealthMonitorService.getEndpointHealth('api-12');
      expect(health?.status).toBe('healthy');
    });

    it('should classify as degraded with 10%+ error rate', () => {
      apiHealthMonitorService.registerEndpoint('api-13');
      for (let i = 0; i < 9; i++) {
        apiHealthMonitorService.recordLatency('api-13', 100, true);
      }
      apiHealthMonitorService.recordLatency('api-13', 100, false);

      const health = apiHealthMonitorService.getEndpointHealth('api-13');
      expect(health?.status).toBe('degraded');
    });

    it('should classify as unhealthy with 50%+ error rate', () => {
      apiHealthMonitorService.registerEndpoint('api-14');
      apiHealthMonitorService.recordLatency('api-14', 100, true);
      apiHealthMonitorService.recordLatency('api-14', 100, false);

      const health = apiHealthMonitorService.getEndpointHealth('api-14');
      expect(health?.status).toBe('unhealthy');
    });

    it('should classify as degraded with high latency (5s+)', () => {
      apiHealthMonitorService.registerEndpoint('api-15');
      apiHealthMonitorService.recordLatency('api-15', 6000, true);
      apiHealthMonitorService.recordLatency('api-15', 6000, true);

      const health = apiHealthMonitorService.getEndpointHealth('api-15');
      expect(health?.status).toBe('degraded');
    });

    it('should classify as unhealthy with very high latency (15s+)', () => {
      apiHealthMonitorService.registerEndpoint('api-16');
      apiHealthMonitorService.recordLatency('api-16', 16000, true);

      const health = apiHealthMonitorService.getEndpointHealth('api-16');
      expect(health?.status).toBe('unhealthy');
    });

    it('should be unhealthy if circuit is open', () => {
      vi.mocked(circuitBreakerService.getState).mockReturnValue('open');
      apiHealthMonitorService.registerEndpoint('api-17');
      apiHealthMonitorService.recordLatency('api-17', 100, true);

      const health = apiHealthMonitorService.getEndpointHealth('api-17');
      expect(health?.status).toBe('unhealthy');
    });

    it('should be degraded if circuit is half-open', () => {
      vi.mocked(circuitBreakerService.getState).mockReturnValue('half-open');
      apiHealthMonitorService.registerEndpoint('api-18');
      apiHealthMonitorService.recordLatency('api-18', 100, true);

      const health = apiHealthMonitorService.getEndpointHealth('api-18');
      expect(health?.status).toBe('degraded');
    });
  });

  describe('getIsOnline', () => {
    it('should return online status', () => {
      const isOnline = apiHealthMonitorService.getIsOnline();
      expect(typeof isOnline).toBe('boolean');
    });
  });

  describe('event system', () => {
    it('should notify listeners on latency recorded', () => {
      const listener = vi.fn();
      apiHealthMonitorService.subscribe(listener);

      apiHealthMonitorService.registerEndpoint('api-19');
      listener.mockClear();

      apiHealthMonitorService.recordLatency('api-19', 100, true);

      expect(listener).toHaveBeenCalled();
      const state = listener.mock.calls[0][0];
      expect(state.endpoints).toBeDefined();
      expect(state.endpoints['api-19']).toBeDefined();
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = apiHealthMonitorService.subscribe(listener);

      unsubscribe();

      apiHealthMonitorService.registerEndpoint('api-20');
      apiHealthMonitorService.recordLatency('api-20', 100, true);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return full health state', () => {
      apiHealthMonitorService.registerEndpoint('api-21');
      apiHealthMonitorService.recordLatency('api-21', 100, true);

      const state = apiHealthMonitorService.getState();

      expect(state.isOnline).toBeDefined();
      expect(state.endpoints).toBeDefined();
      expect(state.lastGlobalCheckAt).toBeGreaterThan(0);
      expect(state.endpoints['api-21']).toBeDefined();
    });
  });

  describe('hydration', () => {
    it('should hydrate from persisted state', async () => {
      apiHealthMonitorService.registerEndpoint('api-22');
      apiHealthMonitorService.recordLatency('api-22', 100, true);

      await apiHealthMonitorService.hydrate();

      const health = apiHealthMonitorService.getEndpointHealth('api-22');
      expect(health?.totalRequests).toBeGreaterThanOrEqual(1);
    });
  });

  describe('destroy', () => {
    it('should stop periodic check on destroy', () => {
      // destroy() should not throw
      expect(() => {
        apiHealthMonitorService.destroy();
      }).not.toThrow();
    });
  });

  describe('getEndpointHealth', () => {
    it('should return undefined for unregistered endpoint', () => {
      const health = apiHealthMonitorService.getEndpointHealth('non-existent');
      expect(health).toBeUndefined();
    });

    it('should return health data for registered endpoint', () => {
      apiHealthMonitorService.registerEndpoint('api-23');
      const health = apiHealthMonitorService.getEndpointHealth('api-23');

      expect(health).toBeDefined();
      expect(health?.endpointId).toBe('api-23');
      expect(health?.isReachable).toBeDefined();
      expect(health?.lastCheckedAt).toBeDefined();
    });
  });
});
