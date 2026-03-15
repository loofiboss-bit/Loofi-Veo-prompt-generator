import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { ROUTES } from '@core/config/routes';

import { AppScaffold } from './AppScaffold';

vi.mock('./Sidebar', () => ({
  Sidebar: ({ activeSection }: { activeSection: string }) => (
    <div data-testid="sidebar-active-section">{activeSection}</div>
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

function renderScaffold(pathname: string, activeSection = 'prompt') {
  return render(
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
    />,
  );
}

describe('AppScaffold', () => {
  it('maps the settings route to the settings sidebar section', () => {
    renderScaffold(ROUTES.SETTINGS, 'prompt');

    expect(screen.getByTestId('sidebar-active-section')).toHaveTextContent('settings');
  });

  it('maps the timeline route to the timeline sidebar section', () => {
    renderScaffold(ROUTES.TIMELINE, 'prompt');

    expect(screen.getByTestId('sidebar-active-section')).toHaveTextContent('timeline');
  });

  it('falls back to the provided active section on the home route', () => {
    renderScaffold(ROUTES.HOME, 'prompt');

    expect(screen.getByTestId('sidebar-active-section')).toHaveTextContent('prompt');
  });
});
