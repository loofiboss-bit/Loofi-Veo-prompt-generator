import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_STATE } from '@core/constants';
import type { Asset, PromptSuggestion, Shot } from '@core/types';
import { useOptimizationStore } from '@core/store/useOptimizationStore';
import { optimizationOrchestratorService } from './optimizationOrchestratorService';

const {
  mockAnalyzeAsset,
  mockAnalyzePrompt,
  mockAnalyzeSequence,
  mockEstimateForPrompt,
  mockRecommendPreset,
} = vi.hoisted(() => ({
  mockAnalyzeAsset: vi.fn(),
  mockAnalyzePrompt: vi.fn(),
  mockAnalyzeSequence: vi.fn(),
  mockEstimateForPrompt: vi.fn(),
  mockRecommendPreset: vi.fn(),
}));

vi.mock('@core/services/assetIntelligenceService', () => ({
  assetIntelligenceService: {
    analyzeAsset: mockAnalyzeAsset,
  },
}));

vi.mock('@core/services/costEstimationService', () => ({
  costEstimationService: {
    estimateForPrompt: mockEstimateForPrompt,
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@core/services/narrativeAnalysisService', () => ({
  narrativeAnalysisService: {
    analyzeSequence: mockAnalyzeSequence,
  },
}));

vi.mock('@core/services/presetMatchingService', () => ({
  presetMatchingService: {
    recommendPreset: mockRecommendPreset,
  },
}));

vi.mock('@core/services/promptRefinementService', () => ({
  promptRefinementService: {
    analyzePrompt: mockAnalyzePrompt,
  },
}));

const shot: Shot = {
  id: 1,
  type: 'video',
  action: 'Hero runs through neon rain',
  camera: 'Wide tracking shot',
  characterId: 'hero',
  takes: [],
  selectedTakeIndex: 0,
  visualLink: true,
  duration: 8,
  transition: {
    type: 'cut',
    duration: 0,
  },
};

const imageAsset: Asset = {
  id: 'asset-1',
  type: 'image',
  name: 'reference.png',
  url: '',
  data: 'abc123',
  mimeType: 'image/png',
};

describe('optimizationOrchestratorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOptimizationStore.getState().clearForProject();

    mockAnalyzePrompt.mockResolvedValue([
      {
        id: 'suggestion-1',
        promptId: 'project-1',
        category: 'camera',
        original: '',
        suggested: 'Add a slow dolly in',
        reasoning: 'Improves camera intent.',
        status: 'pending',
        confidence: 0.88,
        source: 'heuristic',
      } satisfies PromptSuggestion,
    ]);
    mockAnalyzeAsset.mockResolvedValue([
      {
        id: 'tag-1',
        assetId: 'asset-1',
        label: 'neon',
        category: 'mood',
        confidence: 0.8,
        source: 'manual',
      },
    ]);
    mockEstimateForPrompt.mockReturnValue({
      promptId: 'project-1',
      modelId: 'flow-veo',
      estimatedUsd: 0.14,
      qualityScore: 8.5,
      breakdown: [
        {
          name: 'Specificity',
          score: 8,
          weight: 1,
          feedback: 'Detailed enough for local scoring.',
        },
      ],
    });
    mockAnalyzeSequence.mockReturnValue([
      {
        id: 'issue-1',
        type: 'pacing',
        sceneIds: ['1'],
        severity: 'info',
        suggestion: 'Hold the first beat for continuity.',
      },
    ]);
    mockRecommendPreset.mockReturnValue({
      modelId: 'flow-veo',
      profileId: 'balanced',
      confidence: 0.8,
      reasoning: ['Balanced preset fits the current prompt.'],
      complexityVector: {
        cinematic: 0.8,
      },
    });
  });

  it('analyzes the current project and writes a coherent store result', async () => {
    const result = await optimizationOrchestratorService.analyzeProject({
      projectId: 'project-1',
      promptId: 'project-1',
      promptState: {
        ...INITIAL_STATE,
        idea: 'Neon street chase',
        targetModel: 'flow-veo',
      },
      shots: [shot],
      assets: [imageAsset],
    });

    expect(result.status).toBe('ready');
    expect(result.source).toBe('heuristic');
    expect(result.suggestions[0].patch).toEqual({
      target: 'prompt',
      field: 'cameraMovement',
      value: 'Add a slow dolly in',
      append: true,
    });
    expect(mockAnalyzePrompt).toHaveBeenCalledWith(expect.stringContaining('Neon'), 'project-1');
    expect(mockAnalyzeAsset).toHaveBeenCalledWith('asset-1', 'data:image/png;base64,abc123');

    const storeState = useOptimizationStore.getState();
    expect(storeState.analysisStatus['project-1']).toBe('ready');
    expect(storeState.suggestions['project-1']).toHaveLength(1);
    expect(storeState.costEstimates['project-1'].qualityScore).toBe(8.5);
    expect(storeState.narrativeIssues).toHaveLength(1);
    expect(storeState.presetRecommendation?.profileId).toBe('balanced');
  });

  it('applies prompt and shot suggestion patches without losing existing text', () => {
    const promptPatch = optimizationOrchestratorService.applySuggestionPatch({
      promptState: {
        ...INITIAL_STATE,
        idea: 'Original idea',
        cameraMovement: 'Static shot',
      },
      suggestion: {
        id: 'suggestion-2',
        promptId: 'project-1',
        category: 'camera',
        original: '',
        suggested: 'slow dolly in',
        reasoning: 'Camera direction is missing.',
        status: 'pending',
        confidence: 0.8,
        source: 'heuristic',
        patch: {
          target: 'prompt',
          field: 'cameraMovement',
          value: 'slow dolly in',
          append: true,
        },
      },
    });

    expect(promptPatch.promptStatePatch.cameraMovement).toBe('Static shot. slow dolly in');

    const shotPatch = optimizationOrchestratorService.applySuggestionPatch({
      promptState: INITIAL_STATE,
      shots: [shot],
      suggestion: {
        id: 'suggestion-3',
        promptId: 'project-1',
        category: 'syntax',
        original: '',
        suggested: 'Add rain reflections',
        reasoning: 'Shot action benefits from continuity notes.',
        status: 'pending',
        confidence: 0.8,
        source: 'heuristic',
        patch: {
          target: 'shot',
          shotId: 1,
          field: 'action',
          value: 'rain reflections stay consistent',
          append: true,
        },
      },
    });

    expect(shotPatch.shots?.[0].action).toContain('Hero runs through neon rain.');
    expect(shotPatch.shots?.[0].action).toContain('rain reflections stay consistent');
  });
});
