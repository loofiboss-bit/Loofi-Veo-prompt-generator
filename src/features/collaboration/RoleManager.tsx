/**
 * RoleManager Component
 * v2.6.0 - Collaboration Suite
 *
 * Panel for managing team workspace roles (viewer/editor/admin).
 * Only visible to admins. Shows member list with role controls.
 */

import React, { useState, useCallback } from 'react';
import { useCollaborationStore } from '@core/store/useCollaborationStore';
import { collaborationService } from '@core/services/collaborationService';
import { permissionService } from '@core/services/permissionService';
import type { CollaborationRole, RoomMember } from '@core/types';

// ─── Member Row ──────────────────────────────────────────────────────

interface MemberRowProps {
  member: RoomMember;
  currentUserId: string;
  isOwner: boolean;
  isCurrentUserAdmin: boolean;
  roomId: string;
  onRoleChange: (userId: string, newRole: CollaborationRole) => void;
  onRemove: (userId: string) => void;
}

function MemberRow({
  member,
  currentUserId,
  isOwner,
  isCurrentUserAdmin,
  roomId,
  onRoleChange,
  onRemove,
}: MemberRowProps) {
  const isCurrentUser = member.userId === currentUserId;
  const isMemberOwner = isOwner;
  const initials = member.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const lastSeen = getTimeAgo(member.lastSeen);

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: member.avatarColor }}
        >
          {initials}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {member.displayName}
            </span>
            {isCurrentUser && (
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                You
              </span>
            )}
            {isMemberOwner && (
              <span className="px-1.5 py-0.5 text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded">
                Owner
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            Last active {lastSeen}
          </span>
        </div>
      </div>

      {/* Role controls */}
      <div className="flex items-center gap-2">
        {isCurrentUserAdmin && !isCurrentUser && !isMemberOwner ? (
          <>
            <select
              value={member.role}
              onChange={(e) => onRoleChange(member.userId, e.target.value as CollaborationRole)}
              className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={() => onRemove(member.userId)}
              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
              title="Remove member"
            >
              ✕
            </button>
          </>
        ) : (
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeClass(member.role)}`}
          >
            {member.role}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Role Manager Panel ──────────────────────────────────────────────

interface RoleManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleManager({ isOpen, onClose }: RoleManagerProps) {
  const { activeRoom, currentUser, setActiveRoom } = useCollaborationStore();

  const handleRoleChange = useCallback(
    async (userId: string, newRole: CollaborationRole) => {
      if (!activeRoom) return;
      const updated = await collaborationService.updateMemberRole(activeRoom.id, userId, newRole);
      if (updated) setActiveRoom(updated);
    },
    [activeRoom, setActiveRoom],
  );

  const handleRemove = useCallback(
    async (userId: string) => {
      if (!activeRoom) return;
      const updated = await collaborationService.removeMember(activeRoom.id, userId);
      if (updated) setActiveRoom(updated);
    },
    [activeRoom, setActiveRoom],
  );

  if (!isOpen || !activeRoom || !currentUser) return null;

  const isCurrentUserAdmin = permissionService.hasPermission(
    currentUser.id,
    'manage_roles',
    activeRoom,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Members</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {activeRoom.name} • {activeRoom.members.length} member
              {activeRoom.members.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Role legend */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400">
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1" />
              Viewer: read only
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />
              Editor: read + write
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-1" />
              Admin: full access
            </span>
          </div>
        </div>

        {/* Member list */}
        <div className="max-h-80 overflow-y-auto py-2 px-3">
          {activeRoom.members
            .sort((a, b) => permissionService.compareRoles(b.role, a.role))
            .map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                currentUserId={currentUser.id}
                isOwner={member.userId === activeRoom.ownerId}
                isCurrentUserAdmin={isCurrentUserAdmin}
                roomId={activeRoom.id}
                onRoleChange={handleRoleChange}
                onRemove={handleRemove}
              />
            ))}
        </div>

        {/* Footer */}
        {!isCurrentUserAdmin && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
            Only admins can manage roles.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getRoleBadgeClass(role: CollaborationRole): string {
  switch (role) {
    case 'viewer':
      return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    case 'editor':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    case 'admin':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
  }
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
