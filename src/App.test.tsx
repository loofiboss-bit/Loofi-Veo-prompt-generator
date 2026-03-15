/**
 * App.test.tsx — v3.8.0
 *
 * Basic render tests for the App component.
 * Tests hydration gate, main layout, sidebar, and navigation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@core/config/i18n';
import { ROUTES } from '@core/config/routes';
import { App } from './App';

type TestRouteEntry = string | { pathname: string; state?: unknown };

const appScaffoldRenderSpy = vi.fn();
let mockToasts: Array<{
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}> = [];
let mockFallbackNotification: { primaryModel: string; fallbackModel: string } | null = null;

// ─── Default mock state ───────────────────────────────────────────

const DEFAULT_PROMPT_STATE = {
  artStyle: '',
  cameraMovement: '',
  environment: '',
  characterAge: '',
  voiceStyle: '',
  aspectRatio: '16:9',
  model: 'veo',
  subjectDescription: '',
  actionDescription: '',
  cinematicInspiration: '',
  audienceIntent: '',
  colorPalette: '',
  lightingStyle: '',
  negativePrompt: '',
  duration: '',
  motionIntensity: '',
  mood: '',
  era: '',
  weather: '',
};

const mockAppStore = {
  promptState: DEFAULT_PROMPT_STATE,
  setPromptState: vi.fn(),
  _hasHydrated: true,
  openModal: vi.fn(),
  openStudio: vi.fn(),
  activeStudio: null,
  setTheme: vi.fn(),
  theme: 'dark',
  setNewProjectWizardOpen: vi.fn(),
  isHistoryOpen: false,
  isTemplatesOpen: false,
  isDNAModalOpen: false,
  isCharacterBankOpen: false,
  isLocationBankOpen: false,
  isProjectManagerOpen: false,
  isWizardOpen: false,
  isSeriesBibleOpen: false,
};

const mockStartupStore = {
  criticalBootstrapComplete: true,
};

// ─── Module mocks ─────────────────────────────────────────────────

vi.mock('@core/store/useAppStore', () => {
  const temporal = {
    getState: () => ({
      undo: vi.fn(),
      redo: vi.fn(),
      pastStates: [],
      futureStates: [],
    }),
  };
  const useAppStore = (selector?: (s: typeof mockAppStore) => unknown) => {
    const state = { ...mockAppStore };
    return selector ? selector(state) : state;
  };
  useAppStore.temporal = temporal;
  return { useAppStore };
});

vi.mock('zustand', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand')>();
  return {
    ...actual,
    useStore: vi.fn((_store, selector) =>
      selector
        ? selector({ pastStates: [], futureStates: [] })
        : { pastStates: [], futureStates: [] },
    ),
  };
});

vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: () => ({
    currentProjectId: 'proj-1',
    projects: [{ id: 'proj-1', name: 'Test Project' }],
  }),
}));

vi.mock('@core/store/useHistoryStore', () => ({
  useHistoryStore: () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@core/store/useVideoStore', () => ({
  useVideoStore: (selector?: (s: { isGenerating: boolean }) => unknown) =>
    selector ? selector({ isGenerating: false }) : { isGenerating: false },
}));

vi.mock('@core/store/useDiagnosticsStore', () => ({
  useDiagnosticsStore: () => ({
    isPanelOpen: false,
    openPanel: vi.fn(),
    closePanel: vi.fn(),
    result: null,
  }),
}));

vi.mock('@core/store/useJobQueueStore', () => ({
  useJobQueueStore: (selector?: (s: { pendingCount: number }) => unknown) =>
    selector ? selector({ pendingCount: 0 }) : { pendingCount: 0 },
}));

vi.mock('@core/store/useStartupStore', () => ({
  useStartupStore: (selector?: (s: typeof mockStartupStore) => unknown) => {
    const state = { ...mockStartupStore };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@core/store/useOptimizationStore', () => ({
  useOptimizationStore: (
    selector?: (s: { panelOpen: boolean; togglePanel: () => void }) => unknown,
  ) => {
    const state = { panelOpen: false, togglePanel: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@core/store/useCollaborationStore', () => ({
  useCollaborationStore: (
    selector?: (s: { connectionStatus: string; currentUser: null }) => unknown,
  ) => {
    const state = { connectionStatus: 'disconnected', currentUser: null };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@shared/hooks/useAppSync', () => ({
  useAppSync: () => false,
}));

vi.mock('@shared/hooks/useToastManager', () => ({
  useToastManager: () => ({
    toasts: mockToasts,
    addToast: vi.fn(),
    dismissToast: vi.fn(),
  }),
}));

vi.mock('@shared/hooks/useSafeMode', () => ({
  useSafeMode: () => ({ safeModeStatus: null }),
}));

vi.mock('@shared/hooks/useHelpPanel', () => ({
  useHelpPanel: () => ({
    showHelpPanel: false,
    helpPanelTopic: null,
    helpPanelCategory: null,
    openHelpPanel: vi.fn(),
    closeHelpPanel: vi.fn(),
  }),
}));

vi.mock('@shared/hooks/useGenerationState', () => ({
  useGenerationState: () => ({
    isGenerating: false,
    generationQueue: [],
  }),
}));

vi.mock('@shared/hooks/useAppInitialization', () => ({
  useAppInitialization: vi.fn(),
}));

vi.mock('@shared/hooks/useAppHandlers', () => ({
  useAppHandlers: () => ({
    handleInputChange: vi.fn(),
    handleCheckboxChange: vi.fn(),
    handleSelectChange: vi.fn(),
    handleSliderChange: vi.fn(),
  }),
}));

vi.mock('@shared/hooks/usePromptOptions', () => ({
  usePromptOptions: () => ({
    artStyleOptions: [],
    cameraMovementOptions: [],
    environmentOptions: [],
  }),
}));

vi.mock('@shared/hooks/usePromptLogic', () => ({
  usePromptLogic: () => ({
    handleGeneratePrompt: vi.fn(),
    handleRefinePrompt: vi.fn(),
    handleTriggerCharacterDetails: vi.fn(),
    isLoading: false,
    generatedPrompt: null,
    errorMessage: null,
  }),
}));

vi.mock('@shared/hooks/useHistoryState', () => ({
  useHistoryState: () => ({
    state: '',
    setState: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    reset: vi.fn(),
    canUndo: false,
    canRedo: false,
  }),
}));

vi.mock('@shared/hooks/useAppKeyboardShortcuts', () => ({
  useAppKeyboardShortcuts: vi.fn(),
}));

vi.mock('@shared/hooks/useFallbackNotifications', () => ({
  useFallbackNotifications: () => ({
    notification: mockFallbackNotification,
    dismissNotification: vi.fn(),
  }),
}));

vi.mock('@shared/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    restartTutorial: vi.fn(),
    isOnboarding: false,
  }),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@core/services/apiKeyService', () => ({
  hasApiKey: vi.fn(() => false),
  hasApiKeyAsync: vi.fn().mockResolvedValue(false),
}));

vi.mock('@core/services/themeService', () => ({
  themeService: {
    setMode: vi.fn().mockResolvedValue(undefined),
    getMode: vi.fn().mockReturnValue('dark'),
  },
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  entries: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(),
  promisifyRequest: vi.fn(),
}));

// Mock complex layout components to avoid deep dependency chains
vi.mock('@shared/components/layout', () => ({
  Header: () => <div data-testid="header">Header</div>,
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
  ModalManager: () => <div data-testid="modal-manager">ModalManager</div>,
  AppOverlays: () => <div data-testid="app-overlays">AppOverlays</div>,
  AppPanels: () => <div data-testid="app-panels">AppPanels</div>,
  AppBackground: () => <div data-testid="app-background" aria-hidden="true" />,
  AppScaffold: (props: {
    skipToContentLabel: string;
    appPanelsProps: unknown;
    appOverlaysProps: unknown;
  }) => {
    appScaffoldRenderSpy(props);
    return (
      <div>
        <a href="#main-content" className="sr-only">
          {props.skipToContentLabel}
        </a>
        <main id="main-content" />
      </div>
    );
  },
  AppLoadingGate: () => (
    <div>
      <div role="status" aria-label="Loading workspace" />
      <p>Loading Workspace...</p>
    </div>
  ),
  AppCollaborationPanels: () => <div data-testid="collaboration-panels" />,
}));

vi.mock('@features/prompt/PromptWorkspace', () => ({
  PromptWorkspace: () => <div data-testid="prompt-workspace">PromptWorkspace</div>,
}));

// Mock lazy-loaded components
vi.mock('@features/prompt/AssetLibrary', () => ({
  default: () => <div data-testid="asset-library">Asset Library</div>,
}));

vi.mock('@features/optimization', () => ({
  OptimizePanel: () => <div data-testid="optimize-panel">Optimize</div>,
  InlineSuggestions: () => <div data-testid="inline-suggestions">Suggestions</div>,
}));

vi.mock('@features/collaboration', () => ({
  ShareDialog: () => <div data-testid="share-dialog">Share</div>,
  ConflictResolutionPanel: () => <div data-testid="conflict-resolution">Conflict</div>,
  ProfileSetup: () => <div data-testid="profile-setup">Profile</div>,
  CommentPanel: () => <div data-testid="comment-panel">Comments</div>,
  RoleManager: () => <div data-testid="role-manager">Roles</div>,
}));

// ─── Helper ───────────────────────────────────────────────────────

function renderApp(initialRoute: TestRouteEntry = ROUTES.HOME) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────

describe('App', () => {
  beforeEach(() => {
    mockAppStore._hasHydrated = true;
    mockStartupStore.criticalBootstrapComplete = true;
    mockToasts = [];
    mockFallbackNotification = null;
    appScaffoldRenderSpy.mockClear();
    vi.clearAllMocks();
  });

  describe('Hydration gate', () => {
    it('shows loading spinner when store has not hydrated', () => {
      mockAppStore._hasHydrated = false;
      renderApp();
      expect(screen.getByText('Loading Workspace...')).toBeInTheDocument();
    });

    it('shows loading spinner while critical bootstrap is still running', () => {
      mockStartupStore.criticalBootstrapComplete = false;
      renderApp();
      expect(screen.getByText('Loading Workspace...')).toBeInTheDocument();
    });

    it('renders main content after hydration', async () => {
      mockAppStore._hasHydrated = true;
      renderApp();
      await waitFor(() => {
        expect(screen.getByText(/Skip to main content/i)).toBeInTheDocument();
      });
    });
  });

  describe('Layout structure', () => {
    it('renders skip navigation link', () => {
      renderApp();
      const skipLink = screen.getByText(/Skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink.tagName).toBe('A');
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('renders main content area with landmark', () => {
      renderApp();
      const main = document.getElementById('main-content');
      expect(main).toBeInTheDocument();
    });

    it('wires app panels and overlays props into scaffold', async () => {
      mockToasts = [{ id: 'toast-1', message: 'Saved', type: 'info' }];
      mockFallbackNotification = { primaryModel: 'veo-3', fallbackModel: 'veo-2' };

      renderApp();

      await waitFor(() => {
        expect(appScaffoldRenderSpy).toHaveBeenCalled();
      });

      const latestProps = appScaffoldRenderSpy.mock.calls.at(-1)?.[0];
      expect(latestProps).toBeDefined();
      expect(latestProps.appPanelsProps.fallbackNotification).toEqual(mockFallbackNotification);
      expect(latestProps.appPanelsProps.isBatchModalOpen).toBe(false);
      expect(typeof latestProps.appPanelsProps.onCloseBatchModal).toBe('function');

      expect(latestProps.appOverlaysProps.toasts).toHaveLength(1);
      expect(latestProps.appOverlaysProps.hasSeenWelcome).toBe(false);
      expect(typeof latestProps.appOverlaysProps.onCloseWelcome).toBe('function');
      expect(typeof latestProps.appOverlaysProps.onCloseDiagnostics).toBe('function');
    });

    it('keeps panel close callbacks stable across rerenders when panel state is unchanged', async () => {
      const view = renderApp();

      await waitFor(() => {
        expect(appScaffoldRenderSpy).toHaveBeenCalled();
      });

      const firstProps = appScaffoldRenderSpy.mock.calls.at(-1)?.[0];
      expect(firstProps).toBeDefined();

      view.rerender(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={[ROUTES.HOME]}>
            <App />
          </MemoryRouter>
        </I18nextProvider>,
      );

      const secondProps = appScaffoldRenderSpy.mock.calls.at(-1)?.[0];
      expect(secondProps).toBeDefined();

      expect(secondProps.appPanelsProps.onCloseBatchModal).toBe(
        firstProps.appPanelsProps.onCloseBatchModal,
      );
      expect(secondProps.appPanelsProps.onCloseJobsPanel).toBe(
        firstProps.appPanelsProps.onCloseJobsPanel,
      );
      expect(secondProps.appPanelsProps.onCloseWorkspaceManager).toBe(
        firstProps.appPanelsProps.onCloseWorkspaceManager,
      );
      expect(secondProps.appPanelsProps.onCloseQueuePanel).toBe(
        firstProps.appPanelsProps.onCloseQueuePanel,
      );
    });

    it('updates overlay toasts while preserving close handlers across rerenders', async () => {
      mockToasts = [{ id: 'toast-1', message: 'Saved', type: 'info' }];
      const view = renderApp();

      await waitFor(() => {
        expect(appScaffoldRenderSpy).toHaveBeenCalled();
      });

      const firstProps = appScaffoldRenderSpy.mock.calls.at(-1)?.[0];
      expect(firstProps.appOverlaysProps.toasts).toHaveLength(1);

      mockToasts = [
        { id: 'toast-1', message: 'Saved', type: 'info' },
        { id: 'toast-2', message: 'Synced', type: 'success' },
      ];

      view.rerender(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={[ROUTES.HOME]}>
            <App />
          </MemoryRouter>
        </I18nextProvider>,
      );

      const secondProps = appScaffoldRenderSpy.mock.calls.at(-1)?.[0];
      expect(secondProps.appOverlaysProps.toasts).toHaveLength(2);
      expect(secondProps.appOverlaysProps.onCloseWelcome).toBe(
        firstProps.appOverlaysProps.onCloseWelcome,
      );
      expect(typeof secondProps.appOverlaysProps.onCloseDiagnostics).toBe('function');
    });

    it('opens the storyboard studio when the sidebar storyboard action is invoked', async () => {
      renderApp();

      await waitFor(() => {
        expect(appScaffoldRenderSpy).toHaveBeenCalled();
      });

      const latestProps = appScaffoldRenderSpy.mock.calls.at(-1)?.[0];
      latestProps.sidebarProps.onNavigate('storyboard');

      expect(mockAppStore.openStudio).toHaveBeenCalledWith('story');
    });

    it('reopens the storyboard studio when home route state requests it', async () => {
      renderApp({ pathname: ROUTES.HOME, state: { reopenStudio: 'story' } });

      await waitFor(() => {
        expect(mockAppStore.openStudio).toHaveBeenCalledWith('story');
      });
    });

    it('exposes a dedicated plugins command in the command palette', async () => {
      renderApp();

      await waitFor(() => {
        expect(appScaffoldRenderSpy).toHaveBeenCalled();
      });

      const latestProps = appScaffoldRenderSpy.mock.calls.at(-1)?.[0];
      const pluginCommand = latestProps.appOverlaysProps.commandPalette.commands.find(
        (command: { id: string }) => command.id === 'open-plugins',
      );

      expect(pluginCommand).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has skip-to-content link as first focusable element', () => {
      renderApp();
      const skipLink = screen.getByText(/Skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink.className).toContain('sr-only');
    });
  });
});
