import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

// Mock BroadcastChannel BEFORE the source module loads
class MockBroadcastChannel {
  name: string;
  private handlers = new Map<string, Set<EventListener>>();
  postMessage = vi.fn();
  close = vi.fn();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.lastInstance = this;
    MockBroadcastChannel.instances.push(this);
  }

  addEventListener(type: string, handler: EventListener) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }

  removeEventListener(type: string, handler: EventListener) {
    this.handlers.get(type)?.delete(handler);
  }

  simulateMessage(data: unknown) {
    const event = new MessageEvent('message', { data });
    this.handlers.get('message')?.forEach((h) => h(event));
  }

  static lastInstance: MockBroadcastChannel | null = null;
  static instances: MockBroadcastChannel[] = [];
  static reset() {
    MockBroadcastChannel.instances = [];
    MockBroadcastChannel.lastInstance = null;
  }
}

// Install mock BroadcastChannel globally BEFORE module import
const originalBroadcastChannel = globalThis.BroadcastChannel;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.BroadcastChannel = MockBroadcastChannel as any;

vi.mock('@core/services/loggerService', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Static import so V8 coverage instrumentation works
import { useBroadcastState } from './useBroadcastState';

describe('useBroadcastState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Don't reset instances - just clear mocks on the last instance
    // The singleton channel persists but we can clear its mock state
    if (MockBroadcastChannel.lastInstance) {
      MockBroadcastChannel.lastInstance.postMessage.mockClear();
    }
    cleanup();
  });

  afterAll(() => {
    globalThis.BroadcastChannel = originalBroadcastChannel;
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useBroadcastState({ count: 0 }));
    expect(result.current[0]).toEqual({ count: 0 });
  });

  it('should report connected status', () => {
    const { result } = renderHook(() => useBroadcastState({ x: 1 }));
    expect(result.current[2]).toBe(true);
  });

  it('should update state via setBroadcastState', () => {
    const { result } = renderHook(() => useBroadcastState({ name: 'initial' }));

    act(() => result.current[1]({ name: 'updated' }));
    expect(result.current[0].name).toBe('updated');
  });

  it('should broadcast partial update to other tabs', () => {
    const { result } = renderHook(() => useBroadcastState({ a: 1, b: 2 }));

    // Clear any initial postMessage calls (REQUEST_STATE)
    const ch = MockBroadcastChannel.lastInstance!;
    ch.postMessage.mockClear();

    act(() => result.current[1]({ a: 10 }));

    expect(ch.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'STATE_UPDATE_PARTIAL',
        payload: { a: 10 },
      }),
    );
  });

  it('should broadcast full state on replace action', () => {
    const { result } = renderHook(() => useBroadcastState({ x: 1 }));

    const ch = MockBroadcastChannel.lastInstance!;
    ch.postMessage.mockClear();

    act(() => result.current[1]({ x: 99 } as Partial<{ x: number }>, 'replace'));

    expect(ch.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'STATE_UPDATE_FULL',
        payload: { x: 99 },
      }),
    );
  });

  it('should handle incoming partial state update', () => {
    const { result } = renderHook(() => useBroadcastState({ a: 1, b: 2 }));

    act(() => {
      MockBroadcastChannel.lastInstance!.simulateMessage({
        type: 'STATE_UPDATE_PARTIAL',
        payload: { b: 99 },
      });
    });

    expect(result.current[0].b).toBe(99);
    expect(result.current[0].a).toBe(1);
  });

  it('should handle incoming full state replacement', () => {
    const { result } = renderHook(() => useBroadcastState({ x: 1 }));

    act(() => {
      MockBroadcastChannel.lastInstance!.simulateMessage({
        type: 'STATE_UPDATE_FULL',
        payload: { x: 42 },
      });
    });

    expect(result.current[0].x).toBe(42);
  });

  it('should support undo after state change', () => {
    const { result } = renderHook(() => useBroadcastState({ v: 'a' }, 0));

    act(() => result.current[1]({ v: 'b' }));
    expect(result.current[0].v).toBe('b');

    act(() => result.current[3]());
    expect(result.current[0].v).toBe('a');
  });

  it('should support redo after undo', () => {
    const { result } = renderHook(() => useBroadcastState({ v: 'a' }, 0));

    act(() => result.current[1]({ v: 'b' }));
    act(() => result.current[3]());
    expect(result.current[0].v).toBe('a');

    act(() => result.current[4]());
    expect(result.current[0].v).toBe('b');
  });

  it('should report canUndo and canRedo correctly', () => {
    const { result } = renderHook(() => useBroadcastState({ n: 0 }, 0));

    expect(result.current[5]).toBe(false);
    expect(result.current[6]).toBe(false);

    act(() => result.current[1]({ n: 1 }));
    expect(result.current[5]).toBe(true);
    expect(result.current[6]).toBe(false);

    act(() => result.current[3]());
    expect(result.current[5]).toBe(false);
    expect(result.current[6]).toBe(true);
  });

  it('should do nothing on undo when history is empty', () => {
    const { result } = renderHook(() => useBroadcastState({ n: 5 }));

    act(() => result.current[3]());
    expect(result.current[0].n).toBe(5);
  });

  it('should do nothing on redo when future is empty', () => {
    const { result } = renderHook(() => useBroadcastState({ n: 5 }));

    act(() => result.current[4]());
    expect(result.current[0].n).toBe(5);
  });

  it('should request state from other tabs on mount', () => {
    const ch = MockBroadcastChannel.lastInstance;
    // Clear any previous calls
    if (ch) ch.postMessage.mockClear();

    renderHook(() => useBroadcastState({ init: true }));

    // The channel was already created by earlier tests (singleton),
    // so the useEffect won't create a new one, but it still posts REQUEST_STATE
    expect(MockBroadcastChannel.lastInstance!.postMessage).toHaveBeenCalledWith({
      type: 'REQUEST_STATE',
    });
  });

  it('should respond to REQUEST_STATE with current state', () => {
    renderHook(() => useBroadcastState({ data: 'hello' }));

    const ch = MockBroadcastChannel.lastInstance!;
    ch.postMessage.mockClear();

    act(() => {
      ch.simulateMessage({ type: 'REQUEST_STATE' });
    });

    expect(ch.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'STATE_UPDATE_FULL',
      }),
    );
  });
});
