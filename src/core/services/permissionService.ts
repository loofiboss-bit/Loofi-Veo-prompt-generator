/**
 * Permission Service
 * v2.6.0 - Collaboration Suite
 *
 * Client-side role enforcement and permission checking.
 * Roles are stored in the Yjs document and synchronized across peers.
 */

import { logger } from './loggerService';
import type {
  CollaborationRole,
  PermissionAction,
  RoomMember,
  CollaborationRoom,
} from '@core/types';
import { ROLE_PERMISSIONS } from '@core/types/collaboration';

class PermissionService {
  private static instance: PermissionService;

  static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * Check if a user has permission to perform an action in a room.
   */
  hasPermission(userId: string, action: PermissionAction, room: CollaborationRoom): boolean {
    // Room owner always has all permissions
    if (room.ownerId === userId) return true;

    const member = room.members.find((m) => m.userId === userId);
    if (!member) {
      // Not a member — check if public read-only
      if (room.isPublicReadOnly && action === 'read') return true;
      return false;
    }

    return this.roleHasPermission(member.role, action);
  }

  /**
   * Check if a role has a specific permission.
   */
  roleHasPermission(role: CollaborationRole, action: PermissionAction): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions.includes(action);
  }

  /**
   * Get the effective role for a user in a room.
   */
  getUserRole(userId: string, room: CollaborationRoom): CollaborationRole | null {
    if (room.ownerId === userId) return 'admin';
    const member = room.members.find((m) => m.userId === userId);
    return member?.role ?? null;
  }

  /**
   * Check if a user can modify another user's role.
   */
  canModifyRole(
    actorId: string,
    targetId: string,
    newRole: CollaborationRole,
    room: CollaborationRoom,
  ): boolean {
    // Can't modify own role
    if (actorId === targetId) return false;

    // Only admins can modify roles
    if (!this.hasPermission(actorId, 'manage_roles', room)) return false;

    // Can't set someone to admin unless you're the owner
    if (newRole === 'admin' && room.ownerId !== actorId) return false;

    // Owner's role can't be changed
    if (targetId === room.ownerId) return false;

    return true;
  }

  /**
   * Assign a role to a user in a room. Returns updated members list.
   */
  assignRole(
    userId: string,
    role: CollaborationRole,
    room: CollaborationRoom,
    actorId: string,
  ): RoomMember[] | null {
    if (!this.canModifyRole(actorId, userId, role, room)) {
      logger.warn('PermissionService', 'Unauthorized role assignment attempt', {
        actorId,
        targetId: userId,
        role,
      });
      return null;
    }

    const members = room.members.map((m) => (m.userId === userId ? { ...m, role } : m));

    logger.info('PermissionService', `Role assigned: ${userId} → ${role}`, {
      actorId,
      roomId: room.id,
    });

    return members;
  }

  /**
   * Get all permissions for a role.
   */
  getPermissionsForRole(role: CollaborationRole): PermissionAction[] {
    return [...ROLE_PERMISSIONS[role]];
  }

  /**
   * Validate that a role string is valid.
   */
  isValidRole(role: string): role is CollaborationRole {
    return role === 'viewer' || role === 'editor' || role === 'admin';
  }

  /**
   * Compare role levels (for display ordering).
   * Returns negative if a < b, 0 if equal, positive if a > b.
   */
  compareRoles(a: CollaborationRole, b: CollaborationRole): number {
    const levels: Record<CollaborationRole, number> = {
      viewer: 0,
      editor: 1,
      admin: 2,
    };
    return levels[a] - levels[b];
  }
}

export const permissionService = PermissionService.getInstance();
