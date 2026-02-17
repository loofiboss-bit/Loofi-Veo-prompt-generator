import { GenerationTask } from '@core/types';
import { generateProxy } from '@core/services/videoEditorService';
import { getStoredApiKey } from '@core/services/apiKeyService';
import { useVideoStore } from '@core/store/useVideoStore';
import { logger } from '@core/services/loggerService';
import { generationQueueService } from '@core/services/generationQueueService';
import { costTrackingService } from '@core/services/costTrackingService';

export interface VideoGenerationSettings {
  aspectRatio: string;
  resolution: '1080p' | '720p';
  veoModel: 'fast' | 'quality';
  count?: number;
  takeGroupId?: string;
  takeIndex?: number;
}

class VideoGenerationService {
  private isMounted = false;

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

    if (type === 'JOB_UPDATE') {
      const updatedTask = payload as GenerationTask;

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
    } else if (type === 'SYNC_STATE') {
      const sorted = (payload as GenerationTask[]).sort((a, b) => b.id.localeCompare(a.id));
      store.setTasks(sorted);
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
    const count = settings.count || 1;
    const prompts = Array(count).fill(prompt);

    return this.addToQueue(prompts, settings, image, onToast);
  }

  addToQueue(
    prompts: string[],
    settings: VideoGenerationSettings,
    image?: { data: string; mimeType: string },
    onToast?: (msg: string, type: 'info' | 'error') => void,
  ): string | null {
    this.requestNotificationPermission();

    const apiKey = getStoredApiKey() || process.env.API_KEY;
    if (!apiKey) {
      onToast?.('API Key missing. Please set your API key in Settings.', 'error');
      return null;
    }

    const batchGroupId = settings.takeGroupId || `take_group_${Date.now()}`;
    const store = useVideoStore.getState();

    // Compute cost estimate for each video
    const modelId =
      settings.veoModel === 'quality'
        ? 'veo-3.1-generate-preview'
        : 'veo-3.1-fast-generate-preview';
    const costEstimate = costTrackingService.estimateVideoGenerationCost(modelId);

    const newTasks: GenerationTask[] = prompts.map((p, index) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      status: 'Queued',
      videoUrl: null,
      prompt: p,
      settings: { ...settings, takeGroupId: batchGroupId, takeIndex: index + 1 },
      inputImage: image,
      timestamp: Date.now(),
    }));

    // Optimistically add to video store
    newTasks.forEach((task) => store.addTask(task));

    // Enqueue via generation queue (handles offline, retry, etc.)
    newTasks.forEach((task) => {
      generationQueueService.enqueue({
        type: 'video',
        label: `Video: ${task.prompt.substring(0, 40)}...`,
        payload: { ...task, apiKey },
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
      navigator.serviceWorker.controller.postMessage({
        type: 'START_JOB',
        payload: task,
        apiKey: task.apiKey,
      });

      onProgress(10);
    });
  }

  private requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

export const videoGenerationService = new VideoGenerationService();
