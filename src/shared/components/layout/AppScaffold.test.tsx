import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import { ROUTES } from '@core/config/routes';

import { AppScaffold } from './AppScaffold';

const viewport = vi.hoisted(() => ({ isMobile: false, isCompact: false }));
vi.mock('@shared/hooks/useViewport', () => ({ useViewport: () => viewport }));
vi.mock('./Sidebar', () => ({
  Sidebar: ({
    activeSection,
    isCollapsed,
    onToggleCollapse,
  }: {
    activeSection: string;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
  }) => (
    <div data-testid="sidebar-active-section" data-collapsed={isCollapsed}>
      <span>{activeSection}</span>
      <button onClick={onToggleCollapse}>Toggle sidebar</button>
    </div>
  ),
}));

vi.mock('./Header', () => ({
  default: () => <div data-testid="header" />,
}));

vi.mock('@features/prompt/PromptWorkspace', () => ({
  PromptWorkspace: () => <div data-testid="prompt-workspace" />,
}));

vi.mock('./ModalManager', () => ({
  default: () => <div data-testid="modal-manager" />,
}));

vi.mock('./AppOverlays', () => ({
  AppOverlays: () => <div data-testid="app-overlays" />,
}));

vi.mock('./AppPanels', () => ({
  AppPanels: () => <div data-testid="app-panels" />,
}));

vi.mock('./AppBackground', () => ({
  AppBackground: () => <div data-testid="app-background" />,
}));

vi.mock('./AppCollaborationPanels', () => ({
  AppCollaborationPanels: () => <div data-testid="collaboration-panels" />,
}));

vi.mock('./FocusModeBanner', () => ({
  FocusModeBanner: () => <div data-testid="focus-mode-banner" />,
}));

function scaffold(pathname: string, activeSection = 'prompt') {
  return (
    <AppScaffold
      skipToContentLabel="Skip to content"
      pathname={pathname}
      isChildRoute={false}
      activeSection={activeSection}
      sidebarProps={{
        onNavigate: vi.fn(),
        onOpenProject: vi.fn(),
        onOpenHistory: vi.fn(),
        onOpenTemplates: vi.fn(),
        onOpenPlugins: vi.fn(),
        onOpenSettings: vi.fn(),
        onOpenDiagnostics: vi.fn(),
        onOpenBatchGenerator: vi.fn(),
        onOpenJobsPanel: vi.fn(),
        onOpenWorkspaceManager: vi.fn(),
        onOpenQueue: vi.fn(),
        onOpenHelpPanel: vi.fn(),
        onOpenOptimize: vi.fn(),
        onOpenCollaborate: vi.fn(),
        onOpenComments: vi.fn(),
        onOpenRoles: vi.fn(),
        diagnosticIssueCount: 0,
        pendingJobCount: 0,
        isApiConfigured: true,
      }}
      headerProps={{} as never}
      promptWorkspaceProps={{} as never}
      modalManagerProps={{} as never}
      collaborationPanelsProps={{} as never}
      appPanelsProps={{} as never}
      appOverlaysProps={{} as never}
    />
  );
}
function renderScaffold(pathname: string, activeSection = 'prompt') {
  return render(scaffold(pathname, activeSection));
}

describe('AppScaffold', () => {
  beforeEach(() => {
    viewport.isMobile = false;
    viewport.isCompact = false;
  });
  it('maps the settings route to the settings sidebar section', () => {
    renderScaffold(ROUTES.SETTINGS, 'prompt');

    expect(screen.getByTestId('sidebar-active-section')).toHaveTextContent('settings');
  });

  it('maps the timeline route to the timeline sidebar section', () => {
    renderScaffold(ROUTES.TIMELINE, 'prompt');

    expect(screen.getByTestId('sidebar-active-section')).toHaveTextContent('timeline');
  });

  it('maps canonical Create and legacy Director to the same sidebar section', () => {
    renderScaffold(ROUTES.CREATE, 'prompt');
    expect(screen.getByTestId('sidebar-active-section')).toHaveTextContent('create');
  });

  it('falls back to the provided active section on the home route', () => {
    renderScaffold(ROUTES.HOME, 'prompt');

    expect(screen.getByTestId('sidebar-active-section')).toHaveTextContent('prompt');
  });
  it('shares the collapsed width with content and restores defaults across categories', async () => {
    const { user, rerender } = renderScaffold(ROUTES.STUDIO);
    const content = screen.getByRole('main', { name: 'Workspace content' });
    expect(content).toHaveStyle({ marginInlineStart: 'var(--sidebar-width)' });
    await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(content).toHaveStyle({ marginInlineStart: 'var(--sidebar-width-collapsed)' });
    viewport.isCompact = true;
    // The context row state is scoped to each responsive category.
    rerender(scaffold(ROUTES.STUDIO));
    expect(screen.getByRole('main', { name: 'Workspace content' })).toHaveStyle({
      marginInlineStart: 'var(--sidebar-width-collapsed)',
    });
  });
  it('uses a dismissible drawer without offset on mobile', async () => {
    viewport.isMobile = true;
    viewport.isCompact = true;
    const { user } = renderScaffold(ROUTES.STUDIO);
    expect(screen.queryByTestId('sidebar-active-section')).not.toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Workspace content' })).toHaveStyle({
      marginInlineStart: '0px',
    });
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog', { name: 'Main navigation' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('uses a unique skip target without changing the hash route and a visible palette entry', async () => {
    const { user } = renderScaffold(ROUTES.STUDIO);
    const hash = window.location.hash;
    await user.click(screen.getByRole('link', { name: 'Skip to content' }));
    expect(window.location.hash).toBe(hash);
    expect(screen.getByRole('main', { name: 'Workspace content' })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#app-route-content',
    );
    expect(screen.getByRole('main', { name: 'Workspace content' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(screen.getByRole('button', { name: 'Quick navigation' })).toBeInTheDocument();
  });
  it('focuses a lazily mounted page title after navigation', async () => {
    const { rerender } = renderScaffold(ROUTES.STUDIO);
    const content = screen.getByRole('main', { name: 'Workspace content' });
    content.scrollTop = 120;
    rerender(scaffold(ROUTES.SETTINGS));
    expect(content.scrollTop).toBe(0);
    const title = document.createElement('h1');
    title.textContent = 'Prompt Studio';
    content.appendChild(title);
    await waitFor(() => expect(title).toHaveFocus());
  });
});
