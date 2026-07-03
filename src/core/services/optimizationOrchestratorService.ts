import type {
  Asset,
  AssetTag,
  OptimizationAnalysisInput,
  OptimizationAnalysisResult,
  OptimizationPatch,
  PromptState,
  PromptSuggestion,
  Shot,
} from '@core/types';
import { assetIntelligenceService } from '@core/services/assetIntelligenceService';
import { costEstimationService } from '@core/services/costEstimationService';
import { logger } from '@core/services/loggerService';
import { narrativeAnalysisService } from '@core/services/narrativeAnalysisService';
import { presetMatchingService } from '@core/services/presetMatchingService';
import { promptRefinementService } from '@core/services/promptRefinementService';
import { useOptimizationStore } from '@core/store/useOptimizationStore';

interface ApplySuggestionInput {
  promptState: PromptState;
  shots?: Shot[];
  suggestion: PromptSuggestion;
}

interface ApplySuggestionResult {
  promptStatePatch: Partial<PromptState>;
  shots?: Shot[];
}

const PROMPT_TEXT_FIELDS: Array<keyof PromptState> = [
  'idea',
  'environment',
  'characterActions',
  'cameraMovement',
  'lightingStyle',
  'artStyle',
  'negativePrompt',
];

const appendValue = (current: string, next: string): string => {
  const trimmedCurrent = current.trim();
  const trimmedNext = next.trim();
  if (!trimmedCurrent) {
    return trimmedNext;
  }
  if (!trimmedNext || trimmedCurrent.toLowerCase().includes(trimmedNext.toLowerCase())) {
    return trimmedCurrent;
  }
  return `${trimmedCurrent}. ${trimmedNext}`;
};

const getPromptText = (input: OptimizationAnalysisInput): string =>
  [
    input.generatedPrompt,
    input.promptState.idea,
    input.promptState.environment,
    input.promptState.characterActions,
    input.promptState.cameraMovement,
    input.promptState.lightingStyle,
    input.promptState.artStyle === 'Custom'
      ? input.promptState.customArtStyle
      : input.promptState.artStyle,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n');

const getPatchFieldForCategory = (category: PromptSuggestion['category']): keyof PromptState => {
  switch (category) {
    case 'camera':
      return 'cameraMovement';
    case 'lighting':
      return 'lightingStyle';
    case 'style':
      return 'customArtStyle';
    case 'syntax':
    case 'specificity':
    default:
      return 'idea';
  }
};

const attachSuggestionPatches = (suggestions: PromptSuggestion[]): PromptSuggestion[] =>
  suggestions.map((suggestion) => ({
    ...suggestion,
    patch:
      suggestion.patch ??
      ({
        target: 'prompt',
        field: getPatchFieldForCategory(suggestion.category),
        value: suggestion.suggested,
        append: true,
      } satisfies OptimizationPatch),
  }));

const getSceneData = (shots: Shot[] = []) =>
  shots
    .filter((shot) => shot.action.trim() || shot.camera.trim())
    .map((shot, index) => ({
      id: String(shot.id),
      promptText: [shot.action, shot.camera].filter(Boolean).join(' '),
      orderIndex: index,
    }));

const assetToDataUrl = (asset: Asset): string | null => {
  if (asset.type !== 'image') {
    return null;
  }
  if (asset.data.startsWith('data:')) {
    return asset.data;
  }
  if (asset.data) {
    return `data:${asset.mimeType};base64,${asset.data}`;
  }
  return asset.url || null;
};

class OptimizationOrchestratorService {
  private static instance: OptimizationOrchestratorService;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  static getInstance(): OptimizationOrchestratorService {
    if (!OptimizationOrchestratorService.instance) {
      OptimizationOrchestratorService.instance = new OptimizationOrchestratorService();
    }
    return OptimizationOrchestratorService.instance;
  }

  analyzeProjectDebounced(input: OptimizationAnalysisInput, delayMs = 700): void {
    const timerKey = input.projectId;
    const existingTimer = this.timers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    useOptimizationStore.getState().markAnalysisStale(input.projectId);

    const nextTimer = setTimeout(() => {
      this.timers.delete(timerKey);
      void this.analyzeProject(input);
    }, delayMs);
    this.timers.set(timerKey, nextTimer);
  }

  async analyzePromptState(input: OptimizationAnalysisInput): Promise<OptimizationAnalysisResult> {
    return this.analyzeProject(input);
  }

  async analyzeProject(input: OptimizationAnalysisInput): Promise<OptimizationAnalysisResult> {
    const startedAt = Date.now();
    const promptText = getPromptText(input);

    const analyzingResult: OptimizationAnalysisResult = {
      projectId: input.projectId,
      promptId: input.promptId,
      status: 'analyzing',
      suggestions: [],
      assetTags: {},
      costEstimate: null,
      narrativeIssues: [],
      presetRecommendation: null,
      source: 'heuristic',
      startedAt,
      completedAt: null,
    };
    useOptimizationStore.getState().setAnalysisResult(analyzingResult);

    try {
      const [suggestions, assetTags] = await Promise.all([
        promptRefinementService.analyzePrompt(promptText || input.promptState.idea, input.promptId),
        this.analyzeAssets(input.assets ?? []),
      ]);

      const patchedSuggestions = attachSuggestionPatches(suggestions);
      const costEstimate = costEstimationService.estimateForPrompt(
        promptText || input.promptState.idea,
        input.promptId,
        input.promptState.targetModel,
      );
      const presetRecommendation = presetMatchingService.recommendPreset(
        promptText || input.promptState.idea,
        input.promptId,
      );
      const narrativeIssues = narrativeAnalysisService.analyzeSequence(getSceneData(input.shots));
      const hasAiSource =
        patchedSuggestions.some((suggestion) => suggestion.source === 'ai') ||
        Object.values(assetTags).some((tags) => tags.some((tag) => tag.source === 'ai'));

      const result: OptimizationAnalysisResult = {
        projectId: input.projectId,
        promptId: input.promptId,
        status: 'ready',
        suggestions: patchedSuggestions,
        assetTags,
        costEstimate,
        narrativeIssues,
        presetRecommendation,
        source: hasAiSource ? 'mixed' : 'heuristic',
        startedAt,
        completedAt: Date.now(),
      };

      useOptimizationStore.getState().setAnalysisResult(result);
      return result;
    } catch (error) {
      logger.error('OptimizationOrchestrator', 'Project analysis failed', error);
      const result: OptimizationAnalysisResult = {
        ...analyzingResult,
        status: 'error',
        completedAt: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown optimization analysis error',
      };
      useOptimizationStore.getState().setAnalysisResult(result);
      return result;
    }
  }

  applySuggestionPatch({
    promptState,
    shots = [],
    suggestion,
  }: ApplySuggestionInput): ApplySuggestionResult {
    const patch = suggestion.patch;
    if (!patch) {
      return { promptStatePatch: {} };
    }

    if (patch.target === 'shot') {
      return {
        promptStatePatch: {},
        shots: shots.map((shot) => {
          if (shot.id !== patch.shotId) {
            return shot;
          }
          const current = String(shot[patch.field] ?? '');
          const nextValue =
            patch.append && typeof patch.value === 'string'
              ? appendValue(current, patch.value)
              : patch.value;
          return { ...shot, [patch.field]: nextValue };
        }),
      };
    }

    const currentValue = promptState[patch.field];
    const nextValue =
      patch.append && typeof currentValue === 'string' && typeof patch.value === 'string'
        ? appendValue(currentValue, patch.value)
        : patch.value;

    if (PROMPT_TEXT_FIELDS.includes(patch.field) || patch.field === 'customArtStyle') {
      return {
        promptStatePatch: {
          [patch.field]: nextValue,
          ...(patch.field === 'customArtStyle' ? { artStyle: 'Custom' } : {}),
        } as Partial<PromptState>,
      };
    }

    return { promptStatePatch: { [patch.field]: nextValue } as Partial<PromptState> };
  }

  dismissSuggestion(promptId: string, suggestionId: string): PromptSuggestion | null {
    return useOptimizationStore.getState().dismissSuggestion(promptId, suggestionId);
  }

  private async analyzeAssets(assets: Asset[]): Promise<Record<string, AssetTag[]>> {
    const entries = await Promise.all(
      assets.slice(0, 5).map(async (asset) => {
        const dataUrl = assetToDataUrl(asset);
        if (!dataUrl) {
          return [asset.id, []] as const;
        }
        const tags = await assetIntelligenceService.analyzeAsset(asset.id, dataUrl);
        return [asset.id, tags] as const;
      }),
    );

    return Object.fromEntries(entries);
  }
}

export const optimizationOrchestratorService = OptimizationOrchestratorService.getInstance();
