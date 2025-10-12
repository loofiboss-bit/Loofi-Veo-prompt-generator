import { useState, useEffect, useCallback, useRef } from 'react';

const CHANNEL_NAME = 'veo-prompt-sync';
let channel: BroadcastChannel | null = null;

// Message types for clarity
type BroadcastMessage<T> =
  | { type: 'STATE_UPDATE_PARTIAL'; payload: Partial<T> }
  | { type: 'STATE_UPDATE_FULL'; payload: T }
  | { type: 'REQUEST_STATE' };

// The hook's return type for the setter function.
type SetBroadcastState<T> = (update: Partial<T>, action?: 'replace') => void;

export function useBroadcastState<T>(initialState: T): [T, SetBroadcastState<T>, boolean] {
  const [state, setState] = useState<T>(initialState);
  const [isConnected, setIsConnected] = useState(false);
  
  const stateRef = useRef(state);
  stateRef.current = state;

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
      // Fix: Stored event.data in a const to allow for correct type narrowing in the switch statement.
      const data = event.data;
      switch (data.type) {
        case 'STATE_UPDATE_PARTIAL':
          setState(prevState => ({ ...prevState, ...data.payload }));
          break;
        case 'STATE_UPDATE_FULL':
          setState(data.payload);
          break;
        case 'REQUEST_STATE':
          if (channel) {
            const message: BroadcastMessage<T> = { type: 'STATE_UPDATE_FULL', payload: stateRef.current };
            channel.postMessage(message);
          }
          break;
      }
    };

    channel.addEventListener('message', handleMessage as EventListener);

    // When this tab loads, request the current state from any other open tabs.
    channel.postMessage({ type: 'REQUEST_STATE' });

    return () => {
      channel?.removeEventListener('message', handleMessage as EventListener);
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount.

  const setBroadcastState = useCallback<SetBroadcastState<T>>((update, action) => {
    const isReplace = action === 'replace';
    
    // Update local state
    if (isReplace) {
      setState(update as T);
    } else {
      setState(prevState => ({ ...prevState, ...update }));
    }

    // Broadcast the change to other tabs
    if (channel?.postMessage) {
      try {
        const message: BroadcastMessage<T> = isReplace
          ? { type: 'STATE_UPDATE_FULL', payload: update as T }
          : { type: 'STATE_UPDATE_PARTIAL', payload: update };
        channel.postMessage(message);
      } catch (e) {
        console.error("Failed to broadcast state:", e);
      }
    }
  }, []);

  return [state, setBroadcastState, isConnected];
}
