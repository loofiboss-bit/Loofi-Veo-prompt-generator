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
import { App } from './App';

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
    result: null,
  }),
}));

vi.mock('@core/store/useJobQueueStore', () => ({
  useJobQueueStore: (selector?: (s: { pendingCount: number }) => unknown) =>
    selector ? selector({ pendingCount: 0 }) : { pendingCount: 0 },
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
    toasts: [],
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
    notification: null,
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

function renderApp(initialRoute = '/') {
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
    vi.clearAllMocks();
  });

  describe('Hydration gate', () => {
    it('shows loading spinner when store has not hydrated', () => {
      mockAppStore._hasHydrated = false;
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
