import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { ProfileSetup } from './ProfileSetup';

vi.mock('@core/store/useCollaborationStore', () => ({
  useCollaborationStore: () => ({
    currentUser: null,
    setCurrentUser: vi.fn(),
  }),
}));

vi.mock('@core/services/authService', () => ({
  authService: {
    getAvatarColors: vi.fn().mockReturnValue(['#3b82f6', '#ef4444', '#10b981', '#f59e0b']),
    updateProfile: vi.fn().mockResolvedValue({
      id: 'user-1',
      displayName: 'Alice',
      avatarColor: '#3b82f6',
    }),
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('ProfileSetup', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<ProfileSetup isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders setup form when open', () => {
    render(<ProfileSetup isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Set Up Your Profile/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your name/i)).toBeInTheDocument();
  });

  it('shows save button', () => {
    render(<ProfileSetup isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Save Profile/i })).toBeInTheDocument();
  });

  it('shows avatar color picker', () => {
    render(<ProfileSetup isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Avatar Color')).toBeInTheDocument();
  });

  it('calls onClose when cancel button clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<ProfileSetup isOpen={true} onClose={onClose} />);
    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
