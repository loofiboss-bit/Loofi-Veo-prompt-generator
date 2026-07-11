import type {
  GenerationTask,
  ProductionRun,
  VeoExecutionInputs,
  VeoGenerationRequest,
} from '@core/types';
import { INITIAL_STATE } from '@core/constants';
import { generateProxy } from '@core/services/videoEditorService';
import { getStoredApiKeyAsync } from '@core/services/apiKeyService';
import { useVideoStore } from '@core/store/useVideoStore';
import { logger } from '@core/services/loggerService';
import { generationQueueService } from '@core/services/generationQueueService';
import { costTrackingService } from '@core/services/costTrackingService';
import { appendApiKeyToMediaUrl } from '@core/utils/mediaUrlAuth';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { productionRunService } from '@core/services/productionRunService';
import {
  VEO_PRICING_EFFECTIVE_DATE,
  veoGenerationService,
} from '@core/services/veoGenerationService';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';

export interface VideoGenerationSettings {
  aspectRatio: string;
  resolution: '4k' | '1080p' | '720p';
  veoModel: 'fast' | 'quality' | 'lite';
  durationSeconds?: 4 | 6 | 8;
  count?: number;
  takeGroupId?: string;
  takeIndex?: number;
}

export interface ProductionGenerationContext {
  runId: string;
  shotId: number;
  takeId: string;
}

class VideoGenerationService {
  private isMounted = false;

  private withAuthenticatedVideoUrl(task: GenerationTask, apiKey: string | null): GenerationTask {
    return {
      ...task,
      videoUrl: appendApiKeyToMediaUrl(task.videoUrl, apiKey),
    };
  }

  initialize() {
    if (this.isMounted) return;
    this.isMounted = true;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        logger.info('[VideoGenerationService] Connected to SW');
        if (registration.active) {
          registration.active.postMessage({ type: 'SYNC_STATE' });
        }
      });

      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
    }

    // Register video executor with the generation queue
    generationQueueService.registerExecutor('video', {
      execute: async (item, onProgress, signal) => {
        return this.executeViaServiceWorker(item.payload as GenerationTask, onProgress, signal);
      },
    });
  }

  private async handleMessage(event: MessageEvent) {
    const { type, payload } = event.data;
    const store = useVideoStore.getState();
    const apiKey = await getStoredApiKeyAsync();

    if (type === 'JOB_UPDATE') {
      const updatedTask = this.withAuthenticatedVideoUrl(payload as GenerationTask, apiKey);

      // Proxy Trigger Logic
      if (updatedTask.status === 'Complete' && updatedTask.videoUrl && !updatedTask.proxyUrl) {
        try {
          const proxyUrl = await generateProxy(updatedTask.videoUrl);
          updatedTask.proxyUrl = proxyUrl;
        } catch (_e) {
          logger.warn('[VideoGenerationService] Auto-proxy failed for task', updatedTask.id);
        }
      }

      store.updateTask(updatedTask);
      await this.syncProductionTask(updatedTask, apiKey);
    } else if (type === 'SYNC_STATE') {
      const sorted = (payload as GenerationTask[])
        .map((task) => this.withAuthenticatedVideoUrl(task, apiKey))
        .sort((a, b) => b.id.localeCompare(a.id));
      store.setTasks(sorted);
    }
  }

  private async syncProductionTask(task: GenerationTask, apiKey: string | null): Promise<void> {
    if (!task.productionRunId || task.productionShotId === undefined || !task.productionTakeId) {
      return;
    }

    const updates = {
      taskId: task.id,
      providerMediaUri: task.providerMediaUri ?? task.videoUrl ?? undefined,
      providerArtifact: task.providerOperationName
        ? {
            operationName: task.providerOperationName,
            mediaUri: task.providerMediaUri ?? task.videoUrl ?? undefined,
            createdAt: task.timestamp,
            expiresAt: task.providerExpiresAt ?? task.timestamp + 2 * 24 * 60 * 60 * 1000,
          }
        : undefined,
    };

    if (task.status === 'RecoveryRequired') {
      await productionRunService.updateTake(
        task.productionRunId,
        task.productionShotId,
        task.productionTakeId,
        { ...updates, status: 'recovery-required', error: task.error },
      );
      return;
    }
    if (task.status === 'Error') {
      await productionRunService.updateTake(
        task.productionRunId,
        task.productionShotId,
        task.productionTakeId,
        { ...updates, status: 'failed', error: task.error },
      );
      return;
    }
    if (['Submitting', 'Processing', 'Polling', 'Fetching'].includes(task.status)) {
      await productionRunService.updateTake(
        task.productionRunId,
        task.productionShotId,
        task.productionTakeId,
        {
          ...updates,
          status: task.status === 'Submitting' ? 'submitting' : 'generating',
        },
      );
      return;
    }
    if (task.status !== 'Complete' || !task.videoUrl) {
      return;
    }

    const run = await productionRunService.getRun(task.productionRunId);
    const take = run?.shots
      .find((shot) => shot.id === task.productionShotId)
      ?.takes.find((item) => item.id === task.productionTakeId);
    if (take?.localMediaKey) {
      return;
    }

    const mediaKey = `production-media:${task.productionTakeId}`;
    try {
      const record = await mediaAssetService.cacheRemoteMedia({
        key: mediaKey,
        url: task.videoUrl,
        apiKey,
        providerExpiresAt: task.providerExpiresAt,
      });
      const localMediaUrl = await mediaAssetService.getObjectUrl(mediaKey);
      await productionRunService.updateTake(
        task.productionRunId,
        task.productionShotId,
        task.productionTakeId,
        {
          ...updates,
          status: 'complete',
          localMediaKey: mediaKey,
          localMediaUrl: localMediaUrl ?? undefined,
          completedAt: Date.now(),
        },
      );
      const appState = useAppStore.getState();
      if (!appState.assets.some((asset) => asset.id === task.productionTakeId)) {
        appState.addAsset({
          id: task.productionTakeId,
          type: 'video',
          name: `Director Take ${task.productionShotId}`,
          url: localMediaUrl ?? task.videoUrl,
          data: '',
          mimeType: record.mimeType,
          storageKey: mediaKey,
          providerUri: task.providerMediaUri ?? task.videoUrl,
          providerExpiresAt: task.providerExpiresAt,
          groupId: `director-shot-${task.productionShotId}`,
          version: take ? (take.request.seed ?? 1) : 1,
          tags: ['director-mode', `shot-${task.productionShotId}`],
        });
      }
    } catch (error) {
      logger.error('VideoGenerationService', 'Failed to cache generated media', error);
      await productionRunService.updateTake(
        task.productionRunId,
        task.productionShotId,
        task.productionTakeId,
        {
          ...updates,
          status: 'media-at-risk',
          error: error instanceof Error ? error.message : 'Failed to cache generated media.',
          completedAt: Date.now(),
        },
      );
    }
  }

  /**
   * Start video generation via the unified generation queue (v2.5.0).
   * This method enqueues the request; the queue handles offline, retry, circuit breaker.
   */
  async startGeneration(
    prompt: string,
    settings: VideoGenerationSettings,
    image?: { data: string; mimeType: string },
    onToast?: (msg: string, type: 'info' | 'error') => void,
  ): Promise<string | null> {
    this.initialize();

    const count = settings.count || 1;
    const prompts = Array(count).fill(prompt);
    const apiKey = await getStoredApiKeyAsync();
    if (!apiKey) {
      onToast?.('API Key missing. Please set your API key in Settings.', 'error');
      return null;
    }
    const contexts = await this.createCompatibilityRun(prompts, settings, image);

    return this.addToQueue(prompts, settings, image, onToast, contexts);
  }

  private async createCompatibilityRun(
    prompts: string[],
    settings: VideoGenerationSettings,
    image?: { data: string; mimeType: string },
  ): Promise<ProductionGenerationContext[]> {
    const now = Date.now();
    const runId = crypto.randomUUID();
    const durationSeconds = settings.durationSeconds ?? 8;
    const modelId =
      settings.veoModel === 'quality' ? ('veo-3.1-quality' as const) : ('veo-3.1-fast' as const);
    const aspectRatio = settings.aspectRatio === '9:16' ? ('9:16' as const) : ('16:9' as const);
    const requests: VeoGenerationRequest[] = prompts.map((item) => ({
      mode: image ? 'image-to-video' : 'text-to-video',
      modelId,
      prompt: item,
      aspectRatio,
      resolution: settings.resolution,
      durationSeconds,
      firstFrameAssetId: image ? 'legacy-inline-first-frame' : undefined,
      referenceAssetIds: [],
    }));
    const estimatedUsd = requests.reduce(
      (total, request) => total + veoGenerationService.estimateCost(request),
      0,
    );
    const run: ProductionRun = {
      schemaVersion: 1,
      id: runId,
      projectId: useProjectStore.getState().currentProjectId ?? 'legacy-project',
      title: 'Compatibility video generation',
      status: 'awaiting-approval',
      brief: prompts.join('\n'),
      source: 'local',
      planRevision: 1,
      promptSnapshot: useAppStore.getState().promptState ?? INITIAL_STATE,
      assetIds: [],
      shots: requests.map((request, index) => ({
        id: index + 1,
        title: `Compatibility Shot ${index + 1}`,
        prompt: request.prompt,
        negativePrompt: request.negativePrompt ?? '',
        camera: '',
        durationSeconds: request.durationSeconds,
        status: 'awaiting-approval',
        generationRequest: request,
        takes: [],
      })),
      approvals: [],
      cost: {
        estimatedUsd,
        approvedUsd: 0,
        recordedUsd: 0,
        pricingEffectiveDate: VEO_PRICING_EFFECTIVE_DATE,
      },
      createdAt: now,
      updatedAt: now,
    };

    await productionRunService.createRun(run);
    await productionRunService.approveShots(
      run.id,
      run.shots.map((shot) => shot.id),
      estimatedUsd,
    );
    return Promise.all(
      run.shots.map(async (shot) => {
        const take = await productionRunService.createApprovedTake(run.id, shot.id);
        return { runId: run.id, shotId: shot.id, takeId: take.id };
      }),
    );
  }

  async startGenerationRequest(
    request: VeoGenerationRequest,
    context: ProductionGenerationContext,
    executionInputs: VeoExecutionInputs = {},
    onToast?: (msg: string, type: 'info' | 'error') => void,
  ): Promise<string | null> {
    this.initialize();
    const issues = veoGenerationService.validateRequest(request);
    if (issues.length > 0) {
      const message = issues.map((issue) => issue.message).join(' ');
      onToast?.(message, 'error');
      throw new Error(message);
    }

    const apiKey = await getStoredApiKeyAsync();
    if (!apiKey) {
      onToast?.('API Key missing. Please set your API key in Settings.', 'error');
      return null;
    }

    const task: GenerationTask = {
      id: crypto.randomUUID(),
      status: 'Queued',
      videoUrl: null,
      prompt: request.prompt,
      settings: {
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
        veoModel:
          request.modelId === 'veo-3.1-quality'
            ? 'quality'
            : request.modelId === 'veo-3.1-lite'
              ? 'lite'
              : 'fast',
        durationSeconds: request.durationSeconds,
      },
      request,
      executionInputs,
      productionRunId: context.runId,
      productionShotId: context.shotId,
      productionTakeId: context.takeId,
      timestamp: Date.now(),
    };

    useVideoStore.getState().addTask(task);
    await productionRunService.updateTake(context.runId, context.shotId, context.takeId, {
      taskId: task.id,
      status: 'queued',
    });
    generationQueueService.enqueue({
      type: 'video',
      label: `Director Shot ${context.shotId}: ${request.prompt.substring(0, 40)}...`,
      payload: task,
      priority: 0,
      costEstimate: costTrackingService.estimateVideoGenerationCost(
        request.modelId,
        request.durationSeconds,
        request.resolution,
      ),
    });
    onToast?.(`Queued Director Shot ${context.shotId}.`, 'info');
    return task.id;
  }

  async addToQueue(
    prompts: string[],
    settings: VideoGenerationSettings,
    image?: { data: string; mimeType: string },
    onToast?: (msg: string, type: 'info' | 'error') => void,
    productionContexts?: ProductionGenerationContext[],
  ): Promise<string | null> {
    this.initialize();

    this.requestNotificationPermission();

    const apiKey = await getStoredApiKeyAsync();
    if (!apiKey) {
      onToast?.('API Key missing. Please set your API key in Settings.', 'error');
      return null;
    }

    const batchGroupId = settings.takeGroupId || `take_group_${Date.now()}`;
    const store = useVideoStore.getState();

    // Compute cost estimate for each video
    const modelId =
      settings.veoModel === 'quality'
        ? 'veo-3.1-quality'
        : settings.veoModel === 'lite'
          ? 'veo-3.1-lite'
          : 'veo-3.1-fast';
    const costEstimate = costTrackingService.estimateVideoGenerationCost(
      modelId,
      settings.durationSeconds,
      settings.resolution,
    );

    const newTasks: GenerationTask[] = prompts.map((p, index) => {
      const context = productionContexts?.[index];
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        status: 'Queued',
        videoUrl: null,
        prompt: p,
        settings: { ...settings, takeGroupId: batchGroupId, takeIndex: index + 1 },
        inputImage: image,
        productionRunId: context?.runId,
        productionShotId: context?.shotId,
        productionTakeId: context?.takeId,
        timestamp: Date.now(),
      };
    });

    // Optimistically add to video store
    newTasks.forEach((task) => store.addTask(task));
    await Promise.all(
      newTasks.map(async (task, index) => {
        const context = productionContexts?.[index];
        if (!context) return;
        await productionRunService.updateTake(context.runId, context.shotId, context.takeId, {
          taskId: task.id,
          status: 'queued',
        });
      }),
    );

    // Enqueue via generation queue (handles offline, retry, etc.)
    newTasks.forEach((task) => {
      generationQueueService.enqueue({
        type: 'video',
        label: `Video: ${task.prompt.substring(0, 40)}...`,
        payload: task,
        priority: 0,
        costEstimate,
      });
    });

    onToast?.(`Queued ${prompts.length} videos for background rendering.`, 'info');

    return newTasks[0].id;
  }

  /**
   * Execute a video generation via the Service Worker (thin executor).
   * Called by the GenerationQueueService executor.
   */
  private executeViaServiceWorker(
    task: GenerationTask & { apiKey?: string },
    onProgress: (progress: number) => void,
    signal: AbortSignal,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker.controller) {
        reject(new Error('Service Worker not ready'));
        return;
      }

      const taskId = task.id;

      // Listen for updates from the SW for this specific task
      const handler = (event: MessageEvent) => {
        const { type, payload } = event.data;
        if (type === 'JOB_UPDATE' && payload.id === taskId) {
          if (payload.status === 'Polling') {
            onProgress(50);
          } else if (payload.status === 'Complete') {
            navigator.serviceWorker.removeEventListener('message', handler);
            resolve();
          } else if (payload.status === 'Error') {
            navigator.serviceWorker.removeEventListener('message', handler);
            reject(new Error(payload.error || 'Video generation failed'));
          } else if (payload.status === 'RecoveryRequired') {
            navigator.serviceWorker.removeEventListener('message', handler);
            reject(new Error(payload.error || 'Generation submission requires manual recovery'));
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handler);

      // Abort support
      signal.addEventListener('abort', () => {
        navigator.serviceWorker.removeEventListener('message', handler);
        navigator.serviceWorker.controller?.postMessage({
          type: 'CANCEL_JOB',
          payload: { id: taskId },
        });
        reject(new DOMException('Cancelled', 'AbortError'));
      });

      // Send to SW as a direct execution command
      void (async () => {
        const apiKey = await getStoredApiKeyAsync();
        if (!apiKey) {
          navigator.serviceWorker.removeEventListener('message', handler);
          reject(new Error('API Key missing. Please set your API key in Settings.'));
          return;
        }

        navigator.serviceWorker.controller?.postMessage({
          type: 'START_JOB',
          payload: task,
          apiKey,
        });

        onProgress(10);
      })().catch((error: unknown) => {
        navigator.serviceWorker.removeEventListener('message', handler);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  private requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

export const videoGenerationService = new VideoGenerationService();
