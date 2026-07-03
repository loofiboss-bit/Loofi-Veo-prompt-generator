/**
 * Optimization Types — v2.7.0
 * AI-Driven Project Optimization types for prompt suggestions,
 * quality scoring, cost estimation, and narrative analysis.
 */

import type { Asset, PromptState, Shot } from './index';

// Suggestion categories for prompt refinement
export type SuggestionCategory = 'style' | 'camera' | 'lighting' | 'specificity' | 'syntax';

export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed' | 'modified';

export type OptimizationPatchTarget = 'prompt' | 'shot';

export interface PromptOptimizationPatch {
  target: 'prompt';
  field: keyof PromptState;
  value: PromptState[keyof PromptState];
  append?: boolean;
}

export interface ShotOptimizationPatch {
  target: 'shot';
  shotId: number;
  field: keyof Pick<Shot, 'action' | 'camera' | 'duration'>;
  value: string | number;
  append?: boolean;
}

export type OptimizationPatch = PromptOptimizationPatch | ShotOptimizationPatch;

export interface PromptSuggestion {
  id: string;
  promptId: string;
  category: SuggestionCategory;
  original: string;
  suggested: string;
  reasoning: string;
  status: SuggestionStatus;
  confidence: number; // 0-1
  source: 'ai' | 'heuristic';
  patch?: OptimizationPatch;
}

export type AssetTagCategory = 'scene' | 'mood' | 'subject' | 'palette' | 'location';

export interface AssetTag {
  id: string;
  assetId: string;
  label: string;
  category: AssetTagCategory;
  confidence: number; // 0-1
  source: 'ai' | 'manual';
}

export type NarrativeIssueType =
  | 'missing-transition'
  | 'pacing'
  | 'character-jump'
  | 'duplicate-theme';

export type NarrativeIssueSeverity = 'info' | 'warning';

export interface NarrativeIssue {
  id: string;
  type: NarrativeIssueType;
  sceneIds: string[];
  severity: NarrativeIssueSeverity;
  suggestion: string;
  fixAction?: string;
}

export interface QualityDimension {
  name: string;
  score: number; // 0-10
  weight: number; // 0-1, all weights sum to 1
  feedback: string;
}

export interface OptimizationCostEstimate {
  promptId: string;
  modelId: 'flow-veo' | 'veo-api' | string;
  estimatedUsd: number;
  qualityScore: number; // 1-10
  breakdown: QualityDimension[];
}

export interface PresetRecommendation {
  modelId: string;
  profileId: string;
  confidence: number; // 0-1
  reasoning: string[];
  complexityVector: Record<string, number>;
}

export type OptimizationAction = 'accepted' | 'dismissed' | 'modified';

export interface OptimizationHistoryEntry {
  id: string;
  projectId: string;
  timestamp: number;
  type:
    | 'prompt-suggestion'
    | 'asset-tag'
    | 'cost-estimate'
    | 'narrative-issue'
    | 'preset-recommendation';
  suggestion?: PromptSuggestion;
  action: OptimizationAction;
}

export interface OptimizationAnalysisInput {
  projectId: string;
  promptId: string;
  promptState: PromptState;
  shots?: Shot[];
  assets?: Asset[];
  generatedPrompt?: string;
}

export type OptimizationAnalysisStatus = 'idle' | 'stale' | 'analyzing' | 'ready' | 'error';

export interface OptimizationAnalysisResult {
  projectId: string;
  promptId: string;
  status: OptimizationAnalysisStatus;
  suggestions: PromptSuggestion[];
  assetTags: Record<string, AssetTag[]>;
  costEstimate: OptimizationCostEstimate | null;
  narrativeIssues: NarrativeIssue[];
  presetRecommendation: PresetRecommendation | null;
  source: 'ai' | 'heuristic' | 'mixed';
  startedAt: number;
  completedAt: number | null;
  error?: string;
}

export interface OptimizationState {
  suggestions: Map<string, PromptSuggestion[]>;
  assetTags: Map<string, AssetTag[]>;
  costEstimates: Map<string, OptimizationCostEstimate>;
  analysisResults: Map<string, OptimizationAnalysisResult>;
  analysisStatus: Map<string, OptimizationAnalysisStatus>;
  narrativeIssues: NarrativeIssue[];
  presetRecommendation: PresetRecommendation | null;
  history: OptimizationHistoryEntry[];
  isAnalyzing: boolean;
  lastAnalyzedAt: number | null;
  panelOpen: boolean;
}
