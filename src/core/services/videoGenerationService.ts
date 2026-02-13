import { GenerationTask } from '@core/types';
import { generateProxy } from '@core/services/videoEditorService';
import { getStoredApiKey } from '@core/services/apiKeyService';
import { useVideoStore } from '@core/store/useVideoStore';

class VideoGenerationService {
  private isMounted = false;

  initialize() {
    if (this.isMounted) return;
    this.isMounted = true;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[VideoGenerationService] Connected to SW');
        if (registration.active) {
          registration.active.postMessage({ type: 'SYNC_STATE' });
        }
      });

      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
    }
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
        } catch (e) {
          console.warn('[VideoGenerationService] Auto-proxy failed for task', updatedTask.id);
        }
      }

      store.updateTask(updatedTask);
    } else if (type === 'SYNC_STATE') {
      const sorted = (payload as GenerationTask[]).sort((a, b) => b.id.localeCompare(a.id));
      store.setTasks(sorted);
    }
  }

  async startGeneration(
    prompt: string,
    settings: {
      aspectRatio: string;
      resolution: '1080p' | '720p';
      veoModel: 'fast' | 'quality';
      count?: number;
      takeGroupId?: string;
    },
    image?: { data: string; mimeType: string },
    onToast?: (msg: string, type: 'info' | 'error') => void,
  ): Promise<string | null> {
    const count = settings.count || 1;
    const prompts = Array(count).fill(prompt);

    return this.addToQueue(prompts, settings, image, onToast);
  }

  addToQueue(
    prompts: string[],
    settings: any,
    image?: { data: string; mimeType: string },
    onToast?: (msg: string, type: 'info' | 'error') => void,
  ): string | null {
    this.requestNotificationPermission();

    const apiKey = getStoredApiKey() || process.env.API_KEY;
    if (!apiKey) {
      onToast?.('API Key missing. Please set your API key in Settings.', 'error');
      return null;
    }

    if (!navigator.serviceWorker.controller) {
      onToast?.('Background Service starting... please retry in a moment.', 'info');
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.active) reg.active.postMessage({ type: 'SYNC_STATE' });
      });
      return null;
    }

    const batchGroupId = settings.takeGroupId || `take_group_${Date.now()}`;
    const store = useVideoStore.getState();

    const newTasks: GenerationTask[] = prompts.map((p, index) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      status: 'Queued',
      videoUrl: null,
      prompt: p,
      settings: { ...settings, takeGroupId: batchGroupId, takeIndex: index + 1 },
      inputImage: image,
      timestamp: Date.now(),
    }));

    // Optimistically add to Store
    newTasks.forEach((task) => store.addTask(task));

    onToast?.(`Queued ${prompts.length} videos for background rendering.`, 'info');

    // Send to SW
    newTasks.forEach((task) => {
      navigator.serviceWorker.controller?.postMessage({
        type: 'ADD_JOB',
        payload: task,
        apiKey: apiKey,
      });
    });

    return newTasks[0].id;
  }

  private requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

export const videoGenerationService = new VideoGenerationService();
