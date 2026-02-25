/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState } from 'react';
import Icon from '@shared/components/ui/Icon';
import EmptyState from '@shared/components/EmptyState';
import AppDialog from '@shared/components/ui/AppDialog';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { useTranslation } from 'react-i18next';
import { ToastMessage, PromptVariation } from '@core/types';

interface VariationsPanelProps {
  variations: PromptVariation[];
  isLoading: boolean;
  onSelect: (variation: string) => void;
  onClose: () => void;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  model: string;
  addToast: (message: string, type: ToastMessage['type']) => void;
  targetModel: 'veo' | 'sora' | 'local';
}

const VariationsPanel: React.FC<VariationsPanelProps> = ({
  variations,
  isLoading,
  onSelect,
  onClose,
  language,
  model,
  addToast,
  targetModel,
}) => {
  const { t, i18n } = useTranslation(['project', 'errors']);
  const errorStrings = i18n.getResourceBundle(i18n.language, 'errors') || {};
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [combinedPrompt, setCombinedPrompt] = useState('');
  const [isCombining, setIsCombining] = useState(false);

  const handleCheckboxChange = (promptText: string, isChecked: boolean) => {
    setSelectedVariations((prev) =>
      isChecked ? [...prev, promptText] : prev.filter((v) => v !== promptText),
    );
  };

  const handleCombine = async () => {
    if (selectedVariations.length < 1) return;
    setIsCombining(true);
    setCombinedPrompt('');
    try {
      const result = await geminiService.combinePromptVariations(
        selectedVariations,
        language,
        model,
        targetModel,
      );
      setCombinedPrompt(result);
    } catch (error) {
      addToast(getApiErrorMessage(error, errorStrings), 'error');
    } finally {
      setIsCombining(false);
    }
  };

  const handleUseCombined = () => {
    if (combinedPrompt.trim()) {
      onSelect(combinedPrompt);
    }
  };

  return (
    <AppDialog
      isOpen={true}
      onClose={onClose}
      size="xl"
      showCloseButton={false}
      bodyClassName="!p-0"
      dialogClassName="max-w-5xl"
      ariaLabelledBy="variations-panel-title"
    >
      <div className="flex max-h-[90vh] flex-col bg-slate-900/70">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 p-4">
          <h2 id="variations-panel-title" className="text-lg font-semibold text-slate-100">
            {t('variations.title')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Close variations panel"
          >
            <Icon name="cancel" className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-16 text-slate-300 flex flex-col items-center">
              <Icon name="spinner" className="w-10 h-10 animate-spin text-cyan-400" />
              <p className="mt-4 text-lg">{t('variations.loading')}</p>
            </div>
          ) : variations.length === 0 ? (
            <EmptyState
              icon="🧪"
              title={t('variations.empty')}
              description="Generate variations to compare alternate prompt directions."
              className="py-12"
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {variations.map((variation, index) => (
                  <div
                    key={index}
                    className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 flex flex-col hover:border-slate-600 transition-all shadow-lg hover:shadow-cyan-900/10"
                  >
                    <div className="flex-grow">
                      <span className="inline-block px-2 py-1 mb-3 text-xs font-bold uppercase tracking-wider text-cyan-300 bg-cyan-900/40 rounded border border-cyan-800/50">
                        {variation.label}
                      </span>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {variation.prompt}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                      <label
                        htmlFor={`variation-check-${index}`}
                        className="flex items-center space-x-2 text-sm text-slate-400 cursor-pointer hover:text-slate-200 transition-colors"
                      >
                        <input
                          type="checkbox"
                          id={`variation-check-${index}`}
                          checked={selectedVariations.includes(variation.prompt)}
                          onChange={(e) =>
                            handleCheckboxChange(variation.prompt, e.currentTarget.checked)
                          }
                          className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span>Select for Mix</span>
                      </label>
                      <button
                        onClick={() => onSelect(variation.prompt)}
                        className="px-4 py-2 text-xs font-semibold rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500 shadow-sm"
                      >
                        {t('variations.use')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-700/50">
                <div className="flex justify-center mb-4">
                  <button
                    onClick={handleCombine}
                    disabled={selectedVariations.length < 2 || isCombining}
                    className="flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg transition-all bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {isCombining ? (
                      <>
                        <Icon name="spinner" className="w-4 h-4 mr-2 animate-spin" />
                        <span>{t('variations.combiningButton')}</span>
                      </>
                    ) : (
                      <>
                        <Icon name="magic" className="w-4 h-4 mr-2" />
                        <span>
                          {t('variations.combine')} ({selectedVariations.length})
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {(isCombining || combinedPrompt) && (
                  <div className="animate-fade-in-up bg-slate-800/40 p-4 rounded-xl border border-slate-700">
                    <label
                      htmlFor="combined-prompt-area"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      {t('variations.combinedPromptLabel')}
                    </label>
                    <textarea
                      id="combined-prompt-area"
                      value={combinedPrompt}
                      onChange={(e) => setCombinedPrompt(e.currentTarget.value)}
                      rows={6}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg shadow-inner text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 transition duration-150 ease-in-out p-3 resize-y text-sm"
                      placeholder="Select multiple variations above and click 'Combine' to generate a merged prompt here."
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={handleUseCombined}
                        disabled={!combinedPrompt.trim()}
                        className="px-5 py-2 text-sm font-semibold rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                      >
                        {t('variations.useCombined')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppDialog>
  );
};

export default VariationsPanel;
