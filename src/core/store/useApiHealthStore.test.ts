/**
 * useApiHealthStore Tests
 *
 * Verifies that the store correctly:
 * 1. Initializes from apiHealthMonitorService state
 * 2. Refresh action pulls latest service state
 * 3. Subscribe callback updates state when service changes
 * 4. Online/offline window events update isOnline from navigator.onLine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ApiHealthState, EndpointHealth } from '@core/types';

// Hoisted mock variables (available before module imports)
const { mockGetState, mockGetIsOnline, mockSubscribe, getSubscribeCallback } = vi.hoisted(() => {
  let capturedSubscribeCallback: ((state: ApiHealthState) => void) | null = null;

  return {
    mockGetState: vi.fn().mockReturnValue({
      endpoints: {},
      isOnline: true,
      lastGlobalCheckAt: Date.now(),
    }),
    mockGetIsOnline: vi.fn().mockReturnValue(true),
    mockSubscribe: vi.fn().mockImplementation((callback: (state: ApiHealthState) => void) => {
      capturedSubscribeCallback = callback;
      return () => {}; // Cleanup function
    }),
    getSubscribeCallback: () => capturedSubscribeCallback,
  };
});

vi.mock('@core/services/apiHealthMonitorService', () => ({
  apiHealthMonitorService: {
    getState: mockGetState,
    getIsOnline: mockGetIsOnline,
    subscribe: mockSubscribe,
  },
}));

// Mock idb-keyval (not used by store, but imported by service)
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  createStore: vi.fn(),
  update: vi.fn(),
}));

import { useApiHealthStore } from './useApiHealthStore';

describe('useApiHealthStore', () => {
  const mockEndpoints: Record<string, EndpointHealth> = {
    'api.example.com': {
      endpointId: 'api.example.com',
      status: 'healthy',
      avgLatencyMs: 150,
      errorRate: 0.02,
      totalRequests: 100,
      lastCheckedAt: Date.now(),
      isReachable: true,
    },
  };

  beforeEach(() => {
    // Reset store state
    useApiHealthStore.setState({
      endpoints: {},
      isOnline: false,
      refresh: useApiHealthStore.getState().refresh,
    });

    // Reset mock return values (but not call counts from initialization)
    mockGetState.mockReturnValue({
      endpoints: mockEndpoints,
      isOnline: true,
      lastGlobalCheckAt: Date.now(),
    });
    mockGetIsOnline.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes from apiHealthMonitorService state', () => {
    // Store was already initialized on import
    // Verify it subscribed and got initial state
    expect(mockSubscribe).toHaveBeenCalled();
    expect(mockGetState).toHaveBeenCalled();
    expect(mockGetIsOnline).toHaveBeenCalled();
  });

  it('refresh action pulls latest service state', () => {
    const updatedEndpoints: Record<string, EndpointHealth> = {
      'api.example.com': {
        ...mockEndpoints['api.example.com'],
        status: 'degraded' as const,
        avgLatencyMs: 5500,
      },
    };

    mockGetState.mockReturnValue({
      endpoints: updatedEndpoints,
      isOnline: false,
      lastGlobalCheckAt: Date.now(),
    });
    mockGetIsOnline.mockReturnValue(false);

    useApiHealthStore.getState().refresh();

    const state = useApiHealthStore.getState();
    expect(state.endpoints).toEqual(updatedEndpoints);
    expect(state.isOnline).toBe(false);
    expect(mockGetState).toHaveBeenCalledTimes(2); // once at init, once for refresh
    expect(mockGetIsOnline).toHaveBeenCalledTimes(2);
  });

  it('subscribe callback updates state when service changes', () => {
    const capturedSubscribeCallback = getSubscribeCallback();
    expect(capturedSubscribeCallback).not.toBeNull();

    const newEndpoints: Record<string, EndpointHealth> = {
      'api.new.com': {
        endpointId: 'api.new.com',
        status: 'unhealthy',
        avgLatencyMs: 15000,
        errorRate: 0.6,
        totalRequests: 50,
        lastCheckedAt: Date.now(),
        isReachable: false,
      },
    };

    // Update mock service state
    mockGetState.mockReturnValue({
      endpoints: newEndpoints,
      isOnline: false,
      lastGlobalCheckAt: Date.now(),
    });
    mockGetIsOnline.mockReturnValue(false);

    // Trigger the subscribe callback
    capturedSubscribeCallback!({
      endpoints: newEndpoints,
      isOnline: false,
      lastGlobalCheckAt: Date.now(),
    });

    const state = useApiHealthStore.getState();
    expect(state.endpoints).toEqual(newEndpoints);
    expect(state.isOnline).toBe(false);
  });

  it('online event updates isOnline from navigator.onLine', () => {
    // Mock navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });

    // Dispatch online event
    window.dispatchEvent(new Event('online'));

    const state = useApiHealthStore.getState();
    expect(state.isOnline).toBe(true);
  });

  it('offline event updates isOnline from navigator.onLine', () => {
    // Set initial state to online
    useApiHealthStore.setState({ isOnline: true });

    // Mock navigator.onLine to false
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: false,
    });

    // Dispatch offline event
    window.dispatchEvent(new Event('offline'));

    const state = useApiHealthStore.getState();
    expect(state.isOnline).toBe(false);
  });
});
