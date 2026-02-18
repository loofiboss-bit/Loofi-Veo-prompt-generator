import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { CommentPanel } from './CommentPanel';

// Mutable store — tests mutate mockStore.currentUser to simulate different states
const mockStore = {
  currentUser: {
    id: 'user-1',
    displayName: 'Alice',
    avatarColor: '#3b82f6',
  } as { id: string; displayName: string; avatarColor: string } | null,
  comments: [] as unknown[],
  addComment: vi.fn(),
  updateComment: vi.fn(),
  removeComment: vi.fn(),
  resolveComment: vi.fn(),
};

vi.mock('@core/store/useCollaborationStore', () => ({
  useCollaborationStore: (selector?: (s: unknown) => unknown) =>
    selector ? selector(mockStore) : mockStore,
}));

vi.mock('@core/services/commentService', () => ({
  commentService: {
    createComment: vi.fn(() => ({
      id: 'c-1',
      shotId: 1,
      content: 'hello',
      authorId: 'user-1',
      authorName: 'Alice',
      authorColor: '#3b82f6',
      parentId: null,
      reactions: [],
      isResolved: false,
      createdAt: Date.now(),
    })),
    addComment: vi.fn().mockResolvedValue(undefined),
    editComment: vi.fn().mockResolvedValue(undefined),
    deleteComment: vi.fn().mockResolvedValue(undefined),
    resolveComment: vi.fn().mockResolvedValue(undefined),
    addReaction: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('CommentPanel', () => {
  afterEach(() => {
    mockStore.currentUser = { id: 'user-1', displayName: 'Alice', avatarColor: '#3b82f6' };
    mockStore.comments = [];
  });

  it('renders comment input for authenticated user', () => {
    render(<CommentPanel shotId={1} projectId="proj-1" />);
    expect(screen.getByPlaceholderText(/Add a comment/i)).toBeInTheDocument();
  });

  it('shows empty state when no comments', () => {
    render(<CommentPanel shotId={1} projectId="proj-1" />);
    expect(screen.getByText(/No comments on this shot yet/i)).toBeInTheDocument();
  });

  it('shows profile prompt when no current user', () => {
    mockStore.currentUser = null;
    render(<CommentPanel shotId={1} projectId="proj-1" />);
    expect(screen.getByText(/Set up your profile to comment/i)).toBeInTheDocument();
  });
});
