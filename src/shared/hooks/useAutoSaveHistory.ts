import { useEffect } from 'react';
import type { PromptState, VeoPromptResponse } from '@core/types';
import { useHistoryStore } from '@core/store/useHistoryStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { logger } from '@core/services/loggerService';

/**
 * Auto-saves generated prompts to history with a 500ms debounce.
 * Extracted from App.tsx to reduce top-level component complexity.
 */
export function useAutoSaveHistory(
  generatedPrompt: VeoPromptResponse | null,
  promptState: PromptState,
): void {
  const historyStore = useHistoryStore();
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  useEffect(() => {
    if (!generatedPrompt?.prompt) return;

    const timeout = setTimeout(() => {
      const autoSaveToHistory = async () => {
        try {
          await historyStore.addEntry({
            projectId: currentProjectId || 'default',
            prompt: generatedPrompt.prompt,
            params: promptState,
            metadata: {
              style: promptState.artStyle,
              camera: promptState.cameraMovement,
              scene: promptState.environment,
              character: promptState.characterAge,
              audio: promptState.voiceStyle,
              aspectRatio: promptState.aspectRatio,
              model: promptState.model,
            },
            tags: [],
            favorite: false,
          });
        } catch (error) {
          logger.error('Failed to auto-save to history:', error);
        }
      };

      autoSaveToHistory();
    }, 500);

    return () => clearTimeout(timeout);
  }, [generatedPrompt, promptState, historyStore, currentProjectId]);
}
