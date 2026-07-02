import type { PromptState } from '@core/types';
import {
  buildFlowVeoScenePack,
  buildVeoApiPrompt,
} from '@core/services/flowVeo/flowVeoPromptBuilder';
import { exportFlowVeoScenePack } from '@core/services/flowVeo/flowScenePackExport';
import { VideoModelAdapter } from './VideoModelAdapter';

export class FlowVeoAdapter implements VideoModelAdapter {
  validateConstraints(state: PromptState): string[] {
    const warnings: string[] = [];

    if (!['16:9', '9:16', '1:1'].includes(state.aspectRatio)) {
      warnings.push('Flow/Veo workflows are best prepared in 16:9, 9:16, or 1:1.');
    }

    if (state.targetModel === 'veo-api' && !state.resolution) {
      warnings.push('Veo API prompts should include a resolution.');
    }

    return warnings;
  }

  getEnhancements(key: keyof PromptState, value: string): string {
    if (!value) {
      return '';
    }

    if (key === 'cameraMovement') {
      return ' (Flow-ready motion path with stable subject continuity)';
    }

    if (key === 'artStyle') {
      return ' (documented in the style bible for cross-shot consistency)';
    }

    return '';
  }

  buildPrompt(state: PromptState): string {
    if (state.targetModel === 'veo-api' || state.flowVeoOutputMode === 'veo-api-prompt') {
      return buildVeoApiPrompt(state);
    }

    const scenePack = buildFlowVeoScenePack(state);

    if (state.flowVeoOutputMode === 'single-prompt') {
      return scenePack.oneShotPrompt;
    }

    if (state.flowVeoOutputMode === 'flow-shot-card') {
      return scenePack.shotCards[0]?.prompt ?? scenePack.oneShotPrompt;
    }

    return exportFlowVeoScenePack(scenePack, { format: 'markdown' });
  }
}
