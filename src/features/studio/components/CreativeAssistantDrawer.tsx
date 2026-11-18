import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  creativeAssistantService,
  type CreativeAnalysisInput,
} from '@core/services/creativeAssistantService';
import type { CreativeSuggestion } from '@core/types/videoIteration';

export interface CreativeAssistantDrawerProps {
  analysisInput: CreativeAnalysisInput;
  onApplyInstruction: (instruction: string) => void;
  disabled?: boolean;
}

export const CreativeAssistantDrawer: React.FC<CreativeAssistantDrawerProps> = ({
  analysisInput,
  onApplyInstruction,
  disabled = false,
}) => {
  const { t, i18n } = useTranslation('studio');
  const {
    idea,
    currentPrompt,
    notes,
    target,
    currentVersion,
    cameraDirection,
    lightingStyle,
    neighboringShotSummary,
    language,
  } = analysisInput;
  const heuristicSuggestions = useMemo(
    () =>
      creativeAssistantService.generateHeuristicSuggestions({
        idea,
        currentPrompt,
        notes,
        target,
        currentVersion,
        cameraDirection,
        lightingStyle,
        neighboringShotSummary,
        language: language ?? i18n.language,
      }),
    [
      idea,
      currentPrompt,
      notes,
      target,
      currentVersion,
      cameraDirection,
      lightingStyle,
      neighboringShotSummary,
      language,
      i18n.language,
    ],
  );
  const [aiSuggestions, setAiSuggestions] = useState<CreativeSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setAiSuggestions(null);
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [
    analysisInput.idea,
    analysisInput.currentPrompt,
    analysisInput.currentVersion,
    analysisInput.neighboringShotSummary,
  ]);

  const handleAnalyzeWithAi = async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    try {
      const res = await creativeAssistantService.generateSuggestions(
        {
          ...analysisInput,
          language: analysisInput.language ?? i18n.language,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setAiSuggestions(res);
      }
    } catch {
      // Keep heuristic suggestions on error
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const suggestions = aiSuggestions ?? heuristicSuggestions;

  const categoryIcons: Record<string, string> = {
    camera: '📹',
    lighting: '💡',
    deviation: '⚠️',
    'iteration-prompt': '✨',
  };

  return (
    <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--color-border-primary)]">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] hover:opacity-80"
          aria-expanded={isOpen}
        >
          <span>💡</span>
          <span>
            {t('creativeAssistant.title', {
              defaultValue: 'Intelligent Creative Assistant',
            })}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            ({suggestions.length} {isOpen ? '▲' : '▼'})
          </span>
        </button>
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="text-xs text-blue-400 animate-pulse">
              {t('creativeAssistant.analyzing', { defaultValue: 'Analyzing scene…' })}
            </span>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={handleAnalyzeWithAi}
              data-testid="creative-assistant-ai-analyze"
              className="rounded border border-blue-500/40 bg-blue-600/15 px-2.5 py-1 text-xs font-medium text-blue-300 hover:bg-blue-600/25 disabled:opacity-50"
            >
              ✨{' '}
              {t('creativeAssistant.analyzeWithAi', {
                defaultValue: 'Deep AI Analysis',
              })}
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`rounded-lg border p-3 transition-colors ${
                suggestion.category === 'deviation'
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : 'border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                  <span>{categoryIcons[suggestion.category] ?? '✨'}</span>
                  <span>{suggestion.title}</span>
                </div>
                {suggestion.confidence && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {suggestion.confidence}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {suggestion.description}
              </p>

              {suggestion.suggestedInstruction && (
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--color-border-primary)] pt-2">
                  <span className="truncate font-mono text-[11px] text-blue-400">
                    &ldquo;{suggestion.suggestedInstruction}&rdquo;
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onApplyInstruction(suggestion.suggestedInstruction!)}
                    className="shrink-0 rounded bg-blue-600/20 px-2.5 py-1 text-xs font-medium text-blue-300 hover:bg-blue-600/30 disabled:opacity-50"
                  >
                    {t('creativeAssistant.useSuggestion', {
                      defaultValue: 'Use as instruction',
                    })}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
