import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockSetState, mockSubscribe } = vi.hoisted(() => ({
  mockSetState: vi.fn(),
  mockSubscribe: vi.fn(() => vi.fn()),
}));

// BroadcastChannel mock
let lastChannel: {
  onmessage: ((event: { data: unknown }) => void) | null;
  postMessage: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
} | null = null;

class MockBroadcastChannel {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();
  constructor(_name: string) {
    lastChannel = this;
  }
}

vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: {
    setState: mockSetState,
    subscribe: mockSubscribe,
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { useAppSync } from './useAppSync';

describe('useAppSync', () => {
  beforeEach(() => {
    lastChannel = null;
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
  });

  it('should return connected status', () => {
    const { result } = renderHook(() => useAppSync());
    expect(result.current).toBe(true);
  });

  it('should create a BroadcastChannel', () => {
    renderHook(() => useAppSync());
    expect(lastChannel).not.toBeNull();
  });

  it('should subscribe to store changes', () => {
    renderHook(() => useAppSync());
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('should update store when receiving state update messages', () => {
    renderHook(() => useAppSync());

    const payload = { description: 'test prompt' };
    lastChannel?.onmessage?.({ data: { type: 'STATE_UPDATE', payload } });

    expect(mockSetState).toHaveBeenCalledWith({ promptState: payload });
  });

  it('should ignore messages without STATE_UPDATE type', () => {
    renderHook(() => useAppSync());

    lastChannel?.onmessage?.({ data: { type: 'OTHER', payload: {} } });

    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('should ignore messages without data', () => {
    renderHook(() => useAppSync());

    lastChannel?.onmessage?.({ data: null });

    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('should broadcast store changes', () => {
    renderHook(() => useAppSync());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscriberCallback = (mockSubscribe as any).mock.calls[0][0] as (
      state: Record<string, unknown>,
    ) => void;
    const mockState = { promptState: { description: 'broadcast test' } };
    subscriberCallback(mockState);

    expect(lastChannel?.postMessage).toHaveBeenCalledWith({
      type: 'STATE_UPDATE',
      payload: mockState.promptState,
    });
  });

  it('should close channel on unmount', () => {
    const { unmount } = renderHook(() => useAppSync());

    unmount();

    expect(lastChannel?.close).toHaveBeenCalled();
  });

  it('should unsubscribe from store on unmount', () => {
    const unsubscribe = vi.fn();
    mockSubscribe.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useAppSync());
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should return false when BroadcastChannel fails', () => {
    vi.stubGlobal(
      'BroadcastChannel',
      class {
        constructor() {
          throw new Error('Not supported');
        }
      },
    );

    const { result } = renderHook(() => useAppSync());
    expect(result.current).toBe(false);
  });
});
