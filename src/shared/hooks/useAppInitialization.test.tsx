import React, { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppInitialization } from './useAppInitialization';

const {
  mockDatabaseInitialize,
  mockPluginInitialize,
  mockVideoInitialize,
  mockGenerationQueueStoreInitialize,
  mockJobQueueHydrate,
  mockJobQueueSetNetworkOnline,
  mockBatchRegister,
  mockSceneRegister,
  mockSettingsMigration,
  mockRegisterInternalPlugins,
  mockJobQueueStoreInitialize,
  mockGetStoredApiKeyAsync,
  mockHasApiKeyAsync,
  mockMarkStart,
  mockMarkEnd,
  mockStartupReset,
  mockStartupStartCriticalBootstrap,
  mockStartupCompleteCriticalBootstrap,
  mockStartupFailCriticalBootstrap,
  mockStartupStartDeferredServices,
  mockStartupCompleteDeferredServices,
  mockStartupFailDeferredServices,
  mockStartupMarkServiceRunning,
  mockStartupMarkServiceReady,
  mockStartupMarkServiceDegraded,
} = vi.hoisted(() => ({
  mockDatabaseInitialize: vi.fn().mockResolvedValue(undefined),
  mockPluginInitialize: vi.fn().mockResolvedValue(undefined),
  mockVideoInitialize: vi.fn(),
  mockGenerationQueueStoreInitialize: vi.fn().mockResolvedValue(undefined),
  mockJobQueueHydrate: vi.fn().mockResolvedValue(undefined),
  mockJobQueueSetNetworkOnline: vi.fn(),
  mockBatchRegister: vi.fn(),
  mockSceneRegister: vi.fn(),
  mockSettingsMigration: vi.fn().mockResolvedValue(undefined),
  mockRegisterInternalPlugins: vi.fn().mockResolvedValue(undefined),
  mockJobQueueStoreInitialize: vi.fn(),
  mockGetStoredApiKeyAsync: vi.fn().mockResolvedValue('test-api-key'),
  mockHasApiKeyAsync: vi.fn().mockResolvedValue(true),
  mockMarkStart: vi.fn(),
  mockMarkEnd: vi.fn(),
  mockStartupReset: vi.fn(),
  mockStartupStartCriticalBootstrap: vi.fn(),
  mockStartupCompleteCriticalBootstrap: vi.fn(),
  mockStartupFailCriticalBootstrap: vi.fn(),
  mockStartupStartDeferredServices: vi.fn(),
  mockStartupCompleteDeferredServices: vi.fn(),
  mockStartupFailDeferredServices: vi.fn(),
  mockStartupMarkServiceRunning: vi.fn(),
  mockStartupMarkServiceReady: vi.fn(),
  mockStartupMarkServiceDegraded: vi.fn(),
}));

const mockStartupState = vi.hoisted(() => ({
  phase: 'idle',
  criticalBootstrapComplete: false,
}));

// Mock services
vi.mock('@core/utils/performanceMarks', () => ({
  markStart: mockMarkStart,
  markEnd: mockMarkEnd,
  PERF_MARKS: {
    APP_STARTUP: 'app-startup',
    STORE_HYDRATION: 'store-hydration',
    FIRST_RENDER: 'first-render',
    FIRST_INTERACTIVE: 'first-interactive',
    CRITICAL_BOOTSTRAP: 'critical-bootstrap',
    DB_INIT: 'db-init',
    SETTINGS_MIGRATION: 'settings-migration',
    PROJECT_STORE_INIT: 'project-store-init',
    PLUGIN_INIT: 'plugin-init',
    JOB_QUEUE_HYDRATE: 'job-queue-hydrate',
    QUEUE_REPLAY_SYNC: 'queue-replay-sync',
    ONLINE_RESUME_HANDOFF: 'online-resume-handoff',
    DEFERRED_SERVICES: 'deferred-services',
  },
}));

vi.mock('@core/services/performanceService', () => ({
  performanceService: {
    startMark: vi.fn(),
    endMark: vi.fn(),
  },
}));

vi.mock('@core/services/performanceProfiler', () => ({
  performanceProfiler: {
    start: vi.fn(),
    end: vi.fn(),
  },
}));

vi.mock('@core/services/databaseService', () => ({
  databaseService: {
    initialize: mockDatabaseInitialize,
  },
}));

vi.mock('@core/services/pluginService', () => ({
  pluginService: {
    initialize: mockPluginInitialize,
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@core/services/videoGenerationService', () => ({
  videoGenerationService: {
    initialize: mockVideoInitialize,
  },
}));

vi.mock('@core/services/jobQueueService', () => ({
  jobQueueService: {
    hydrate: mockJobQueueHydrate,
    setNetworkOnline: mockJobQueueSetNetworkOnline,
  },
}));

vi.mock('@core/services/batchPromptService', () => ({
  batchPromptService: {
    register: mockBatchRegister,
  },
}));

vi.mock('@core/services/sceneExportService', () => ({
  sceneExportService: {
    register: mockSceneRegister,
  },
}));

vi.mock('@core/services/settingsMigrationService', () => ({
  settingsMigrationService: {
    runMigrations: mockSettingsMigration,
  },
}));

vi.mock('@core/config/internalPlugins', () => ({
  registerInternalPlugins: mockRegisterInternalPlugins,
}));

vi.mock('@core/services/apiKeyService', () => ({
  hasApiKeyAsync: () => mockHasApiKeyAsync(),
  getStoredApiKeyAsync: () => mockGetStoredApiKeyAsync(),
}));

const mockProjectStoreInitialize = vi.fn().mockResolvedValue(undefined);
vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: () => ({
    initialize: mockProjectStoreInitialize,
  }),
}));

vi.mock('@core/store/useJobQueueStore', () => ({
  useJobQueueStore: {
    getState: vi.fn(() => ({
      initialize: mockJobQueueStoreInitialize,
    })),
  },
}));

vi.mock('@core/store/useGenerationQueueStore', () => ({
  useGenerationQueueStore: {
    getState: vi.fn(() => ({
      initialize: mockGenerationQueueStoreInitialize,
    })),
  },
}));

vi.mock('@core/store/useStartupStore', () => ({
  useStartupStore: {
    getState: vi.fn(() => ({
      phase: mockStartupState.phase,
      criticalBootstrapComplete: mockStartupState.criticalBootstrapComplete,
      reset: mockStartupReset,
      startCriticalBootstrap: mockStartupStartCriticalBootstrap,
      completeCriticalBootstrap: mockStartupCompleteCriticalBootstrap,
      failCriticalBootstrap: mockStartupFailCriticalBootstrap,
      startDeferredServices: mockStartupStartDeferredServices,
      completeDeferredServices: mockStartupCompleteDeferredServices,
      failDeferredServices: mockStartupFailDeferredServices,
      markServiceRunning: mockStartupMarkServiceRunning,
      markServiceReady: mockStartupMarkServiceReady,
      markServiceDegraded: mockStartupMarkServiceDegraded,
    })),
  },
}));

describe('useAppInitialization', () => {
  const mockSetNewProjectWizardOpen = vi.fn();
  const mockAddToast = vi.fn();

  const defaultOptions = {
    _hasHydrated: false,
    hasSeenWelcome: true,
    currentProjectId: null,
    promptIdea: '',
    setNewProjectWizardOpen: mockSetNewProjectWizardOpen,
    addToast: mockAddToast,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockHasApiKeyAsync.mockResolvedValue(true);
    mockGetStoredApiKeyAsync.mockResolvedValue('test-api-key');
    mockStartupState.phase = 'idle';
    mockStartupState.criticalBootstrapComplete = false;
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show configuration guidance when hydrated and hasApiKey returns false', async () => {
    mockHasApiKeyAsync.mockResolvedValue(false);

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
      }),
    );

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        'Configure your Gemini API key in Settings to enable prompt generation.',
        'info',
      );
    });
  });

  it('should not show configuration guidance when API key exists', async () => {
    mockHasApiKeyAsync.mockResolvedValue(true);

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
      }),
    );

    await waitFor(() => {
      expect(mockAddToast).not.toHaveBeenCalled();
    });
  });

  it('should run initialization chain when hydrated is true', async () => {
    mockHasApiKeyAsync.mockResolvedValue(true);

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
      }),
    );

    await waitFor(() => {
      expect(mockProjectStoreInitialize).toHaveBeenCalled();
    });

    expect(mockDatabaseInitialize).toHaveBeenCalledOnce();
    expect(mockSettingsMigration).toHaveBeenCalledOnce();
    expect(mockStartupReset).toHaveBeenCalledOnce();
    expect(mockStartupStartCriticalBootstrap).toHaveBeenCalledOnce();
    expect(mockStartupCompleteCriticalBootstrap).toHaveBeenCalledOnce();
  });

  it('should open new project wizard when no shared state, prompt, or current project', async () => {
    mockHasApiKeyAsync.mockResolvedValue(true);
    window.history.pushState({}, '', '/');

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
        currentProjectId: null,
        promptIdea: '',
      }),
    );

    await waitFor(() => {
      expect(mockSetNewProjectWizardOpen).toHaveBeenCalledWith(true);
    });
  });

  it('should defer new project wizard until welcome flow is completed', async () => {
    mockHasApiKeyAsync.mockResolvedValue(true);
    window.history.pushState({}, '', '/');

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
        hasSeenWelcome: false,
        currentProjectId: null,
        promptIdea: '',
      }),
    );

    await waitFor(() => {
      expect(mockHasApiKeyAsync).toHaveBeenCalled();
    });

    expect(mockSetNewProjectWizardOpen).not.toHaveBeenCalled();
  });

  it('should defer non-critical startup services until after critical initialization', async () => {
    mockHasApiKeyAsync.mockResolvedValue(true);

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
      }),
    );

    await waitFor(() => {
      expect(mockProjectStoreInitialize).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockPluginInitialize).toHaveBeenCalledOnce();
      expect(mockRegisterInternalPlugins).toHaveBeenCalledOnce();
      expect(mockVideoInitialize).toHaveBeenCalledOnce();
      expect(mockGenerationQueueStoreInitialize).toHaveBeenCalledOnce();
      expect(mockJobQueueHydrate).toHaveBeenCalledOnce();
      expect(mockJobQueueSetNetworkOnline).toHaveBeenCalledWith(true);
      expect(mockBatchRegister).toHaveBeenCalledOnce();
      expect(mockSceneRegister).toHaveBeenCalledOnce();
      expect(mockJobQueueStoreInitialize).toHaveBeenCalledOnce();
    });

    expect(mockStartupStartDeferredServices).toHaveBeenCalledOnce();
    expect(mockStartupCompleteDeferredServices).toHaveBeenCalledOnce();
    expect(mockStartupMarkServiceRunning).toHaveBeenCalledWith('database');
    expect(mockStartupMarkServiceReady).toHaveBeenCalledWith('projectStore');
    expect(mockStartupMarkServiceReady).toHaveBeenCalledWith('generationQueueStore');

    expect(mockMarkStart).toHaveBeenCalledWith('critical-bootstrap');
    expect(mockMarkEnd).toHaveBeenCalledWith('critical-bootstrap');
    expect(mockMarkStart).toHaveBeenCalledWith('settings-migration');
    expect(mockMarkEnd).toHaveBeenCalledWith('settings-migration');
    expect(mockMarkStart).toHaveBeenCalledWith('project-store-init');
    expect(mockMarkEnd).toHaveBeenCalledWith('project-store-init');
    expect(mockMarkStart).toHaveBeenCalledWith('job-queue-hydrate');
    expect(mockMarkEnd).toHaveBeenCalledWith('job-queue-hydrate');
    expect(mockMarkStart).toHaveBeenCalledWith('queue-replay-sync');
    expect(mockMarkEnd).toHaveBeenCalledWith('queue-replay-sync');
  });

  it('should post RESUME_QUEUED_JOBS to service worker controller when online', async () => {
    mockHasApiKeyAsync.mockResolvedValue(true);

    const mockPostMessage = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: {
          postMessage: mockPostMessage,
        },
      },
    });

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
      }),
    );

    await waitFor(() => {
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'RESUME_QUEUED_JOBS',
        apiKey: 'test-api-key',
      });
    });
  });

  it('should mark critical bootstrap as degraded when initialization fails', async () => {
    mockDatabaseInitialize.mockRejectedValueOnce(new Error('db init failed'));

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
      }),
    );

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('Initialization failed', 'error');
    });

    expect(mockStartupMarkServiceDegraded).toHaveBeenCalledWith('database', 'db init failed');
    expect(mockStartupFailCriticalBootstrap).toHaveBeenCalledWith('db init failed');
  });

  it('should fail critical bootstrap when a startup step times out', async () => {
    vi.useFakeTimers();
    mockDatabaseInitialize.mockImplementationOnce(() => new Promise(() => {}));

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
      }),
    );

    await vi.advanceTimersByTimeAsync(8000);
    await Promise.resolve();

    expect(mockStartupFailCriticalBootstrap).toHaveBeenCalledWith(
      expect.stringContaining('database'),
    );

    expect(mockStartupMarkServiceDegraded).toHaveBeenCalledWith(
      'database',
      expect.stringContaining('timed out'),
    );
    expect(mockAddToast).toHaveBeenCalledWith('Initialization failed', 'error');
  });

  it('should only start critical bootstrap once inside StrictMode', async () => {
    renderHook(
      () =>
        useAppInitialization({
          ...defaultOptions,
          _hasHydrated: true,
        }),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <StrictMode>{children}</StrictMode>
        ),
      },
    );

    await waitFor(() => {
      expect(mockProjectStoreInitialize).toHaveBeenCalled();
    });

    expect(mockDatabaseInitialize).toHaveBeenCalledOnce();
    expect(mockStartupReset).toHaveBeenCalledOnce();
    expect(mockStartupStartCriticalBootstrap).toHaveBeenCalledOnce();
  });
});
