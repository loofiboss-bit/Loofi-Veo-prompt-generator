/**
 * DiagnosticsPanel Component
 * v1.8.0 — Project Intelligence Layer
 *
 * Full diagnostics tab with health score, issue list, and dependency graph.
 * Supports filtering by severity and category, inline issue highlighting,
 * and auto-dismiss via the diagnostics store.
 */

import React, { useCallback, useMemo } from 'react';
import { useDiagnosticsStore } from '@core/store/useDiagnosticsStore';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { DependencyGraph } from './DependencyGraph';
import { HealthBadge } from './HealthBadge';
import Icon from '@shared/components/ui/Icon';
import type { AnalysisRequest } from '@core/types/diagnostics';
import type { DiagnosticSeverity, DiagnosticCategory } from '@core/types/diagnostics';

interface DiagnosticsPanelProps {
  onClose: () => void;
}

const SEVERITY_ICONS: Record<DiagnosticSeverity, string> = {
  error: '🔴',
  warning: '🟡',
  info: '🔵',
  hint: '💡',
};

const SEVERITY_CLASSES: Record<DiagnosticSeverity, string> = {
  error: 'border-red-500/30 bg-red-500/5',
  warning: 'border-yellow-500/30 bg-yellow-500/5',
  info: 'border-blue-500/30 bg-blue-500/5',
  hint: 'border-slate-500/30 bg-slate-500/5',
};

const CATEGORY_LABELS: Record<DiagnosticCategory, string> = {
  'project-health': 'Project Health',
  'scene-consistency': 'Scene Consistency',
  'timeline-integrity': 'Timeline Integrity',
  'prompt-quality': 'Prompt Quality',
  dependency: 'Dependency',
};

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ onClose }) => {
  const store = useDiagnosticsStore();
  const appStore = useAppStore();
  const projectStore = useProjectStore();

  const {
    result,
    isAnalyzing,
    severityFilter,
    categoryFilter,
    setSeverityFilter,
    setCategoryFilter,
    dismissIssue,
    runAnalysis,
  } = store;

  const filteredIssues = store.getFilteredIssues();
  const issueCounts = store.getIssueCounts();
  const health = store.getHealthScore();

  // Build analysis request from current state
  const buildRequest = useCallback((): AnalysisRequest => {
    return {
      type: 'full',
      projectId: projectStore.currentProjectId || 'default',
      shots: appStore.sbShots,
      tracks: appStore.tracks,
      clips: appStore.clips,
      promptState: appStore.promptState,
      globalContext: appStore.sbGlobalContext,
      characters: [],
      locations: [],
    };
  }, [appStore, projectStore.currentProjectId]);

  const handleRunAnalysis = useCallback(() => {
    const request = buildRequest();
    runAnalysis(request);
  }, [buildRequest, runAnalysis]);

  // Active tab: 'issues' | 'health' | 'graph'
  const [activeTab, setActiveTab] = React.useState<'issues' | 'health' | 'graph'>('issues');

  const severityOptions: Array<{ value: DiagnosticSeverity | 'all'; label: string }> = useMemo(
    () => [
      { value: 'all', label: `All (${result?.allIssues.length || 0})` },
      { value: 'error', label: `Errors (${issueCounts.error})` },
      { value: 'warning', label: `Warnings (${issueCounts.warning})` },
      { value: 'info', label: `Info (${issueCounts.info})` },
      { value: 'hint', label: `Hints (${issueCounts.hint})` },
    ],
    [result, issueCounts],
  );

  const categoryOptions: Array<{ value: string; label: string }> = useMemo(() => {
    const cats = new Set(result?.allIssues.map((i) => i.category) || []);
    return [
      { value: 'all', label: 'All Categories' },
      ...Array.from(cats).map((c) => ({
        value: c,
        label: CATEGORY_LABELS[c as DiagnosticCategory] || c,
      })),
    ];
  }, [result]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <Icon name="activity" className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-100">Project Diagnostics</h2>
            <HealthBadge health={health} compact />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? (
                <Icon name="spinner" className="w-4 h-4 animate-spin" />
              ) : (
                <Icon name="zap" className="w-4 h-4" />
              )}
              {isAnalyzing ? 'Analyzing…' : 'Run Analysis'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-700/50">
          {(['issues', 'health', 'graph'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
              }`}
            >
              {tab === 'issues' && `Issues${result ? ` (${result.allIssues.length})` : ''}`}
              {tab === 'health' && 'Health Score'}
              {tab === 'graph' && 'Dependency Map'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!result && !isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4">
              <Icon name="activity" className="w-12 h-12 text-slate-600" />
              <p className="text-sm">
                No analysis data. Click &quot;Run Analysis&quot; to scan your project.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Analyzing project…</p>
            </div>
          )}

          {/* Issues Tab */}
          {activeTab === 'issues' && result && !isAnalyzing && (
            <div className="space-y-3">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                {severityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSeverityFilter(opt.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      severityFilter === opt.value
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issue List */}
              {filteredIssues.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  {result.allIssues.length === 0
                    ? '✅ No issues found. Your project looks great!'
                    : 'No issues match the current filter.'}
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${SEVERITY_CLASSES[issue.severity]}`}
                  >
                    <span className="text-sm mt-0.5">{SEVERITY_ICONS[issue.severity]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200 font-medium">{issue.message}</div>
                      {issue.detail && (
                        <div className="text-xs text-slate-400 mt-1">{issue.detail}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                          {CATEGORY_LABELS[issue.category] || issue.category}
                        </span>
                        {issue.location && (
                          <span className="text-xs text-slate-500">
                            {issue.location.label ||
                              `${issue.location.type} ${issue.location.entityId}`}
                          </span>
                        )}
                        {issue.fixAction && (
                          <span className="text-xs text-cyan-400">Auto-fixable</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => dismissIssue(issue.id)}
                      className="p-1 text-slate-500 hover:text-white transition-colors flex-shrink-0"
                      title="Dismiss"
                    >
                      <Icon name="close" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Health Tab */}
          {activeTab === 'health' && result && !isAnalyzing && (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="text-center">
                <div
                  className="text-5xl font-bold"
                  style={{
                    color:
                      result.health.color === 'green'
                        ? '#4ade80'
                        : result.health.color === 'yellow'
                          ? '#facc15'
                          : result.health.color === 'orange'
                            ? '#fb923c'
                            : '#f87171',
                  }}
                >
                  {result.health.overall}
                </div>
                <div className="text-sm text-slate-400 mt-1">{result.health.tier}</div>
              </div>

              {/* Dimension Bars */}
              <div className="space-y-3">
                {result.health.dimensions.map((dim) => (
                  <div key={dim.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">{dim.name}</span>
                      <span className="text-slate-500">
                        {dim.score}/{dim.maxScore}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(dim.score / dim.maxScore) * 100}%`,
                          backgroundColor:
                            dim.score / dim.maxScore >= 0.7
                              ? '#4ade80'
                              : dim.score / dim.maxScore >= 0.4
                                ? '#facc15'
                                : '#f87171',
                        }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{dim.description}</div>
                  </div>
                ))}
              </div>

              {/* Analysis Meta */}
              <div className="text-xs text-slate-600 text-center">
                Analyzed in {result.analysisTimeMs.toFixed(0)}ms ·{' '}
                {new Date(result.lastAnalyzedAt).toLocaleTimeString()}
              </div>
            </div>
          )}

          {/* Dependency Graph Tab */}
          {activeTab === 'graph' && result && !isAnalyzing && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 mb-2">
                {result.dependencyMap.nodes.length} nodes · {result.dependencyMap.edges.length}{' '}
                edges
                {result.dependencyMap.isolatedNodes.length > 0 &&
                  ` · ${result.dependencyMap.isolatedNodes.length} isolated`}
              </div>
              <DependencyGraph map={result.dependencyMap} width={620} height={400} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
