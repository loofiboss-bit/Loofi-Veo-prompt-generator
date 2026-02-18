/**
 * useOptimizationStore Tests
 *
 * Comprehensive tests for the optimization store covering:
 * - Suggestions management
 * - Asset tags
 * - Cost estimates
 * - Narrative issues
 * - Preset recommendations
 * - History tracking
 * - Panel state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

// Mock idb-keyval before any store imports
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(),
}));

import { useOptimizationStore } from './useOptimizationStore';
import type {
  PromptSuggestion,
  AssetTag,
  OptimizationCostEstimate,
  NarrativeIssue,
  PresetRecommendation,
  OptimizationHistoryEntry,
} from '@core/types';

// ─── Mock Data Helpers ──────────────────────────────────────────────

const createMockPromptSuggestion = (overrides?: Partial<PromptSuggestion>): PromptSuggestion => ({
  id: 'sug-1',
  promptId: 'prompt-1',
  category: 'style',
  original: 'a car',
  suggested: 'a sleek red sports car',
  reasoning: 'More specific description improves generation quality',
  status: 'pending',
  confidence: 0.85,
  source: 'ai',
  ...overrides,
});

const createMockAssetTag = (overrides?: Partial<AssetTag>): AssetTag => ({
  id: 'tag-1',
  assetId: 'asset-1',
  label: 'sunset',
  category: 'mood',
  confidence: 0.9,
  source: 'ai',
  ...overrides,
});

const createMockCostEstimate = (
  overrides?: Partial<OptimizationCostEstimate>,
): OptimizationCostEstimate => ({
  promptId: 'prompt-1',
  modelId: 'veo',
  estimatedUsd: 2.5,
  qualityScore: 8.5,
  breakdown: [
    {
      name: 'clarity',
      score: 9,
      weight: 0.4,
      feedback: 'Clear and specific',
    },
    {
      name: 'creativity',
      score: 8,
      weight: 0.3,
      feedback: 'Good creative elements',
    },
    {
      name: 'feasibility',
      score: 8.5,
      weight: 0.3,
      feedback: 'Highly feasible',
    },
  ],
  ...overrides,
});

const createMockNarrativeIssue = (overrides?: Partial<NarrativeIssue>): NarrativeIssue => ({
  id: 'issue-1',
  type: 'missing-transition',
  sceneIds: ['scene-1', 'scene-2'],
  severity: 'warning',
  suggestion: 'Consider adding a transition between these scenes',
  fixAction: 'Add fade transition',
  ...overrides,
});

const createMockPresetRecommendation = (
  overrides?: Partial<PresetRecommendation>,
): PresetRecommendation => ({
  modelId: 'veo',
  profileId: 'cinematic-4k',
  confidence: 0.92,
  reasoning: ['High detail requirements', 'Cinematic style detected'],
  complexityVector: { detail: 0.9, motion: 0.7, lighting: 0.8 },
  ...overrides,
});

const createMockHistoryEntry = (
  overrides?: Partial<OptimizationHistoryEntry>,
): OptimizationHistoryEntry => ({
  id: 'hist-1',
  projectId: 'proj-1',
  timestamp: Date.now(),
  type: 'prompt-suggestion',
  action: 'accepted',
  suggestion: createMockPromptSuggestion(),
  ...overrides,
});

// ─── Tests ──────────────────────────────────────────────────────────

describe('useOptimizationStore', () => {
  beforeEach(() => {
    const state = useOptimizationStore.getState();
    act(() => {
      state.clearForProject();
      if (state.panelOpen) state.togglePanel();
      useOptimizationStore.setState({
        history: [],
        panelOpen: false,
      });
    });
  });

  // ── Initial state ──────────────────────────────────────────────

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useOptimizationStore.getState();

      expect(state.suggestions).toEqual({});
      expect(state.assetTags).toEqual({});
      expect(state.costEstimates).toEqual({});
      expect(state.narrativeIssues).toEqual([]);
      expect(state.presetRecommendation).toBeNull();
      expect(state.history).toEqual([]);
      expect(state.isAnalyzing).toBe(false);
      expect(state.lastAnalyzedAt).toBeNull();
      expect(state.panelOpen).toBe(false);
    });

    it('should have all action functions defined', () => {
      const state = useOptimizationStore.getState();

      expect(typeof state.addSuggestions).toBe('function');
      expect(typeof state.updateSuggestionStatus).toBe('function');
      expect(typeof state.setAssetTags).toBe('function');
      expect(typeof state.setCostEstimate).toBe('function');
      expect(typeof state.setNarrativeIssues).toBe('function');
      expect(typeof state.setPresetRecommendation).toBe('function');
      expect(typeof state.addHistoryEntry).toBe('function');
      expect(typeof state.clearForProject).toBe('function');
      expect(typeof state.togglePanel).toBe('function');
      expect(typeof state.setIsAnalyzing).toBe('function');
    });
  });

  // ── addSuggestions ─────────────────────────────────────────────

  describe('addSuggestions', () => {
    it('should add suggestions for a promptId', () => {
      const suggestions = [
        createMockPromptSuggestion({ id: 'sug-1' }),
        createMockPromptSuggestion({ id: 'sug-2', category: 'camera' }),
      ];

      act(() => {
        useOptimizationStore.getState().addSuggestions('prompt-1', suggestions);
      });

      const state = useOptimizationStore.getState();
      expect(state.suggestions['prompt-1']).toEqual(suggestions);
      expect(state.suggestions['prompt-1']).toHaveLength(2);
    });

    it('should overwrite suggestions for same promptId', () => {
      const firstSuggestions = [createMockPromptSuggestion({ id: 'sug-1' })];
      const secondSuggestions = [createMockPromptSuggestion({ id: 'sug-2' })];

      act(() => {
        useOptimizationStore.getState().addSuggestions('prompt-1', firstSuggestions);
      });

      let state = useOptimizationStore.getState();
      expect(state.suggestions['prompt-1']).toHaveLength(1);
      expect(state.suggestions['prompt-1'][0].id).toBe('sug-1');

      act(() => {
        useOptimizationStore.getState().addSuggestions('prompt-1', secondSuggestions);
      });

      state = useOptimizationStore.getState();
      expect(state.suggestions['prompt-1']).toHaveLength(1);
      expect(state.suggestions['prompt-1'][0].id).toBe('sug-2');
    });

    it('should set lastAnalyzedAt timestamp', () => {
      const beforeTimestamp = Date.now();

      act(() => {
        useOptimizationStore.getState().addSuggestions('prompt-1', [createMockPromptSuggestion()]);
      });

      const state = useOptimizationStore.getState();
      expect(state.lastAnalyzedAt).not.toBeNull();
      expect(state.lastAnalyzedAt).toBeGreaterThanOrEqual(beforeTimestamp);
    });

    it('should handle multiple prompts independently', () => {
      const suggestions1 = [createMockPromptSuggestion({ id: 'sug-1', promptId: 'prompt-1' })];
      const suggestions2 = [createMockPromptSuggestion({ id: 'sug-2', promptId: 'prompt-2' })];

      act(() => {
        useOptimizationStore.getState().addSuggestions('prompt-1', suggestions1);
        useOptimizationStore.getState().addSuggestions('prompt-2', suggestions2);
      });

      const state = useOptimizationStore.getState();
      expect(state.suggestions['prompt-1']).toHaveLength(1);
      expect(state.suggestions['prompt-2']).toHaveLength(1);
      expect(state.suggestions['prompt-1'][0].id).toBe('sug-1');
      expect(state.suggestions['prompt-2'][0].id).toBe('sug-2');
    });
  });

  // ── updateSuggestionStatus ─────────────────────────────────────

  describe('updateSuggestionStatus', () => {
    it('should update status of specific suggestion', () => {
      const suggestions = [
        createMockPromptSuggestion({ id: 'sug-1', status: 'pending' }),
        createMockPromptSuggestion({ id: 'sug-2', status: 'pending' }),
      ];

      act(() => {
        useOptimizationStore.getState().addSuggestions('prompt-1', suggestions);
        useOptimizationStore.getState().updateSuggestionStatus('prompt-1', 'sug-1', 'accepted');
      });

      const state = useOptimizationStore.getState();
      expect(state.suggestions['prompt-1'][0].status).toBe('accepted');
      expect(state.suggestions['prompt-1'][1].status).toBe('pending');
    });

    it('should return unchanged state for non-existent promptId', () => {
      const suggestions = [createMockPromptSuggestion({ id: 'sug-1' })];

      act(() => {
        useOptimizationStore.getState().addSuggestions('prompt-1', suggestions);
      });

      const stateBefore = useOptimizationStore.getState();

      act(() => {
        useOptimizationStore
          .getState()
          .updateSuggestionStatus('non-existent-prompt', 'sug-1', 'accepted');
      });

      const stateAfter = useOptimizationStore.getState();
      expect(stateAfter.suggestions).toEqual(stateBefore.suggestions);
    });

    it('should return unchanged state for non-existent suggestionId', () => {
      const suggestions = [createMockPromptSuggestion({ id: 'sug-1', status: 'pending' })];

      act(() => {
        useOptimizationStore.getState().addSuggestions('prompt-1', suggestions);
      });

      act(() => {
        useOptimizationStore
          .getState()
          .updateSuggestionStatus('prompt-1', 'non-existent-sug', 'accepted');
      });

      const state = useOptimizationStore.getState();
      expect(state.suggestions['prompt-1'][0].status).toBe('pending');
    });

    it('should handle all status types', () => {
      const statuses: Array<'pending' | 'accepted' | 'dismissed' | 'modified'> = [
        'pending',
        'accepted',
        'dismissed',
        'modified',
      ];

      act(() => {
        useOptimizationStore
          .getState()
          .addSuggestions('prompt-1', [createMockPromptSuggestion({ id: 'sug-1' })]);
      });

      statuses.forEach((status) => {
        act(() => {
          useOptimizationStore.getState().updateSuggestionStatus('prompt-1', 'sug-1', status);
        });

        const state = useOptimizationStore.getState();
        expect(state.suggestions['prompt-1'][0].status).toBe(status);
      });
    });
  });

  // ── setAssetTags ───────────────────────────────────────────────

  describe('setAssetTags', () => {
    it('should set tags for an asset', () => {
      const tags = [
        createMockAssetTag({ id: 'tag-1', label: 'sunset' }),
        createMockAssetTag({ id: 'tag-2', label: 'ocean' }),
      ];

      act(() => {
        useOptimizationStore.getState().setAssetTags('asset-1', tags);
      });

      const state = useOptimizationStore.getState();
      expect(state.assetTags['asset-1']).toEqual(tags);
      expect(state.assetTags['asset-1']).toHaveLength(2);
    });

    it('should overwrite tags for same assetId', () => {
      const firstTags = [createMockAssetTag({ id: 'tag-1' })];
      const secondTags = [createMockAssetTag({ id: 'tag-2' })];

      act(() => {
        useOptimizationStore.getState().setAssetTags('asset-1', firstTags);
      });

      let state = useOptimizationStore.getState();
      expect(state.assetTags['asset-1']).toHaveLength(1);
      expect(state.assetTags['asset-1'][0].id).toBe('tag-1');

      act(() => {
        useOptimizationStore.getState().setAssetTags('asset-1', secondTags);
      });

      state = useOptimizationStore.getState();
      expect(state.assetTags['asset-1']).toHaveLength(1);
      expect(state.assetTags['asset-1'][0].id).toBe('tag-2');
    });

    it('should handle multiple assets independently', () => {
      const tags1 = [createMockAssetTag({ id: 'tag-1', assetId: 'asset-1' })];
      const tags2 = [createMockAssetTag({ id: 'tag-2', assetId: 'asset-2' })];

      act(() => {
        useOptimizationStore.getState().setAssetTags('asset-1', tags1);
        useOptimizationStore.getState().setAssetTags('asset-2', tags2);
      });

      const state = useOptimizationStore.getState();
      expect(state.assetTags['asset-1']).toHaveLength(1);
      expect(state.assetTags['asset-2']).toHaveLength(1);
      expect(state.assetTags['asset-1'][0].id).toBe('tag-1');
      expect(state.assetTags['asset-2'][0].id).toBe('tag-2');
    });
  });

  // ── setCostEstimate ────────────────────────────────────────────

  describe('setCostEstimate', () => {
    it('should set cost estimate for a prompt', () => {
      const estimate = createMockCostEstimate({ promptId: 'prompt-1', estimatedUsd: 3.5 });

      act(() => {
        useOptimizationStore.getState().setCostEstimate('prompt-1', estimate);
      });

      const state = useOptimizationStore.getState();
      expect(state.costEstimates['prompt-1']).toEqual(estimate);
      expect(state.costEstimates['prompt-1'].estimatedUsd).toBe(3.5);
    });

    it('should overwrite estimate for same promptId', () => {
      const firstEstimate = createMockCostEstimate({ promptId: 'prompt-1', estimatedUsd: 2.0 });
      const secondEstimate = createMockCostEstimate({ promptId: 'prompt-1', estimatedUsd: 5.0 });

      act(() => {
        useOptimizationStore.getState().setCostEstimate('prompt-1', firstEstimate);
      });

      let state = useOptimizationStore.getState();
      expect(state.costEstimates['prompt-1'].estimatedUsd).toBe(2.0);

      act(() => {
        useOptimizationStore.getState().setCostEstimate('prompt-1', secondEstimate);
      });

      state = useOptimizationStore.getState();
      expect(state.costEstimates['prompt-1'].estimatedUsd).toBe(5.0);
    });

    it('should handle multiple prompts independently', () => {
      const estimate1 = createMockCostEstimate({ promptId: 'prompt-1', estimatedUsd: 2.5 });
      const estimate2 = createMockCostEstimate({ promptId: 'prompt-2', estimatedUsd: 4.0 });

      act(() => {
        useOptimizationStore.getState().setCostEstimate('prompt-1', estimate1);
        useOptimizationStore.getState().setCostEstimate('prompt-2', estimate2);
      });

      const state = useOptimizationStore.getState();
      expect(state.costEstimates['prompt-1'].estimatedUsd).toBe(2.5);
      expect(state.costEstimates['prompt-2'].estimatedUsd).toBe(4.0);
    });
  });

  // ── setNarrativeIssues ─────────────────────────────────────────

  describe('setNarrativeIssues', () => {
    it('should set narrative issues', () => {
      const issues = [
        createMockNarrativeIssue({ id: 'issue-1', type: 'missing-transition' }),
        createMockNarrativeIssue({ id: 'issue-2', type: 'pacing' }),
      ];

      act(() => {
        useOptimizationStore.getState().setNarrativeIssues(issues);
      });

      const state = useOptimizationStore.getState();
      expect(state.narrativeIssues).toEqual(issues);
      expect(state.narrativeIssues).toHaveLength(2);
    });

    it('should overwrite previous issues', () => {
      const firstIssues = [createMockNarrativeIssue({ id: 'issue-1' })];
      const secondIssues = [
        createMockNarrativeIssue({ id: 'issue-2' }),
        createMockNarrativeIssue({ id: 'issue-3' }),
      ];

      act(() => {
        useOptimizationStore.getState().setNarrativeIssues(firstIssues);
      });

      let state = useOptimizationStore.getState();
      expect(state.narrativeIssues).toHaveLength(1);

      act(() => {
        useOptimizationStore.getState().setNarrativeIssues(secondIssues);
      });

      state = useOptimizationStore.getState();
      expect(state.narrativeIssues).toHaveLength(2);
      expect(state.narrativeIssues[0].id).toBe('issue-2');
    });

    it('should handle empty array', () => {
      act(() => {
        useOptimizationStore
          .getState()
          .setNarrativeIssues([createMockNarrativeIssue({ id: 'issue-1' })]);
      });

      let state = useOptimizationStore.getState();
      expect(state.narrativeIssues).toHaveLength(1);

      act(() => {
        useOptimizationStore.getState().setNarrativeIssues([]);
      });

      state = useOptimizationStore.getState();
      expect(state.narrativeIssues).toEqual([]);
    });
  });

  // ── setPresetRecommendation ────────────────────────────────────

  describe('setPresetRecommendation', () => {
    it('should set preset recommendation', () => {
      const recommendation = createMockPresetRecommendation({
        modelId: 'veo',
        profileId: 'cinematic-4k',
      });

      act(() => {
        useOptimizationStore.getState().setPresetRecommendation(recommendation);
      });

      const state = useOptimizationStore.getState();
      expect(state.presetRecommendation).toEqual(recommendation);
      expect(state.presetRecommendation?.modelId).toBe('veo');
    });

    it('should clear recommendation with null', () => {
      const recommendation = createMockPresetRecommendation();

      act(() => {
        useOptimizationStore.getState().setPresetRecommendation(recommendation);
      });

      let state = useOptimizationStore.getState();
      expect(state.presetRecommendation).not.toBeNull();

      act(() => {
        useOptimizationStore.getState().setPresetRecommendation(null);
      });

      state = useOptimizationStore.getState();
      expect(state.presetRecommendation).toBeNull();
    });

    it('should overwrite existing recommendation', () => {
      const firstRec = createMockPresetRecommendation({ profileId: 'profile-1' });
      const secondRec = createMockPresetRecommendation({ profileId: 'profile-2' });

      act(() => {
        useOptimizationStore.getState().setPresetRecommendation(firstRec);
      });

      let state = useOptimizationStore.getState();
      expect(state.presetRecommendation?.profileId).toBe('profile-1');

      act(() => {
        useOptimizationStore.getState().setPresetRecommendation(secondRec);
      });

      state = useOptimizationStore.getState();
      expect(state.presetRecommendation?.profileId).toBe('profile-2');
    });
  });

  // ── addHistoryEntry ────────────────────────────────────────────

  describe('addHistoryEntry', () => {
    it('should append to history', () => {
      const entry1 = createMockHistoryEntry({ id: 'hist-1' });
      const entry2 = createMockHistoryEntry({ id: 'hist-2' });

      act(() => {
        useOptimizationStore.getState().addHistoryEntry(entry1);
      });

      let state = useOptimizationStore.getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0].id).toBe('hist-1');

      act(() => {
        useOptimizationStore.getState().addHistoryEntry(entry2);
      });

      state = useOptimizationStore.getState();
      expect(state.history).toHaveLength(2);
      expect(state.history[1].id).toBe('hist-2');
    });

    it('should maintain history order', () => {
      const entries = [
        createMockHistoryEntry({ id: 'hist-1', timestamp: 1000 }),
        createMockHistoryEntry({ id: 'hist-2', timestamp: 2000 }),
        createMockHistoryEntry({ id: 'hist-3', timestamp: 3000 }),
      ];

      act(() => {
        entries.forEach((entry) => {
          useOptimizationStore.getState().addHistoryEntry(entry);
        });
      });

      const state = useOptimizationStore.getState();
      expect(state.history).toHaveLength(3);
      expect(state.history[0].id).toBe('hist-1');
      expect(state.history[1].id).toBe('hist-2');
      expect(state.history[2].id).toBe('hist-3');
    });

    it('should handle different history entry types', () => {
      const types: Array<OptimizationHistoryEntry['type']> = [
        'prompt-suggestion',
        'asset-tag',
        'cost-estimate',
        'narrative-issue',
        'preset-recommendation',
      ];

      act(() => {
        types.forEach((type, index) => {
          const entry = createMockHistoryEntry({
            id: `hist-${index}`,
            type,
          });
          useOptimizationStore.getState().addHistoryEntry(entry);
        });
      });

      const state = useOptimizationStore.getState();
      expect(state.history).toHaveLength(5);
      state.history.forEach((entry, index) => {
        expect(entry.type).toBe(types[index]);
      });
    });
  });

  // ── clearForProject ────────────────────────────────────────────

  describe('clearForProject', () => {
    it('should reset all data but preserve history and panelOpen', () => {
      // Set up state with data
      act(() => {
        useOptimizationStore.getState().addSuggestions('prompt-1', [createMockPromptSuggestion()]);
        useOptimizationStore.getState().setAssetTags('asset-1', [createMockAssetTag()]);
        useOptimizationStore.getState().setCostEstimate('prompt-1', createMockCostEstimate());
        useOptimizationStore.getState().setNarrativeIssues([createMockNarrativeIssue()]);
        useOptimizationStore.getState().setPresetRecommendation(createMockPresetRecommendation());
        useOptimizationStore.getState().addHistoryEntry(createMockHistoryEntry());
        useOptimizationStore.getState().setIsAnalyzing(true);
        useOptimizationStore.getState().togglePanel(); // Open panel
      });

      let state = useOptimizationStore.getState();
      expect(Object.keys(state.suggestions)).toHaveLength(1);
      expect(state.history).toHaveLength(1);
      expect(state.panelOpen).toBe(true);

      act(() => {
        useOptimizationStore.getState().clearForProject();
      });

      state = useOptimizationStore.getState();
      expect(state.suggestions).toEqual({});
      expect(state.assetTags).toEqual({});
      expect(state.costEstimates).toEqual({});
      expect(state.narrativeIssues).toEqual([]);
      expect(state.presetRecommendation).toBeNull();
      expect(state.isAnalyzing).toBe(false);
      expect(state.lastAnalyzedAt).toBeNull();
      // History and panelOpen should be preserved
      expect(state.history).toHaveLength(1);
      expect(state.panelOpen).toBe(true);
    });

    it('should clear multiple suggestions and estimates', () => {
      act(() => {
        useOptimizationStore.getState().addSuggestions('prompt-1', [createMockPromptSuggestion()]);
        useOptimizationStore.getState().addSuggestions('prompt-2', [createMockPromptSuggestion()]);
        useOptimizationStore.getState().setCostEstimate('prompt-1', createMockCostEstimate());
        useOptimizationStore.getState().setCostEstimate('prompt-2', createMockCostEstimate());
      });

      let state = useOptimizationStore.getState();
      expect(Object.keys(state.suggestions)).toHaveLength(2);
      expect(Object.keys(state.costEstimates)).toHaveLength(2);

      act(() => {
        useOptimizationStore.getState().clearForProject();
      });

      state = useOptimizationStore.getState();
      expect(state.suggestions).toEqual({});
      expect(state.costEstimates).toEqual({});
    });
  });

  // ── togglePanel ────────────────────────────────────────────────

  describe('togglePanel', () => {
    it('should toggle panelOpen from false to true', () => {
      let state = useOptimizationStore.getState();
      expect(state.panelOpen).toBe(false);

      act(() => {
        useOptimizationStore.getState().togglePanel();
      });

      state = useOptimizationStore.getState();
      expect(state.panelOpen).toBe(true);
    });

    it('should toggle panelOpen from true to false', () => {
      act(() => {
        useOptimizationStore.getState().togglePanel();
      });

      let state = useOptimizationStore.getState();
      expect(state.panelOpen).toBe(true);

      act(() => {
        useOptimizationStore.getState().togglePanel();
      });

      state = useOptimizationStore.getState();
      expect(state.panelOpen).toBe(false);
    });

    it('should toggle multiple times', () => {
      const toggleCount = 5;

      for (let i = 0; i < toggleCount; i++) {
        // After each toggle, state alternates: false -> true -> false -> true -> false
        // i=0: toggle → true, i=1: toggle → false, i=2: toggle → true, etc.
        const expectedState = i % 2 === 0;

        act(() => {
          useOptimizationStore.getState().togglePanel();
        });

        const state = useOptimizationStore.getState();
        expect(state.panelOpen).toBe(expectedState);
      }
    });
  });

  // ── setIsAnalyzing ─────────────────────────────────────────────

  describe('setIsAnalyzing', () => {
    it('should set analyzing state to true', () => {
      act(() => {
        useOptimizationStore.getState().setIsAnalyzing(true);
      });

      const state = useOptimizationStore.getState();
      expect(state.isAnalyzing).toBe(true);
    });

    it('should set analyzing state to false', () => {
      act(() => {
        useOptimizationStore.getState().setIsAnalyzing(true);
      });

      let state = useOptimizationStore.getState();
      expect(state.isAnalyzing).toBe(true);

      act(() => {
        useOptimizationStore.getState().setIsAnalyzing(false);
      });

      state = useOptimizationStore.getState();
      expect(state.isAnalyzing).toBe(false);
    });

    it('should toggle analyzing state multiple times', () => {
      const states = [true, false, true, false];

      states.forEach((analyzing) => {
        act(() => {
          useOptimizationStore.getState().setIsAnalyzing(analyzing);
        });

        const state = useOptimizationStore.getState();
        expect(state.isAnalyzing).toBe(analyzing);
      });
    });
  });
});
