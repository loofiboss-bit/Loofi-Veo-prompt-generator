
import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { useAppStore } from '../store/useAppStore';
import { Shot, PromptState, GlobalContext } from '../types';

// Colors for user cursors
const USER_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#f43f5e'];

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

    // Store Access
    const { 
        promptState, 
        sbGlobalContext, 
        sbShots, 
        seriesBible,
        setFullState 
    } = useAppStore();

    // 1. Connect Function
    const connectToRoom = useCallback((roomName: string) => {
        if (providerRef.current) {
            providerRef.current.disconnect();
            providerRef.current.destroy();
        }

        const doc = new Y.Doc();
        yDocRef.current = doc;

        // Use public signaling server for demo purposes. 
        // In production, you would deploy your own 'y-webrtc-signaling' docker container.
        const provider = new WebrtcProvider(roomName, doc, {
            signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com']
        });
        providerRef.current = provider;

        // Awareness (Presence)
        const awareness = provider.awareness;
        const myColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
        setCurrentUserColor(myColor);
        
        awareness.setLocalState({
            name: `User ${Math.floor(Math.random() * 1000)}`,
            color: myColor
        });

        awareness.on('change', () => {
            const states = Array.from(awareness.getStates().entries()).map(([id, state]) => ({
                clientId: id,
                ...state
            })) as UserAwareness[];
            setActiveUsers(states);
        });

        // 2. Data Sync Logic (Incoming from Remote)
        const yPromptState = doc.getMap('promptState');
        const yGlobalContext = doc.getMap('sbGlobalContext');
        const yShots = doc.getArray('sbShots');
        const ySeriesBible = doc.getText('seriesBible');

        doc.on('update', () => {
            if (isSyncingRef.current) return; // Ignore updates we caused

            // Bulk update store to prevent tearing
            const newState: any = {};
            
            if (yPromptState.size > 0) newState.promptState = yPromptState.toJSON() as PromptState;
            if (yGlobalContext.size > 0) newState.sbGlobalContext = yGlobalContext.toJSON() as GlobalContext;
            if (yShots.length > 0) newState.sbShots = yShots.toJSON() as Shot[];
            if (ySeriesBible.length > 0) newState.seriesBible = ySeriesBible.toString();

            if (Object.keys(newState).length > 0) {
                setFullState(newState);
            }
        });

        setRoomId(roomName);
        setIsConnected(true);
    }, [setFullState]);

    const disconnect = useCallback(() => {
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

    // 3. Sync Outgoing (Local -> Remote)
    // This effect runs whenever the local store changes
    useEffect(() => {
        if (!isConnected || !yDocRef.current || !providerRef.current) return;

        const doc = yDocRef.current;
        const yPromptState = doc.getMap('promptState');
        const yGlobalContext = doc.getMap('sbGlobalContext');
        const yShots = doc.getArray('sbShots');
        const ySeriesBible = doc.getText('seriesBible');

        isSyncingRef.current = true; // Set mutex

        doc.transact(() => {
            // -- Prompt State --
            // Only update if changed (basic shallow check or granular update is better, but full replace for simplicity here)
            // Ideally we iterate keys
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
            // Yjs Array diffing is complex. For this "lightweight" implementation, 
            // if the length differs or IDs don't match, we replace.
            // In a real production app, you'd calculate precise edits.
            const currentYShots = yShots.toJSON();
            if (JSON.stringify(currentYShots) !== JSON.stringify(sbShots)) {
                yShots.delete(0, yShots.length);
                yShots.insert(0, sbShots);
            }

            // -- Series Bible --
            const currentBible = ySeriesBible.toString();
            if (currentBible !== seriesBible) {
                ySeriesBible.delete(0, ySeriesBible.length);
                ySeriesBible.insert(0, seriesBible);
            }
        });

        isSyncingRef.current = false; // Release mutex

    }, [promptState, sbGlobalContext, sbShots, seriesBible, isConnected]);

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
        updateFocus
    };
};
