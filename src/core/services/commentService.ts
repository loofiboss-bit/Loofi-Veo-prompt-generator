/**
 * Comment Service
 * v2.6.0 - Collaboration Suite
 *
 * Manages comments on timeline shots. Comments are stored in IndexedDB
 * and synchronized via Yjs when collaboration is active.
 */

import { get, set, del } from 'idb-keyval';
import { logger } from './loggerService';
import type { ShotComment, CommentThread } from '@core/types';

const IDB_PREFIX = 'collab:comments:';

class CommentService {
  private static instance: CommentService;
  private writeLocks = new Map<string, Promise<void>>();

  static getInstance(): CommentService {
    if (!CommentService.instance) {
      CommentService.instance = new CommentService();
    }
    return CommentService.instance;
  }

  /** Serialize writes per project to prevent read-modify-write races */
  private async withWriteLock<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
    const key = projectId;
    const previous = this.writeLocks.get(key) ?? Promise.resolve();
    let resolve: () => void;
    const lock = new Promise<void>((r) => {
      resolve = r;
    });
    this.writeLocks.set(key, lock);
    try {
      await previous;
      return await fn();
    } finally {
      resolve!();
      if (this.writeLocks.get(key) === lock) {
        this.writeLocks.delete(key);
      }
    }
  }

  /**
   * Get all comments for a project.
   */
  async getCommentsByProject(projectId: string): Promise<ShotComment[]> {
    try {
      const comments = await get<ShotComment[]>(`${IDB_PREFIX}${projectId}`);
      return comments ?? [];
    } catch (error) {
      logger.error('CommentService', 'Failed to load comments', error);
      return [];
    }
  }

  /**
   * Get comments for a specific shot.
   */
  async getCommentsByShot(projectId: string, shotId: number): Promise<ShotComment[]> {
    const all = await this.getCommentsByProject(projectId);
    return all.filter((c) => c.shotId === shotId);
  }

  /**
   * Get threaded comments for a shot (grouped by parent).
   */
  async getThreadsByShot(projectId: string, shotId: number): Promise<CommentThread[]> {
    const shotComments = await this.getCommentsByShot(projectId, shotId);
    return this.buildThreads(shotComments);
  }

  /**
   * Add a comment.
   */
  async addComment(projectId: string, comment: ShotComment): Promise<ShotComment[]> {
    return this.withWriteLock(projectId, async () => {
      try {
        const comments = await this.getCommentsByProject(projectId);
        comments.push(comment);
        await set(`${IDB_PREFIX}${projectId}`, comments);
        logger.info('CommentService', `Comment added to shot ${comment.shotId}`, {
          commentId: comment.id,
        });
        return comments;
      } catch (error) {
        logger.error('CommentService', 'Failed to add comment', error);
        throw error;
      }
    });
  }

  /**
   * Update a comment's content.
   */
  async editComment(
    projectId: string,
    commentId: string,
    newContent: string,
  ): Promise<ShotComment[]> {
    return this.withWriteLock(projectId, async () => {
      try {
        const comments = await this.getCommentsByProject(projectId);
        const idx = comments.findIndex((c) => c.id === commentId);
        if (idx === -1) throw new Error(`Comment ${commentId} not found`);

        comments[idx] = {
          ...comments[idx],
          content: newContent,
          editedAt: Date.now(),
        };

        await set(`${IDB_PREFIX}${projectId}`, comments);
        logger.info('CommentService', `Comment ${commentId} edited`);
        return comments;
      } catch (error) {
        logger.error('CommentService', 'Failed to edit comment', error);
        throw error;
      }
    });
  }

  /**
   * Delete a comment (and its replies if it's a root comment).
   */
  async deleteComment(projectId: string, commentId: string): Promise<ShotComment[]> {
    return this.withWriteLock(projectId, async () => {
      try {
        let comments = await this.getCommentsByProject(projectId);
        const comment = comments.find((c) => c.id === commentId);
        if (!comment) throw new Error(`Comment ${commentId} not found`);

        if (!comment.parentId) {
          comments = comments.filter((c) => c.id !== commentId && c.parentId !== commentId);
        } else {
          comments = comments.filter((c) => c.id !== commentId);
        }

        await set(`${IDB_PREFIX}${projectId}`, comments);
        logger.info('CommentService', `Comment ${commentId} deleted`);
        return comments;
      } catch (error) {
        logger.error('CommentService', 'Failed to delete comment', error);
        throw error;
      }
    });
  }

  /**
   * Resolve/unresolve a comment thread.
   */
  async resolveComment(
    projectId: string,
    commentId: string,
    isResolved: boolean = true,
  ): Promise<ShotComment[]> {
    return this.withWriteLock(projectId, async () => {
      try {
        const comments = await this.getCommentsByProject(projectId);
        const idx = comments.findIndex((c) => c.id === commentId);
        if (idx === -1) throw new Error(`Comment ${commentId} not found`);

        comments[idx] = { ...comments[idx], isResolved };

        await set(`${IDB_PREFIX}${projectId}`, comments);
        logger.info('CommentService', `Comment ${commentId} resolved: ${isResolved}`);
        return comments;
      } catch (error) {
        logger.error('CommentService', 'Failed to resolve comment', error);
        throw error;
      }
    });
  }

  /**
   * Add a reaction to a comment.
   */
  async addReaction(
    projectId: string,
    commentId: string,
    emoji: string,
    userId: string,
  ): Promise<ShotComment[]> {
    return this.withWriteLock(projectId, async () => {
      try {
        const comments = await this.getCommentsByProject(projectId);
        const idx = comments.findIndex((c) => c.id === commentId);
        if (idx === -1) throw new Error(`Comment ${commentId} not found`);

        const comment = comments[idx];
        const reactions = [...comment.reactions];
        const existingIdx = reactions.findIndex((r) => r.emoji === emoji);

        if (existingIdx >= 0) {
          const reaction = reactions[existingIdx];
          if (reaction.userIds.includes(userId)) {
            reactions[existingIdx] = {
              ...reaction,
              userIds: reaction.userIds.filter((id) => id !== userId),
            };
            if (reactions[existingIdx].userIds.length === 0) {
              reactions.splice(existingIdx, 1);
            }
          } else {
            reactions[existingIdx] = {
              ...reaction,
              userIds: [...reaction.userIds, userId],
            };
          }
        } else {
          reactions.push({ emoji, userIds: [userId] });
        }

        comments[idx] = { ...comment, reactions };
        await set(`${IDB_PREFIX}${projectId}`, comments);
        return comments;
      } catch (error) {
        logger.error('CommentService', 'Failed to add reaction', error);
        throw error;
      }
    });
  }

  /**
   * Get comment count for a shot (for badges).
   */
  async getCommentCount(projectId: string, shotId: number): Promise<number> {
    const comments = await this.getCommentsByShot(projectId, shotId);
    return comments.length;
  }

  /**
   * Get unresolved comment count for a project.
   */
  async getUnresolvedCount(projectId: string): Promise<number> {
    const comments = await this.getCommentsByProject(projectId);
    return comments.filter((c) => !c.isResolved && !c.parentId).length;
  }

  /**
   * Bulk set comments (for Yjs sync).
   */
  async setComments(projectId: string, comments: ShotComment[]): Promise<void> {
    try {
      await set(`${IDB_PREFIX}${projectId}`, comments);
    } catch (error) {
      logger.error('CommentService', 'Failed to bulk set comments', error);
    }
  }

  /**
   * Delete all comments for a project.
   */
  async clearProject(projectId: string): Promise<void> {
    try {
      await del(`${IDB_PREFIX}${projectId}`);
      logger.info('CommentService', `Comments cleared for project ${projectId}`);
    } catch (error) {
      logger.error('CommentService', 'Failed to clear comments', error);
    }
  }

  /**
   * Create a new comment object.
   */
  createComment(
    shotId: number,
    content: string,
    authorId: string,
    authorName: string,
    authorColor: string,
    parentId: string | null = null,
  ): ShotComment {
    return {
      id: this.generateId(),
      shotId,
      authorId,
      authorName,
      authorColor,
      content,
      createdAt: Date.now(),
      editedAt: null,
      isResolved: false,
      parentId,
      reactions: [],
    };
  }

  /**
   * Build threaded comment structure from flat list.
   */
  private buildThreads(comments: ShotComment[]): CommentThread[] {
    const roots = comments.filter((c) => !c.parentId).sort((a, b) => a.createdAt - b.createdAt);

    return roots.map((root) => {
      const replies = comments
        .filter((c) => c.parentId === root.id)
        .sort((a, b) => a.createdAt - b.createdAt);

      return {
        root,
        replies,
        totalCount: 1 + replies.length,
      };
    });
  }

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `cmt_${timestamp}_${random}`;
  }
}

export const commentService = CommentService.getInstance();
