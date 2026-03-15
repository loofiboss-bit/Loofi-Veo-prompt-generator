import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test-utils';

vi.mock('@shared/hooks/useCollaborativeProject', () => ({
  useCollaborativeProject: () => ({
    isConnected: false,
    connectToRoom: vi.fn(),
    disconnect: vi.fn(),
    activeUsers: [],
    roomId: null,
  }),
}));

vi.mock('@shared/components/resilience', () => ({
  HealthBar: () => <div data-testid="health-bar" />,
  CostBadge: () => <div data-testid="cost-badge" />,
}));

vi.mock('@features/collaboration', () => ({
  PresenceIndicator: () => <div data-testid="presence-indicator" />,
}));

const { default: Header } = await import('./Header');

const createProps = (overrides = {}) => ({
  onShowHistory: vi.fn(),
  historyButtonText: 'History',
  onShowImageStudio: vi.fn(),
  imageStudioButtonText: 'Image Studio',
  onShowSunoStudio: vi.fn(),
  sunoStudioButtonText: 'Audio Studio',
  onShowVideoAnalysis: vi.fn(),
  isSyncConnected: false,
  theme: 'dark' as const,
  onThemeToggle: vi.fn(),
  onStartTutorial: vi.fn(),
  onResetAll: vi.fn(),
  onShowSearch: vi.fn(),
  onShowVideoStudio: vi.fn(),
  onOpenWizard: vi.fn(),
  ...overrides,
});

describe('Header', () => {
  it('should render the header element', () => {
    render(<Header {...createProps()} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('should show sync indicator as offline when not connected', () => {
    render(<Header {...createProps({ isSyncConnected: false })} />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should show sync indicator as live when connected', () => {
    render(<Header {...createProps({ isSyncConnected: true })} />);
    expect(screen.getByText('Live Sync')).toBeInTheDocument();
  });

  it('should render project indicator when onOpenProjectManager is provided', () => {
    render(<Header {...createProps({ onOpenProjectManager: vi.fn() })} />);
    expect(screen.getByTitle('Manage Projects')).toBeInTheDocument();
  });

  it('should display current project name', () => {
    render(
      <Header
        {...createProps({
          onOpenProjectManager: vi.fn(),
          currentProjectName: 'My Film',
        })}
      />,
    );
    expect(screen.getByText('My Film')).toBeInTheDocument();
  });

  it('should call onThemeToggle when theme button is clicked', async () => {
    const onThemeToggle = vi.fn();
    const { user } = render(<Header {...createProps({ onThemeToggle })} />);
    const themeBtn = screen.getByTitle('Toggle Theme');
    await user.click(themeBtn);
    expect(onThemeToggle).toHaveBeenCalledOnce();
  });

  it('should call onShowSearch when search button is clicked', async () => {
    const onShowSearch = vi.fn();
    const { user } = render(<Header {...createProps({ onShowSearch })} />);
    const searchBtn = screen.getByTitle('Search');
    await user.click(searchBtn);
    expect(onShowSearch).toHaveBeenCalledOnce();
  });

  it('should call onStartTutorial when tutorial button is clicked', async () => {
    const onStartTutorial = vi.fn();
    const { user } = render(<Header {...createProps({ onStartTutorial })} />);
    const tutBtn = screen.getByTitle('Start Tutorial');
    await user.click(tutBtn);
    expect(onStartTutorial).toHaveBeenCalledOnce();
  });

  it('should call onResetAll when reset button is clicked', async () => {
    const onResetAll = vi.fn();
    const { user } = render(<Header {...createProps({ onResetAll })} />);
    const resetBtn = screen.getByTitle('Reset Everything');
    await user.click(resetBtn);
    expect(onResetAll).toHaveBeenCalledOnce();
  });

  it('should call onOpenStoryBoard when the storyboard button is clicked', async () => {
    const onOpenStoryBoard = vi.fn();
    const { user } = render(<Header {...createProps({ onOpenStoryBoard })} />);
    const storyBoardBtn = screen.getByRole('button', { name: /Story Board/i });
    await user.click(storyBoardBtn);
    expect(onOpenStoryBoard).toHaveBeenCalledOnce();
  });

  it('should call onShowVideoStudio when the video studio button is clicked', async () => {
    const onShowVideoStudio = vi.fn();
    const { user } = render(<Header {...createProps({ onShowVideoStudio })} />);
    const videoStudioBtn = screen.getByRole('button', { name: /Video Studio/i });
    await user.click(videoStudioBtn);
    expect(onShowVideoStudio).toHaveBeenCalledOnce();
  });

  it('should render health bar and cost badge', () => {
    render(<Header {...createProps()} />);
    expect(screen.getByTestId('health-bar')).toBeInTheDocument();
    expect(screen.getByTestId('cost-badge')).toBeInTheDocument();
  });
});
