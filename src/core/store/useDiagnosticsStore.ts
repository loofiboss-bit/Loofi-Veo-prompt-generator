/**
 * Diagnostics Store
 * v1.8.0 — Project Intelligence Layer
 *
 * Zustand store managing project analysis state, diagnostic issues,
 * and health scoring lifecycle.
 *
 * @module useDiagnosticsStore
 */

import { create } from 'zustand';
import { projectAnalysisService } from '@core/services/projectAnalysisService';
import { logger } from '@core/services/loggerService';
import type {
  AnalysisResult,
  AnalysisRequest,
  DiagnosticIssue,
  ProjectHealthScore,
  DiagnosticSeverity,
} from '@core/types/diagnostics';

interface DiagnosticsStore {
  // State
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  /** Whether the diagnostics panel is visible */
  isPanelOpen: boolean;
  /** Active severity filter */
  severityFilter: DiagnosticSeverity | 'all';
  /** Active category filter */
  categoryFilter: string | 'all';
  /** Whether auto-analysis on change is enabled */
  autoAnalyze: boolean;

  // Actions
  runAnalysis: (request: AnalysisRequest) => void;
  runAnalysisAsync: (request: AnalysisRequest) => Promise<void>;
  clearResults: () => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setSeverityFilter: (severity: DiagnosticSeverity | 'all') => void;
  setCategoryFilter: (category: string | 'all') => void;
  setAutoAnalyze: (enabled: boolean) => void;
  dismissIssue: (issueId: string) => void;

  // Computed-like selectors
  getFilteredIssues: () => DiagnosticIssue[];
  getHealthScore: () => ProjectHealthScore | null;
  getIssueCounts: () => Record<DiagnosticSeverity, number>;
}

export const useDiagnosticsStore = create<DiagnosticsStore>()((set, get) => ({
  // Initial State
  result: null,
  isAnalyzing: false,
  error: null,
  isPanelOpen: false,
  severityFilter: 'all',
  categoryFilter: 'all',
  autoAnalyze: false,

  // Run analysis synchronously (main thread)
  runAnalysis: (request: AnalysisRequest) => {
    set({ isAnalyzing: true, error: null });
    try {
      const result = projectAnalysisService.analyze(request);
      set({ result, isAnalyzing: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Analysis failed', undefined, err);
      set({ error: message, isAnalyzing: false });
    }
  },

  // Run analysis via web worker (background thread)
  runAnalysisAsync: async (request: AnalysisRequest) => {
    set({ isAnalyzing: true, error: null });
    try {
      const worker = new Worker(
        new URL('@infrastructure/workers/analysisWorker.ts', import.meta.url),
        { type: 'module' },
      );

      const result = await new Promise<AnalysisResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('Analysis worker timed out'));
        }, 30_000);

        worker.onmessage = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          if (event.data.type === 'analysis-result') {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error || 'Unknown worker error'));
          }
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(err.message));
        };

        worker.postMessage(request);
      });

      set({ result, isAnalyzing: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Async analysis failed, falling back to sync', undefined, err);
      // Fallback to synchronous analysis
      try {
        const result = projectAnalysisService.analyze(request);
        set({ result, isAnalyzing: false });
      } catch (_syncErr) {
        set({ error: message, isAnalyzing: false });
      }
    }
  },

  clearResults: () => set({ result: null, error: null }),

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),

  setSeverityFilter: (severity) => set({ severityFilter: severity }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setAutoAnalyze: (enabled) => set({ autoAnalyze: enabled }),

  dismissIssue: (issueId: string) => {
    const { result } = get();
    if (!result) return;
    set({
      result: {
        ...result,
        allIssues: result.allIssues.filter((i) => i.id !== issueId),
      },
    });
  },

  // Selectors
  getFilteredIssues: () => {
    const { result, severityFilter, categoryFilter } = get();
    if (!result) return [];

    let issues = result.allIssues;
    if (severityFilter !== 'all') {
      issues = issues.filter((i) => i.severity === severityFilter);
    }
    if (categoryFilter !== 'all') {
      issues = issues.filter((i) => i.category === categoryFilter);
    }
    return issues;
  },

  getHealthScore: () => {
    const { result } = get();
    return result?.health ?? null;
  },

  getIssueCounts: () => {
    const { result } = get();
    const counts: Record<DiagnosticSeverity, number> = { error: 0, warning: 0, info: 0, hint: 0 };
    if (!result) return counts;
    for (const issue of result.allIssues) {
      counts[issue.severity]++;
    }
    return counts;
  },
}));
