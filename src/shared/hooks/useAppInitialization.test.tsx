import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppInitialization } from './useAppInitialization';

const {
  mockDatabaseInitialize,
  mockPluginInitialize,
  mockVideoInitialize,
  mockJobQueueHydrate,
  mockBatchRegister,
  mockSceneRegister,
  mockSettingsMigration,
  mockRegisterInternalPlugins,
  mockJobQueueStoreInitialize,
} = vi.hoisted(() => ({
  mockDatabaseInitialize: vi.fn().mockResolvedValue(undefined),
  mockPluginInitialize: vi.fn().mockResolvedValue(undefined),
  mockVideoInitialize: vi.fn(),
  mockJobQueueHydrate: vi.fn().mockResolvedValue(undefined),
  mockBatchRegister: vi.fn(),
  mockSceneRegister: vi.fn(),
  mockSettingsMigration: vi.fn().mockResolvedValue(undefined),
  mockRegisterInternalPlugins: vi.fn().mockResolvedValue(undefined),
  mockJobQueueStoreInitialize: vi.fn(),
}));

// Mock services
vi.mock('@core/utils/performanceMarks', () => ({
  markStart: vi.fn(),
  markEnd: vi.fn(),
  PERF_MARKS: {
    APP_STARTUP: 'app-startup',
    STORE_HYDRATION: 'store-hydration',
    FIRST_RENDER: 'first-render',
    FIRST_INTERACTIVE: 'first-interactive',
    DB_INIT: 'db-init',
    PLUGIN_INIT: 'plugin-init',
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

const mockHasApiKey = vi.fn();
vi.mock('@core/services/apiKeyService', () => ({
  hasApiKey: () => mockHasApiKey(),
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

describe('useAppInitialization', () => {
  const mockOpenSettings = vi.fn();
  const mockSetNewProjectWizardOpen = vi.fn();
  const mockAddToast = vi.fn();

  const defaultOptions = {
    _hasHydrated: false,
    currentProjectId: null,
    promptIdea: '',
    setNewProjectWizardOpen: mockSetNewProjectWizardOpen,
    openSettings: mockOpenSettings,
    addToast: mockAddToast,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('should call openSettings when hydrated and hasApiKey returns false', () => {
    mockHasApiKey.mockReturnValue(false);

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
      }),
    );

    expect(mockOpenSettings).toHaveBeenCalledOnce();
  });

  it('should not call openSettings when API key exists', () => {
    mockHasApiKey.mockReturnValue(true);

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
      }),
    );

    expect(mockOpenSettings).not.toHaveBeenCalled();
  });

  it('should run initialization chain when hydrated is true', async () => {
    mockHasApiKey.mockReturnValue(true);

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
  });

  it('should open new project wizard when no shared state, prompt, or current project', () => {
    mockHasApiKey.mockReturnValue(true);
    window.history.pushState({}, '', '/');

    renderHook(() =>
      useAppInitialization({
        ...defaultOptions,
        _hasHydrated: true,
        currentProjectId: null,
        promptIdea: '',
      }),
    );

    expect(mockSetNewProjectWizardOpen).toHaveBeenCalledWith(true);
  });

  it('should defer non-critical startup services until after critical initialization', async () => {
    mockHasApiKey.mockReturnValue(true);

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
      expect(mockJobQueueHydrate).toHaveBeenCalledOnce();
      expect(mockBatchRegister).toHaveBeenCalledOnce();
      expect(mockSceneRegister).toHaveBeenCalledOnce();
      expect(mockJobQueueStoreInitialize).toHaveBeenCalledOnce();
    });
  });
});
