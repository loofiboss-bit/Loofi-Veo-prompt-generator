import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppInitialization } from './useAppInitialization';

// Mock services
vi.mock('@core/services/performanceService', () => ({
  performanceService: {
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
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@core/services/pluginService', () => ({
  pluginService: {
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@core/services/videoGenerationService', () => ({
  videoGenerationService: {
    initialize: vi.fn(),
  },
}));

vi.mock('@core/services/jobQueueService', () => ({
  jobQueueService: {
    hydrate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@core/services/batchPromptService', () => ({
  batchPromptService: {
    register: vi.fn(),
  },
}));

vi.mock('@core/services/sceneExportService', () => ({
  sceneExportService: {
    register: vi.fn(),
  },
}));

vi.mock('@core/services/settingsMigrationService', () => ({
  settingsMigrationService: {
    runMigrations: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@core/config/internalPlugins', () => ({
  registerInternalPlugins: vi.fn().mockResolvedValue(undefined),
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
      initialize: vi.fn(),
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
});
