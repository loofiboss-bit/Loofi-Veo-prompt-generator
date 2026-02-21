import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const {
  mockSetFullState,
  mockSetConnectionStatus,
  mockSetPeers,
  mockAwarenessSetLocalState,
  mockAwarenessSetLocalStateField,
  mockProviderDisconnect,
  mockProviderDestroy,
  MockDoc,
  MockWebrtcProvider,
} = vi.hoisted(() => {
  const mockAwarenessSetLocalState = vi.fn();
  const mockAwarenessSetLocalStateField = vi.fn();
  const mockAwarenessGetStates = vi.fn().mockReturnValue(new Map());
  const mockAwarenessOn = vi.fn();
  const mockProviderDisconnect = vi.fn();
  const mockProviderDestroy = vi.fn();

  // Use function declaration so it can be called with `new`
  const MockDoc = vi.fn(function (this: Record<string, unknown>) {
    this.getMap = vi.fn().mockReturnValue({
      set: vi.fn(),
      get: vi.fn(),
      toJSON: vi.fn().mockReturnValue({}),
      size: 0,
    });
    this.getArray = vi.fn().mockReturnValue({
      insert: vi.fn(),
      delete: vi.fn(),
      toJSON: vi.fn().mockReturnValue([]),
      length: 0,
    });
    this.getText = vi.fn().mockReturnValue({
      insert: vi.fn(),
      delete: vi.fn(),
      toString: vi.fn().mockReturnValue(''),
      length: 0,
    });
    this.transact = vi.fn((fn: () => void) => fn());
    this.on = vi.fn();
    this.destroy = vi.fn();
  });

  const MockWebrtcProvider = vi.fn(function (this: Record<string, unknown>) {
    this.awareness = {
      setLocalState: mockAwarenessSetLocalState,
      setLocalStateField: mockAwarenessSetLocalStateField,
      getStates: mockAwarenessGetStates,
      on: mockAwarenessOn,
    };
    this.disconnect = mockProviderDisconnect;
    this.destroy = mockProviderDestroy;
  });

  return {
    mockSetFullState: vi.fn(),
    mockSetConnectionStatus: vi.fn(),
    mockSetPeers: vi.fn(),
    mockAwarenessSetLocalState,
    mockAwarenessSetLocalStateField,

    mockProviderDisconnect,
    mockProviderDestroy,
    MockDoc,
    MockWebrtcProvider,
  };
});

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: () => ({
    promptState: { idea: 'Test' },
    sbGlobalContext: { style: 'Cinematic' },
    sbShots: [],
    tracks: [],
    clips: [],
    seriesBible: '',
    setFullState: mockSetFullState,
  }),
}));

vi.mock('@core/store/useCollaborationStore', () => {
  const store = {
    currentUser: { id: 'user1', displayName: 'TestUser', avatarColor: '#3b82f6' },
    setConnectionStatus: (...args: unknown[]) => mockSetConnectionStatus(...args),
    setPeers: (...args: unknown[]) => mockSetPeers(...args),
    activeRoom: null,
    comments: [],
  };
  return {
    useCollaborationStore: Object.assign(() => store, { getState: () => store }),
  };
});

vi.mock('@core/services/permissionService', () => ({
  permissionService: {
    hasPermission: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('yjs', () => ({ Doc: MockDoc }));

vi.mock('y-webrtc', () => ({ WebrtcProvider: MockWebrtcProvider }));

import { useCollaborativeProject } from './useCollaborativeProject';

describe('useCollaborativeProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start disconnected', () => {
    const { result } = renderHook(() => useCollaborativeProject());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.roomId).toBeNull();
    expect(result.current.activeUsers).toEqual([]);
  });

  it('should connect to a room', () => {
    const { result } = renderHook(() => useCollaborativeProject());

    act(() => {
      result.current.connectToRoom('test-room');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.roomId).toBe('test-room');
    expect(mockSetConnectionStatus).toHaveBeenCalledWith('connecting');
    expect(mockSetConnectionStatus).toHaveBeenCalledWith('connected');
    expect(mockAwarenessSetLocalState).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'TestUser', role: 'editor' }),
    );
  });

  it('should set user color from currentUser', () => {
    const { result } = renderHook(() => useCollaborativeProject());

    act(() => {
      result.current.connectToRoom('color-room');
    });

    expect(result.current.currentUserColor).toBe('#3b82f6');
  });

  it('should disconnect from room', () => {
    const { result } = renderHook(() => useCollaborativeProject());

    act(() => {
      result.current.connectToRoom('room-to-leave');
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.roomId).toBeNull();
    expect(result.current.activeUsers).toEqual([]);
    expect(mockSetConnectionStatus).toHaveBeenCalledWith('disconnected');
    expect(mockSetPeers).toHaveBeenCalledWith([]);
    expect(mockProviderDisconnect).toHaveBeenCalled();
    expect(mockProviderDestroy).toHaveBeenCalled();
  });

  it('should abort previous connection when connecting to new room', () => {
    const { result } = renderHook(() => useCollaborativeProject());

    act(() => {
      result.current.connectToRoom('room-1');
    });

    act(() => {
      result.current.connectToRoom('room-2');
    });

    expect(result.current.roomId).toBe('room-2');
    expect(mockProviderDisconnect).toHaveBeenCalled();
  });

  it('should update focus via awareness', () => {
    const { result } = renderHook(() => useCollaborativeProject());

    act(() => {
      result.current.connectToRoom('focus-room');
    });

    act(() => {
      result.current.updateFocus('shot-5');
    });

    expect(mockAwarenessSetLocalStateField).toHaveBeenCalledWith('focusId', 'shot-5');
  });

  it('should update editing state via awareness', () => {
    const { result } = renderHook(() => useCollaborativeProject());

    act(() => {
      result.current.connectToRoom('edit-room');
    });

    act(() => {
      result.current.setEditing(true);
    });

    expect(mockAwarenessSetLocalStateField).toHaveBeenCalledWith('isEditing', true);
  });

  it('should report canWrite as true in local mode (no room)', () => {
    const { result } = renderHook(() => useCollaborativeProject());

    expect(result.current.canWrite()).toBe(true);
  });

  it('should cleanup on unmount', () => {
    const { unmount, result } = renderHook(() => useCollaborativeProject());

    act(() => {
      result.current.connectToRoom('cleanup-room');
    });

    unmount();

    expect(mockProviderDisconnect).toHaveBeenCalled();
    expect(mockProviderDestroy).toHaveBeenCalled();
  });
});
