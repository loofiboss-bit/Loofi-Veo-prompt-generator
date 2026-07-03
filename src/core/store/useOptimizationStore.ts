/**
 * Optimization Store — v2.7.0
 *
 * Zustand store with Zundo (temporal) and persist for AI-driven optimization.
 * Manages prompt suggestions, asset tags, cost estimates, narrative analysis, and preset recommendations.
 */

import { create } from 'zustand';
import { temporal } from 'zundo';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '@core/utils/storage';
import type {
  PromptSuggestion,
  AssetTag,
  OptimizationCostEstimate,
  NarrativeIssue,
  PresetRecommendation,
  OptimizationHistoryEntry,
  OptimizationAnalysisResult,
  OptimizationAnalysisStatus,
} from '@core/types';
import { logger } from '@core/services/loggerService';

const OPTIMIZATION_STORE_NAME = 'optimization-store-v2';
const LEGACY_OPTIMIZATION_STORE_NAME = 'optimization-store-v1';

const optimizationStorage = {
  ...idbStorage,
  getItem: async (name: string): Promise<string | null> => {
    const current = await idbStorage.getItem(name);
    if (current || name !== OPTIMIZATION_STORE_NAME) {
      return current;
    }

    const legacy = await idbStorage.getItem(LEGACY_OPTIMIZATION_STORE_NAME);
    if (legacy) {
      logger.info('OptimizationStore', 'Migrating legacy optimization store');
    }
    return legacy;
  },
};

interface OptimizationStoreState {
  // State
  suggestions: Record<string, PromptSuggestion[]>;
  assetTags: Record<string, AssetTag[]>;
  costEstimates: Record<string, OptimizationCostEstimate>;
  analysisResults: Record<string, OptimizationAnalysisResult>;
  analysisStatus: Record<string, OptimizationAnalysisStatus>;
  narrativeIssues: NarrativeIssue[];
  presetRecommendation: PresetRecommendation | null;
  history: OptimizationHistoryEntry[];
  isAnalyzing: boolean;
  lastAnalyzedAt: number | null;
  panelOpen: boolean;

  // Actions
  addSuggestions: (promptId: string, suggestions: PromptSuggestion[]) => void;
  setAnalysisResult: (result: OptimizationAnalysisResult) => void;
  markAnalysisStale: (projectId: string) => void;
  applySuggestion: (promptId: string, suggestionId: string) => PromptSuggestion | null;
  dismissSuggestion: (promptId: string, suggestionId: string) => PromptSuggestion | null;
  updateSuggestionStatus: (
    promptId: string,
    suggestionId: string,
    status: PromptSuggestion['status'],
  ) => void;
  setAssetTags: (assetId: string, tags: AssetTag[]) => void;
  setCostEstimate: (promptId: string, estimate: OptimizationCostEstimate) => void;
  setNarrativeIssues: (issues: NarrativeIssue[]) => void;
  setPresetRecommendation: (rec: PresetRecommendation | null) => void;
  addHistoryEntry: (entry: OptimizationHistoryEntry) => void;
  clearProjectAnalysis: (projectId: string, promptId?: string) => void;
  clearForProject: () => void;
  togglePanel: () => void;
  setIsAnalyzing: (analyzing: boolean) => void;
}

export const useOptimizationStore = create<OptimizationStoreState>()(
  temporal(
    persist<OptimizationStoreState, [], [], Partial<OptimizationStoreState>>(
      (set, get) => ({
        // Initial state
        suggestions: {},
        assetTags: {},
        costEstimates: {},
        analysisResults: {},
        analysisStatus: {},
        narrativeIssues: [],
        presetRecommendation: null,
        history: [],
        isAnalyzing: false,
        lastAnalyzedAt: null,
        panelOpen: false,

        // Actions
        addSuggestions: (promptId, newSuggestions) =>
          set((state) => ({
            suggestions: {
              ...state.suggestions,
              [promptId]: newSuggestions,
            },
            lastAnalyzedAt: Date.now(),
          })),

        setAnalysisResult: (result) =>
          set((state) => ({
            analysisResults: {
              ...state.analysisResults,
              [result.projectId]: result,
            },
            analysisStatus: {
              ...state.analysisStatus,
              [result.projectId]: result.status,
            },
            suggestions: {
              ...state.suggestions,
              [result.promptId]: result.suggestions,
            },
            assetTags: {
              ...state.assetTags,
              ...result.assetTags,
            },
            costEstimates: result.costEstimate
              ? {
                  ...state.costEstimates,
                  [result.promptId]: result.costEstimate,
                }
              : state.costEstimates,
            narrativeIssues: result.narrativeIssues,
            presetRecommendation: result.presetRecommendation,
            isAnalyzing: result.status === 'analyzing',
            lastAnalyzedAt: result.completedAt ?? Date.now(),
          })),

        markAnalysisStale: (projectId) =>
          set((state) => ({
            analysisStatus: {
              ...state.analysisStatus,
              [projectId]: 'stale',
            },
          })),

        applySuggestion: (promptId, suggestionId) => {
          const suggestion =
            get().suggestions[promptId]?.find((item) => item.id === suggestionId) ?? null;
          if (!suggestion) {
            return null;
          }
          get().updateSuggestionStatus(promptId, suggestionId, 'accepted');
          get().addHistoryEntry({
            id: `history-${Date.now()}-${suggestionId}`,
            projectId: promptId,
            timestamp: Date.now(),
            type: 'prompt-suggestion',
            suggestion,
            action: 'accepted',
          });
          return suggestion;
        },

        dismissSuggestion: (promptId, suggestionId) => {
          const suggestion =
            get().suggestions[promptId]?.find((item) => item.id === suggestionId) ?? null;
          if (!suggestion) {
            return null;
          }
          get().updateSuggestionStatus(promptId, suggestionId, 'dismissed');
          get().addHistoryEntry({
            id: `history-${Date.now()}-${suggestionId}`,
            projectId: promptId,
            timestamp: Date.now(),
            type: 'prompt-suggestion',
            suggestion,
            action: 'dismissed',
          });
          return suggestion;
        },

        updateSuggestionStatus: (promptId, suggestionId, status) =>
          set((state) => {
            const promptSuggestions = state.suggestions[promptId];
            if (!promptSuggestions) return state;
            return {
              suggestions: {
                ...state.suggestions,
                [promptId]: promptSuggestions.map((s) =>
                  s.id === suggestionId ? { ...s, status } : s,
                ),
              },
            };
          }),

        setAssetTags: (assetId, tags) =>
          set((state) => ({
            assetTags: { ...state.assetTags, [assetId]: tags },
          })),

        setCostEstimate: (promptId, estimate) =>
          set((state) => ({
            costEstimates: { ...state.costEstimates, [promptId]: estimate },
          })),

        setNarrativeIssues: (issues) => set({ narrativeIssues: issues }),

        setPresetRecommendation: (rec) => set({ presetRecommendation: rec }),

        addHistoryEntry: (entry) =>
          set((state) => ({
            history: [...state.history, entry].slice(-50),
          })),

        clearProjectAnalysis: (projectId, promptId = projectId) =>
          set((state) => {
            const { [projectId]: _removedResult, ...analysisResults } = state.analysisResults;
            const { [projectId]: _removedStatus, ...analysisStatus } = state.analysisStatus;
            const { [promptId]: _removedSuggestions, ...suggestions } = state.suggestions;
            const { [promptId]: _removedCost, ...costEstimates } = state.costEstimates;

            return {
              analysisResults,
              analysisStatus,
              suggestions,
              costEstimates,
              narrativeIssues: [],
              presetRecommendation: null,
              isAnalyzing: false,
              lastAnalyzedAt: null,
            };
          }),

        clearForProject: () =>
          set({
            suggestions: {},
            assetTags: {},
            costEstimates: {},
            analysisResults: {},
            analysisStatus: {},
            narrativeIssues: [],
            presetRecommendation: null,
            isAnalyzing: false,
            lastAnalyzedAt: null,
          }),

        togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),

        setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      }),
      {
        name: OPTIMIZATION_STORE_NAME,
        storage: createJSONStorage(() => optimizationStorage),
        version: 2,
        migrate: (persistedState) => {
          const state = persistedState as Partial<OptimizationStoreState>;
          return {
            ...state,
            suggestions: state.suggestions ?? {},
            assetTags: state.assetTags ?? {},
            costEstimates: state.costEstimates ?? {},
            analysisResults: state.analysisResults ?? {},
            analysisStatus: state.analysisStatus ?? {},
            narrativeIssues: state.narrativeIssues ?? [],
            presetRecommendation: state.presetRecommendation ?? null,
            history: state.history ?? [],
            isAnalyzing: false,
            lastAnalyzedAt: state.lastAnalyzedAt ?? null,
            panelOpen: state.panelOpen ?? false,
          };
        },
        partialize: (state) => ({
          suggestions: state.suggestions,
          assetTags: state.assetTags,
          costEstimates: state.costEstimates,
          analysisResults: state.analysisResults,
          analysisStatus: state.analysisStatus,
          history: state.history,
        }),
      },
    ),
    {
      partialize: (state) => ({
        suggestions: state.suggestions,
      }),
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      limit: 50,
    },
  ),
);
