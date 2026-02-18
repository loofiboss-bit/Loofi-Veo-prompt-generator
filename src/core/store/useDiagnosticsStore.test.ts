/**
 * useDiagnosticsStore Tests
 * Tests for project diagnostics Zustand store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalysisResult, AnalysisRequest } from '@core/types/diagnostics';

// Mock projectAnalysisService using vi.hoisted
const mockAnalysisResult: AnalysisResult = {
  projectId: 'test-project',
  allIssues: [
    {
      id: 'issue-1',
      severity: 'error',
      category: 'project-health',
      message: 'Missing required field',
      location: { type: 'project', entityId: 'test-project', label: 'Test project' },
      detectedAt: Date.now(),
    },
    {
      id: 'issue-2',
      severity: 'warning',
      category: 'prompt-quality',
      message: 'Inconsistent naming',
      location: { type: 'prompt', entityId: 'prompt-1', label: 'Prompt' },
      detectedAt: Date.now(),
    },
    {
      id: 'issue-3',
      severity: 'info',
      category: 'dependency',
      message: 'Consider optimization',
      location: { type: 'clip', entityId: 'clip-1', label: 'Clip 1' },
      detectedAt: Date.now(),
    },
  ],
  health: {
    overall: 75,
    tier: 'Good',
    color: 'yellow',
    dimensions: [
      {
        name: 'Structure',
        score: 80,
        maxScore: 100,
        description: 'Project structure quality',
      },
      {
        name: 'Prompt Quality',
        score: 70,
        maxScore: 100,
        description: 'Prompt quality and consistency',
      },
      {
        name: 'Dependencies',
        score: 75,
        maxScore: 100,
        description: 'Dependency integrity',
      },
    ],
    computedAt: Date.now(),
  },
  sceneConsistency: {
    isConsistent: true,
    shotResults: [],
    issues: [],
  },
  timelineIntegrity: {
    isValid: true,
    gaps: [],
    overlaps: [],
    orphanClips: [],
    unlinkedShots: [],
    issues: [],
  },
  dependencyMap: {
    nodes: [],
    edges: [],
    isolatedNodes: [],
  },
  analysisTimeMs: 150,
  lastAnalyzedAt: Date.now(),
};

const mockAnalysisRequest: AnalysisRequest = {
  type: 'full',
  projectId: 'test-project',
  shots: [],
  tracks: [],
  clips: [],
  promptState: {} as AnalysisRequest['promptState'],
  globalContext: {} as AnalysisRequest['globalContext'],
  characters: [],
  locations: [],
};

const mockProjectAnalysisService = vi.hoisted(() => ({
  analyze: vi.fn(() => mockAnalysisResult),
}));

vi.mock('@core/services/projectAnalysisService', () => ({
  projectAnalysisService: mockProjectAnalysisService,
}));

vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { useDiagnosticsStore } from './useDiagnosticsStore';

describe('useDiagnosticsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useDiagnosticsStore.setState({
      result: null,
      isAnalyzing: false,
      error: null,
      isPanelOpen: false,
      severityFilter: 'all',
      categoryFilter: 'all',
      autoAnalyze: false,
    });
    mockProjectAnalysisService.analyze.mockReturnValue(mockAnalysisResult);
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useDiagnosticsStore.getState();
      expect(state.result).toBeNull();
      expect(state.isAnalyzing).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isPanelOpen).toBe(false);
      expect(state.severityFilter).toBe('all');
      expect(state.categoryFilter).toBe('all');
      expect(state.autoAnalyze).toBe(false);
    });
  });

  describe('runAnalysis', () => {
    it('should run analysis successfully', () => {
      const request: AnalysisRequest = mockAnalysisRequest;

      useDiagnosticsStore.getState().runAnalysis(request);

      expect(mockProjectAnalysisService.analyze).toHaveBeenCalledWith(request);

      const state = useDiagnosticsStore.getState();
      expect(state.result).toEqual(mockAnalysisResult);
      expect(state.isAnalyzing).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isAnalyzing during analysis', () => {
      const request: AnalysisRequest = { ...mockAnalysisRequest, type: 'health' };

      // Mock a slow analysis
      mockProjectAnalysisService.analyze.mockImplementation(() => {
        // Check state during execution
        const state = useDiagnosticsStore.getState();
        expect(state.isAnalyzing).toBe(true);
        return mockAnalysisResult;
      });

      useDiagnosticsStore.getState().runAnalysis(request);

      expect(useDiagnosticsStore.getState().isAnalyzing).toBe(false);
    });

    it('should handle analysis errors', () => {
      const request: AnalysisRequest = mockAnalysisRequest;

      mockProjectAnalysisService.analyze.mockImplementation(() => {
        throw new Error('Analysis failed');
      });

      useDiagnosticsStore.getState().runAnalysis(request);

      const state = useDiagnosticsStore.getState();
      expect(state.error).toBe('Analysis failed');
      expect(state.isAnalyzing).toBe(false);
      expect(state.result).toBeNull();
    });
  });

  describe('runAnalysisAsync', () => {
    it('should run async analysis successfully', async () => {
      const request: AnalysisRequest = mockAnalysisRequest;

      // Mock Worker that auto-responds when onmessage is set
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workerInstance: any = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _onmessage: null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _onerror: null as any,
      };
      Object.defineProperty(workerInstance, 'onmessage', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set(fn: any) {
          workerInstance._onmessage = fn;
          // Auto-respond after handler is set
          queueMicrotask(() => {
            fn({ data: { type: 'analysis-result', result: mockAnalysisResult } });
          });
        },
        get() {
          return workerInstance._onmessage;
        },
      });
      Object.defineProperty(workerInstance, 'onerror', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set(fn: any) {
          workerInstance._onerror = fn;
        },
        get() {
          return workerInstance._onerror;
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.Worker = vi.fn().mockImplementation(() => workerInstance) as any;

      await useDiagnosticsStore.getState().runAnalysisAsync(request);

      const state = useDiagnosticsStore.getState();
      expect(state.result).toEqual(mockAnalysisResult);
      expect(state.isAnalyzing).toBe(false);
    });

    it('should fallback to sync analysis on worker error', async () => {
      const request: AnalysisRequest = mockAnalysisRequest;

      // Mock Worker that auto-errors when onerror is set
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workerInstance: any = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _onmessage: null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _onerror: null as any,
      };
      Object.defineProperty(workerInstance, 'onmessage', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set(fn: any) {
          workerInstance._onmessage = fn;
        },
        get() {
          return workerInstance._onmessage;
        },
      });
      Object.defineProperty(workerInstance, 'onerror', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set(fn: any) {
          workerInstance._onerror = fn;
          // Auto-trigger error after handler is set
          queueMicrotask(() => {
            fn({ message: 'Worker failed' });
          });
        },
        get() {
          return workerInstance._onerror;
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.Worker = vi.fn().mockImplementation(() => workerInstance) as any;

      await useDiagnosticsStore.getState().runAnalysisAsync(request);

      expect(mockProjectAnalysisService.analyze).toHaveBeenCalled();
      const state = useDiagnosticsStore.getState();
      expect(state.result).toEqual(mockAnalysisResult);
    });
  });

  describe('panel controls', () => {
    it('should toggle panel', () => {
      useDiagnosticsStore.getState().togglePanel();
      expect(useDiagnosticsStore.getState().isPanelOpen).toBe(true);

      useDiagnosticsStore.getState().togglePanel();
      expect(useDiagnosticsStore.getState().isPanelOpen).toBe(false);
    });

    it('should open panel', () => {
      useDiagnosticsStore.getState().openPanel();
      expect(useDiagnosticsStore.getState().isPanelOpen).toBe(true);
    });

    it('should close panel', () => {
      useDiagnosticsStore.setState({ isPanelOpen: true });
      useDiagnosticsStore.getState().closePanel();
      expect(useDiagnosticsStore.getState().isPanelOpen).toBe(false);
    });
  });

  describe('filters', () => {
    it('should set severity filter', () => {
      useDiagnosticsStore.getState().setSeverityFilter('error');
      expect(useDiagnosticsStore.getState().severityFilter).toBe('error');
    });

    it('should set category filter', () => {
      useDiagnosticsStore.getState().setCategoryFilter('project-health');
      expect(useDiagnosticsStore.getState().categoryFilter).toBe('project-health');
    });

    it('should set auto analyze', () => {
      useDiagnosticsStore.getState().setAutoAnalyze(true);
      expect(useDiagnosticsStore.getState().autoAnalyze).toBe(true);
    });
  });

  describe('clearResults', () => {
    it('should clear results and error', () => {
      useDiagnosticsStore.setState({
        result: mockAnalysisResult,
        error: 'Some error',
      });

      useDiagnosticsStore.getState().clearResults();

      const state = useDiagnosticsStore.getState();
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('dismissIssue', () => {
    it('should remove dismissed issue', () => {
      useDiagnosticsStore.setState({ result: mockAnalysisResult });

      useDiagnosticsStore.getState().dismissIssue('issue-1');

      const state = useDiagnosticsStore.getState();
      expect(state.result?.allIssues).toHaveLength(2);
      expect(state.result?.allIssues.find((i) => i.id === 'issue-1')).toBeUndefined();
    });

    it('should do nothing if no result', () => {
      useDiagnosticsStore.getState().dismissIssue('issue-1');
      expect(useDiagnosticsStore.getState().result).toBeNull();
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      useDiagnosticsStore.setState({ result: mockAnalysisResult });
    });

    it('getFilteredIssues should return all issues when no filter', () => {
      const issues = useDiagnosticsStore.getState().getFilteredIssues();
      expect(issues).toHaveLength(3);
    });

    it('getFilteredIssues should filter by severity', () => {
      useDiagnosticsStore.setState({ severityFilter: 'error' });
      const issues = useDiagnosticsStore.getState().getFilteredIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
    });

    it('getFilteredIssues should filter by category', () => {
      useDiagnosticsStore.setState({ categoryFilter: 'prompt-quality' });
      const issues = useDiagnosticsStore.getState().getFilteredIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0].category).toBe('prompt-quality');
    });

    it('getFilteredIssues should apply both filters', () => {
      useDiagnosticsStore.setState({
        severityFilter: 'warning',
        categoryFilter: 'prompt-quality',
      });
      const issues = useDiagnosticsStore.getState().getFilteredIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('issue-2');
    });

    it('getFilteredIssues should return empty array when no result', () => {
      useDiagnosticsStore.setState({ result: null });
      const issues = useDiagnosticsStore.getState().getFilteredIssues();
      expect(issues).toEqual([]);
    });

    it('getHealthScore should return health score', () => {
      const health = useDiagnosticsStore.getState().getHealthScore();
      expect(health).toEqual(mockAnalysisResult.health);
    });

    it('getHealthScore should return null when no result', () => {
      useDiagnosticsStore.setState({ result: null });
      const health = useDiagnosticsStore.getState().getHealthScore();
      expect(health).toBeNull();
    });

    it('getIssueCounts should return counts by severity', () => {
      const counts = useDiagnosticsStore.getState().getIssueCounts();
      expect(counts.error).toBe(1);
      expect(counts.warning).toBe(1);
      expect(counts.info).toBe(1);
      expect(counts.hint).toBe(0);
    });

    it('getIssueCounts should return zeros when no result', () => {
      useDiagnosticsStore.setState({ result: null });
      const counts = useDiagnosticsStore.getState().getIssueCounts();
      expect(counts).toEqual({ error: 0, warning: 0, info: 0, hint: 0 });
    });
  });

  describe('edge cases', () => {
    it('should handle empty issues array', () => {
      const emptyResult: AnalysisResult = {
        ...mockAnalysisResult,
        allIssues: [],
      };
      useDiagnosticsStore.setState({ result: emptyResult });

      const issues = useDiagnosticsStore.getState().getFilteredIssues();
      expect(issues).toEqual([]);

      const counts = useDiagnosticsStore.getState().getIssueCounts();
      expect(counts).toEqual({ error: 0, warning: 0, info: 0, hint: 0 });
    });

    it('should handle non-Error exceptions', () => {
      mockProjectAnalysisService.analyze.mockImplementation(() => {
        throw 'String error';
      });

      const request: AnalysisRequest = {
        ...mockAnalysisRequest,
      };

      useDiagnosticsStore.getState().runAnalysis(request);

      expect(useDiagnosticsStore.getState().error).toBe('String error');
    });
  });
});
