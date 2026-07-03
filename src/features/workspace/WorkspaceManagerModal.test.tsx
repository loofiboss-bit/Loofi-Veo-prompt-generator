import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';

const mockWorkspaceStore = {
  workspaces: [
    {
      id: 'default',
      name: 'Default Workspace',
      description: 'Main workspace',
      createdAt: 1000,
      modifiedAt: 2000,
      projectIds: ['p1'],
      settings: {},
      metadata: { projectCount: 1, lastActivity: 2000, color: 'cyan' },
    },
    {
      id: 'ws-2',
      name: 'Client Project',
      description: 'For client work',
      createdAt: 3000,
      modifiedAt: 4000,
      projectIds: [],
      settings: {},
      metadata: { projectCount: 0, lastActivity: 4000, color: 'blue' },
    },
  ],
  currentWorkspaceId: 'default',
  createWorkspace: vi.fn(),
  updateWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  setCurrentWorkspace: vi.fn(),
  isLoading: false,
};

vi.mock('@core/store/useWorkspaceStore', () => ({
  useWorkspaceStore: () => mockWorkspaceStore,
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('./WorkspaceSettingsPanel', () => ({
  WorkspaceSettingsPanel: ({ workspace }: { workspace: { name: string } }) => (
    <div data-testid="workspace-settings">{workspace.name} settings</div>
  ),
}));

import { WorkspaceManagerModal } from './WorkspaceManagerModal';

function renderModal(overrides: Partial<typeof mockWorkspaceStore> = {}) {
  Object.assign(mockWorkspaceStore, overrides);
  const onClose = vi.fn();
  const result = render(<WorkspaceManagerModal isOpen={true} onClose={onClose} />);
  return { ...result, onClose };
}

describe('WorkspaceManagerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockWorkspaceStore, {
      workspaces: [
        {
          id: 'default',
          name: 'Default Workspace',
          description: 'Main workspace',
          createdAt: 1000,
          modifiedAt: 2000,
          projectIds: ['p1'],
          settings: {},
          metadata: { projectCount: 1, lastActivity: 2000, color: 'cyan' },
        },
        {
          id: 'ws-2',
          name: 'Client Project',
          description: 'For client work',
          createdAt: 3000,
          modifiedAt: 4000,
          projectIds: [],
          settings: {},
          metadata: { projectCount: 0, lastActivity: 4000, color: 'blue' },
        },
      ],
      currentWorkspaceId: 'default',
      isLoading: false,
    });
  });

  // ── Dialog semantics ──────────────────────────────────────────────

  it('renders a dialog via AppDialog with proper ARIA', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has close button with accessible label', () => {
    renderModal();
    const closeBtn = screen.getByRole('button', { name: /close workspace manager/i });
    expect(closeBtn).toBeInTheDocument();
  });

  it('displays heading for workspace list view', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /manage workspaces/i })).toBeInTheDocument();
  });

  // ── Workspace list ────────────────────────────────────────────────

  it('renders all workspaces with names', () => {
    renderModal();
    expect(screen.getByText('Default Workspace')).toBeInTheDocument();
    expect(screen.getByText('Client Project')).toBeInTheDocument();
  });

  it('marks the active workspace', () => {
    renderModal();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('marks the default workspace', () => {
    renderModal();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows project count per workspace', () => {
    renderModal();
    expect(screen.getByText('1 project')).toBeInTheDocument();
    expect(screen.getByText('0 projects')).toBeInTheDocument();
  });

  // ── Row action buttons accessibility ──────────────────────────────

  it('provides switch button with workspace name in label', () => {
    renderModal();
    const switchBtn = screen.getByRole('button', { name: /switch to client project/i });
    expect(switchBtn).toBeInTheDocument();
  });

  it('provides rename button with workspace name in label', () => {
    renderModal();
    const renameButtons = screen.getAllByRole('button', { name: /rename/i });
    expect(renameButtons.length).toBeGreaterThanOrEqual(1);
    expect(renameButtons[0]).toHaveAttribute('aria-label', 'Rename Default Workspace');
  });

  it('provides settings button with workspace name in label', () => {
    renderModal();
    const settingsButtons = screen.getAllByRole('button', { name: /settings for/i });
    expect(settingsButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('provides delete button for non-default workspaces', () => {
    renderModal();
    const deleteBtn = screen.getByRole('button', { name: /delete client project/i });
    expect(deleteBtn).toBeInTheDocument();
  });

  it('does not show delete button for default workspace', () => {
    renderModal();
    expect(
      screen.queryByRole('button', { name: /delete default workspace/i }),
    ).not.toBeInTheDocument();
  });

  // ── Create view ───────────────────────────────────────────────────

  it('navigates to create view and shows name input with label', async () => {
    const { user } = renderModal();
    const newBtn = screen.getByRole('button', { name: /new workspace/i });
    await user.click(newBtn);

    expect(screen.getByRole('heading', { name: /new workspace/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument();
  });

  it('keeps create button clickable and validates when name is empty', async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const createBtn = screen.getByRole('button', { name: /create workspace/i });
    expect(createBtn).toBeEnabled();

    await user.click(createBtn);
    expect(screen.getByRole('alert')).toHaveTextContent('Workspace name is required.');
  });

  it('enables create button when name has content', async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const nameInput = screen.getByLabelText(/workspace name/i);
    await user.type(nameInput, 'My Project');

    const createBtn = screen.getByRole('button', { name: /create workspace/i });
    expect(createBtn).toBeEnabled();
  });

  it('has no aria-describedby on name input when no error exists', async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const nameInput = screen.getByLabelText(/workspace name/i);
    expect(nameInput).not.toHaveAttribute('aria-describedby');
  });

  // ── Color picker radiogroup ───────────────────────────────────────

  it('renders color picker as a radiogroup', async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const radiogroup = screen.getByRole('radiogroup', { name: /workspace color/i });
    expect(radiogroup).toBeInTheDocument();
  });

  it('marks the default color as checked', async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const defaultColor = screen.getByRole('radio', { name: /color: cyan/i });
    expect(defaultColor).toHaveAttribute('aria-checked', 'true');
  });

  it('marks other colors as unchecked', async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const blueColor = screen.getByRole('radio', { name: /color: blue/i });
    expect(blueColor).toHaveAttribute('aria-checked', 'false');
  });

  // ── Back navigation ───────────────────────────────────────────────

  it('provides back button with accessible label in create view', async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const backBtn = screen.getByRole('button', { name: /back to workspace list/i });
    expect(backBtn).toBeInTheDocument();
  });

  // ── Empty state ───────────────────────────────────────────────────

  it('shows empty state when no workspaces exist', () => {
    renderModal({ workspaces: [] });
    expect(screen.getByText(/no workspaces found/i)).toBeInTheDocument();
  });

  // ── Inline rename accessibility ───────────────────────────────────

  it('shows rename input with accessible label', async () => {
    const { user } = renderModal();
    const renameBtn = screen.getAllByRole('button', { name: /rename/i })[0];
    await user.click(renameBtn);

    const renameInput = screen.getByRole('textbox', { name: /rename workspace/i });
    expect(renameInput).toBeInTheDocument();
    expect(renameInput).toHaveFocus();
  });

  // ── Does not render when closed ───────────────────────────────────

  it('returns null when isOpen is false', () => {
    const { container } = render(<WorkspaceManagerModal isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});
