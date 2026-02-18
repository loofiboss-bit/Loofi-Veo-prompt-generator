/**
 * Collaboration Store Unit Tests
 * v2.6.0 - Collaboration Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCollaborationStore } from './useCollaborationStore';
import type {
  CollaborationUser,
  CollaborationRoom,
  ShotComment,
  PresenceState,
  ConflictEvent,
  ShareableLink,
} from '@core/types';

describe('useCollaborationStore', () => {
  beforeEach(() => {
    useCollaborationStore.getState().reset();
  });

  const mockUser: CollaborationUser = {
    id: 'user_1',
    displayName: 'Alice',
    avatarColor: '#3b82f6',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockRoom: CollaborationRoom = {
    id: 'room_1',
    name: 'Test Room',
    projectId: 'project_1',
    ownerId: 'user_1',
    shareCode: 'abc123',
    isPublicReadOnly: false,
    members: [
      {
        userId: 'user_1',
        displayName: 'Alice',
        avatarColor: '#3b82f6',
        role: 'admin',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      },
    ],
    createdAt: Date.now(),
    lastActivity: Date.now(),
    status: 'active',
  };

  const mockComment: ShotComment = {
    id: 'cmt_1',
    shotId: 1,
    authorId: 'user_1',
    authorName: 'Alice',
    authorColor: '#3b82f6',
    content: 'Great shot!',
    createdAt: Date.now(),
    editedAt: null,
    isResolved: false,
    parentId: null,
    reactions: [],
  };

  describe('Initial state', () => {
    it('should have default initial values', () => {
      const state = useCollaborationStore.getState();

      expect(state.currentUser).toBeNull();
      expect(state.activeRoom).toBeNull();
      expect(state.peers).toEqual([]);
      expect(state.comments).toEqual([]);
      expect(state.conflicts).toEqual([]);
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.isProfileSetUp).toBe(false);
      expect(state.shareLinks).toEqual([]);
    });
  });

  describe('setCurrentUser', () => {
    it('should set current user', () => {
      useCollaborationStore.getState().setCurrentUser(mockUser);

      const state = useCollaborationStore.getState();
      expect(state.currentUser).toEqual(mockUser);
    });

    it('should compute isProfileSetUp from displayName', () => {
      // User with default name
      const defaultUser = { ...mockUser, displayName: 'User 1234' };
      useCollaborationStore.getState().setCurrentUser(defaultUser);
      expect(useCollaborationStore.getState().isProfileSetUp).toBe(false);

      // User with custom name
      const customUser = { ...mockUser, displayName: 'Alice' };
      useCollaborationStore.getState().setCurrentUser(customUser);
      expect(useCollaborationStore.getState().isProfileSetUp).toBe(true);
    });

    it('should update isProfileSetUp when displayName starts with "User "', () => {
      const user = { ...mockUser, displayName: 'User 5000' };
      useCollaborationStore.getState().setCurrentUser(user);

      expect(useCollaborationStore.getState().isProfileSetUp).toBe(false);
    });
  });

  describe('setActiveRoom', () => {
    it('should set active room', () => {
      useCollaborationStore.getState().setActiveRoom(mockRoom);

      expect(useCollaborationStore.getState().activeRoom).toEqual(mockRoom);
    });

    it('should clear active room with null', () => {
      useCollaborationStore.getState().setActiveRoom(mockRoom);
      useCollaborationStore.getState().setActiveRoom(null);

      expect(useCollaborationStore.getState().activeRoom).toBeNull();
    });
  });

  describe('setPeers', () => {
    it('should set peers list', () => {
      const peers: PresenceState[] = [
        {
          clientId: 1,
          userId: 'user_2',
          displayName: 'Bob',
          avatarColor: '#ef4444',
          role: 'editor',
          isEditing: false,
          lastActive: Date.now(),
          isOnline: true,
        },
      ];

      useCollaborationStore.getState().setPeers(peers);

      expect(useCollaborationStore.getState().peers).toEqual(peers);
    });

    it('should replace peers list', () => {
      const peers1: PresenceState[] = [
        {
          clientId: 1,
          userId: 'user_2',
          displayName: 'Bob',
          avatarColor: '#ef4444',
          role: 'editor',
          isEditing: false,
          lastActive: Date.now(),
          isOnline: true,
        },
      ];
      const peers2: PresenceState[] = [
        {
          clientId: 2,
          userId: 'user_3',
          displayName: 'Charlie',
          avatarColor: '#22c55e',
          role: 'viewer',
          isEditing: false,
          lastActive: Date.now(),
          isOnline: true,
        },
      ];

      useCollaborationStore.getState().setPeers(peers1);
      useCollaborationStore.getState().setPeers(peers2);

      expect(useCollaborationStore.getState().peers).toEqual(peers2);
    });

    it('should clear peers with empty array', () => {
      const peers: PresenceState[] = [
        {
          clientId: 1,
          userId: 'user_2',
          displayName: 'Bob',
          avatarColor: '#ef4444',
          role: 'editor',
          isEditing: false,
          lastActive: Date.now(),
          isOnline: true,
        },
      ];

      useCollaborationStore.getState().setPeers(peers);
      useCollaborationStore.getState().setPeers([]);

      expect(useCollaborationStore.getState().peers).toEqual([]);
    });
  });

  describe('addComment', () => {
    it('should add comment to comments array', () => {
      useCollaborationStore.getState().addComment(mockComment);

      expect(useCollaborationStore.getState().comments).toHaveLength(1);
      expect(useCollaborationStore.getState().comments[0]).toEqual(mockComment);
    });

    it('should append multiple comments', () => {
      const comment1 = { ...mockComment, id: 'cmt_1' };
      const comment2 = { ...mockComment, id: 'cmt_2' };

      useCollaborationStore.getState().addComment(comment1);
      useCollaborationStore.getState().addComment(comment2);

      expect(useCollaborationStore.getState().comments).toHaveLength(2);
    });
  });

  describe('updateComment', () => {
    it('should update comment by ID', () => {
      useCollaborationStore.getState().addComment(mockComment);

      useCollaborationStore
        .getState()
        .updateComment(mockComment.id, { content: 'Updated content' });

      const updated = useCollaborationStore.getState().comments[0];
      expect(updated.content).toBe('Updated content');
      expect(updated.id).toBe(mockComment.id);
    });

    it('should merge partial updates', () => {
      useCollaborationStore.getState().addComment(mockComment);

      useCollaborationStore.getState().updateComment(mockComment.id, {
        isResolved: true,
        editedAt: Date.now(),
      });

      const updated = useCollaborationStore.getState().comments[0];
      expect(updated.isResolved).toBe(true);
      expect(updated.editedAt).toBeDefined();
      expect(updated.content).toBe(mockComment.content); // Original content preserved
    });

    it('should not affect other comments', () => {
      const comment1 = { ...mockComment, id: 'cmt_1' };
      const comment2 = { ...mockComment, id: 'cmt_2' };

      useCollaborationStore.getState().addComment(comment1);
      useCollaborationStore.getState().addComment(comment2);

      useCollaborationStore.getState().updateComment('cmt_1', { content: 'Updated' });

      const state = useCollaborationStore.getState();
      expect(state.comments[0].content).toBe('Updated');
      expect(state.comments[1].content).toBe(mockComment.content);
    });

    it('should do nothing if comment not found', () => {
      useCollaborationStore.getState().addComment(mockComment);

      useCollaborationStore.getState().updateComment('nonexistent', { content: 'New' });

      const state = useCollaborationStore.getState();
      expect(state.comments).toHaveLength(1);
      expect(state.comments[0]).toEqual(mockComment);
    });
  });

  describe('removeComment', () => {
    it('should remove comment by ID', () => {
      useCollaborationStore.getState().addComment(mockComment);

      useCollaborationStore.getState().removeComment(mockComment.id);

      expect(useCollaborationStore.getState().comments).toHaveLength(0);
    });

    it('should remove root comment and its replies', () => {
      const root = { ...mockComment, id: 'cmt_1', parentId: null };
      const reply = { ...mockComment, id: 'cmt_2', parentId: 'cmt_1' };

      useCollaborationStore.getState().addComment(root);
      useCollaborationStore.getState().addComment(reply);

      useCollaborationStore.getState().removeComment('cmt_1');

      expect(useCollaborationStore.getState().comments).toHaveLength(0);
    });

    it('should only remove specific reply', () => {
      const root = { ...mockComment, id: 'cmt_1', parentId: null };
      const reply = { ...mockComment, id: 'cmt_2', parentId: 'cmt_1' };

      useCollaborationStore.getState().addComment(root);
      useCollaborationStore.getState().addComment(reply);

      useCollaborationStore.getState().removeComment('cmt_2');

      const state = useCollaborationStore.getState();
      expect(state.comments).toHaveLength(1);
      expect(state.comments[0].id).toBe('cmt_1');
    });
  });

  describe('resolveComment', () => {
    it('should set comment isResolved to true', () => {
      useCollaborationStore.getState().addComment(mockComment);

      useCollaborationStore.getState().resolveComment(mockComment.id);

      expect(useCollaborationStore.getState().comments[0].isResolved).toBe(true);
    });

    it('should only affect targeted comment', () => {
      const comment1 = { ...mockComment, id: 'cmt_1' };
      const comment2 = { ...mockComment, id: 'cmt_2' };

      useCollaborationStore.getState().addComment(comment1);
      useCollaborationStore.getState().addComment(comment2);

      useCollaborationStore.getState().resolveComment('cmt_1');

      const state = useCollaborationStore.getState();
      expect(state.comments[0].isResolved).toBe(true);
      expect(state.comments[1].isResolved).toBe(false);
    });

    it('should do nothing if comment not found', () => {
      useCollaborationStore.getState().addComment(mockComment);

      useCollaborationStore.getState().resolveComment('nonexistent');

      expect(useCollaborationStore.getState().comments[0].isResolved).toBe(false);
    });
  });

  describe('addConflict', () => {
    it('should add conflict to conflicts array', () => {
      const conflict: ConflictEvent = {
        id: 'conflict_1',
        dataType: 'shot',
        elementId: 1,
        description: 'Background color changed',
        localValue: '#ffffff',
        remoteValue: '#000000',
        mergedValue: '#808080',
        remoteUserId: 'user_2',
        remoteUserName: 'Bob',
        timestamp: Date.now(),
        status: 'pending',
      };

      useCollaborationStore.getState().addConflict(conflict);

      expect(useCollaborationStore.getState().conflicts).toHaveLength(1);
      expect(useCollaborationStore.getState().conflicts[0]).toEqual(conflict);
    });

    it('should append multiple conflicts', () => {
      const conflict1: ConflictEvent = {
        id: 'conflict_1',
        dataType: 'shot',
        elementId: 1,
        description: 'Conflict 1',
        localValue: 'local1',
        remoteValue: 'remote1',
        mergedValue: 'merged1',
        remoteUserId: 'user_2',
        remoteUserName: 'Bob',
        timestamp: Date.now(),
        status: 'pending',
      };
      const conflict2: ConflictEvent = {
        id: 'conflict_2',
        dataType: 'prompt',
        elementId: 2,
        description: 'Conflict 2',
        localValue: 'local2',
        remoteValue: 'remote2',
        mergedValue: 'merged2',
        remoteUserId: 'user_3',
        remoteUserName: 'Charlie',
        timestamp: Date.now(),
        status: 'pending',
      };

      useCollaborationStore.getState().addConflict(conflict1);
      useCollaborationStore.getState().addConflict(conflict2);

      expect(useCollaborationStore.getState().conflicts).toHaveLength(2);
    });
  });

  describe('resolveConflict', () => {
    it('should update conflict status', () => {
      const conflict: ConflictEvent = {
        id: 'conflict_1',
        dataType: 'shot',
        elementId: 1,
        description: 'Test conflict',
        localValue: 'local',
        remoteValue: 'remote',
        mergedValue: 'merged',
        remoteUserId: 'user_2',
        remoteUserName: 'Bob',
        timestamp: Date.now(),
        status: 'pending',
      };

      useCollaborationStore.getState().addConflict(conflict);
      useCollaborationStore.getState().resolveConflict('conflict_1', 'accepted');

      expect(useCollaborationStore.getState().conflicts[0].status).toBe('accepted');
    });

    it('should support different resolution statuses', () => {
      const conflict: ConflictEvent = {
        id: 'conflict_1',
        dataType: 'shot',
        elementId: 1,
        description: 'Test conflict',
        localValue: 'local',
        remoteValue: 'remote',
        mergedValue: 'merged',
        remoteUserId: 'user_2',
        remoteUserName: 'Bob',
        timestamp: Date.now(),
        status: 'pending',
      };

      useCollaborationStore.getState().addConflict(conflict);

      useCollaborationStore.getState().resolveConflict('conflict_1', 'reverted');
      expect(useCollaborationStore.getState().conflicts[0].status).toBe('reverted');

      useCollaborationStore.getState().resolveConflict('conflict_1', 'custom');
      expect(useCollaborationStore.getState().conflicts[0].status).toBe('custom');
    });

    it('should only affect targeted conflict', () => {
      const conflict1: ConflictEvent = {
        id: 'conflict_1',
        dataType: 'shot',
        elementId: 1,
        description: 'Conflict 1',
        localValue: 'local1',
        remoteValue: 'remote1',
        mergedValue: 'merged1',
        remoteUserId: 'user_2',
        remoteUserName: 'Bob',
        timestamp: Date.now(),
        status: 'pending',
      };
      const conflict2: ConflictEvent = {
        id: 'conflict_2',
        dataType: 'prompt',
        elementId: 2,
        description: 'Conflict 2',
        localValue: 'local2',
        remoteValue: 'remote2',
        mergedValue: 'merged2',
        remoteUserId: 'user_3',
        remoteUserName: 'Charlie',
        timestamp: Date.now(),
        status: 'pending',
      };

      useCollaborationStore.getState().addConflict(conflict1);
      useCollaborationStore.getState().addConflict(conflict2);

      useCollaborationStore.getState().resolveConflict('conflict_1', 'accepted');

      const state = useCollaborationStore.getState();
      expect(state.conflicts[0].status).toBe('accepted');
      expect(state.conflicts[1].status).toBe('pending');
    });
  });

  describe('clearResolvedConflicts', () => {
    it('should remove resolved conflicts', () => {
      const pending: ConflictEvent = {
        id: 'conflict_1',
        dataType: 'shot',
        elementId: 1,
        description: 'Pending',
        localValue: 'local1',
        remoteValue: 'remote1',
        mergedValue: 'merged1',
        remoteUserId: 'user_2',
        remoteUserName: 'Bob',
        timestamp: Date.now(),
        status: 'pending',
      };
      const accepted: ConflictEvent = {
        id: 'conflict_2',
        dataType: 'prompt',
        elementId: 2,
        description: 'Accepted',
        localValue: 'local2',
        remoteValue: 'remote2',
        mergedValue: 'merged2',
        remoteUserId: 'user_3',
        remoteUserName: 'Charlie',
        timestamp: Date.now(),
        status: 'accepted',
      };
      const reverted: ConflictEvent = {
        id: 'conflict_3',
        dataType: 'timeline',
        elementId: 3,
        description: 'Reverted',
        localValue: 'local3',
        remoteValue: 'remote3',
        mergedValue: 'merged3',
        remoteUserId: 'user_4',
        remoteUserName: 'David',
        timestamp: Date.now(),
        status: 'reverted',
      };

      useCollaborationStore.getState().addConflict(pending);
      useCollaborationStore.getState().addConflict(accepted);
      useCollaborationStore.getState().addConflict(reverted);

      useCollaborationStore.getState().clearResolvedConflicts();

      const state = useCollaborationStore.getState();
      expect(state.conflicts).toHaveLength(1);
      expect(state.conflicts[0].status).toBe('pending');
    });

    it('should keep only pending conflicts', () => {
      const pending1: ConflictEvent = {
        id: 'conflict_1',
        dataType: 'shot',
        elementId: 1,
        description: 'Pending 1',
        localValue: 'local1',
        remoteValue: 'remote1',
        mergedValue: 'merged1',
        remoteUserId: 'user_2',
        remoteUserName: 'Bob',
        timestamp: Date.now(),
        status: 'pending',
      };
      const pending2: ConflictEvent = {
        id: 'conflict_2',
        dataType: 'prompt',
        elementId: 2,
        description: 'Pending 2',
        localValue: 'local2',
        remoteValue: 'remote2',
        mergedValue: 'merged2',
        remoteUserId: 'user_3',
        remoteUserName: 'Charlie',
        timestamp: Date.now(),
        status: 'pending',
      };
      const resolved: ConflictEvent = {
        id: 'conflict_3',
        dataType: 'timeline',
        elementId: 3,
        description: 'Resolved',
        localValue: 'local3',
        remoteValue: 'remote3',
        mergedValue: 'merged3',
        remoteUserId: 'user_4',
        remoteUserName: 'David',
        timestamp: Date.now(),
        status: 'custom',
      };

      useCollaborationStore.getState().addConflict(pending1);
      useCollaborationStore.getState().addConflict(pending2);
      useCollaborationStore.getState().addConflict(resolved);

      useCollaborationStore.getState().clearResolvedConflicts();

      const state = useCollaborationStore.getState();
      expect(state.conflicts).toHaveLength(2);
      expect(state.conflicts.every((c) => c.status === 'pending')).toBe(true);
    });
  });

  describe('setConnectionStatus', () => {
    it('should update connection status', () => {
      useCollaborationStore.getState().setConnectionStatus('connecting');
      expect(useCollaborationStore.getState().connectionStatus).toBe('connecting');

      useCollaborationStore.getState().setConnectionStatus('connected');
      expect(useCollaborationStore.getState().connectionStatus).toBe('connected');

      useCollaborationStore.getState().setConnectionStatus('reconnecting');
      expect(useCollaborationStore.getState().connectionStatus).toBe('reconnecting');

      useCollaborationStore.getState().setConnectionStatus('disconnected');
      expect(useCollaborationStore.getState().connectionStatus).toBe('disconnected');
    });
  });

  describe('setShareLinks', () => {
    it('should set share links', () => {
      const links: ShareableLink[] = [
        {
          id: 'link_1',
          roomId: 'room_1',
          shareCode: 'abc123',
          defaultRole: 'viewer',
          isActive: true,
          expiresAt: null,
          maxUsers: null,
          usedCount: 2,
          createdAt: Date.now(),
        },
      ];

      useCollaborationStore.getState().setShareLinks(links);

      expect(useCollaborationStore.getState().shareLinks).toEqual(links);
    });

    it('should replace share links', () => {
      const links1: ShareableLink[] = [
        {
          id: 'link_1',
          roomId: 'room_1',
          shareCode: 'abc123',
          defaultRole: 'viewer',
          isActive: true,
          expiresAt: null,
          maxUsers: null,
          usedCount: 0,
          createdAt: Date.now(),
        },
      ];
      const links2: ShareableLink[] = [
        {
          id: 'link_2',
          roomId: 'room_1',
          shareCode: 'def456',
          defaultRole: 'editor',
          isActive: true,
          expiresAt: null,
          maxUsers: 10,
          usedCount: 5,
          createdAt: Date.now(),
        },
      ];

      useCollaborationStore.getState().setShareLinks(links1);
      useCollaborationStore.getState().setShareLinks(links2);

      expect(useCollaborationStore.getState().shareLinks).toEqual(links2);
    });

    it('should clear share links with empty array', () => {
      const links: ShareableLink[] = [
        {
          id: 'link_1',
          roomId: 'room_1',
          shareCode: 'abc123',
          defaultRole: 'viewer',
          isActive: true,
          expiresAt: null,
          maxUsers: null,
          usedCount: 0,
          createdAt: Date.now(),
        },
      ];

      useCollaborationStore.getState().setShareLinks(links);
      useCollaborationStore.getState().setShareLinks([]);

      expect(useCollaborationStore.getState().shareLinks).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set up some state
      useCollaborationStore.getState().setCurrentUser(mockUser);
      useCollaborationStore.getState().setActiveRoom(mockRoom);
      useCollaborationStore.getState().addComment(mockComment);
      useCollaborationStore.getState().setConnectionStatus('connected');

      // Reset
      useCollaborationStore.getState().reset();

      const state = useCollaborationStore.getState();
      expect(state.currentUser).toBeNull();
      expect(state.activeRoom).toBeNull();
      expect(state.comments).toEqual([]);
      expect(state.peers).toEqual([]);
      expect(state.conflicts).toEqual([]);
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.isProfileSetUp).toBe(false);
      expect(state.shareLinks).toEqual([]);
    });
  });

  describe('Store isolation', () => {
    it('should not share state between independent operations', () => {
      useCollaborationStore.getState().setCurrentUser(mockUser);

      const state1 = useCollaborationStore.getState();
      expect(state1.currentUser).toBe(mockUser);

      useCollaborationStore.getState().reset();

      const state2 = useCollaborationStore.getState();
      expect(state2.currentUser).toBeNull();
    });
  });
});
