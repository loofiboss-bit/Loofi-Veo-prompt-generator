/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HistoryEntry, CustomPreset, PromptTemplate } from '@core/types';
import { filterItem } from '@core/utils/search';
import Icon from '@shared/components/ui/Icon';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  presets: CustomPreset[];
  templates: PromptTemplate[];
  onSelectHistory: (entry: HistoryEntry) => void;
  onSelectPreset: (preset: CustomPreset) => void;
  onSelectTemplate: (template: PromptTemplate) => void;
  uiStrings: {
    placeholder: string;
    title: string;
    historySection: string;
    presetsSection: string;
    templatesSection: string;
    noResults: string;
    recentHistory: string;
  };
  language: string;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen, onClose, history, presets, templates,
  onSelectHistory, onSelectPreset, onSelectTemplate,
  uiStrings, language
}) => {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce logic: Update debouncedQuery 300ms after inputValue changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredHistory = useMemo(() => {
    if (!debouncedQuery.trim()) return history.slice(0, 5); // Recent 5
    return history.filter(entry => filterItem(debouncedQuery, entry.params.idea, entry.prompt));
  }, [history, debouncedQuery]);

  const filteredPresets = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return presets.filter(preset => filterItem(debouncedQuery, preset.name, preset.params.idea));
  }, [presets, debouncedQuery]);

  const filteredTemplates = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return templates.filter(template => filterItem(debouncedQuery, template.name, template.description));
  }, [templates, debouncedQuery]);

  const hasResults = filteredHistory.length > 0 || filteredPresets.length > 0 || filteredTemplates.length > 0;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex flex-col items-center pt-20 p-4 transition-opacity"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
    >
      <div className="w-full max-w-3xl flex flex-col max-h-[85vh] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-900 relative">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Icon name="search" className="w-6 h-6 text-slate-400" />
            </div>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.currentTarget.value)}
                placeholder={uiStrings.placeholder}
                className="w-full bg-transparent text-xl text-slate-100 placeholder-slate-500 border-none focus:ring-0 pl-10 pr-10 py-2"
            />
            <button 
                onClick={onClose}
                className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-white"
            >
                <span className="bg-slate-800 px-2 py-1 rounded text-xs font-medium">ESC</span>
            </button>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto flex-grow p-2 sm:p-4 space-y-6">
            {!hasResults && debouncedQuery.trim() !== '' && (
                <div className="text-center py-12 text-slate-500">
                    <p>{uiStrings.noResults}</p>
                </div>
            )}

            {filteredPresets.length > 0 && (
                <section>
                    <h3 className="px-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{uiStrings.presetsSection}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredPresets.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => { onSelectPreset(preset); onClose(); }}
                                className="flex flex-col items-start p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 transition-all text-left group"
                            >
                                <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">{preset.name}</span>
                                <span className="text-xs text-slate-500 mt-1 line-clamp-1">{preset.params.idea}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {filteredTemplates.length > 0 && (
                <section>
                    <h3 className="px-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{uiStrings.templatesSection}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredTemplates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => { onSelectTemplate(template); onClose(); }}
                                className="flex flex-col items-start p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-fuchsia-500/50 transition-all text-left group"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon name={template.icon} className="w-4 h-4 text-slate-500 group-hover:text-fuchsia-400" />
                                    <span className="font-semibold text-slate-200 group-hover:text-fuchsia-300 transition-colors">{template.name}</span>
                                </div>
                                <span className="text-xs text-slate-500 line-clamp-1">{template.description}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {filteredHistory.length > 0 && (
                <section>
                    <h3 className="px-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {debouncedQuery.trim() ? uiStrings.historySection : uiStrings.recentHistory}
                    </h3>
                    <div className="space-y-2">
                        {filteredHistory.map(entry => (
                            <button
                                key={entry.id}
                                onClick={() => { onSelectHistory(entry); onClose(); }}
                                className="w-full flex items-start p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 transition-all text-left group"
                            >
                                <Icon name="history" className="w-4 h-4 text-slate-500 mt-0.5 mr-3 flex-shrink-0 group-hover:text-slate-300" />
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-slate-300 group-hover:text-white truncate">{entry.params.idea}</div>
                                    <div className="text-xs text-slate-500 mt-0.5 truncate">{new Date(entry.timestamp).toLocaleDateString()} • {entry.prompt}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;