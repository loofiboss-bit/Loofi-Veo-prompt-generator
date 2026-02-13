import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@core/store/useAppStore';

const CHANNEL_NAME = 'veo-prompt-sync';

export const useAppSync = () => {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isReceivingRef = useRef(false);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
      setIsConnected(true);

      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATE') {
          // Prevent circular updates
          isReceivingRef.current = true;
          // Update only the promptState part of the store
          useAppStore.setState({ promptState: event.data.payload });
          isReceivingRef.current = false;
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel setup failed', e);
      setIsConnected(false);
    }

    // Subscribe to store changes to broadcast them
    const unsubscribe = useAppStore.subscribe((state) => {
      if (!isReceivingRef.current && channelRef.current) {
        // We only sync the promptState, not the whole UI state (like modals)
        channelRef.current.postMessage({
          type: 'STATE_UPDATE',
          payload: state.promptState,
        });
      }
    });

    return () => {
      unsubscribe();
      channelRef.current?.close();
    };
  }, []);

  return isConnected;
};
