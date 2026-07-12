import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useOptimizationStore } from '@core/store/useOptimizationStore';
import type { PromptSuggestion, SuggestionCategory } from '@core/types';
import { CATEGORY_COLORS } from '@core/constants/optimizationRules';

interface InlineSuggestionsProps {
  promptId: string;
  onAcceptSuggestion?: (suggestion: PromptSuggestion) => void;
}

const CATEGORY_ICONS: Record<SuggestionCategory, string> = {
  style: '🎨',
  camera: '🎬',
  lighting: '💡',
  specificity: '🎯',
  syntax: '📝',
};
const EMPTY_SUGGESTIONS: PromptSuggestion[] = [];

export const InlineSuggestions: React.FC<InlineSuggestionsProps> = ({
  promptId,
  onAcceptSuggestion,
}) => {
  const { t } = useTranslation('optimization');
  const suggestions = useOptimizationStore(
    (state) => state.suggestions[promptId] ?? EMPTY_SUGGESTIONS,
  );
  const applySuggestion = useOptimizationStore((state) => state.applySuggestion);
  const dismissSuggestion = useOptimizationStore((state) => state.dismissSuggestion);
  const isAnalyzing = useOptimizationStore((state) => state.isAnalyzing);

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');

  const handleAccept = useCallback(
    (suggestion: PromptSuggestion) => {
      const acceptedSuggestion = applySuggestion(promptId, suggestion.id);
      if (acceptedSuggestion) {
        onAcceptSuggestion?.(acceptedSuggestion);
      }
    },
    [applySuggestion, promptId, onAcceptSuggestion],
  );

  const handleDismiss = useCallback(
    (suggestion: PromptSuggestion) => {
      dismissSuggestion(promptId, suggestion.id);
    },
    [dismissSuggestion, promptId],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, suggestion: PromptSuggestion) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAccept(suggestion);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDismiss(suggestion);
      }
    },
    [handleAccept, handleDismiss],
  );

  if (pendingSuggestions.length === 0 && !isAnalyzing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('aria.suggestionList')}
      className="mt-2 space-y-1.5"
    >
      {isAnalyzing && (
        <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-ping" />
          {t('suggestions.analyzing')}
        </div>
      )}
      {pendingSuggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          role="button"
          tabIndex={0}
          aria-label={`${t(`suggestions.categories.${suggestion.category}`)} — ${suggestion.suggested}`}
          onKeyDown={(e) => handleKeyDown(e, suggestion)}
          className="group flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2 transition-all duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          style={{
            borderLeftColor: CATEGORY_COLORS[suggestion.category] ?? '#666',
            borderLeftWidth: '3px',
          }}
        >
          <span className="text-sm flex-shrink-0" aria-hidden="true">
            {CATEGORY_ICONS[suggestion.category]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${CATEGORY_COLORS[suggestion.category]}20`,
                  color: CATEGORY_COLORS[suggestion.category],
                }}
              >
                {t(`suggestions.categories.${suggestion.category}`)}
              </span>
              {suggestion.source === 'heuristic' && (
                <span className="text-[10px] text-gray-500 italic">{t('suggestions.offline')}</span>
              )}
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{suggestion.suggested}</p>
            {suggestion.reasoning && (
              <p className="text-[10px] text-gray-500 mt-0.5">{suggestion.reasoning}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => handleAccept(suggestion)}
              aria-label={t('suggestions.accept')}
              className="p-1 rounded text-green-400 hover:bg-green-400/20 transition-colors"
            >
              ✓
            </button>
            <button
              onClick={() => handleDismiss(suggestion)}
              aria-label={t('suggestions.dismiss')}
              className="p-1 rounded text-red-400 hover:bg-red-400/20 transition-colors"
            >
              ✗
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
