import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../../test-utils';

const mockWorkspaceStore = {
  workspaces: [
    {
      id: 'ws-1',
      name: 'Design System',
      description: '',
      createdAt: 1000,
      modifiedAt: 2000,
      projectIds: ['p1', 'p2'],
      settings: {},
      metadata: { projectCount: 2, lastActivity: 2000, color: 'cyan' },
    },
    {
      id: 'ws-2',
      name: 'Marketing',
      description: '',
      createdAt: 3000,
      modifiedAt: 4000,
      projectIds: [],
      settings: {},
      metadata: { projectCount: 0, lastActivity: 4000, color: 'purple' },
    },
  ],
  currentWorkspaceId: 'ws-1',
  setCurrentWorkspace: vi.fn(),
  createWorkspace: vi.fn(),
};

vi.mock('@core/store/useWorkspaceStore', () => ({
  useWorkspaceStore: () => mockWorkspaceStore,
}));

vi.mock('@shared/components/ui/Icon', () => ({
  default: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { WorkspaceSwitcher } from './WorkspaceSwitcher';

function renderSwitcher(props: { isCollapsed?: boolean; onOpenManager?: () => void } = {}) {
  return render(<WorkspaceSwitcher {...props} />);
}

describe('WorkspaceSwitcher — Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceStore.currentWorkspaceId = 'ws-1';
  });

  // ── Trigger button ──────────────────────────────────────────────

  it('sets aria-expanded="false" when dropdown is closed', () => {
    renderSwitcher();
    const trigger = screen.getByRole('button', { name: /switch workspace/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('sets aria-haspopup="listbox" on the trigger', () => {
    renderSwitcher();
    const trigger = screen.getByRole('button', { name: /switch workspace/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('includes current workspace name in trigger aria-label', () => {
    renderSwitcher();
    const trigger = screen.getByRole('button', { name: /switch workspace/i });
    expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('Design System'));
  });

  it('sets aria-expanded="true" when dropdown is open', async () => {
    const { user } = renderSwitcher();
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));

    const trigger = screen.getByRole('button', { name: /switch workspace.*design system/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  // ── Listbox semantics ───────────────────────────────────────────

  it('renders a listbox when dropdown is open', async () => {
    const { user } = renderSwitcher();
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));

    expect(screen.getByRole('listbox', { name: /workspaces/i })).toBeInTheDocument();
  });

  it('renders workspace items as role="option"', async () => {
    const { user } = renderSwitcher();
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
  });

  it('marks current workspace as aria-selected="true"', async () => {
    const { user } = renderSwitcher();
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));

    const listbox = screen.getByRole('listbox');
    const selectedOption = within(listbox)
      .getAllByRole('option')
      .find((opt) => opt.getAttribute('aria-selected') === 'true');
    expect(selectedOption).toBeDefined();
    expect(selectedOption).toHaveTextContent('Design System');
  });

  it('marks non-current workspaces as aria-selected="false"', async () => {
    const { user } = renderSwitcher();
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));

    const listbox = screen.getByRole('listbox');
    const unselected = within(listbox)
      .getAllByRole('option')
      .filter((opt) => opt.getAttribute('aria-selected') === 'false');
    expect(unselected).toHaveLength(1);
    expect(unselected[0]).toHaveTextContent('Marketing');
  });

  // ── Collapsed mode ──────────────────────────────────────────────

  it('shows aria-label with workspace name in collapsed mode', () => {
    renderSwitcher({ isCollapsed: true });
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label', 'Current workspace: Design System');
  });

  // ── Inline create ──────────────────────────────────────────────

  it('shows new workspace input with aria-label when creating', async () => {
    const { user } = renderSwitcher();
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));
    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const input = screen.getByLabelText(/new workspace name/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('disables Create button when name input is empty', async () => {
    const { user } = renderSwitcher();
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));
    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const createBtn = screen.getByRole('button', { name: /^create$/i });
    expect(createBtn).toBeDisabled();
  });

  it('enables Create button after typing a name', async () => {
    const { user } = renderSwitcher();
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));
    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const input = screen.getByLabelText(/new workspace name/i);
    await user.type(input, 'New Project');

    const createBtn = screen.getByRole('button', { name: /^create$/i });
    expect(createBtn).toBeEnabled();
  });

  // ── Manage Workspaces button ────────────────────────────────────

  it('renders Manage Workspaces button when onOpenManager is provided', async () => {
    const onOpen = vi.fn();
    const { user } = renderSwitcher({ onOpenManager: onOpen });
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));

    expect(screen.getByRole('button', { name: /manage workspaces/i })).toBeInTheDocument();
  });

  it('does not render Manage Workspaces button without callback', async () => {
    const { user } = renderSwitcher();
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));

    expect(screen.queryByRole('button', { name: /manage workspaces/i })).not.toBeInTheDocument();
  });

  // ── Workspace switching ─────────────────────────────────────────

  it('calls setCurrentWorkspace when clicking a non-active option', async () => {
    const { user } = renderSwitcher();
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));

    const listbox = screen.getByRole('listbox');
    const marketingOption = within(listbox)
      .getAllByRole('option')
      .find((opt) => opt.getAttribute('aria-selected') === 'false')!;
    await user.click(marketingOption);

    expect(mockWorkspaceStore.setCurrentWorkspace).toHaveBeenCalledWith('ws-2');
  });

  // ── Project count display ───────────────────────────────────────

  it('displays project counts on workspace options', async () => {
    const { user } = renderSwitcher();
    await user.click(screen.getByRole('button', { name: /switch workspace/i }));

    expect(screen.getByText('2 projects')).toBeInTheDocument();
    expect(screen.getByText('0 projects')).toBeInTheDocument();
  });
});
