/**
 * ShareDialog Component
 * v2.6.0 - Collaboration Suite
 *
 * Modal dialog for creating/managing shareable project links,
 * inviting users via share codes, and configuring room access.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useCollaborationStore } from '@core/store/useCollaborationStore';
import { collaborationService } from '@core/services/collaborationService';
import type { CollaborationRole, ShareableLink } from '@core/types';
import { logger } from '@core/services/loggerService';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export function ShareDialog({ isOpen, onClose, projectId, projectName }: ShareDialogProps) {
  const [shareCode, setShareCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [defaultRole, setDefaultRole] = useState<CollaborationRole>('editor');
  const [isPublicReadOnly, setIsPublicReadOnly] = useState(false);

  const { activeRoom, shareLinks, setActiveRoom, setShareLinks } = useCollaborationStore();

  // Load share links when room is available
  useEffect(() => {
    if (activeRoom) {
      setShareCode(activeRoom.shareCode);
      collaborationService.getShareLinks(activeRoom.id).then(setShareLinks);
    }
  }, [activeRoom, setShareLinks]);

  const handleCreateRoom = useCallback(async () => {
    setIsCreating(true);
    try {
      const room = await collaborationService.createRoom(projectId, projectName, isPublicReadOnly);
      setActiveRoom(room);
      setShareCode(room.shareCode);

      // Create initial share link
      const link = await collaborationService.createShareLink(room.id, defaultRole);
      setShareLinks([link]);
    } catch (error) {
      logger.error('Failed to create room:', error);
    } finally {
      setIsCreating(false);
    }
  }, [projectId, projectName, isPublicReadOnly, defaultRole, setActiveRoom, setShareLinks]);

  const handleJoin = useCallback(async () => {
    setJoinError('');
    const room = await collaborationService.joinRoom(joinCode.toUpperCase(), defaultRole);
    if (room) {
      setActiveRoom(room);
      onClose();
    } else {
      setJoinError('Room not found. Check the code and try again.');
    }
  }, [joinCode, defaultRole, setActiveRoom, onClose]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const input = document.createElement('input');
      input.value = shareCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareCode]);

  const handleCreateLink = useCallback(async () => {
    if (!activeRoom) return;
    const link = await collaborationService.createShareLink(activeRoom.id, defaultRole);
    setShareLinks([...shareLinks, link]);
  }, [activeRoom, defaultRole, shareLinks, setShareLinks]);

  const handleDeactivateLink = useCallback(
    async (linkId: string) => {
      await collaborationService.deactivateLink(linkId);
      setShareLinks(shareLinks.map((l) => (l.id === linkId ? { ...l, isActive: false } : l)));
    },
    [shareLinks, setShareLinks],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Share Project</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!activeRoom ? (
            <>
              {/* Create or Join */}
              <div className="space-y-4">
                {/* Create section */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Create a collaboration room
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Start a real-time session for &quot;{projectName}&quot;
                  </p>

                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="share-default-role"
                      className="text-xs text-gray-600 dark:text-gray-400"
                    >
                      Default role for new members:
                    </label>
                    <select
                      id="share-default-role"
                      value={defaultRole}
                      onChange={(e) => setDefaultRole(e.target.value as CollaborationRole)}
                      className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                      aria-label="Default role for new members"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={isPublicReadOnly}
                      onChange={(e) => setIsPublicReadOnly(e.target.checked)}
                      className="rounded"
                    />
                    Allow read-only access via share link
                  </label>

                  <button
                    onClick={handleCreateRoom}
                    disabled={isCreating}
                    className="w-full px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isCreating ? 'Creating...' : 'Create Room'}
                  </button>
                </div>

                {/* Join section */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Join an existing room
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Enter share code"
                      maxLength={6}
                      className="flex-1 px-3 py-2 text-sm font-mono tracking-wider bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                    <button
                      onClick={handleJoin}
                      disabled={joinCode.length < 6}
                      className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Join
                    </button>
                  </div>
                  {joinError && <p className="text-xs text-red-500">{joinError}</p>}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Active room */}
              <div className="space-y-4">
                {/* Share code */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">Share this code:</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-mono font-bold tracking-[0.3em] text-blue-800 dark:text-blue-200">
                      {shareCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {copied ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Room info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {activeRoom.members.length} member{activeRoom.members.length !== 1 ? 's' : ''}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      activeRoom.isPublicReadOnly
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    }`}
                  >
                    {activeRoom.isPublicReadOnly ? 'Public (read-only)' : 'Private'}
                  </span>
                </div>

                {/* Share links */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Share Links
                    </h4>
                    <button
                      onClick={handleCreateLink}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      + New Link
                    </button>
                  </div>

                  {shareLinks.map((link) => (
                    <ShareLinkItem key={link.id} link={link} onDeactivate={handleDeactivateLink} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Share Link Item ─────────────────────────────────────────────────

interface ShareLinkItemProps {
  link: ShareableLink;
  onDeactivate: (linkId: string) => void;
}

function ShareLinkItem({ link, onDeactivate }: ShareLinkItemProps) {
  return (
    <div
      className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
        link.isActive
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
          : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-gray-700 dark:text-gray-300">{link.shareCode}</span>
        <span className="text-gray-400">→</span>
        <span className="text-gray-600 dark:text-gray-400">{link.defaultRole}</span>
        {link.usedCount > 0 && <span className="text-gray-400">({link.usedCount} joined)</span>}
      </div>
      {link.isActive && (
        <button
          onClick={() => onDeactivate(link.id)}
          className="text-red-500 hover:text-red-600"
          title="Deactivate link"
        >
          ✕
        </button>
      )}
    </div>
  );
}
