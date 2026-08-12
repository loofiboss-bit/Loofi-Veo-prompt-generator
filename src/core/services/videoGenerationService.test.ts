/**
 * VideoGenerationService Unit Tests
 * Tests for video generation queue and service worker integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'mock-store'),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
}));

vi.mock('./mediaAssetService', () => ({
  mediaAssetService: {
    cacheRemoteMedia: vi.fn(),
    getObjectUrl: vi.fn(),
  },
}));

vi.mock('./productionRunService', () => ({
  productionRunService: {
    createRun: vi.fn().mockImplementation(async (run) => run),
    approveShots: vi.fn().mockResolvedValue({ id: 'approval-1' }),
    createApprovedTake: vi.fn().mockResolvedValue({ id: 'take-1' }),
    getRun: vi.fn(),
    updateTake: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('./veoGenerationService', () => ({
  VEO_PRICING_EFFECTIVE_DATE: '2026-07-10',
  veoGenerationService: {
    validateRequest: vi.fn(() => []),
    estimateCost: vi.fn(() => 0.96),
  },
}));

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: {
    getState: vi.fn(() => ({
      assets: [],
      addAsset: vi.fn(),
      promptState: { idea: 'Compatibility generation' },
    })),
  },
}));

vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: {
    getState: vi.fn(() => ({ currentProjectId: 'project-1' })),
  },
}));

// Mock loggerService
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock videoEditorService
vi.mock('./videoEditorService', () => ({
  generateProxy: vi.fn().mockResolvedValue('blob:proxy-url'),
}));

// Mock apiKeyService
const { mockGetStoredApiKey, mockGetStoredApiKeyAsync, mockHasApiKeyAsync } = vi.hoisted(() => ({
  mockGetStoredApiKey: vi.fn().mockReturnValue('test-api-key'),
  mockGetStoredApiKeyAsync: vi.fn().mockResolvedValue('test-api-key'),
  mockHasApiKeyAsync: vi.fn().mockResolvedValue(true),
}));

vi.mock('./apiKeyService', () => ({
  getStoredApiKey: mockGetStoredApiKey,
  getStoredApiKeyAsync: mockGetStoredApiKeyAsync,
  hasApiKeyAsync: mockHasApiKeyAsync,
}));

// Mock generationQueueService
const {
  mockEnqueue,
  mockRegisterExecutor,
  mockAddTask,
  mockUpdateTask,
  mockSetTasks,
  mockPostMessage,
  mockAddEventListener,
  mockRemoveEventListener,
} = vi.hoisted(() => ({
  mockEnqueue: vi.fn(),
  mockRegisterExecutor: vi.fn(),
  mockAddTask: vi.fn(),
  mockUpdateTask: vi.fn(),
  mockSetTasks: vi.fn(),
  mockPostMessage: vi.fn(),
  mockAddEventListener: vi.fn(),
  mockRemoveEventListener: vi.fn(),
}));

vi.mock('./generationQueueService', () => ({
  generationQueueService: {
    enqueue: mockEnqueue,
    registerExecutor: mockRegisterExecutor,
  },
}));

// Mock costTrackingService
vi.mock('./costTrackingService', () => ({
  costTrackingService: {
    estimateVideoGenerationCost: vi.fn().mockReturnValue(0.05),
  },
}));

// Mock useVideoStore
vi.mock('@core/store/useVideoStore', () => ({
  useVideoStore: {
    getState: vi.fn(() => ({
      addTask: mockAddTask,
      updateTask: mockUpdateTask,
      setTasks: mockSetTasks,
    })),
  },
}));

// Mock navigator.serviceWorker
Object.defineProperty(global.navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      active: { postMessage: mockPostMessage },
    }),
    controller: {
      postMessage: mockPostMessage,
    },
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  },
  writable: true,
});

// Mock Notification
Object.defineProperty(global, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  },
  writable: true,
});

import { videoGenerationService } from './videoGenerationService';
import type { VideoGenerationSettings } from './videoGenerationService';
import type { GenerationTask, VeoGenerationRequest } from '@core/types';
import { logger } from '@core/services/loggerService';
import { generateProxy } from './videoEditorService';

describe('VideoGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoredApiKey.mockReset();
    mockGetStoredApiKeyAsync.mockReset();
    mockGetStoredApiKey.mockReturnValue('test-api-key');
    mockGetStoredApiKeyAsync.mockResolvedValue('test-api-key');
    // Reset the private isMounted flag so initialize() can be called fresh each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (videoGenerationService as any).isMounted = false;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('initialize', () => {
    it('should register video executor with generation queue', () => {
      videoGenerationService.initialize();

      expect(mockRegisterExecutor).toHaveBeenCalledWith('video', expect.any(Object));
    });

    it('blocks the registered executor when the desktop paid-job bridge is absent', async () => {
      delete window.electron;
      videoGenerationService.initialize();
      const executor = mockRegisterExecutor.mock.calls[0]?.[1];
      const task = {
        id: 'browser-paid-job',
        status: 'Queued',
        videoUrl: null,
        prompt: 'Blocked browser execution',
        settings: { aspectRatio: '16:9', resolution: '720p', veoModel: 'fast' },
        timestamp: Date.now(),
      } as GenerationTask;

      await expect(
        executor.execute({ payload: task }, vi.fn(), new AbortController().signal),
      ).rejects.toThrow(/desktop approval boundary/);
      expect(mockPostMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'START_JOB' }),
      );
    });

    it('should connect to service worker when ready', async () => {
      videoGenerationService.initialize();

      await vi.waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith('[VideoGenerationService] Connected to SW');
      });
    });

    it('should sync state with service worker on init', async () => {
      videoGenerationService.initialize();

      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith({ type: 'SYNC_STATE' });
      });
    });

    it('should not initialize twice', () => {
      videoGenerationService.initialize();
      videoGenerationService.initialize();

      // Only one registration
      expect(mockRegisterExecutor).toHaveBeenCalledTimes(1);
    });
  });

  describe('startGeneration', () => {
    const settings: VideoGenerationSettings = {
      aspectRatio: '16:9',
      resolution: '1080p',
      veoModel: 'fast',
      count: 1,
    };

    it('blocks legacy quick generation before queueing or provider execution', async () => {
      const onToast = vi.fn();

      await expect(
        videoGenerationService.startGeneration('Test video prompt', settings, undefined, onToast),
      ).rejects.toThrow('Open Create');
      expect(mockEnqueue).not.toHaveBeenCalled();
      expect(mockAddTask).not.toHaveBeenCalled();
    });

    it('should return null if API key is missing', async () => {
      mockHasApiKeyAsync.mockResolvedValueOnce(false);
      mockGetStoredApiKeyAsync.mockResolvedValueOnce(null);
      mockGetStoredApiKey.mockReturnValueOnce(null);
      delete process.env.API_KEY;

      const onToast = vi.fn();

      const result = await videoGenerationService.startGeneration(
        'Test',
        settings,
        undefined,
        onToast,
      );

      expect(result).toBeNull();
      expect(onToast).toHaveBeenCalledWith(expect.stringContaining('API Key missing'), 'error');
      expect(mockEnqueue).not.toHaveBeenCalled();
    });
  });

  describe('startGenerationRequest', () => {
    const request: VeoGenerationRequest = {
      mode: 'text-to-video',
      modelId: 'veo-3.1-fast',
      prompt: 'A detective crosses a neon-lit street in heavy rain.',
      aspectRatio: '16:9',
      resolution: '1080p',
      durationSeconds: 8,
      referenceAssetIds: [],
    };

    it('blocks when a continuity reference cannot be loaded into the paid payload', async () => {
      const onToast = vi.fn();

      await expect(
        videoGenerationService.startGenerationRequest(
          { ...request, referenceAssetIds: ['hero-ref'] },
          { runId: 'run-1', shotId: 1, takeId: 'take-1' },
          {},
          onToast,
        ),
      ).rejects.toThrow(/selected continuity references/);

      expect(onToast).toHaveBeenCalledWith(
        expect.stringContaining('selected continuity references'),
        'error',
      );
      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it('blocks when a required frame cannot be loaded into the paid payload', async () => {
      await expect(
        videoGenerationService.startGenerationRequest(
          { ...request, mode: 'image-to-video', firstFrameAssetId: 'first-frame' },
          { runId: 'run-1', shotId: 1, takeId: 'take-1' },
          {},
        ),
      ).rejects.toThrow(/first frame could not be loaded/);
      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it('throws when credentials are missing so an approved take cannot remain queued', async () => {
      mockHasApiKeyAsync.mockResolvedValueOnce(false);
      const onToast = vi.fn();

      await expect(
        videoGenerationService.startGenerationRequest(
          request,
          { runId: 'run-1', shotId: 1, takeId: 'take-1' },
          {},
          onToast,
        ),
      ).rejects.toThrow(/API Key missing/);

      expect(onToast).toHaveBeenCalledWith(expect.stringContaining('API Key missing'), 'error');
      expect(mockEnqueue).not.toHaveBeenCalled();
      expect(mockAddTask).not.toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    beforeEach(() => {
      videoGenerationService.initialize();
    });

    it('should update task on JOB_UPDATE message', async () => {
      const handler = mockAddEventListener.mock.calls.find((call) => call[0] === 'message')?.[1];

      const updatedTask: GenerationTask = {
        id: 'task-1',
        status: 'Processing',
        videoUrl: null,
        prompt: 'Test',
        settings: {
          aspectRatio: '16:9',
          resolution: '1080p',
          veoModel: 'fast',
        },
        timestamp: Date.now(),
      };

      handler?.({ data: { type: 'JOB_UPDATE', payload: updatedTask } });

      await vi.waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(updatedTask);
      });
    });

    it('should generate proxy when video completes without proxy', async () => {
      const handler = mockAddEventListener.mock.calls.find((call) => call[0] === 'message')?.[1];

      const completedTask: GenerationTask = {
        id: 'task-1',
        status: 'Complete',
        videoUrl: 'blob:video',
        proxyUrl: undefined,
        prompt: 'Test',
        settings: {
          aspectRatio: '16:9',
          resolution: '1080p',
          veoModel: 'fast',
        },
        timestamp: Date.now(),
      };

      handler?.({ data: { type: 'JOB_UPDATE', payload: completedTask } });

      await vi.waitFor(() => {
        expect(generateProxy).toHaveBeenCalledWith('blob:video');
      });

      expect(mockUpdateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          proxyUrl: 'blob:proxy-url',
        }),
      );
    });

    it('should not generate proxy if already exists', () => {
      const handler = mockAddEventListener.mock.calls.find((call) => call[0] === 'message')?.[1];

      const completedTask: GenerationTask = {
        id: 'task-1',
        status: 'Complete',
        videoUrl: 'blob:video',
        proxyUrl: 'blob:existing-proxy',
        prompt: 'Test',
        settings: {
          aspectRatio: '16:9',
          resolution: '1080p',
          veoModel: 'fast',
        },
        timestamp: Date.now(),
      };

      handler?.({ data: { type: 'JOB_UPDATE', payload: completedTask } });

      expect(generateProxy).not.toHaveBeenCalled();
    });

    it('should handle proxy generation failure gracefully', async () => {
      vi.mocked(generateProxy).mockRejectedValueOnce(new Error('Proxy failed'));

      const handler = mockAddEventListener.mock.calls.find((call) => call[0] === 'message')?.[1];

      const completedTask: GenerationTask = {
        id: 'task-1',
        status: 'Complete',
        videoUrl: 'blob:video',
        prompt: 'Test',
        settings: {
          aspectRatio: '16:9',
          resolution: '1080p',
          veoModel: 'fast',
        },
        timestamp: Date.now(),
      };

      handler?.({ data: { type: 'JOB_UPDATE', payload: completedTask } });

      await vi.waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Auto-proxy failed'),
          'task-1',
        );
      });
    });

    it('should sync all tasks on SYNC_STATE message', async () => {
      const handler = mockAddEventListener.mock.calls.find((call) => call[0] === 'message')?.[1];

      const tasks: GenerationTask[] = [
        {
          id: 'task-2',
          status: 'Complete',
          videoUrl: 'blob:video2',
          prompt: 'Test 2',
          settings: { aspectRatio: '16:9', resolution: '1080p', veoModel: 'fast' },
          timestamp: Date.now(),
        },
        {
          id: 'task-1',
          status: 'Complete',
          videoUrl: 'blob:video1',
          prompt: 'Test 1',
          settings: { aspectRatio: '16:9', resolution: '1080p', veoModel: 'fast' },
          timestamp: Date.now() - 1000,
        },
      ];

      handler?.({ data: { type: 'SYNC_STATE', payload: tasks } });

      // Should sort by ID descending
      await vi.waitFor(() => {
        expect(mockSetTasks).toHaveBeenCalledWith([tasks[0], tasks[1]]);
      });
    });
  });

  describe('addToQueue', () => {
    it('should request notification permission', async () => {
      const settings: VideoGenerationSettings = {
        aspectRatio: '16:9',
        resolution: '1080p',
        veoModel: 'fast',
      };

      await videoGenerationService.addToQueue(['Test'], settings);

      expect(global.Notification.requestPermission).toHaveBeenCalled();
    });

    it('should assign unique IDs to each task', async () => {
      const settings: VideoGenerationSettings = {
        aspectRatio: '16:9',
        resolution: '1080p',
        veoModel: 'fast',
      };

      await videoGenerationService.addToQueue(['Prompt 1', 'Prompt 2'], settings);

      const calls = mockAddTask.mock.calls;
      const id1 = calls[0][0].id;
      const id2 = calls[1][0].id;

      expect(id1).not.toBe(id2);
    });

    it('should include takeIndex in settings', async () => {
      const settings: VideoGenerationSettings = {
        aspectRatio: '16:9',
        resolution: '1080p',
        veoModel: 'fast',
      };

      await videoGenerationService.addToQueue(['P1', 'P2', 'P3'], settings);

      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({ takeIndex: 1 }),
        }),
      );
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({ takeIndex: 2 }),
        }),
      );
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({ takeIndex: 3 }),
        }),
      );
    });
  });
});
