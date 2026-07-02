import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@shared/components/ui/Icon';
import AppDialog from '@shared/components/ui/AppDialog';
import * as geminiService from '@core/services/geminiService';
import { ModelComparisonResponse } from '@core/types';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { useTranslation } from 'react-i18next';

interface CompareModelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: string;
  language: string;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onSelectPrompt: (prompt: string, model: 'flow-veo' | 'veo-api') => void;
}

const CompareModelsModal: React.FC<CompareModelsModalProps> = ({
  isOpen,
  onClose,
  idea,
  language,
  addToast,
  onSelectPrompt,
}) => {
  const { t, i18n } = useTranslation(['studios', 'errors']);
  const [result, setResult] = useState<ModelComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateComparison = useCallback(async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const comparison = await geminiService.generateModelComparison(idea, language);
      setResult(comparison);
    } catch (error) {
      addToast(
        getApiErrorMessage(error, i18n.getResourceBundle(i18n.language, 'errors') || {}),
        'error',
      );
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [idea, language, addToast, i18n, onClose]);

  useEffect(() => {
    if (isOpen && idea) {
      generateComparison();
    } else if (isOpen && !idea) {
      // Should theoretically be disabled by parent if no idea, but safety check
      addToast('Please enter a core idea first.', 'error');
      onClose();
    }
  }, [isOpen, idea, addToast, onClose, generateComparison]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelect = (prompt: string, model: 'flow-veo' | 'veo-api') => {
    onSelectPrompt(prompt, model);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      layer="overlay"
      showCloseButton={false}
      bodyClassName="!p-0"
    >
      <div className="relative bg-slate-900/80 backdrop-blur-xl w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="compare" className="w-6 h-6 text-cyan-400" />
            {t('studios:compareModels.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Icon name="spinner" className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
              <p>{t('studios:compareModels.loading')}</p>
            </div>
          ) : result ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              {/* Flow scene pack column */}
              <div className="flex flex-col h-full bg-slate-800/20 rounded-xl border border-cyan-500/30 overflow-hidden">
                <div className="p-4 bg-cyan-900/10 border-b border-cyan-500/20 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Icon name="film" className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-cyan-100">
                      {t('studios:compareModels.veoHeader')}
                    </h3>
                    <p className="text-xs text-cyan-200/60">
                      {t('studios:compareModels.veoDescription')}
                    </p>
                  </div>
                </div>
                <div className="p-5 flex-grow font-serif leading-relaxed text-slate-200 text-sm md:text-base whitespace-pre-wrap">
                  {result.flowScenePackPrompt}
                </div>
                <div className="p-4 bg-slate-900/30 border-t border-cyan-500/20">
                  <button
                    onClick={() => handleSelect(result.flowScenePackPrompt, 'flow-veo')}
                    className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2"
                  >
                    <span>{t('studios:compareModels.useButton')}</span>
                    <Icon name="check" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Veo API column */}
              <div className="flex flex-col h-full bg-slate-800/20 rounded-xl border border-blue-500/30 overflow-hidden">
                <div className="p-4 bg-blue-900/10 border-b border-blue-500/20 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Icon name="api" className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-100">
                      {t('studios:compareModels.veoApiHeader')}
                    </h3>
                    <p className="text-xs text-blue-200/60">
                      {t('studios:compareModels.veoApiDescription')}
                    </p>
                  </div>
                </div>
                <div className="p-5 flex-grow font-sans leading-relaxed text-slate-200 text-sm md:text-base whitespace-pre-wrap">
                  {result.veoApiPrompt}
                </div>
                <div className="p-4 bg-slate-900/30 border-t border-blue-500/20">
                  <button
                    onClick={() => handleSelect(result.veoApiPrompt, 'veo-api')}
                    className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                  >
                    <span>{t('studios:compareModels.useButton')}</span>
                    <Icon name="check" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppDialog>
  );
};

export default CompareModelsModal;
