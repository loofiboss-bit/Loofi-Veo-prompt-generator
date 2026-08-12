import type { GenerationTask, VeoExecutionInputs, VeoGenerationRequest } from '@core/types';
import { generateProxy } from '@core/services/videoEditorService';
import { getStoredApiKeyAsync, hasApiKeyAsync } from '@core/services/apiKeyService';
import { useVideoStore } from '@core/store/useVideoStore';
import { logger } from '@core/services/loggerService';
import { generationQueueService } from '@core/services/generationQueueService';
import { costTrackingService } from '@core/services/costTrackingService';
import { appendApiKeyToMediaUrl } from '@core/utils/mediaUrlAuth';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { productionRunService } from '@core/services/productionRunService';
import { veoGenerationService } from '@core/services/veoGenerationService';
import { useAppStore } from '@core/store/useAppStore';

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
        const task = item.payload as GenerationTask;
        if (!window.electron?.submitPaidJob || !window.electron.onPaidJobUpdate) {
          throw new Error(
            'Paid video execution requires the desktop approval boundary. Browser execution is disabled.',
          );
        }
        return this.executeViaElectron(task, onProgress, signal);
      },
    });
  }

  private executeViaElectron(
    task: GenerationTask,
    onProgress: (progress: number) => void,
    signal: AbortSignal,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const bridge = window.electron;
      if (!bridge?.submitPaidJob || !bridge.onPaidJobUpdate) {
        reject(new Error('Desktop paid-job bridge is unavailable.'));
        return;
      }
      const unsubscribe = bridge.onPaidJobUpdate((updatedTask) => {
        if (updatedTask.id !== task.id) return;
        void this.handleMessage(
          new MessageEvent('message', { data: { type: 'JOB_UPDATE', payload: updatedTask } }),
        );
        if (updatedTask.status === 'Polling') onProgress(50);
        if (updatedTask.status === 'Complete') {
          unsubscribe();
          resolve();
        } else if (updatedTask.status === 'Error' || updatedTask.status === 'RecoveryRequired') {
          unsubscribe();
          reject(new Error(updatedTask.error || 'Desktop video generation failed.'));
        }
      });
      signal.addEventListener(
        'abort',
        () => {
          unsubscribe();
          void bridge.cancelPaidJob?.(task.id);
          reject(new DOMException('Cancelled', 'AbortError'));
        },
        { once: true },
      );
      bridge
        .submitPaidJob(task)
        .then(() => onProgress(10))
        .catch((error: unknown) => {
          unsubscribe();
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  private async handleMessage(event: MessageEvent) {
    const { type, payload } = event.data;
    const store = useVideoStore.getState();
    const apiKey = window.electron?.cacheDesktopMedia ? null : await getStoredApiKeyAsync();

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
      const desktopRecord = window.electron?.cacheDesktopMedia
        ? await window.electron.cacheDesktopMedia({ key: mediaKey, url: task.videoUrl })
        : null;
      const record = desktopRecord
        ? null
        : await mediaAssetService.cacheRemoteMedia({
            key: mediaKey,
            url: task.videoUrl,
            apiKey,
            providerExpiresAt: task.providerExpiresAt,
          });
      const localMediaUrl =
        desktopRecord?.localUrl ?? (await mediaAssetService.getObjectUrl(mediaKey));
      await productionRunService.updateTake(
        task.productionRunId,
        task.productionShotId,
        task.productionTakeId,
        {
          ...updates,
          status: 'complete',
          localMediaKey: desktopRecord ? `desktop:${desktopRecord.path}` : mediaKey,
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
          mimeType: desktopRecord?.mimeType ?? record?.mimeType ?? 'video/mp4',
          storageKey: desktopRecord ? `desktop:${desktopRecord.path}` : mediaKey,
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
    const configured = await hasApiKeyAsync();
    if (!configured) {
      onToast?.('API Key missing. Please set your API key in Settings.', 'error');
      return null;
    }
    const contexts = await this.createCompatibilityRun(prompts, settings, image);

    return this.addToQueue(prompts, settings, image, onToast, contexts);
  }

  private async createCompatibilityRun(
    _prompts: string[],
    _settings: VideoGenerationSettings,
    _image?: { data: string; mimeType: string },
  ): Promise<ProductionGenerationContext[]> {
    throw new Error(
      'Legacy quick generation cannot approve a paid call automatically. Open Create to review and approve the maximum charge.',
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

    const referenceInputs = executionInputs.referenceImages ?? [];
    if (referenceInputs.length !== request.referenceAssetIds.length) {
      const message =
        'Paid generation is blocked because the selected continuity references could not be loaded.';
      onToast?.(message, 'error');
      throw new Error(message);
    }
    if (request.firstFrameAssetId && !executionInputs.firstFrame) {
      throw new Error('Paid generation is blocked because the first frame could not be loaded.');
    }
    if (request.lastFrameAssetId && !executionInputs.lastFrame) {
      throw new Error('Paid generation is blocked because the last frame could not be loaded.');
    }

    const configured = await hasApiKeyAsync();
    if (!configured) {
      const message = 'API Key missing. Please set your API key in Settings.';
      onToast?.(message, 'error');
      throw new Error(message);
    }

    const run = await productionRunService.getRun(context.runId);
    const take = run?.shots
      .find((shot) => shot.id === context.shotId)
      ?.takes.find((candidate) => candidate.id === context.takeId);
    if (!take?.costApproval) {
      throw new Error('No auditable cost approval is attached to this generation request.');
    }
    if (
      !Number.isFinite(take.costApproval.maximumChargeUsd) ||
      take.costApproval.maximumChargeUsd <= 0
    ) {
      throw new Error('Paid generation is blocked because the approved price is unavailable.');
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
      costApproval: take.costApproval,
      productionRunId: context.runId,
      productionShotId: context.shotId,
      productionTakeId: context.takeId,
      continuitySnapshotHash: take.continuitySnapshot?.snapshotHash,
      continuityAssetHashes: take.continuitySnapshot?.referenceAssetHashes,
      continuityProfileVersions: take.continuitySnapshot?.profileVersions,
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

    const configured = await hasApiKeyAsync();
    if (!configured) {
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

  private requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

export const videoGenerationService = new VideoGenerationService();
