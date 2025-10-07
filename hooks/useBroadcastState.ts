import { useState, useEffect, useCallback, useRef } from 'react';

const CHANNEL_NAME = 'veo-prompt-sync';
let channel: BroadcastChannel | null = null;

// This is a simplified implementation for demonstration.
// A more robust solution might handle race conditions or message ordering.
export function useBroadcastState<T>(initialState: T): [T, (newState: Partial<T>) => void, boolean] {
  const [state, setState] = useState<T>(initialState);
  const [isConnected, setIsConnected] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    // This effect runs only once to initialize the channel
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

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'STATE_UPDATE') {
        setState(event.data.payload);
      } else if (event.data.type === 'REQUEST_STATE') {
        // Another tab has opened and is requesting the current state.
        // Send our current state to get them up to speed.
        channel?.postMessage({ type: 'STATE_UPDATE', payload: stateRef.current });
      }
    };

    channel.addEventListener('message', handleMessage);

    // When a new tab opens, it requests the current state from any active tabs.
    channel.postMessage({ type: 'REQUEST_STATE' });

    return () => {
      channel?.removeEventListener('message', handleMessage);
      // In a real app, you might want more sophisticated channel closing logic,
      // but for this demo, we'll leave it open for other tabs to use.
    };
  }, []); // Empty dependency array ensures this runs only once.

  const broadcastState = useCallback((newState: Partial<T>) => {
    const updatedState = { ...stateRef.current, ...newState };
    setState(updatedState);
    if (channel?.postMessage) {
        try {
            channel.postMessage({ type: 'STATE_UPDATE', payload: updatedState });
        } catch (e) {
            console.error("Failed to broadcast state:", e);
        }
    }
  }, []);

  return [state, broadcastState, isConnected];
}
