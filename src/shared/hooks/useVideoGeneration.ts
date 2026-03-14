import { useCallback, useMemo } from 'react';
import { ToastMessage } from '@core/types';
import { useVideoStore } from '@core/store/useVideoStore';
import { videoGenerationService } from '@core/services/videoGenerationService';

export const useVideoGeneration = (
  addToast: (message: string, type: ToastMessage['type']) => void,
) => {
  const tasks = useVideoStore((state) => state.tasks);

  const addToQueue = useCallback(
    async (
      prompts: string[],
      settings: Record<string, unknown>,
      image?: { data: string; mimeType: string },
    ) => {
      return videoGenerationService.addToQueue(
        prompts,
        settings as unknown as Parameters<typeof videoGenerationService.addToQueue>[1],
        image,
        addToast,
      );
    },
    [addToast],
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
      const id = await videoGenerationService.startGeneration(
        prompt,
        settings,
        image,
        (message, type) => addToast(message, type),
      );
      return id || (await addToQueue(prompts, settings, image)) || '';
    },
    [addToQueue, addToast],
  );

  const isAnyGenerating = useMemo(
    () => tasks.some((t) => ['Processing', 'Polling', 'Queued', 'Pending'].includes(t.status)),
    [tasks],
  );

  return {
    tasks,
    startGeneration,
    addToQueue,
    isAnyGenerating,
  };
};
