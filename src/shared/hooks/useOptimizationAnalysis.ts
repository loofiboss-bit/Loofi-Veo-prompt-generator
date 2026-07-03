import { useEffect } from 'react';
import type { Asset, PromptState, Shot } from '@core/types';
import { optimizationOrchestratorService } from '@core/services/optimizationOrchestratorService';

interface UseOptimizationAnalysisInput {
  projectId: string;
  promptId: string;
  promptState: PromptState;
  shots: Shot[];
  assets: Asset[];
  generatedPrompt?: string;
  enabled?: boolean;
}

const asText = (value: unknown): string => (typeof value === 'string' ? value : '');

const getAnalysisFingerprint = (
  promptState: PromptState,
  shots: Shot[],
  assets: Asset[],
  generatedPrompt?: string,
): string =>
  JSON.stringify({
    generatedPrompt,
    prompt: {
      idea: asText(promptState.idea),
      environment: asText(promptState.environment),
      characterActions: asText(promptState.characterActions),
      cameraMovement: asText(promptState.cameraMovement),
      lightingStyle: asText(promptState.lightingStyle),
      artStyle: asText(promptState.artStyle),
      customArtStyle: asText(promptState.customArtStyle),
      targetModel: promptState.targetModel,
      flowVeoOutputMode: promptState.flowVeoOutputMode,
    },
    shots: shots.map((shot) => ({
      id: shot.id,
      action: asText(shot.action),
      camera: asText(shot.camera),
      duration: shot.duration,
      transition: shot.transition?.type,
    })),
    assets: assets.map((asset) => ({
      id: asset.id,
      type: asset.type,
      name: asset.name,
      hasData: Boolean(asset.data || asset.url),
    })),
  });

export function useOptimizationAnalysis({
  projectId,
  promptId,
  promptState,
  shots,
  assets,
  generatedPrompt,
  enabled = true,
}: UseOptimizationAnalysisInput): void {
  const fingerprint = getAnalysisFingerprint(promptState, shots, assets, generatedPrompt);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const hasPromptContent =
      asText(promptState.idea).trim() ||
      asText(promptState.environment).trim() ||
      asText(promptState.characterActions).trim() ||
      generatedPrompt?.trim();

    if (!hasPromptContent && shots.every((shot) => !asText(shot.action).trim())) {
      return;
    }

    optimizationOrchestratorService.analyzeProjectDebounced({
      projectId,
      promptId,
      promptState,
      shots,
      assets,
      generatedPrompt,
    });
  }, [assets, enabled, fingerprint, generatedPrompt, projectId, promptId, promptState, shots]);
}
