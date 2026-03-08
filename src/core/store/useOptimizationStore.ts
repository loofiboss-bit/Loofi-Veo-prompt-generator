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
} from '@core/types';

interface OptimizationStoreState {
  // State
  suggestions: Record<string, PromptSuggestion[]>;
  assetTags: Record<string, AssetTag[]>;
  costEstimates: Record<string, OptimizationCostEstimate>;
  narrativeIssues: NarrativeIssue[];
  presetRecommendation: PresetRecommendation | null;
  history: OptimizationHistoryEntry[];
  isAnalyzing: boolean;
  lastAnalyzedAt: number | null;
  panelOpen: boolean;

  // Actions
  addSuggestions: (promptId: string, suggestions: PromptSuggestion[]) => void;
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
  clearForProject: () => void;
  togglePanel: () => void;
  setIsAnalyzing: (analyzing: boolean) => void;
}

export const useOptimizationStore = create<OptimizationStoreState>()(
  temporal(
    persist(
      (set) => ({
        // Initial state
        suggestions: {},
        assetTags: {},
        costEstimates: {},
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

        clearForProject: () =>
          set({
            suggestions: {},
            assetTags: {},
            costEstimates: {},
            narrativeIssues: [],
            presetRecommendation: null,
            isAnalyzing: false,
            lastAnalyzedAt: null,
          }),

        togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),

        setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      }),
      {
        name: 'optimization-store-v1',
        storage: createJSONStorage(() => idbStorage),
        partialize: (state) => ({
          suggestions: state.suggestions,
          assetTags: state.assetTags,
          costEstimates: state.costEstimates,
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
