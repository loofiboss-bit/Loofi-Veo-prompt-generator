import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { ShareDialog } from './ShareDialog';

vi.mock('@core/store/useCollaborationStore', () => ({
  useCollaborationStore: () => ({
    activeRoom: null,
    shareLinks: [],
    setActiveRoom: vi.fn(),
    setShareLinks: vi.fn(),
  }),
}));

vi.mock('@core/services/collaborationService', () => ({
  collaborationService: {
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    getShareLinks: vi.fn().mockResolvedValue([]),
    createShareLink: vi.fn(),
    leaveRoom: vi.fn(),
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('ShareDialog', () => {
  it('renders the dialog when open', () => {
    render(
      <ShareDialog isOpen={true} onClose={vi.fn()} projectId="proj-1" projectName="My Project" />,
    );
    expect(screen.getByText('Share Project')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <ShareDialog isOpen={true} onClose={onClose} projectId="proj-1" projectName="My Project" />,
    );
    const closeBtn = screen.getByText('✕');
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render dialog content when closed', () => {
    const { container } = render(
      <ShareDialog isOpen={false} onClose={vi.fn()} projectId="proj-1" projectName="My Project" />,
    );
    expect(container.querySelector('h2')).toBeNull();
  });
});
