import { useCallback, useMemo } from 'react';
import { ToastMessage } from '@core/types';
import { ROUTES } from '@core/config/routes';
import { useVideoStore } from '@core/store/useVideoStore';
import { videoGenerationService } from '@core/services/videoGenerationService';

export const useVideoGeneration = (
  addToast: (message: string, type: ToastMessage['type']) => void,
) => {
  const tasks = useVideoStore((state) => state.tasks);

  const addToQueue = useCallback(
    async (
      _prompts: string[],
      _settings: Record<string, unknown>,
      _image?: { data: string; mimeType: string },
    ) => {
      addToast(
        'Legacy quick generation cannot approve a paid call automatically. Open Create to review and approve the maximum charge.',
        'info',
      );
      if (typeof window !== 'undefined' && window.location) {
        window.location.hash = `#${ROUTES.CREATE}`;
      }
      return null;
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
      const id = await videoGenerationService.startGeneration(
        prompt,
        settings,
        image,
        (message, type) => addToast(message, type),
      );
      return id ?? '';
    },
    [addToast],
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
