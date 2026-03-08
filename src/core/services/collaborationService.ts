/**
 * Collaboration Service
 * v2.6.0 - Collaboration Suite
 *
 * Manages collaboration rooms, shareable links, and room membership.
 * Rooms are stored in IndexedDB and synchronized with peers via Yjs awareness.
 */

import { get, set, keys } from 'idb-keyval';
import { logger } from './loggerService';
import { authService } from './authService';
import type { CollaborationRoom, ShareableLink, RoomMember, CollaborationRole } from '@core/types';

const IDB_ROOMS_PREFIX = 'collab:room:';
const IDB_LINKS_PREFIX = 'collab:link:';
const IDB_ROOM_INDEX = 'collab:room-index';

class CollaborationService {
  private static instance: CollaborationService;

  static getInstance(): CollaborationService {
    if (!CollaborationService.instance) {
      CollaborationService.instance = new CollaborationService();
    }
    return CollaborationService.instance;
  }

  // ─── Room Management ──────────────────────────────────────────────

  /**
   * Create a new collaboration room for a project.
   */
  async createRoom(
    projectId: string,
    name: string,
    isPublicReadOnly: boolean = false,
  ): Promise<CollaborationRoom> {
    const user = await authService.getCurrentUser();
    const room: CollaborationRoom = {
      id: this.generateRoomId(),
      name,
      projectId,
      ownerId: user.id,
      shareCode: this.generateShareCode(),
      isPublicReadOnly,
      members: [
        {
          userId: user.id,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          role: 'admin',
          joinedAt: Date.now(),
          lastSeen: Date.now(),
        },
      ],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      status: 'active',
    };

    await this.saveRoom(room);
    await this.addToRoomIndex(room.id);
    logger.info('CollaborationService', `Room created: ${room.id}`, { projectId, name });
    return room;
  }

  /**
   * Get a room by ID.
   */
  async getRoom(roomId: string): Promise<CollaborationRoom | null> {
    try {
      return (await get<CollaborationRoom>(`${IDB_ROOMS_PREFIX}${roomId}`)) ?? null;
    } catch (error) {
      logger.error('CollaborationService', 'Failed to get room', error);
      return null;
    }
  }

  /**
   * Get all rooms the current user belongs to.
   */
  async getUserRooms(): Promise<CollaborationRoom[]> {
    try {
      const user = await authService.getCurrentUser();
      const roomIds = (await get<string[]>(IDB_ROOM_INDEX)) ?? [];
      const rooms: CollaborationRoom[] = [];

      for (const roomId of roomIds) {
        const room = await this.getRoom(roomId);
        if (room && room.members.some((m) => m.userId === user.id)) {
          rooms.push(room);
        }
      }

      return rooms.sort((a, b) => b.lastActivity - a.lastActivity);
    } catch (error) {
      logger.error('CollaborationService', 'Failed to get user rooms', error);
      return [];
    }
  }

  /**
   * Find a room by its share code.
   */
  async findRoomByShareCode(shareCode: string): Promise<CollaborationRoom | null> {
    try {
      const roomIds = (await get<string[]>(IDB_ROOM_INDEX)) ?? [];
      for (const roomId of roomIds) {
        const room = await this.getRoom(roomId);
        if (room && room.shareCode === shareCode) return room;
      }
      return null;
    } catch (error) {
      logger.error('CollaborationService', 'Failed to find room by share code', error);
      return null;
    }
  }

  /**
   * Join a room via share code.
   */
  async joinRoom(
    shareCode: string,
    role: CollaborationRole = 'editor',
  ): Promise<CollaborationRoom | null> {
    const room = await this.findRoomByShareCode(shareCode);
    if (!room) {
      logger.warn('CollaborationService', 'Room not found for share code', { shareCode });
      return null;
    }

    if (room.status !== 'active') {
      logger.warn('CollaborationService', 'Cannot join inactive room', { roomId: room.id });
      return null;
    }

    const user = await authService.getCurrentUser();

    // Already a member?
    if (room.members.some((m) => m.userId === user.id)) {
      // Update last seen
      return this.updateMemberLastSeen(room.id, user.id);
    }

    // Determine role: public read-only rooms give viewer role
    const effectiveRole = room.isPublicReadOnly ? 'viewer' : role;

    const newMember: RoomMember = {
      userId: user.id,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      role: effectiveRole,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    const updated: CollaborationRoom = {
      ...room,
      members: [...room.members, newMember],
      lastActivity: Date.now(),
    };

    await this.saveRoom(updated);
    await this.addToRoomIndex(updated.id);
    logger.info('CollaborationService', `User joined room: ${room.id}`, {
      userId: user.id,
      role: effectiveRole,
    });
    return updated;
  }

  /**
   * Leave a room.
   */
  async leaveRoom(roomId: string): Promise<void> {
    const user = await authService.getCurrentUser();
    const room = await this.getRoom(roomId);
    if (!room) return;

    // Owner can't leave — they must close the room
    if (room.ownerId === user.id) {
      logger.warn('CollaborationService', 'Owner cannot leave room — use closeRoom instead');
      return;
    }

    const updated: CollaborationRoom = {
      ...room,
      members: room.members.filter((m) => m.userId !== user.id),
      lastActivity: Date.now(),
    };

    await this.saveRoom(updated);
    logger.info('CollaborationService', `User left room: ${roomId}`, { userId: user.id });
  }

  /**
   * Close a room (owner only).
   */
  async closeRoom(roomId: string): Promise<void> {
    const user = await authService.getCurrentUser();
    const room = await this.getRoom(roomId);
    if (!room) return;

    if (room.ownerId !== user.id) {
      logger.warn('CollaborationService', 'Only owner can close room');
      return;
    }

    const updated: CollaborationRoom = {
      ...room,
      status: 'closed',
      lastActivity: Date.now(),
    };

    await this.saveRoom(updated);
    logger.info('CollaborationService', `Room closed: ${roomId}`);
  }

  /**
   * Update a member's role.
   */
  async updateMemberRole(
    roomId: string,
    targetUserId: string,
    newRole: CollaborationRole,
  ): Promise<CollaborationRoom | null> {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const updated: CollaborationRoom = {
      ...room,
      members: room.members.map((m) => (m.userId === targetUserId ? { ...m, role: newRole } : m)),
      lastActivity: Date.now(),
    };

    await this.saveRoom(updated);
    logger.info('CollaborationService', `Role updated for ${targetUserId} → ${newRole}`);
    return updated;
  }

  /**
   * Remove a member from a room.
   */
  async removeMember(roomId: string, targetUserId: string): Promise<CollaborationRoom | null> {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    if (targetUserId === room.ownerId) {
      logger.warn('CollaborationService', 'Cannot remove room owner');
      return null;
    }

    const updated: CollaborationRoom = {
      ...room,
      members: room.members.filter((m) => m.userId !== targetUserId),
      lastActivity: Date.now(),
    };

    await this.saveRoom(updated);
    logger.info('CollaborationService', `Member ${targetUserId} removed from room ${roomId}`);
    return updated;
  }

  // ─── Shareable Links ──────────────────────────────────────────────

  /**
   * Create a shareable link for a room.
   */
  async createShareLink(
    roomId: string,
    defaultRole: CollaborationRole = 'editor',
    expiresAt: number | null = null,
    maxUsers: number | null = null,
  ): Promise<ShareableLink> {
    const link: ShareableLink = {
      id: this.generateLinkId(),
      roomId,
      shareCode: this.generateShareCode(),
      defaultRole,
      isActive: true,
      expiresAt,
      maxUsers,
      usedCount: 0,
      createdAt: Date.now(),
    };

    await this.saveLink(link);
    logger.info('CollaborationService', `Share link created for room ${roomId}`, {
      linkId: link.id,
    });
    return link;
  }

  /**
   * Get all share links for a room.
   */
  async getShareLinks(roomId: string): Promise<ShareableLink[]> {
    try {
      const allKeys = await keys();
      const linkKeys = allKeys.filter(
        (k) => typeof k === 'string' && k.startsWith(IDB_LINKS_PREFIX),
      );

      const links: ShareableLink[] = [];
      for (const key of linkKeys) {
        const link = await get<ShareableLink>(key as string);
        if (link && link.roomId === roomId) links.push(link);
      }

      return links.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logger.error('CollaborationService', 'Failed to get share links', error);
      return [];
    }
  }

  /**
   * Deactivate a share link.
   */
  async deactivateLink(linkId: string): Promise<void> {
    try {
      const link = await get<ShareableLink>(`${IDB_LINKS_PREFIX}${linkId}`);
      if (link) {
        await set(`${IDB_LINKS_PREFIX}${linkId}`, { ...link, isActive: false });
        logger.info('CollaborationService', `Share link deactivated: ${linkId}`);
      }
    } catch (error) {
      logger.error('CollaborationService', 'Failed to deactivate link', error);
    }
  }

  /**
   * Generate a room URL for display (the share code).
   */
  getShareUrl(shareCode: string): string {
    // In a web app, this would be a real URL. For desktop, it's a code to enter.
    return `veostudio://join/${shareCode}`;
  }

  // ─── Internal Helpers ─────────────────────────────────────────────

  private async updateMemberLastSeen(
    roomId: string,
    userId: string,
  ): Promise<CollaborationRoom | null> {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const updated: CollaborationRoom = {
      ...room,
      members: room.members.map((m) => (m.userId === userId ? { ...m, lastSeen: Date.now() } : m)),
      lastActivity: Date.now(),
    };

    await this.saveRoom(updated);
    return updated;
  }

  private async saveRoom(room: CollaborationRoom): Promise<void> {
    await set(`${IDB_ROOMS_PREFIX}${room.id}`, room);
  }

  private async saveLink(link: ShareableLink): Promise<void> {
    await set(`${IDB_LINKS_PREFIX}${link.id}`, link);
  }

  private async addToRoomIndex(roomId: string): Promise<void> {
    const index = (await get<string[]>(IDB_ROOM_INDEX)) ?? [];
    if (!index.includes(roomId)) {
      index.push(roomId);
      await set(IDB_ROOM_INDEX, index);
    }
  }

  private generateRoomId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `room_${timestamp}_${random}`;
  }

  private generateLinkId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `link_${timestamp}_${random}`;
  }

  private generateShareCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randomValues = new Uint32Array(6);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues, (v) => chars[v % chars.length]).join('');
  }
}

export const collaborationService = CollaborationService.getInstance();
