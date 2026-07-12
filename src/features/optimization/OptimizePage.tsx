import React, { useMemo, useState } from 'react';
import Icon from '@shared/components/ui/Icon';
import { useAppStore } from '@core/store/useAppStore';
import { useOptimizationStore } from '@core/store/useOptimizationStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { creativePackExportService, type CreativePackExportFormat } from '@core/services';
import { optimizationOrchestratorService } from '@core/services/optimizationOrchestratorService';
import type { PromptSuggestion } from '@core/types';
import { CostEstimateCard } from './CostEstimateCard';
import { NarrativeHealthPanel } from './NarrativeHealthPanel';
import { PresetRecommendCard } from './PresetRecommendCard';
import { QualityScoreCard } from './QualityScoreCard';

const EMPTY_SUGGESTIONS: PromptSuggestion[] = [];

const getStatusLabel = (status?: string): string => {
  switch (status) {
    case 'analyzing':
      return 'Analyzing';
    case 'ready':
      return 'Ready';
    case 'stale':
      return 'Needs refresh';
    case 'error':
      return 'Error';
    default:
      return 'Idle';
  }
};

export function OptimizePage() {
  const promptState = useAppStore((state) => state.promptState);
  const setPromptState = useAppStore((state) => state.setPromptState);
  const shots = useAppStore((state) => state.sbShots);
  const setSbShots = useAppStore((state) => state.setSbShots);
  const assets = useAppStore((state) => state.assets);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const projectId = currentProjectId || 'default';
  const promptId = projectId;
  const [exportFormat, setExportFormat] = useState<CreativePackExportFormat>('markdown');
  const [copyStatus, setCopyStatus] = useState<string>('');

  const result = useOptimizationStore((state) => state.analysisResults[projectId]);
  const status = useOptimizationStore((state) => state.analysisStatus[projectId]);
  const suggestions = useOptimizationStore(
    (state) => state.suggestions[promptId] ?? EMPTY_SUGGESTIONS,
  );
  const costEstimate = useOptimizationStore((state) => state.costEstimates[promptId]);
  const applySuggestion = useOptimizationStore((state) => state.applySuggestion);
  const dismissSuggestion = useOptimizationStore((state) => state.dismissSuggestion);

  const pendingSuggestions = suggestions.filter((suggestion) => suggestion.status === 'pending');
  const acceptedCount = suggestions.filter((suggestion) => suggestion.status === 'accepted').length;
  const dismissedCount = suggestions.filter(
    (suggestion) => suggestion.status === 'dismissed',
  ).length;

  const creativePackText = useMemo(() => {
    const pack = creativePackExportService.buildCreativePack({
      projectId,
      promptState,
      shots,
    });
    return creativePackExportService.exportCreativePack(pack, exportFormat);
  }, [exportFormat, projectId, promptState, shots]);

  const applyPatch = (suggestion: PromptSuggestion) => {
    const patchResult = optimizationOrchestratorService.applySuggestionPatch({
      promptState,
      shots,
      suggestion,
    });
    if (Object.keys(patchResult.promptStatePatch).length > 0) {
      setPromptState(patchResult.promptStatePatch);
    }
    if (patchResult.shots) {
      setSbShots(patchResult.shots);
    }
  };

  const handleAccept = (suggestion: PromptSuggestion) => {
    const accepted = applySuggestion(promptId, suggestion.id);
    if (accepted) {
      applyPatch(accepted);
    }
  };

  const handleAnalyzeNow = () => {
    void optimizationOrchestratorService.analyzeProject({
      projectId,
      promptId,
      promptState,
      shots,
      assets,
    });
  };

  const handleCopyCreativePack = async () => {
    try {
      await navigator.clipboard.writeText(creativePackText);
      setCopyStatus('Copied Creative Pack to clipboard.');
    } catch {
      setCopyStatus('Clipboard copy failed.');
    }
  };

  return (
    <main className="min-h-full bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
              Creative Intelligence
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
              Optimization Workbench
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Review prompt quality, generation cost, narrative continuity, preset fit, and export a
              complete Flow/Veo plus Suno creative pack.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
              Status: {getStatusLabel(status)}
            </span>
            <button
              type="button"
              onClick={handleAnalyzeNow}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-500"
            >
              <Icon name="zap" className="h-4 w-4" />
              Analyze now
            </button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-500">Pending suggestions</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-300">{pendingSuggestions.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-500">Accepted</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">{acceptedCount}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-500">Dismissed</p>
            <p className="mt-1 text-2xl font-semibold text-slate-300">{dismissedCount}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-500">Analysis source</p>
            <p className="mt-1 text-2xl font-semibold text-violet-300">
              {result?.source ?? 'heuristic'}
            </p>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-5">
            <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-white">Prompt Suggestions</h2>
                <span className="text-xs text-slate-500">
                  {result?.completedAt
                    ? new Date(result.completedAt).toLocaleTimeString()
                    : 'Not run'}
                </span>
              </div>

              {pendingSuggestions.length === 0 ? (
                <p className="rounded-md border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                  No pending suggestions. Add prompt details or run analysis again.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingSuggestions.map((suggestion) => (
                    <article
                      key={suggestion.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-cyan-500/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                              {suggestion.category}
                            </span>
                            <span className="text-xs text-slate-500">
                              {Math.round(suggestion.confidence * 100)}% confidence
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-200">{suggestion.suggested}</p>
                          <p className="mt-1 text-xs text-slate-500">{suggestion.reasoning}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleAccept(suggestion)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
                          >
                            <Icon name="check" className="h-3.5 w-3.5" />
                            Apply
                          </button>
                          <button
                            type="button"
                            onClick={() => dismissSuggestion(promptId, suggestion.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                          >
                            <Icon name="cancel" className="h-3.5 w-3.5" />
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-white">Creative Pack Export</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={exportFormat}
                    onChange={(event) =>
                      setExportFormat(event.target.value as CreativePackExportFormat)
                    }
                    className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200"
                  >
                    <option value="markdown">Markdown</option>
                    <option value="json">JSON</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleCopyCreativePack}
                    className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-white"
                  >
                    <Icon name="copy" className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={creativePackText}
                className="h-80 w-full resize-y rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300"
                aria-label="Creative Pack export preview"
              />
              {copyStatus && <p className="mt-2 text-xs text-slate-400">{copyStatus}</p>}
            </section>
          </div>

          <aside className="space-y-4">
            {costEstimate && (
              <>
                <QualityScoreCard
                  qualityScore={costEstimate.qualityScore}
                  breakdown={costEstimate.breakdown}
                />
                <CostEstimateCard estimate={costEstimate} />
              </>
            )}
            <NarrativeHealthPanel />
            <PresetRecommendCard />
          </aside>
        </section>
      </div>
    </main>
  );
}
