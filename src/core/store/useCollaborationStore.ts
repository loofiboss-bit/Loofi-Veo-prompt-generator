/**
 * Collaboration Store
 * v2.6.0 - Collaboration Suite
 *
 * Zustand store for collaboration state: user profile, room, peers,
 * comments, conflicts, and connection status.
 */

import { create } from 'zustand';
import type {
  CollaborationState,
  CollaborationUser,
  CollaborationRoom,
  PresenceState,
  ShotComment,
  ConflictEvent,
  ShareableLink,
} from '@core/types';

const initialState: Omit<
  CollaborationState,
  | 'setCurrentUser'
  | 'setActiveRoom'
  | 'setPeers'
  | 'addComment'
  | 'updateComment'
  | 'removeComment'
  | 'resolveComment'
  | 'addConflict'
  | 'resolveConflict'
  | 'clearResolvedConflicts'
  | 'setConnectionStatus'
  | 'setShareLinks'
  | 'reset'
> = {
  currentUser: null,
  activeRoom: null,
  peers: [],
  comments: [],
  conflicts: [],
  connectionStatus: 'disconnected',
  isProfileSetUp: false,
  shareLinks: [],
};

export const useCollaborationStore = create<CollaborationState>()((set) => ({
  ...initialState,

  setCurrentUser: (user: CollaborationUser) =>
    set({
      currentUser: user,
      isProfileSetUp: !user.displayName.startsWith('User '),
    }),

  setActiveRoom: (room: CollaborationRoom | null) => set({ activeRoom: room }),

  setPeers: (peers: PresenceState[]) => set({ peers }),

  addComment: (comment: ShotComment) =>
    set((state) => ({
      comments: [...state.comments, comment],
    })),

  updateComment: (commentId: string, updates: Partial<ShotComment>) =>
    set((state) => ({
      comments: state.comments.map((c) => (c.id === commentId ? { ...c, ...updates } : c)),
    })),

  removeComment: (commentId: string) =>
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== commentId && c.parentId !== commentId),
    })),

  resolveComment: (commentId: string) =>
    set((state) => ({
      comments: state.comments.map((c) => (c.id === commentId ? { ...c, isResolved: true } : c)),
    })),

  addConflict: (conflict: ConflictEvent) =>
    set((state) => ({
      conflicts: [...state.conflicts, conflict],
    })),

  resolveConflict: (conflictId: string, status: ConflictEvent['status']) =>
    set((state) => ({
      conflicts: state.conflicts.map((c) => (c.id === conflictId ? { ...c, status } : c)),
    })),

  clearResolvedConflicts: () =>
    set((state) => ({
      conflicts: state.conflicts.filter((c) => c.status === 'pending'),
    })),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setShareLinks: (shareLinks: ShareableLink[]) => set({ shareLinks }),

  reset: () => set(initialState),
}));
