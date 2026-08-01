/**
 * Sidebar Component Tests
 * Verifies rendering, navigation, collapse toggle, badges, and project display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '../../../test-utils';
import { Sidebar } from './Sidebar';
import { useSettingsStore } from '@core/store/useSettingsStore';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: vi.fn(() => ({
    currentProjectId: 'proj-1',
    projects: [
      { id: 'proj-1', name: 'My Test Project' },
      { id: 'proj-2', name: 'Second Project' },
    ],
  })),
}));

vi.mock('@core/store/useHistoryStore', () => ({
  useHistoryStore: vi.fn(() => ({
    stats: { totalEntries: 42 },
  })),
}));

vi.mock('@core/store/useGenerationQueueStore', () => ({
  useGenerationQueueStore: vi.fn((selector?: (s: Record<string, number>) => number) => {
    const state = { activeCount: 1, pendingCount: 2 };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('@features/workspace/WorkspaceSwitcher', () => ({
  WorkspaceSwitcher: ({ isCollapsed }: { isCollapsed: boolean }) => (
    <div data-testid="workspace-switcher">{isCollapsed ? 'collapsed' : 'expanded'}</div>
  ),
}));

vi.mock('@shared/components/ui/Icon', () => ({
  default: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

vi.mock('@shared/hooks/useViewport', () => ({
  useViewport: () => ({
    width: 1920,
    height: 1080,
    scaleFactor: 1,
    effectiveWidth: 1920,
    effectiveHeight: 1080,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isCompact: false,
    isWide: true,
  }),
}));

// ---------------------------------------------------------------------------
// Default props helper
// ---------------------------------------------------------------------------

function defaultProps(): React.ComponentProps<typeof Sidebar> {
  return {
    onNavigate: vi.fn(),
    activeSection: 'create',
    onOpenProject: vi.fn(),
    onOpenHistory: vi.fn(),
    onOpenTemplates: vi.fn(),
    onOpenPlugins: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenAssets: vi.fn(),
    onOpenActivity: vi.fn(),
    onOpenDirector: vi.fn(),
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
    diagnosticIssueCount: 3,
    pendingJobCount: 5,
    isApiConfigured: true,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ focusMode: false });
  });

  it('renders without crashing', () => {
    const props = defaultProps();
    render(<Sidebar {...props} />);
    // The aside landmark is rendered
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('displays the Creator Studio brand text', () => {
    render(<Sidebar {...defaultProps()} />);
    expect(screen.getByText('Loofi Creator Studio')).toBeInTheDocument();
  });

  it('renders all main navigation items', () => {
    render(<Sidebar {...defaultProps()} />);
    // Check a representative set of nav item labels via their translation keys
    // (useTranslation returns the key as-is in the test i18n setup)
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    // All nav buttons should be rendered inside the nav
    const buttons = nav.querySelectorAll('button');
    expect(buttons).toHaveLength(6);
  });

  it('renders exactly the six canonical destinations', () => {
    render(<Sidebar {...defaultProps()} />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveTextContent('Create');
    expect(nav).toHaveTextContent('Projects');
    expect(nav).toHaveTextContent('Assets');
    expect(nav).toHaveTextContent('Timeline');
    expect(nav).toHaveTextContent('Activity');
    expect(nav).toHaveTextContent('Settings');
  });

  it('opens Create from the primary navigation item', async () => {
    const props = defaultProps();
    const { user } = render(<Sidebar {...props} />);
    // The prompt nav item is the first nav button
    const nav = screen.getByRole('navigation');
    const createButton = nav.querySelector('button');
    expect(createButton).toBeTruthy();
    await user.click(createButton!);
    expect(props.onOpenDirector).toHaveBeenCalledOnce();
  });

  it('opens Projects from the second navigation item', async () => {
    const props = defaultProps();
    const { user } = render(<Sidebar {...props} />);
    // History button contains text matching the translation key
    const nav = screen.getByRole('navigation');
    const buttons = Array.from(nav.querySelectorAll('button'));
    // History is the second nav item (index 1)
    const projectsButton = buttons[1];
    await user.click(projectsButton);
    expect(props.onOpenProject).toHaveBeenCalledOnce();
  });

  it('calls onOpenSettings when settings button is clicked', async () => {
    const props = defaultProps();
    const { user } = render(<Sidebar {...props} />);
    const nav = screen.getByRole('navigation');
    const settingsBtn = Array.from(nav.querySelectorAll('button')).at(-1)!;
    await user.click(settingsBtn);
    expect(props.onOpenSettings).toHaveBeenCalledOnce();
  });

  it('toggles collapsed state when collapse button is clicked', async () => {
    const { user } = render(<Sidebar {...defaultProps()} />);
    // When expanded, the brand text is visible
    expect(screen.getByText('Loofi Creator Studio')).toBeInTheDocument();
    // The collapse button is inside the header area — it has a title attribute
    const collapseBtn = screen.getByTitle('Collapse sidebar');
    await user.click(collapseBtn);
    // After collapsing, brand text should be hidden
    expect(screen.queryByText('Loofi Creator Studio')).not.toBeInTheDocument();
  });

  it('hides nav item labels when sidebar is collapsed', async () => {
    const { user } = render(<Sidebar {...defaultProps()} />);
    const collapseBtn = screen.getByTitle('Collapse sidebar');
    await user.click(collapseBtn);
    expect(screen.queryByText('Create')).not.toBeInTheDocument();
  });

  it('displays the current project name', () => {
    render(<Sidebar {...defaultProps()} />);
    expect(screen.getByText('My Test Project')).toBeInTheDocument();
  });

  it('displays project and activity badge counts', () => {
    render(<Sidebar {...defaultProps()} diagnosticIssueCount={7} pendingJobCount={4} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows the expand sidebar button when collapsed', async () => {
    const { user } = render(<Sidebar {...defaultProps()} />);
    const collapseBtn = screen.getByTitle('Collapse sidebar');
    await user.click(collapseBtn);
    expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
  });

  it('shows focus mode banner action in the footer', () => {
    render(<Sidebar {...defaultProps()} />);
    expect(screen.getByRole('button', { name: /Focus Mode/i })).toBeInTheDocument();
  });

  it('retains the complete creation workflow when focus mode is enabled', () => {
    useSettingsStore.setState({ focusMode: true });
    render(<Sidebar {...defaultProps()} />);

    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
  });
});
