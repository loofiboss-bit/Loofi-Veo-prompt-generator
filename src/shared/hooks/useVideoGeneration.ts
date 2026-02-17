import { useState, useCallback, useEffect, useRef } from 'react';
import { GenerationTask, ToastMessage } from '@core/types';
import { generateProxy } from '@core/services/videoEditorService';
import { getStoredApiKey } from '@core/services/apiKeyService';
import { logger } from '@core/services/loggerService';

export const useVideoGeneration = (
  _uiStrings: Record<string, unknown>,
  addToast: (message: string, type: ToastMessage['type']) => void,
) => {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const isMounted = useRef(true);

  // Initialize Service Worker Communication
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // We rely on the main sw.js registered in index.html.
      // Wait for it to be ready.
      navigator.serviceWorker.ready.then((registration) => {
        if (!isMounted.current) return;
        logger.info('Video Generator connected to SW');

        // Request initial state from the active worker
        if (registration.active) {
          registration.active.postMessage({ type: 'SYNC_STATE' });
        }
      });

      // Listen for updates from the SW
      const handleMessage = async (event: MessageEvent) => {
        if (!isMounted.current) return;
        const { type, payload } = event.data;

        if (type === 'JOB_UPDATE') {
          const updatedTask = payload as GenerationTask;

          // --- Proxy Generation Trigger ---
          if (updatedTask.status === 'Complete' && updatedTask.videoUrl && !updatedTask.proxyUrl) {
            try {
              const proxyUrl = await generateProxy(updatedTask.videoUrl);
              updatedTask.proxyUrl = proxyUrl;
              // Note: We are updating local state here.
              // In a real app, we might want to sync this back to IDB via SW
              // or save it to local storage for persistence.
              // For now, it lives in memory for the session.
            } catch (_e) {
              logger.warn('Auto-proxy failed for task', updatedTask.id);
            }
          }

          setTasks((prev) => {
            const exists = prev.find((t) => t.id === updatedTask.id);
            if (exists) {
              return prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
            }
            return [updatedTask, ...prev];
          });
        } else if (type === 'SYNC_STATE') {
          // Bulk replace
          // Sort by newest first based on ID (assuming timestamp based ID)
          const sorted = (payload as GenerationTask[]).sort((a, b) => b.id.localeCompare(a.id));
          setTasks(sorted);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        isMounted.current = false;
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const addToQueue = useCallback(
    (
      prompts: string[],
      settings: Record<string, unknown>,
      image?: { data: string; mimeType: string },
    ) => {
      requestNotificationPermission();

      const apiKey = getStoredApiKey() || process.env.API_KEY;

      if (!apiKey) {
        addToast('API Key missing. Please set your API key in Settings.', 'error');
        return null;
      }

      if (!navigator.serviceWorker.controller) {
        addToast('Background Service starting... please retry in a moment.', 'info');
        // Try to trigger a sync/claim if stuck
        navigator.serviceWorker.ready.then((reg) => {
          if (reg.active) reg.active.postMessage({ type: 'SYNC_STATE' });
        });
        return null;
      }

      // Generate a group ID if not provided, for this batch
      const batchGroupId = settings.takeGroupId || `take_group_${Date.now()}`;

      const newTasks: GenerationTask[] = prompts.map((p, index) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        status: 'Queued',
        videoUrl: null,
        prompt: p,
        settings: { ...settings, takeGroupId: batchGroupId, takeIndex: index + 1 },
        inputImage: image,
        timestamp: Date.now(),
      }));

      // Optimistically add to UI
      setTasks((prev) => [...newTasks, ...prev]);
      addToast(`Queued ${prompts.length} videos for background rendering.`, 'info');

      // Send to SW Controller
      newTasks.forEach((task) => {
        navigator.serviceWorker.controller?.postMessage({
          type: 'ADD_JOB',
          payload: task,
          apiKey: apiKey,
        });
      });

      return newTasks[0].id;
    },
    [addToast, requestNotificationPermission],
  );

  const startGeneration = useCallback(
    async (
      prompt: string,
      settings: {
        aspectRatio: string;
        resolution: '1080p' | '720p';
        veoModel: 'fast' | 'quality';
        count?: number;
        takeGroupId?: string;
      },
      image?: { data: string; mimeType: string },
    ) => {
      const count = settings.count || 1;
      const prompts = Array(count).fill(prompt);

      // If we are regenerating a specific take group, pass it. Otherwise generate new.
      // The addToQueue logic handles fallback generation if undefined.
      const id = addToQueue(prompts, settings, image);
      return id || '';
    },
    [addToQueue],
  );

  const isAnyGenerating = tasks.some((t) => ['Processing', 'Polling', 'Queued'].includes(t.status));

  return {
    tasks,
    startGeneration,
    addToQueue,
    isAnyGenerating,
  };
};
