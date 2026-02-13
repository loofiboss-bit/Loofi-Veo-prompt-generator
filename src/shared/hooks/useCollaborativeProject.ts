import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { useAppStore } from '@core/store/useAppStore';
import { Shot, PromptState, GlobalContext, TimelineTrack, TimelineClip } from '@core/types';

// Colors for user cursors
const USER_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
];

export interface UserAwareness {
  clientId: number;
  name: string;
  color: string;
  focusId?: string | number; // ID of the shot/input currently focused
}

export const useCollaborativeProject = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<UserAwareness[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [currentUserColor, setCurrentUserColor] = useState(USER_COLORS[0]);

  const yDocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const isSyncingRef = useRef(false); // Mutex to prevent loops
  const connectAbortRef = useRef<AbortController | null>(null);

  // Store Access (Flattened Timeline)
  const { promptState, sbGlobalContext, sbShots, tracks, clips, seriesBible, setFullState } =
    useAppStore();

  // 1. Connect Function
  const connectToRoom = useCallback(
    (roomName: string) => {
      // Abort any in-progress connection attempt
      if (connectAbortRef.current) {
        connectAbortRef.current.abort();
      }
      const abortController = new AbortController();
      connectAbortRef.current = abortController;

      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current.destroy();
      }
      if (yDocRef.current) {
        yDocRef.current.destroy();
      }

      const doc = new Y.Doc();
      yDocRef.current = doc;

      // Check if aborted before proceeding
      if (abortController.signal.aborted) return;

      const provider = new WebrtcProvider(roomName, doc, {
        signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com'],
      });
      providerRef.current = provider;

      const awareness = provider.awareness;
      const myColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
      setCurrentUserColor(myColor);

      awareness.setLocalState({
        name: `User ${Math.floor(Math.random() * 1000)}`,
        color: myColor,
      });

      awareness.on('change', () => {
        // Guard against stale closure: ignore if aborted
        if (abortController.signal.aborted) return;
        const states = Array.from(awareness.getStates().entries()).map(([id, state]) => ({
          clientId: id,
          ...state,
        })) as UserAwareness[];
        setActiveUsers(states);
      });

      // 2. Data Sync Logic (Incoming from Remote)
      const yPromptState = doc.getMap('promptState');
      const yGlobalContext = doc.getMap('sbGlobalContext');
      const yShots = doc.getArray('sbShots');
      const yTracks = doc.getArray('tracks');
      const yClips = doc.getArray('clips');
      const ySeriesBible = doc.getText('seriesBible');

      doc.on('update', () => {
        if (isSyncingRef.current) return; // Ignore updates we caused
        if (abortController.signal.aborted) return; // Stale closure guard

        // Bulk update store to prevent tearing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newState: any = {};

        if (yPromptState.size > 0) newState.promptState = yPromptState.toJSON() as PromptState;
        if (yGlobalContext.size > 0)
          newState.sbGlobalContext = yGlobalContext.toJSON() as GlobalContext;
        if (yShots.length > 0) newState.sbShots = yShots.toJSON() as Shot[];
        if (yTracks.length > 0) newState.tracks = yTracks.toJSON() as TimelineTrack[];
        if (yClips.length > 0) newState.clips = yClips.toJSON() as TimelineClip[];
        if (ySeriesBible.length > 0) newState.seriesBible = ySeriesBible.toString();

        if (Object.keys(newState).length > 0) {
          setFullState(newState);
        }
      });

      setRoomId(roomName);
      setIsConnected(true);
    },
    [setFullState],
  );

  const disconnect = useCallback(() => {
    // Abort any pending connection operations
    if (connectAbortRef.current) {
      connectAbortRef.current.abort();
      connectAbortRef.current = null;
    }
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current.destroy();
      providerRef.current = null;
    }
    if (yDocRef.current) {
      yDocRef.current.destroy();
      yDocRef.current = null;
    }
    setIsConnected(false);
    setRoomId(null);
    setActiveUsers([]);
  }, []);

  // Cleanup on unmount to prevent stale connections
  useEffect(() => {
    return () => {
      if (connectAbortRef.current) {
        connectAbortRef.current.abort();
      }
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (yDocRef.current) {
        yDocRef.current.destroy();
        yDocRef.current = null;
      }
    };
  }, []);

  // 3. Sync Outgoing (Local -> Remote)
  useEffect(() => {
    if (!isConnected || !yDocRef.current || !providerRef.current) return;

    const doc = yDocRef.current;
    const yPromptState = doc.getMap('promptState');
    const yGlobalContext = doc.getMap('sbGlobalContext');
    const yShots = doc.getArray('sbShots');
    const yTracks = doc.getArray('tracks');
    const yClips = doc.getArray('clips');
    const ySeriesBible = doc.getText('seriesBible');

    isSyncingRef.current = true; // Set mutex

    doc.transact(() => {
      // -- Prompt State --
      Object.entries(promptState).forEach(([key, value]) => {
        if (JSON.stringify(yPromptState.get(key)) !== JSON.stringify(value)) {
          yPromptState.set(key, value);
        }
      });

      // -- Global Context --
      Object.entries(sbGlobalContext).forEach(([key, value]) => {
        if (yGlobalContext.get(key) !== value) {
          yGlobalContext.set(key, value);
        }
      });

      // -- Shots --
      const currentYShots = yShots.toJSON();
      if (JSON.stringify(currentYShots) !== JSON.stringify(sbShots)) {
        yShots.delete(0, yShots.length);
        yShots.insert(0, sbShots);
      }

      // -- Tracks --
      const currentYTracks = yTracks.toJSON();
      if (JSON.stringify(currentYTracks) !== JSON.stringify(tracks)) {
        yTracks.delete(0, yTracks.length);
        yTracks.insert(0, tracks);
      }

      // -- Clips --
      const currentYClips = yClips.toJSON();
      if (JSON.stringify(currentYClips) !== JSON.stringify(clips)) {
        yClips.delete(0, yClips.length);
        yClips.insert(0, clips);
      }

      // -- Series Bible --
      const currentBible = ySeriesBible.toString();
      if (currentBible !== seriesBible) {
        ySeriesBible.delete(0, ySeriesBible.length);
        ySeriesBible.insert(0, seriesBible);
      }
    });

    isSyncingRef.current = false; // Release mutex
  }, [promptState, sbGlobalContext, sbShots, tracks, clips, seriesBible, isConnected]);

  // 4. Update Presence Focus
  const updateFocus = useCallback((focusId: string | number | null) => {
    if (providerRef.current) {
      providerRef.current.awareness.setLocalStateField('focusId', focusId);
    }
  }, []);

  return {
    isConnected,
    connectToRoom,
    disconnect,
    activeUsers,
    roomId,
    currentUserColor,
    updateFocus,
  };
};
