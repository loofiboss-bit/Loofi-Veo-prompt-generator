
import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { appUIStrings } from '../translations';
import { ToastMessage } from '../types';

interface VariationsPanelProps {
  variations: string[];
  isLoading: boolean;
  onSelect: (variation: string) => void;
  onClose: () => void;
  uiStrings: {
    title: string;
    use: string;
    loading: string;
    empty: string;
    combine: string;
    combiningButton: string;
    useCombined: string;
    combinedPromptLabel: string;
  };
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  model: string;
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const VariationsPanel: React.FC<VariationsPanelProps> = ({ variations, isLoading, onSelect, onClose, uiStrings, language, model, addToast }) => {
    const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
    const [combinedPrompt, setCombinedPrompt] = useState('');
    const [isCombining, setIsCombining] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleCheckboxChange = (variation: string, isChecked: boolean) => {
        setSelectedVariations(prev => 
            isChecked ? [...prev, variation] : prev.filter(v => v !== variation)
        );
    };
    
    const handleCombine = async () => {
        if (selectedVariations.length < 1) return;
        setIsCombining(true);
        setCombinedPrompt('');
        try {
            const result = await geminiService.combinePromptVariations(selectedVariations, language, model);
            setCombinedPrompt(result);
        } catch (error) {
            addToast(getApiErrorMessage(error, appUIStrings[language]), 'error');
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
        <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-[55] p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="variations-panel-title"
        >
            <div 
                className="bg-slate-900/70 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 id="variations-panel-title" className="text-lg font-semibold text-slate-100">{uiStrings.title}</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        aria-label="Close variations panel"
                    >
                        <Icon name="cancel" className="w-5 h-5" />
                    </button>
                </header>
                
                <div className="p-6 overflow-y-auto space-y-4">
                    {isLoading ? (
                        <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                            <Icon name="spinner" className="w-8 h-8 animate-spin text-cyan-400" />
                            <p className="mt-3">{uiStrings.loading}</p>
                        </div>
                    ) : variations.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <p>{uiStrings.empty}</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {variations.map((variation, index) => (
                                    <label key={index} htmlFor={`variation-${index}`} className="bg-slate-800/60 p-3 rounded-lg border border-slate-700 flex items-start space-x-3 hover:border-cyan-500/50 transition-colors cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id={`variation-${index}`}
                                            checked={selectedVariations.includes(variation)}
                                            onChange={(e) => handleCheckboxChange(variation, e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer mt-1 flex-shrink-0"
                                            aria-labelledby={`variation-text-${index}`}
                                        />
                                        <span id={`variation-text-${index}`} className="text-sm text-slate-300 flex-grow">
                                            {variation}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="pt-4 flex justify-center">
                                <button
                                    onClick={handleCombine}
                                    disabled={selectedVariations.length < 1 || isCombining}
                                    className="flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCombining ? (
                                        <>
                                            <Icon name="spinner" className="w-4 h-4 mr-2 animate-spin" />
                                            <span>{uiStrings.combiningButton}</span>
                                        </>
                                    ) : (
                                        `${uiStrings.combine} (${selectedVariations.length})`
                                    )}
                                </button>
                            </div>

                            { (isCombining || combinedPrompt) && (
                                <div className="pt-4 animate-fade-in-up">
                                    <label htmlFor="combined-prompt-area" className="block text-sm font-medium text-slate-300 mb-2">
                                        {uiStrings.combinedPromptLabel}
                                    </label>
                                    <textarea
                                        id="combined-prompt-area"
                                        value={combinedPrompt}
                                        onChange={(e) => setCombinedPrompt(e.target.value)}
                                        rows={8}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg shadow-sm text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 transition duration-150 ease-in-out p-3 resize-y"
                                        placeholder="Select variations and click 'Combine' to merge them here. You can then edit the result."
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {variations.length > 0 && !isLoading && (
                    <footer className="p-4 border-t border-slate-700 flex-shrink-0 flex justify-end">
                        <button
                            onClick={handleUseCombined}
                            disabled={!combinedPrompt.trim()}
                            className="px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uiStrings.useCombined}
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default VariationsPanel;
