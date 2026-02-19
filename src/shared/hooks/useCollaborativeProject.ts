import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { useAppStore } from '@core/store/useAppStore';
import { useCollaborationStore } from '@core/store/useCollaborationStore';
import { permissionService } from '@core/services/permissionService';
import { Shot, PromptState, GlobalContext, TimelineTrack, TimelineClip } from '@core/types';
import type { PresenceState, ShotComment, CollaborationRole } from '@core/types';

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
  userId?: string;
  role?: CollaborationRole;
  isEditing?: boolean;
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

  // Collaboration store
  const { currentUser, setConnectionStatus, setPeers } = useCollaborationStore();

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

      setConnectionStatus('connecting');
      const doc = new Y.Doc();
      yDocRef.current = doc;

      // Check if aborted before proceeding
      if (abortController.signal.aborted) return;

      const provider = new WebrtcProvider(roomName, doc, {
        signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com'],
      });
      providerRef.current = provider;

      const awareness = provider.awareness;
      const myColor =
        currentUser?.avatarColor ?? USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
      setCurrentUserColor(myColor);

      awareness.setLocalState({
        name: currentUser?.displayName ?? `User ${Math.floor(Math.random() * 1000)}`,
        color: myColor,
        userId: currentUser?.id,
        role: 'editor',
        isEditing: false,
      });

      awareness.on('change', () => {
        // Guard against stale closure: ignore if aborted
        if (abortController.signal.aborted) return;
        const states = Array.from(awareness.getStates().entries()).map(([id, state]) => ({
          clientId: id,
          ...state,
        })) as UserAwareness[];
        setActiveUsers(states);

        // Update collaboration store with enhanced presence
        const presenceStates: PresenceState[] = states.map((s) => ({
          clientId: s.clientId,
          userId: s.userId ?? `anon_${s.clientId}`,
          displayName: s.name,
          avatarColor: s.color,
          role: s.role ?? 'viewer',
          focusTarget: s.focusId ? { type: 'shot' as const, id: s.focusId } : undefined,
          isEditing: s.isEditing ?? false,
          lastActive: Date.now(),
          isOnline: true,
        }));
        setPeers(presenceStates);
      });

      // 2. Data Sync Logic (Incoming from Remote)
      const yPromptState = doc.getMap('promptState');
      const yGlobalContext = doc.getMap('sbGlobalContext');
      const yShots = doc.getArray('sbShots');
      const yTracks = doc.getArray('tracks');
      const yClips = doc.getArray('clips');
      const ySeriesBible = doc.getText('seriesBible');
      const yComments = doc.getArray('comments');

      doc.on('update', () => {
        if (isSyncingRef.current) return; // Ignore updates we caused
        if (abortController.signal.aborted) return; // Stale closure guard

        // Bulk update store to prevent tearing
        const newState: Partial<{
          promptState: PromptState;
          sbGlobalContext: GlobalContext;
          sbShots: Shot[];
          tracks: TimelineTrack[];
          clips: TimelineClip[];
          seriesBible: string;
        }> = {};

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

        // Sync comments from Yjs
        if (yComments.length > 0) {
          const remoteComments = yComments.toJSON() as ShotComment[];
          useCollaborationStore.getState().comments = remoteComments;
        }
      });

      setRoomId(roomName);
      setIsConnected(true);
      setConnectionStatus('connected');
    },
    [setFullState, currentUser, setConnectionStatus, setPeers],
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
    setConnectionStatus('disconnected');
    setPeers([]);
  }, [setConnectionStatus, setPeers]);

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

  // 5. Update Editing State
  const setEditing = useCallback((isEditing: boolean) => {
    if (providerRef.current) {
      providerRef.current.awareness.setLocalStateField('isEditing', isEditing);
    }
  }, []);

  // 6. Check if user can write (based on role)
  const canWrite = useCallback((): boolean => {
    const room = useCollaborationStore.getState().activeRoom;
    const user = useCollaborationStore.getState().currentUser;
    if (!room || !user) return true; // No room = local mode, full access
    return permissionService.hasPermission(user.id, 'write', room);
  }, []);

  return {
    isConnected,
    connectToRoom,
    disconnect,
    activeUsers,
    roomId,
    currentUserColor,
    updateFocus,
    setEditing,
    canWrite,
  };
};
