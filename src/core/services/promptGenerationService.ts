import { generateVeoPrompt as generateGeminiPrompt } from '@core/services/gemini/geminiPromptService';
import { generateVeoPromptWithOllama } from '@core/services/ollamaProvider';
import {
  useSettingsStore,
  type AppSettings,
  type PromptGenerationProvider,
} from '@core/store/useSettingsStore';
import type { PromptState, VeoPromptResponse } from '@core/types';

interface PromptGenerationSettings {
  promptGenerationProvider?: PromptGenerationProvider;
  localLlmEnabled: AppSettings['localLlmEnabled'];
  localLlmEndpoint: AppSettings['localLlmEndpoint'];
  localLlmModel: AppSettings['localLlmModel'];
}

function getPromptGenerationSettings(): PromptGenerationSettings {
  const state = useSettingsStore.getState();

  return {
    promptGenerationProvider: state.promptGenerationProvider,
    localLlmEnabled: state.localLlmEnabled,
    localLlmEndpoint: state.localLlmEndpoint,
    localLlmModel: state.localLlmModel,
  };
}

export function resolvePromptGenerationProvider(
  settings: PromptGenerationSettings = getPromptGenerationSettings(),
): PromptGenerationProvider {
  if (settings.promptGenerationProvider) {
    return settings.promptGenerationProvider;
  }

  return settings.localLlmEnabled ? 'ollama' : 'gemini';
}

export async function generatePromptWithCurrentProvider(
  state: PromptState,
  settings: PromptGenerationSettings = getPromptGenerationSettings(),
): Promise<VeoPromptResponse> {
  if (resolvePromptGenerationProvider(settings) === 'ollama') {
    return generateVeoPromptWithOllama(state, {
      baseUrl: settings.localLlmEndpoint,
      model: settings.localLlmModel,
    });
  }

  return generateGeminiPrompt(state);
}
