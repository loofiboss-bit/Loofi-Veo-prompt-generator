import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { RoleManager } from './RoleManager';

const makeRoom = (overrides = {}) => ({
  id: 'room-1',
  name: 'My Room',
  ownerId: 'user-1',
  members: [
    {
      userId: 'user-1',
      displayName: 'Alice',
      avatarColor: '#3b82f6',
      role: 'admin' as const,
      joinedAt: Date.now() - 10000,
      lastSeen: Date.now(),
    },
    {
      userId: 'user-2',
      displayName: 'Bob',
      avatarColor: '#ef4444',
      role: 'editor' as const,
      joinedAt: Date.now() - 5000,
      lastSeen: Date.now(),
    },
  ],
  shareCode: 'ABC123',
  shareLinks: [],
  createdAt: Date.now() - 20000,
  ...overrides,
});

vi.mock('@core/store/useCollaborationStore', () => ({
  useCollaborationStore: () => ({
    activeRoom: makeRoom(),
    currentUser: { id: 'user-1', displayName: 'Alice', avatarColor: '#3b82f6' },
    setActiveRoom: vi.fn(),
  }),
}));

vi.mock('@core/services/collaborationService', () => ({
  collaborationService: {
    updateMemberRole: vi.fn().mockResolvedValue(null),
    removeMember: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@core/services/permissionService', () => ({
  permissionService: {
    hasPermission: vi.fn().mockReturnValue(true),
    compareRoles: vi.fn().mockReturnValue(0),
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('RoleManager', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<RoleManager isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders member list when open', () => {
    render(<RoleManager isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<RoleManager isOpen={true} onClose={onClose} />);
    // Use the first ✕ button which is the header close button
    await user.click(screen.getAllByText('✕')[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows room name and member count', () => {
    render(<RoleManager isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/My Room/)).toBeInTheDocument();
    expect(screen.getByText(/2 members/)).toBeInTheDocument();
  });
});
