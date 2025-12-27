
import { useState, useEffect, useCallback, useRef } from 'react';

const CHANNEL_NAME = 'veo-prompt-sync';
let channel: BroadcastChannel | null = null;

// Message types for clarity
type BroadcastMessage<T> =
  | { type: 'STATE_UPDATE_PARTIAL'; payload: Partial<T> }
  | { type: 'STATE_UPDATE_FULL'; payload: T }
  | { type: 'REQUEST_STATE' };

// The hook's return type.
type SetBroadcastState<T> = (update: Partial<T>, action?: 'replace') => void;

interface UseBroadcastStateReturn<T> {
    state: T;
    setState: SetBroadcastState<T>;
    isSyncConnected: boolean;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function useBroadcastState<T>(initialState: T, debounceTimeout = 500): [T, SetBroadcastState<T>, boolean, () => void, () => void, boolean, boolean] {
  const [state, setInternalState] = useState<T>(initialState);
  const [isConnected, setIsConnected] = useState(false);
  
  // History State
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  
  // Refs for tracking updates without re-renders/stale closures
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastUpdateTime = useRef<number>(0);

  useEffect(() => {
    if (!channel) {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        setIsConnected(true);
      } catch (e) {
        console.warn("BroadcastChannel is not supported in this environment.", e);
        setIsConnected(false);
        return;
      }
    } else {
        setIsConnected(true);
    }

    const handleMessage = (event: MessageEvent<BroadcastMessage<T>>) => {
      const data = event.data;
      // Incoming syncs act like a 'replace' or 'update' but we treat them as a new history step
      // to allow undoing remote changes if necessary, or just syncing up.
      // For simplicity, we just update the state. To avoid history spam, we could check timestamps,
      // but here we simply apply it.
      
      let newState = stateRef.current;

      switch (data.type) {
        case 'STATE_UPDATE_PARTIAL':
          newState = { ...stateRef.current, ...data.payload };
          break;
        case 'STATE_UPDATE_FULL':
          newState = data.payload;
          break;
        case 'REQUEST_STATE':
          if (channel) {
            const message: BroadcastMessage<T> = { type: 'STATE_UPDATE_FULL', payload: stateRef.current };
            channel.postMessage(message);
          }
          return; // No state change for request
      }
      
      // When receiving an update from elsewhere, we push the *current* local state to past
      // and clear future, treating it as a new "edit".
      setPast(p => [...p, stateRef.current]);
      setFuture([]);
      setInternalState(newState);
    };

    channel.addEventListener('message', handleMessage as EventListener);

    // When this tab loads, request the current state from any other open tabs.
    channel.postMessage({ type: 'REQUEST_STATE' });

    return () => {
      channel?.removeEventListener('message', handleMessage as EventListener);
    };
  }, []); 

  const setBroadcastState = useCallback<SetBroadcastState<T>>((update, action) => {
    const now = Date.now();
    const isReplace = action === 'replace';
    
    // Calculate new state
    const newState = isReplace
      ? (update as T)
      : { ...stateRef.current, ...update };

    // Update History
    // If it's a replacement (like loading a template), we always snapshot.
    // If it's a rapid update (typing), we debounce the history push.
    const isRapidUpdate = !isReplace && (now - lastUpdateTime.current < debounceTimeout);

    if (isRapidUpdate && past.length > 0) {
        // Update current, keep past as is (merging this change into the "current tip")
        // No change to past/future
    } else {
        // Significant change: push current state to past, clear future
        setPast(prev => [...prev, stateRef.current]);
        setFuture([]);
    }
    
    setInternalState(newState);
    lastUpdateTime.current = now;

    // Broadcast the change to other tabs
    if (channel?.postMessage) {
      try {
        const message: BroadcastMessage<T> = isReplace
          ? { type: 'STATE_UPDATE_FULL', payload: newState }
          : { type: 'STATE_UPDATE_PARTIAL', payload: update };
        channel.postMessage(message);
      } catch (e) {
        console.error("Failed to broadcast state:", e);
      }
    }
  }, [past.length, debounceTimeout]);

  const undo = useCallback(() => {
      if (past.length === 0) return;
      
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      
      setFuture(prev => [stateRef.current, ...prev]);
      setPast(newPast);
      setInternalState(previous);
      lastUpdateTime.current = 0; // Reset debounce timer on undo

      // Broadcast undo result
      if (channel?.postMessage) {
          channel.postMessage({ type: 'STATE_UPDATE_FULL', payload: previous });
      }
  }, [past]);

  const redo = useCallback(() => {
      if (future.length === 0) return;

      const next = future[0];
      const newFuture = future.slice(1);

      setPast(prev => [...prev, stateRef.current]);
      setFuture(newFuture);
      setInternalState(next);
      lastUpdateTime.current = 0;

      // Broadcast redo result
      if (channel?.postMessage) {
          channel.postMessage({ type: 'STATE_UPDATE_FULL', payload: next });
      }
  }, [future]);

  return [state, setBroadcastState, isConnected, undo, redo, past.length > 0, future.length > 0];
}
