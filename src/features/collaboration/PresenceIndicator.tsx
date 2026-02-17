/**
 * PresenceIndicator Component
 * v2.6.0 - Collaboration Suite
 *
 * Shows avatars of connected users with focus indicators.
 * Displayed in the header/toolbar area.
 */

import React from 'react';
import { useCollaborationStore } from '@core/store/useCollaborationStore';
import type { PresenceState } from '@core/types';

interface PresenceAvatarProps {
  peer: PresenceState;
  size?: 'sm' | 'md';
}

function PresenceAvatar({ peer, size = 'md' }: PresenceAvatarProps) {
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';
  const initials = peer.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative group" title={`${peer.displayName} (${peer.role})`}>
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-white dark:ring-gray-900 transition-transform hover:scale-110`}
        style={{ backgroundColor: peer.avatarColor }}
      >
        {initials}
      </div>
      {/* Online indicator */}
      {peer.isOnline && (
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
      )}
      {/* Editing indicator */}
      {peer.isEditing && (
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-400 rounded-full ring-2 ring-white dark:ring-gray-900 animate-pulse" />
      )}
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {peer.displayName}
        {peer.focusTarget && (
          <span className="text-gray-400 ml-1">
            • {peer.focusTarget.type} {peer.focusTarget.id}
          </span>
        )}
        <span className="text-gray-500 ml-1">({peer.role})</span>
      </div>
    </div>
  );
}

interface PresenceIndicatorProps {
  maxVisible?: number;
}

export function PresenceIndicator({ maxVisible = 5 }: PresenceIndicatorProps) {
  const { peers, connectionStatus, currentUser } = useCollaborationStore();

  // Don't show if not connected
  if (connectionStatus === 'disconnected' || peers.length === 0) return null;

  // Filter out current user from peer list
  const otherPeers = peers.filter((p) => p.userId !== currentUser?.id);
  const visiblePeers = otherPeers.slice(0, maxVisible);
  const overflowCount = Math.max(0, otherPeers.length - maxVisible);

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Connected users">
      {/* Connection status dot */}
      <div
        className={`w-2 h-2 rounded-full mr-1 ${
          connectionStatus === 'connected'
            ? 'bg-green-500'
            : connectionStatus === 'reconnecting'
              ? 'bg-yellow-500 animate-pulse'
              : 'bg-red-500'
        }`}
        title={`Connection: ${connectionStatus}`}
      />

      {/* User avatars */}
      <div className="flex -space-x-2">
        {visiblePeers.map((peer) => (
          <PresenceAvatar key={peer.clientId} peer={peer} />
        ))}
        {overflowCount > 0 && (
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white font-semibold ring-2 ring-white dark:ring-gray-900">
            +{overflowCount}
          </div>
        )}
      </div>

      {/* User count */}
      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
        {otherPeers.length + 1} online
      </span>
    </div>
  );
}
