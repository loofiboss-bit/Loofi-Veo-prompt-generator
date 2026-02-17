/**
 * PermissionService Unit Tests
 * v2.6.0 - Collaboration Suite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock loggerService only (no idb-keyval for this service)
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import { permissionService } from './permissionService';
import type { CollaborationRoom, RoomMember } from '@core/types';

describe('PermissionService', () => {
  let testRoom: CollaborationRoom;
  let testMembers: RoomMember[];

  beforeEach(() => {
    vi.clearAllMocks();

    testMembers = [
      {
        userId: 'user_1',
        displayName: 'Alice',
        avatarColor: '#3b82f6',
        role: 'admin',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      },
      {
        userId: 'user_2',
        displayName: 'Bob',
        avatarColor: '#ef4444',
        role: 'editor',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      },
      {
        userId: 'user_3',
        displayName: 'Charlie',
        avatarColor: '#22c55e',
        role: 'viewer',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      },
    ];

    testRoom = {
      id: 'room_1',
      name: 'Test Room',
      projectId: 'project_1',
      ownerId: 'user_1',
      shareCode: 'abc123',
      isPublicReadOnly: false,
      members: testMembers,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      status: 'active',
    };
  });

  describe('hasPermission', () => {
    it('should always grant permissions to room owner', () => {
      expect(permissionService.hasPermission('user_1', 'read', testRoom)).toBe(true);
      expect(permissionService.hasPermission('user_1', 'write', testRoom)).toBe(true);
      expect(permissionService.hasPermission('user_1', 'manage_roles', testRoom)).toBe(true);
      expect(permissionService.hasPermission('user_1', 'delete', testRoom)).toBe(true);
    });

    it('should check member role permissions', () => {
      // Editor (user_2)
      expect(permissionService.hasPermission('user_2', 'read', testRoom)).toBe(true);
      expect(permissionService.hasPermission('user_2', 'write', testRoom)).toBe(true);
      expect(permissionService.hasPermission('user_2', 'comment', testRoom)).toBe(true);
      expect(permissionService.hasPermission('user_2', 'manage_roles', testRoom)).toBe(false);

      // Viewer (user_3)
      expect(permissionService.hasPermission('user_3', 'read', testRoom)).toBe(true);
      expect(permissionService.hasPermission('user_3', 'write', testRoom)).toBe(false);
      expect(permissionService.hasPermission('user_3', 'comment', testRoom)).toBe(false);
    });

    it('should deny non-members except public read-only', () => {
      const nonMemberId = 'user_4';

      expect(permissionService.hasPermission(nonMemberId, 'read', testRoom)).toBe(false);
      expect(permissionService.hasPermission(nonMemberId, 'write', testRoom)).toBe(false);
    });

    it('should allow public read-only access for non-members', () => {
      const publicRoom = { ...testRoom, isPublicReadOnly: true };
      const nonMemberId = 'user_4';

      expect(permissionService.hasPermission(nonMemberId, 'read', publicRoom)).toBe(true);
      expect(permissionService.hasPermission(nonMemberId, 'write', publicRoom)).toBe(false);
    });
  });

  describe('roleHasPermission', () => {
    it('viewer should only have read permission', () => {
      expect(permissionService.roleHasPermission('viewer', 'read')).toBe(true);
      expect(permissionService.roleHasPermission('viewer', 'write')).toBe(false);
      expect(permissionService.roleHasPermission('viewer', 'comment')).toBe(false);
      expect(permissionService.roleHasPermission('viewer', 'delete')).toBe(false);
      expect(permissionService.roleHasPermission('viewer', 'manage_roles')).toBe(false);
    });

    it('editor should have read, write, comment, export permissions', () => {
      expect(permissionService.roleHasPermission('editor', 'read')).toBe(true);
      expect(permissionService.roleHasPermission('editor', 'write')).toBe(true);
      expect(permissionService.roleHasPermission('editor', 'comment')).toBe(true);
      expect(permissionService.roleHasPermission('editor', 'export')).toBe(true);
      expect(permissionService.roleHasPermission('editor', 'delete')).toBe(false);
      expect(permissionService.roleHasPermission('editor', 'manage_roles')).toBe(false);
    });

    it('admin should have all permissions', () => {
      const allPermissions: Array<
        'read' | 'write' | 'comment' | 'delete' | 'manage_roles' | 'share' | 'export'
      > = ['read', 'write', 'comment', 'delete', 'manage_roles', 'share', 'export'];

      allPermissions.forEach((permission) => {
        expect(permissionService.roleHasPermission('admin', permission)).toBe(true);
      });
    });
  });

  describe('getUserRole', () => {
    it('should return admin for owner', () => {
      const role = permissionService.getUserRole('user_1', testRoom);
      expect(role).toBe('admin');
    });

    it('should return member role', () => {
      expect(permissionService.getUserRole('user_2', testRoom)).toBe('editor');
      expect(permissionService.getUserRole('user_3', testRoom)).toBe('viewer');
    });

    it('should return null for non-members', () => {
      const role = permissionService.getUserRole('user_4', testRoom);
      expect(role).toBeNull();
    });
  });

  describe('canModifyRole', () => {
    it('should deny modifying own role', () => {
      expect(permissionService.canModifyRole('user_1', 'user_1', 'viewer', testRoom)).toBe(false);
      expect(permissionService.canModifyRole('user_2', 'user_2', 'admin', testRoom)).toBe(false);
    });

    it('should only allow admins to modify roles', () => {
      // Owner (user_1) can modify
      expect(permissionService.canModifyRole('user_1', 'user_2', 'viewer', testRoom)).toBe(true);

      // Editor (user_2) cannot modify
      expect(permissionService.canModifyRole('user_2', 'user_3', 'admin', testRoom)).toBe(false);

      // Viewer (user_3) cannot modify
      expect(permissionService.canModifyRole('user_3', 'user_2', 'viewer', testRoom)).toBe(false);
    });

    it('should deny setting admin unless actor is owner', () => {
      const adminMember = { ...testMembers[0], role: 'admin' };
      testRoom.members = [adminMember, testMembers[1], testMembers[2]];

      // Owner can set admin
      expect(permissionService.canModifyRole('user_1', 'user_2', 'admin', testRoom)).toBe(true);

      // Admin who is not owner (if any) cannot set admin
      testRoom.members = [
        { ...testMembers[0], userId: 'user_not_owner', role: 'admin' },
        testMembers[1],
        testMembers[2],
      ];
      testRoom.ownerId = 'user_1'; // Keep user_1 as owner

      expect(permissionService.canModifyRole('user_not_owner', 'user_2', 'admin', testRoom)).toBe(
        false,
      );
    });

    it('should deny modifying owner role', () => {
      expect(permissionService.canModifyRole('user_1', 'user_1', 'viewer', testRoom)).toBe(false);

      expect(permissionService.canModifyRole('user_2', 'user_1', 'viewer', testRoom)).toBe(false);
    });
  });

  describe('assignRole', () => {
    it('should assign role and return updated members', () => {
      const result = permissionService.assignRole('user_2', 'admin', testRoom, 'user_1');

      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
      expect(result!.find((m) => m.userId === 'user_2')).toEqual(
        expect.objectContaining({ role: 'admin' }),
      );
    });

    it('should return null if unauthorized', () => {
      const result = permissionService.assignRole('user_2', 'admin', testRoom, 'user_3');

      expect(result).toBeNull();
    });

    it('should not modify original room members', () => {
      const originalMembers = [...testRoom.members];

      permissionService.assignRole('user_2', 'viewer', testRoom, 'user_1');

      expect(testRoom.members).toEqual(originalMembers);
    });

    it('should update correct member in result', () => {
      const result = permissionService.assignRole('user_3', 'editor', testRoom, 'user_1');

      expect(result).not.toBeNull();
      expect(result!.find((m) => m.userId === 'user_3')).toEqual(
        expect.objectContaining({ role: 'editor' }),
      );
      expect(result!.find((m) => m.userId === 'user_1')).toEqual(
        expect.objectContaining({ role: 'admin' }),
      );
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return correct permissions for viewer', () => {
      const perms = permissionService.getPermissionsForRole('viewer');

      expect(perms).toEqual(['read']);
    });

    it('should return correct permissions for editor', () => {
      const perms = permissionService.getPermissionsForRole('editor');

      expect(perms).toContain('read');
      expect(perms).toContain('write');
      expect(perms).toContain('comment');
      expect(perms).toContain('export');
      expect(perms).not.toContain('manage_roles');
      expect(perms).not.toContain('delete');
    });

    it('should return correct permissions for admin', () => {
      const perms = permissionService.getPermissionsForRole('admin');

      expect(perms).toEqual(
        expect.arrayContaining([
          'read',
          'write',
          'comment',
          'delete',
          'manage_roles',
          'share',
          'export',
        ]),
      );
    });

    it('should return new array (not reference)', () => {
      const perms1 = permissionService.getPermissionsForRole('admin');
      const perms2 = permissionService.getPermissionsForRole('admin');

      expect(perms1).toEqual(perms2);
      expect(perms1).not.toBe(perms2);
    });
  });

  describe('isValidRole', () => {
    it('should return true for valid roles', () => {
      expect(permissionService.isValidRole('viewer')).toBe(true);
      expect(permissionService.isValidRole('editor')).toBe(true);
      expect(permissionService.isValidRole('admin')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(permissionService.isValidRole('owner')).toBe(false);
      expect(permissionService.isValidRole('guest')).toBe(false);
      expect(permissionService.isValidRole('moderator')).toBe(false);
      expect(permissionService.isValidRole('')).toBe(false);
    });
  });

  describe('compareRoles', () => {
    it('viewer < editor < admin', () => {
      expect(permissionService.compareRoles('viewer', 'editor')).toBeLessThan(0);
      expect(permissionService.compareRoles('viewer', 'admin')).toBeLessThan(0);
      expect(permissionService.compareRoles('editor', 'admin')).toBeLessThan(0);
    });

    it('reverse comparisons should be greater than 0', () => {
      expect(permissionService.compareRoles('admin', 'editor')).toBeGreaterThan(0);
      expect(permissionService.compareRoles('admin', 'viewer')).toBeGreaterThan(0);
      expect(permissionService.compareRoles('editor', 'viewer')).toBeGreaterThan(0);
    });

    it('same roles should be equal', () => {
      expect(permissionService.compareRoles('viewer', 'viewer')).toBe(0);
      expect(permissionService.compareRoles('editor', 'editor')).toBe(0);
      expect(permissionService.compareRoles('admin', 'admin')).toBe(0);
    });
  });
});
