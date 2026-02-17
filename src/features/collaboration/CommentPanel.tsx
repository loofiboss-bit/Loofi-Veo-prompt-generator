/**
 * CommentPanel Component
 * v2.6.0 - Collaboration Suite
 *
 * Comment system for timeline shots. Shows threaded comments
 * with reactions, resolve/unresolve, and reply functionality.
 */

import React, { useState, useCallback } from 'react';
import { useCollaborationStore } from '@core/store/useCollaborationStore';
import { commentService } from '@core/services/commentService';
import type { ShotComment, CommentThread } from '@core/types';

// ─── Single Comment ──────────────────────────────────────────────────

interface CommentItemProps {
  comment: ShotComment;
  projectId: string;
  currentUserId: string;
  isReply?: boolean;
  onReply: (commentId: string) => void;
}

function CommentItem({
  comment,
  projectId,
  currentUserId,
  isReply = false,
  onReply,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const { updateComment, removeComment, resolveComment } = useCollaborationStore();

  const isAuthor = comment.authorId === currentUserId;
  const timeAgo = getTimeAgo(comment.createdAt);

  const handleEdit = useCallback(async () => {
    if (!editContent.trim()) return;
    await commentService.editComment(projectId, comment.id, editContent.trim());
    updateComment(comment.id, { content: editContent.trim(), editedAt: Date.now() });
    setIsEditing(false);
  }, [editContent, projectId, comment.id, updateComment]);

  const handleDelete = useCallback(async () => {
    await commentService.deleteComment(projectId, comment.id);
    removeComment(comment.id);
  }, [projectId, comment.id, removeComment]);

  const handleResolve = useCallback(async () => {
    await commentService.resolveComment(projectId, comment.id, !comment.isResolved);
    resolveComment(comment.id);
  }, [projectId, comment.id, comment.isResolved, resolveComment]);

  const handleReaction = useCallback(
    async (emoji: string) => {
      const comments = await commentService.addReaction(
        projectId,
        comment.id,
        emoji,
        currentUserId,
      );
      // Update from returned comments
      const updated = comments.find((c) => c.id === comment.id);
      if (updated) {
        updateComment(comment.id, { reactions: updated.reactions });
      }
    },
    [projectId, comment.id, currentUserId, updateComment],
  );

  return (
    <div
      className={`${isReply ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-3' : ''} ${
        comment.isResolved ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-2 py-2">
        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
          style={{ backgroundColor: comment.authorColor }}
        >
          {comment.authorName.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {comment.authorName}
            </span>
            <span className="text-gray-500 dark:text-gray-400">{timeAgo}</span>
            {comment.editedAt && <span className="text-gray-400 dark:text-gray-500">(edited)</span>}
            {comment.isResolved && (
              <span className="text-green-600 dark:text-green-400 text-[10px] font-medium">
                ✓ Resolved
              </span>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded resize-none"
                rows={2}
                autoFocus
                aria-label="Edit comment"
              />
              <div className="flex gap-1 mt-1">
                <button
                  onClick={handleEdit}
                  className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  className="px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          )}

          {/* Reactions */}
          {comment.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {comment.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => handleReaction(reaction.emoji)}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full border transition-colors ${
                    reaction.userIds.includes(currentUserId)
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {reaction.emoji} {reaction.userIds.length}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => onReply(comment.id)}
                className="text-[10px] text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Reply
              </button>
              {!isReply && (
                <button
                  onClick={handleResolve}
                  className="text-[10px] text-gray-500 hover:text-green-600 dark:hover:text-green-400"
                >
                  {comment.isResolved ? 'Unresolve' : 'Resolve'}
                </button>
              )}
              {['👍', '❤️', '🎬', '✅'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-[10px] opacity-0 group-hover:opacity-100 hover:scale-125 transition-all"
                >
                  {emoji}
                </button>
              ))}
              {isAuthor && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[10px] text-gray-500 hover:text-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-[10px] text-gray-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comment Thread ──────────────────────────────────────────────────

interface CommentThreadViewProps {
  thread: CommentThread;
  projectId: string;
  currentUserId: string;
  onReply: (parentId: string) => void;
}

function CommentThreadView({ thread, projectId, currentUserId, onReply }: CommentThreadViewProps) {
  return (
    <div className="group border-b border-gray-100 dark:border-gray-800 last:border-0">
      <CommentItem
        comment={thread.root}
        projectId={projectId}
        currentUserId={currentUserId}
        onReply={onReply}
      />
      {thread.replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          projectId={projectId}
          currentUserId={currentUserId}
          isReply
          onReply={onReply}
        />
      ))}
    </div>
  );
}

// ─── Comment Panel ───────────────────────────────────────────────────

interface CommentPanelProps {
  shotId: number;
  projectId: string;
}

export function CommentPanel({ shotId, projectId }: CommentPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const { currentUser, comments, addComment: addToStore } = useCollaborationStore();

  const shotComments = comments.filter((c) => c.shotId === shotId);
  const threads = buildThreads(
    showResolved ? shotComments : shotComments.filter((c) => !c.isResolved || c.parentId),
  );

  const unresolvedCount = shotComments.filter((c) => !c.isResolved && !c.parentId).length;
  const resolvedCount = shotComments.filter((c) => c.isResolved && !c.parentId).length;

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim() || !currentUser) return;

    const comment = commentService.createComment(
      shotId,
      newComment.trim(),
      currentUser.id,
      currentUser.displayName,
      currentUser.avatarColor,
      replyingTo,
    );

    await commentService.addComment(projectId, comment);
    addToStore(comment);
    setNewComment('');
    setReplyingTo(null);
  }, [newComment, currentUser, shotId, projectId, replyingTo, addToStore]);

  const handleReply = useCallback((parentId: string) => {
    setReplyingTo(parentId);
  }, []);

  if (!currentUser) {
    return (
      <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
        Set up your profile to comment.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Comments</h3>
          {unresolvedCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              {unresolvedCount}
            </span>
          )}
        </div>
        {resolvedCount > 0 && (
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {showResolved ? 'Hide' : 'Show'} resolved ({resolvedCount})
          </button>
        )}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto px-3">
        {threads.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No comments on this shot yet.
            <br />
            <span className="text-xs">Be the first to leave feedback!</span>
          </div>
        ) : (
          threads.map((thread) => (
            <CommentThreadView
              key={thread.root.id}
              thread={thread}
              projectId={projectId}
              currentUserId={currentUser.id}
              onReply={handleReply}
            />
          ))
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        {replyingTo && (
          <div className="flex items-center justify-between mb-1 text-xs text-blue-600 dark:text-blue-400">
            <span>Replying to comment</span>
            <button onClick={() => setReplyingTo(null)} className="hover:text-red-500">
              ✕
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
            className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Comment Badge (for shot cards) ──────────────────────────────────

interface CommentBadgeProps {
  shotId: number;
  onClick?: () => void;
}

export function CommentBadge({ shotId, onClick }: CommentBadgeProps) {
  const comments = useCollaborationStore((s) => s.comments);
  const count = comments.filter((c) => c.shotId === shotId && !c.isResolved).length;

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
      title={`${count} unresolved comment${count !== 1 ? 's' : ''}`}
    >
      💬 {count}
    </button>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function buildThreads(comments: ShotComment[]): CommentThread[] {
  const roots = comments.filter((c) => !c.parentId).sort((a, b) => a.createdAt - b.createdAt);

  return roots.map((root) => {
    const replies = comments
      .filter((c) => c.parentId === root.id)
      .sort((a, b) => a.createdAt - b.createdAt);
    return { root, replies, totalCount: 1 + replies.length };
  });
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
