/**
 * CommentService Unit Tests
 * v2.6.0 - Collaboration Suite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, set, del } from 'idb-keyval';

// Mock idb-keyval first
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

vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./authService', () => ({
  authService: {
    getCurrentUser: vi.fn().mockResolvedValue({
      id: 'test-user-1',
      displayName: 'Test User',
      avatarColor: '#3b82f6',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  },
}));

// Import after mocks
import { commentService } from './commentService';
import type { ShotComment } from '@core/types';

describe('CommentService', () => {
  const projectId = 'project_1';
  const shotId = 1;

  let testComment: ShotComment;

  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();

    testComment = {
      id: 'cmt_test_1',
      shotId,
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
  });

  describe('addComment', () => {
    it('should add comment to store', async () => {
      const result = await commentService.addComment(projectId, testComment);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(testComment);
      expect(set).toHaveBeenCalledWith(`collab:comments:${projectId}`, [testComment]);
    });

    it('should append to existing comments', async () => {
      const comment1 = { ...testComment, id: 'cmt_1' };
      const comment2 = { ...testComment, id: 'cmt_2' };

      await commentService.addComment(projectId, comment1);
      const result = await commentService.addComment(projectId, comment2);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(comment1);
      expect(result[1]).toEqual(comment2);
    });

    it('should throw on IDB error', async () => {
      vi.mocked(set).mockRejectedValueOnce(new Error('IDB error'));

      await expect(commentService.addComment(projectId, testComment)).rejects.toThrow('IDB error');
    });
  });

  describe('getCommentsByProject', () => {
    it('should return empty array when no comments', async () => {
      const result = await commentService.getCommentsByProject(projectId);

      expect(result).toEqual([]);
    });

    it('should return all comments for project', async () => {
      const comment1 = { ...testComment, id: 'cmt_1' };
      const comment2 = { ...testComment, id: 'cmt_2' };
      mockStore.set(`collab:comments:${projectId}`, [comment1, comment2]);

      const result = await commentService.getCommentsByProject(projectId);

      expect(result).toEqual([comment1, comment2]);
    });

    it('should handle IDB errors gracefully', async () => {
      vi.mocked(get).mockRejectedValueOnce(new Error('IDB error'));

      const result = await commentService.getCommentsByProject(projectId);

      expect(result).toEqual([]);
    });
  });

  describe('getCommentsByShot', () => {
    it('should filter comments by shotId', async () => {
      const comment1 = { ...testComment, id: 'cmt_1', shotId: 1 };
      const comment2 = { ...testComment, id: 'cmt_2', shotId: 2 };
      const comment3 = { ...testComment, id: 'cmt_3', shotId: 1 };
      mockStore.set(`collab:comments:${projectId}`, [comment1, comment2, comment3]);

      const result = await commentService.getCommentsByShot(projectId, 1);

      expect(result).toHaveLength(2);
      expect(result).toEqual([comment1, comment3]);
    });

    it('should return empty array when no comments for shot', async () => {
      const comment = { ...testComment, shotId: 2 };
      mockStore.set(`collab:comments:${projectId}`, [comment]);

      const result = await commentService.getCommentsByShot(projectId, 1);

      expect(result).toEqual([]);
    });
  });

  describe('getThreadsByShot', () => {
    it('should build root + replies structure', async () => {
      const root = { ...testComment, id: 'cmt_1', shotId, parentId: null };
      const reply1 = { ...testComment, id: 'cmt_2', shotId, parentId: 'cmt_1' };
      const reply2 = { ...testComment, id: 'cmt_3', shotId, parentId: 'cmt_1' };
      mockStore.set(`collab:comments:${projectId}`, [root, reply1, reply2]);

      const threads = await commentService.getThreadsByShot(projectId, shotId);

      expect(threads).toHaveLength(1);
      expect(threads[0].root).toEqual(root);
      expect(threads[0].replies).toHaveLength(2);
      expect(threads[0].totalCount).toBe(3);
    });

    it('should create separate threads for different roots', async () => {
      const root1 = { ...testComment, id: 'cmt_1', shotId, parentId: null };
      const root2 = { ...testComment, id: 'cmt_2', shotId, parentId: null };
      const reply1 = { ...testComment, id: 'cmt_3', shotId, parentId: 'cmt_1' };
      mockStore.set(`collab:comments:${projectId}`, [root1, root2, reply1]);

      const threads = await commentService.getThreadsByShot(projectId, shotId);

      expect(threads).toHaveLength(2);
      expect(threads[0].replies).toHaveLength(1);
      expect(threads[1].replies).toHaveLength(0);
    });

    it('should order threads by root creation time', async () => {
      const now = Date.now();
      const root1 = { ...testComment, id: 'cmt_1', shotId, parentId: null, createdAt: now };
      const root2 = {
        ...testComment,
        id: 'cmt_2',
        shotId,
        parentId: null,
        createdAt: now + 1000,
      };
      mockStore.set(`collab:comments:${projectId}`, [root2, root1]);

      const threads = await commentService.getThreadsByShot(projectId, shotId);

      expect(threads[0].root.id).toBe('cmt_1');
      expect(threads[1].root.id).toBe('cmt_2');
    });
  });

  describe('editComment', () => {
    it('should update comment content and editedAt', async () => {
      await commentService.addComment(projectId, testComment);
      // Small delay to ensure editedAt differs from createdAt
      await new Promise((resolve) => setTimeout(resolve, 1));
      const result = await commentService.editComment(projectId, testComment.id, 'Updated content');

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: testComment.id,
          content: 'Updated content',
          editedAt: expect.any(Number),
        }),
      );
      expect(result[0].editedAt).toBeGreaterThanOrEqual(testComment.createdAt);
    });

    it('should throw if comment not found', async () => {
      await expect(
        commentService.editComment(projectId, 'nonexistent', 'New content'),
      ).rejects.toThrow('not found');
    });

    it('should handle IDB errors', async () => {
      await commentService.addComment(projectId, testComment);
      vi.mocked(set).mockRejectedValueOnce(new Error('IDB error'));

      await expect(
        commentService.editComment(projectId, testComment.id, 'Updated'),
      ).rejects.toThrow('IDB error');
    });
  });

  describe('deleteComment', () => {
    it('should remove comment from store', async () => {
      await commentService.addComment(projectId, testComment);
      const result = await commentService.deleteComment(projectId, testComment.id);

      expect(result).toHaveLength(0);
    });

    it('should delete root and all replies', async () => {
      const root = { ...testComment, id: 'cmt_1', parentId: null };
      const reply1 = { ...testComment, id: 'cmt_2', parentId: 'cmt_1' };
      const reply2 = { ...testComment, id: 'cmt_3', parentId: 'cmt_1' };
      await commentService.addComment(projectId, root);
      mockStore.set(`collab:comments:${projectId}`, [root, reply1, reply2]);

      const result = await commentService.deleteComment(projectId, 'cmt_1');

      expect(result).toHaveLength(0);
    });

    it('should only delete specific reply (not root)', async () => {
      const root = { ...testComment, id: 'cmt_1', parentId: null };
      const reply = { ...testComment, id: 'cmt_2', parentId: 'cmt_1' };
      mockStore.set(`collab:comments:${projectId}`, [root, reply]);

      const result = await commentService.deleteComment(projectId, 'cmt_2');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cmt_1');
    });

    it('should throw if comment not found', async () => {
      await expect(commentService.deleteComment(projectId, 'nonexistent')).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('resolveComment', () => {
    it('should set isResolved to true', async () => {
      await commentService.addComment(projectId, testComment);
      const result = await commentService.resolveComment(projectId, testComment.id, true);

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: testComment.id,
          isResolved: true,
        }),
      );
    });

    it('should set isResolved to false', async () => {
      const resolved = { ...testComment, isResolved: true };
      await commentService.addComment(projectId, resolved);
      const result = await commentService.resolveComment(projectId, testComment.id, false);

      expect(result[0].isResolved).toBe(false);
    });

    it('should throw if comment not found', async () => {
      await expect(commentService.resolveComment(projectId, 'nonexistent', true)).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('addReaction', () => {
    it('should add new reaction', async () => {
      await commentService.addComment(projectId, testComment);
      const result = await commentService.addReaction(projectId, testComment.id, '👍', 'user_1');

      expect(result[0].reactions).toHaveLength(1);
      expect(result[0].reactions[0]).toEqual({ emoji: '👍', userIds: ['user_1'] });
    });

    it('should add user to existing reaction', async () => {
      const comment = {
        ...testComment,
        reactions: [{ emoji: '👍', userIds: ['user_1'] }],
      };
      mockStore.set(`collab:comments:${projectId}`, [comment]);

      const result = await commentService.addReaction(projectId, testComment.id, '👍', 'user_2');

      expect(result[0].reactions[0].userIds).toEqual(['user_1', 'user_2']);
    });

    it('should remove user reaction (toggle off)', async () => {
      const comment = {
        ...testComment,
        reactions: [{ emoji: '👍', userIds: ['user_1', 'user_2'] }],
      };
      mockStore.set(`collab:comments:${projectId}`, [comment]);

      const result = await commentService.addReaction(projectId, testComment.id, '👍', 'user_1');

      expect(result[0].reactions[0].userIds).toEqual(['user_2']);
    });

    it('should delete reaction if no users left', async () => {
      const comment = {
        ...testComment,
        reactions: [{ emoji: '👍', userIds: ['user_1'] }],
      };
      mockStore.set(`collab:comments:${projectId}`, [comment]);

      const result = await commentService.addReaction(projectId, testComment.id, '👍', 'user_1');

      expect(result[0].reactions).toHaveLength(0);
    });

    it('should handle multiple reactions', async () => {
      await commentService.addComment(projectId, testComment);
      let result = await commentService.addReaction(projectId, testComment.id, '👍', 'user_1');
      result = await commentService.addReaction(projectId, testComment.id, '❤️', 'user_1');

      expect(result[0].reactions).toHaveLength(2);
      expect(result[0].reactions.map((r) => r.emoji)).toEqual(['👍', '❤️']);
    });

    it('should throw if comment not found', async () => {
      await expect(
        commentService.addReaction(projectId, 'nonexistent', '👍', 'user_1'),
      ).rejects.toThrow('not found');
    });
  });

  describe('getCommentCount', () => {
    it('should return count for shot', async () => {
      const comment1 = { ...testComment, id: 'cmt_1', shotId: 1 };
      const comment2 = { ...testComment, id: 'cmt_2', shotId: 1 };
      const comment3 = { ...testComment, id: 'cmt_3', shotId: 2 };
      mockStore.set(`collab:comments:${projectId}`, [comment1, comment2, comment3]);

      const count = await commentService.getCommentCount(projectId, 1);

      expect(count).toBe(2);
    });

    it('should return 0 when no comments', async () => {
      const count = await commentService.getCommentCount(projectId, 1);

      expect(count).toBe(0);
    });
  });

  describe('getUnresolvedCount', () => {
    it('should count only unresolved root comments', async () => {
      const root1 = { ...testComment, id: 'cmt_1', parentId: null, isResolved: false };
      const root2 = { ...testComment, id: 'cmt_2', parentId: null, isResolved: true };
      const root3 = { ...testComment, id: 'cmt_3', parentId: null, isResolved: false };
      const reply = { ...testComment, id: 'cmt_4', parentId: 'cmt_1', isResolved: false };
      mockStore.set(`collab:comments:${projectId}`, [root1, root2, root3, reply]);

      const count = await commentService.getUnresolvedCount(projectId);

      expect(count).toBe(2); // Only root1 and root3, not reply
    });

    it('should return 0 when all resolved', async () => {
      const root = { ...testComment, isResolved: true, parentId: null };
      mockStore.set(`collab:comments:${projectId}`, [root]);

      const count = await commentService.getUnresolvedCount(projectId);

      expect(count).toBe(0);
    });
  });

  describe('setComments', () => {
    it('should bulk set comments', async () => {
      const comments = [
        { ...testComment, id: 'cmt_1' },
        { ...testComment, id: 'cmt_2' },
      ];

      await commentService.setComments(projectId, comments);

      expect(set).toHaveBeenCalledWith(`collab:comments:${projectId}`, comments);
    });
  });

  describe('clearProject', () => {
    it('should delete all comments for project', async () => {
      await commentService.addComment(projectId, testComment);
      await commentService.clearProject(projectId);

      expect(del).toHaveBeenCalledWith(`collab:comments:${projectId}`);
    });
  });

  describe('createComment', () => {
    it('should create comment with generated ID', () => {
      const comment = commentService.createComment(1, 'Test', 'user_1', 'Alice', '#3b82f6');

      expect(comment.id).toMatch(/^cmt_.*_.*$/);
      expect(comment.shotId).toBe(1);
      expect(comment.authorId).toBe('user_1');
      expect(comment.authorName).toBe('Alice');
      expect(comment.content).toBe('Test');
      expect(comment.createdAt).toBeGreaterThan(0);
      expect(comment.isResolved).toBe(false);
      expect(comment.parentId).toBeNull();
      expect(comment.reactions).toEqual([]);
    });

    it('should set parentId for replies', () => {
      const reply = commentService.createComment(
        1,
        'Reply',
        'user_2',
        'Bob',
        '#ef4444',
        'cmt_parent',
      );

      expect(reply.parentId).toBe('cmt_parent');
    });

    it('should generate unique IDs', () => {
      const comment1 = commentService.createComment(1, 'Test 1', 'user_1', 'Alice', '#3b82f6');
      const comment2 = commentService.createComment(1, 'Test 2', 'user_1', 'Alice', '#3b82f6');

      expect(comment1.id).not.toBe(comment2.id);
    });
  });
});
