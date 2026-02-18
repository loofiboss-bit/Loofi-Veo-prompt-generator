/**
 * CollaborationService Unit Tests
 * Tests for collaboration room and sharing functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
  keys: vi.fn(() => Promise.resolve([...mockStore.keys()])),
}));

// Mock loggerService
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock authService
const { mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
}));
vi.mock('./authService', () => ({
  authService: {
    getCurrentUser: mockGetCurrentUser,
  },
}));

import { get, set, keys } from 'idb-keyval';
import { logger } from './loggerService';
import { collaborationService } from './collaborationService';
import type { CollaborationRoom, ShareableLink } from '@core/types';

describe('CollaborationService', () => {
  const mockUser = {
    id: 'user-1',
    displayName: 'Test User',
    avatarColor: '#ff0000',
    email: 'test@example.com',
    isAnonymous: false,
  };

  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser);
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = collaborationService;
      const instance2 = collaborationService;

      expect(instance1).toBe(instance2);
    });
  });

  describe('createRoom', () => {
    it('should create a new collaboration room', async () => {
      const room = await collaborationService.createRoom('project-1', 'Test Room');

      expect(room.id).toBeDefined();
      expect(room.name).toBe('Test Room');
      expect(room.projectId).toBe('project-1');
      expect(room.ownerId).toBe('user-1');
      expect(room.shareCode).toBeDefined();
      expect(room.shareCode).toHaveLength(6);
      expect(room.status).toBe('active');
      expect(room.members).toHaveLength(1);
      expect(room.members[0].userId).toBe('user-1');
      expect(room.members[0].role).toBe('admin');
    });

    it('should create public read-only room', async () => {
      const room = await collaborationService.createRoom('project-1', 'Public Room', true);

      expect(room.isPublicReadOnly).toBe(true);
    });

    it('should save room to storage', async () => {
      const room = await collaborationService.createRoom('project-1', 'Test Room');

      expect(set).toHaveBeenCalledWith(`collab:room:${room.id}`, room);
      expect(logger.info).toHaveBeenCalledWith(
        'CollaborationService',
        expect.stringContaining('Room created'),
        expect.any(Object),
      );
    });

    it('should add room to index', async () => {
      const room = await collaborationService.createRoom('project-1', 'Test Room');

      expect(set).toHaveBeenCalledWith('collab:room-index', [room.id]);
    });
  });

  describe('getRoom', () => {
    it('should retrieve a room by ID', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Test Room',
        projectId: 'project-1',
        ownerId: 'user-1',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room:room-1', room);

      const result = await collaborationService.getRoom('room-1');

      expect(result).toEqual(room);
    });

    it('should return null for non-existent room', async () => {
      const result = await collaborationService.getRoom('non-existent');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      vi.mocked(get).mockRejectedValueOnce(new Error('Storage error'));

      const result = await collaborationService.getRoom('room-1');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getUserRooms', () => {
    it('should get all rooms for current user', async () => {
      const room1: CollaborationRoom = {
        id: 'room-1',
        name: 'Room 1',
        projectId: 'project-1',
        ownerId: 'user-1',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [
          {
            userId: 'user-1',
            displayName: 'User',
            avatarColor: '#fff',
            role: 'admin',
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          },
        ],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room-index', ['room-1']);
      mockStore.set('collab:room:room-1', room1);

      const rooms = await collaborationService.getUserRooms();

      expect(rooms).toHaveLength(1);
      expect(rooms[0].id).toBe('room-1');
    });

    it('should filter out rooms user is not member of', async () => {
      const room1: CollaborationRoom = {
        id: 'room-1',
        name: 'Room 1',
        projectId: 'project-1',
        ownerId: 'other-user',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [
          {
            userId: 'other-user',
            displayName: 'Other',
            avatarColor: '#fff',
            role: 'admin',
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          },
        ],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room-index', ['room-1']);
      mockStore.set('collab:room:room-1', room1);

      const rooms = await collaborationService.getUserRooms();

      expect(rooms).toHaveLength(0);
    });

    it('should sort rooms by lastActivity descending', async () => {
      const now = Date.now();
      const room1: CollaborationRoom = {
        id: 'room-1',
        name: 'Older',
        projectId: 'project-1',
        ownerId: 'user-1',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [
          {
            userId: 'user-1',
            displayName: 'User',
            avatarColor: '#fff',
            role: 'admin',
            joinedAt: now,
            lastSeen: now,
          },
        ],
        createdAt: now - 2000,
        lastActivity: now - 2000,
        status: 'active',
      };
      const room2: CollaborationRoom = {
        id: 'room-2',
        name: 'Newer',
        projectId: 'project-1',
        ownerId: 'user-1',
        shareCode: 'DEF456',
        isPublicReadOnly: false,
        members: [
          {
            userId: 'user-1',
            displayName: 'User',
            avatarColor: '#fff',
            role: 'admin',
            joinedAt: now,
            lastSeen: now,
          },
        ],
        createdAt: now - 1000,
        lastActivity: now - 1000,
        status: 'active',
      };

      mockStore.set('collab:room-index', ['room-1', 'room-2']);
      mockStore.set('collab:room:room-1', room1);
      mockStore.set('collab:room:room-2', room2);

      const rooms = await collaborationService.getUserRooms();

      expect(rooms[0].id).toBe('room-2');
      expect(rooms[1].id).toBe('room-1');
    });

    it('should return empty array on error', async () => {
      vi.mocked(get).mockRejectedValueOnce(new Error('Error'));

      const rooms = await collaborationService.getUserRooms();

      expect(rooms).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findRoomByShareCode', () => {
    it('should find room by share code', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'user-1',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room-index', ['room-1']);
      mockStore.set('collab:room:room-1', room);

      const result = await collaborationService.findRoomByShareCode('ABC123');

      expect(result).toEqual(room);
    });

    it('should return null if room not found', async () => {
      const result = await collaborationService.findRoomByShareCode('NOTFOUND');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      vi.mocked(get).mockRejectedValueOnce(new Error('Error'));

      const result = await collaborationService.findRoomByShareCode('ABC123');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('joinRoom', () => {
    it('should join room via share code', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'owner-id',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room-index', ['room-1']);
      mockStore.set('collab:room:room-1', room);

      const result = await collaborationService.joinRoom('ABC123', 'editor');

      expect(result).not.toBeNull();
      expect(result?.members.some((m) => m.userId === 'user-1')).toBe(true);
      expect(result?.members.find((m) => m.userId === 'user-1')?.role).toBe('editor');
    });

    it('should return null if room not found', async () => {
      const result = await collaborationService.joinRoom('NOTFOUND');

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'CollaborationService',
        'Room not found for share code',
        expect.any(Object),
      );
    });

    it('should return null if room is inactive', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'owner-id',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'closed',
      };

      mockStore.set('collab:room-index', ['room-1']);
      mockStore.set('collab:room:room-1', room);

      const result = await collaborationService.joinRoom('ABC123');

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'CollaborationService',
        'Cannot join inactive room',
        expect.any(Object),
      );
    });

    it('should update last seen if already a member', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'user-1',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [
          {
            userId: 'user-1',
            displayName: 'User',
            avatarColor: '#fff',
            role: 'admin',
            joinedAt: Date.now() - 1000,
            lastSeen: Date.now() - 1000,
          },
        ],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room-index', ['room-1']);
      mockStore.set('collab:room:room-1', room);

      const result = await collaborationService.joinRoom('ABC123');

      expect(result?.members[0].lastSeen).toBeGreaterThan(Date.now() - 100);
    });

    it('should assign viewer role for public read-only rooms', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'owner-id',
        shareCode: 'ABC123',
        isPublicReadOnly: true,
        members: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room-index', ['room-1']);
      mockStore.set('collab:room:room-1', room);

      const result = await collaborationService.joinRoom('ABC123', 'editor');

      expect(result?.members.find((m) => m.userId === 'user-1')?.role).toBe('viewer');
    });
  });

  describe('leaveRoom', () => {
    it('should remove user from room', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'owner-id',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [
          {
            userId: 'owner-id',
            displayName: 'Owner',
            avatarColor: '#fff',
            role: 'admin',
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          },
          {
            userId: 'user-1',
            displayName: 'User',
            avatarColor: '#fff',
            role: 'editor',
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          },
        ],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room:room-1', room);

      await collaborationService.leaveRoom('room-1');

      const savedRoom = mockStore.get('collab:room:room-1') as CollaborationRoom;
      expect(savedRoom.members.some((m) => m.userId === 'user-1')).toBe(false);
      expect(logger.info).toHaveBeenCalledWith(
        'CollaborationService',
        expect.stringContaining('User left room'),
        expect.any(Object),
      );
    });

    it('should not allow owner to leave', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'user-1',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [
          {
            userId: 'user-1',
            displayName: 'User',
            avatarColor: '#fff',
            role: 'admin',
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          },
        ],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room:room-1', room);

      await collaborationService.leaveRoom('room-1');

      expect(logger.warn).toHaveBeenCalledWith(
        'CollaborationService',
        expect.stringContaining('Owner cannot leave'),
      );
    });
  });

  describe('closeRoom', () => {
    it('should close room if user is owner', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'user-1',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room:room-1', room);

      await collaborationService.closeRoom('room-1');

      const savedRoom = mockStore.get('collab:room:room-1') as CollaborationRoom;
      expect(savedRoom.status).toBe('closed');
      expect(logger.info).toHaveBeenCalledWith(
        'CollaborationService',
        expect.stringContaining('Room closed'),
      );
    });

    it('should not allow non-owner to close room', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'other-user',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room:room-1', room);

      await collaborationService.closeRoom('room-1');

      expect(logger.warn).toHaveBeenCalledWith('CollaborationService', 'Only owner can close room');
      const savedRoom = mockStore.get('collab:room:room-1') as CollaborationRoom;
      expect(savedRoom.status).toBe('active');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'user-1',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [
          {
            userId: 'user-2',
            displayName: 'User 2',
            avatarColor: '#fff',
            role: 'viewer',
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          },
        ],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room:room-1', room);

      const result = await collaborationService.updateMemberRole('room-1', 'user-2', 'editor');

      expect(result?.members.find((m) => m.userId === 'user-2')?.role).toBe('editor');
      expect(logger.info).toHaveBeenCalledWith(
        'CollaborationService',
        expect.stringContaining('Role updated'),
      );
    });

    it('should return null if room not found', async () => {
      const result = await collaborationService.updateMemberRole(
        'non-existent',
        'user-2',
        'editor',
      );

      expect(result).toBeNull();
    });
  });

  describe('removeMember', () => {
    it('should remove member from room', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'user-1',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [
          {
            userId: 'user-1',
            displayName: 'Owner',
            avatarColor: '#fff',
            role: 'admin',
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          },
          {
            userId: 'user-2',
            displayName: 'User 2',
            avatarColor: '#fff',
            role: 'editor',
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          },
        ],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room:room-1', room);

      const result = await collaborationService.removeMember('room-1', 'user-2');

      expect(result?.members.some((m) => m.userId === 'user-2')).toBe(false);
      expect(logger.info).toHaveBeenCalledWith(
        'CollaborationService',
        expect.stringContaining('Member user-2 removed'),
      );
    });

    it('should not allow removing room owner', async () => {
      const room: CollaborationRoom = {
        id: 'room-1',
        name: 'Room',
        projectId: 'project-1',
        ownerId: 'user-1',
        shareCode: 'ABC123',
        isPublicReadOnly: false,
        members: [
          {
            userId: 'user-1',
            displayName: 'Owner',
            avatarColor: '#fff',
            role: 'admin',
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          },
        ],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      };

      mockStore.set('collab:room:room-1', room);

      const result = await collaborationService.removeMember('room-1', 'user-1');

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('CollaborationService', 'Cannot remove room owner');
    });
  });

  describe('createShareLink', () => {
    it('should create shareable link for room', async () => {
      const link = await collaborationService.createShareLink('room-1', 'editor', null, null);

      expect(link.id).toBeDefined();
      expect(link.roomId).toBe('room-1');
      expect(link.shareCode).toBeDefined();
      expect(link.defaultRole).toBe('editor');
      expect(link.isActive).toBe(true);
      expect(link.usedCount).toBe(0);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should create link with expiration', async () => {
      const expiresAt = Date.now() + 86400000;
      const link = await collaborationService.createShareLink('room-1', 'editor', expiresAt);

      expect(link.expiresAt).toBe(expiresAt);
    });

    it('should create link with max users', async () => {
      const link = await collaborationService.createShareLink('room-1', 'editor', null, 10);

      expect(link.maxUsers).toBe(10);
    });
  });

  describe('getShareLinks', () => {
    it('should get all share links for a room', async () => {
      const link1: ShareableLink = {
        id: 'link-1',
        roomId: 'room-1',
        shareCode: 'ABC123',
        defaultRole: 'editor',
        isActive: true,
        expiresAt: null,
        maxUsers: null,
        usedCount: 0,
        createdAt: Date.now(),
      };
      const link2: ShareableLink = {
        id: 'link-2',
        roomId: 'room-2',
        shareCode: 'DEF456',
        defaultRole: 'viewer',
        isActive: true,
        expiresAt: null,
        maxUsers: null,
        usedCount: 0,
        createdAt: Date.now(),
      };

      mockStore.set('collab:link:link-1', link1);
      mockStore.set('collab:link:link-2', link2);

      const links = await collaborationService.getShareLinks('room-1');

      expect(links).toHaveLength(1);
      expect(links[0].id).toBe('link-1');
    });

    it('should return empty array on error', async () => {
      vi.mocked(keys).mockRejectedValueOnce(new Error('Error'));

      const links = await collaborationService.getShareLinks('room-1');

      expect(links).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deactivateLink', () => {
    it('should deactivate share link', async () => {
      const link: ShareableLink = {
        id: 'link-1',
        roomId: 'room-1',
        shareCode: 'ABC123',
        defaultRole: 'editor',
        isActive: true,
        expiresAt: null,
        maxUsers: null,
        usedCount: 0,
        createdAt: Date.now(),
      };

      mockStore.set('collab:link:link-1', link);

      await collaborationService.deactivateLink('link-1');

      const saved = mockStore.get('collab:link:link-1') as ShareableLink;
      expect(saved.isActive).toBe(false);
      expect(logger.info).toHaveBeenCalledWith(
        'CollaborationService',
        expect.stringContaining('deactivated'),
      );
    });
  });

  describe('getShareUrl', () => {
    it('should generate share URL from code', () => {
      const url = collaborationService.getShareUrl('ABC123');

      expect(url).toBe('veostudio://join/ABC123');
    });
  });
});
