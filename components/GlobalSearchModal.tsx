
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HistoryEntry, CustomPreset, PromptTemplate } from '../types';
import { filterItem } from '../utils/search';
import Icon from './Icon';
import * as vectorSearch from '../services/vectorSearch';

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

// Wrapper to normalize items for search indexing
interface SearchableItem {
    id: string;
    type: 'history' | 'preset' | 'template';
    data: any;
    text: string;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen, onClose, history, presets, templates,
  onSelectHistory, onSelectPreset, onSelectTemplate,
  uiStrings, language
}) => {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Semantic Search State
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticMatches, setSemanticMatches] = useState<SearchableItem[]>([]);

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 400); // Increased slightly for semantic buffer

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  // Indexing Effect (Fire and Forget on Mount/Open)
  useEffect(() => {
      if (isOpen) {
          setTimeout(() => inputRef.current?.focus(), 50);

          // Prepare items for indexing
          const indexableItems = [
              ...presets.map(p => ({ id: p.id, text: `${p.name} ${p.params.idea || ''} ${p.params.artStyle || ''}` })),
              ...templates.map(t => ({ id: t.id, text: `${t.name} ${t.description}` })),
              ...history.slice(0, 50).map(h => ({ id: h.id, text: `${h.params.idea} ${h.prompt}` }))
          ];
          
          // Trigger background indexing
          vectorSearch.indexItems(indexableItems).catch(console.error);
      }
  }, [isOpen, history, presets, templates]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Standard Keyword Filtering
  const filteredHistory = useMemo(() => {
    if (!debouncedQuery.trim()) return history.slice(0, 5);
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

  const hasStandardResults = filteredHistory.length > 0 || filteredPresets.length > 0 || filteredTemplates.length > 0;

  // Semantic Search Effect
  useEffect(() => {
      if (!debouncedQuery.trim()) {
          setSemanticMatches([]);
          setIsSearchingSemantic(false);
          return;
      }

      // Only trigger if standard search fails effectively
      if (!hasStandardResults) {
          setIsSearchingSemantic(true);
          vectorSearch.search(debouncedQuery)
            .then(results => {
                const matches: SearchableItem[] = [];
                
                results.slice(0, 6).forEach(res => {
                    // Try find in presets
                    const p = presets.find(x => x.id === res.id);
                    if(p) { matches.push({ id: p.id, type: 'preset', data: p, text: 'Matched Preset' }); return; }

                    // Try find in templates
                    const t = templates.find(x => x.id === res.id);
                    if(t) { matches.push({ id: t.id, type: 'template', data: t, text: 'Matched Template' }); return; }

                    // Try find in history
                    const h = history.find(x => x.id === res.id);
                    if(h) { matches.push({ id: h.id, type: 'history', data: h, text: 'Matched History' }); return; }
                });

                setSemanticMatches(matches);
            })
            .catch(err => console.error(err))
            .finally(() => setIsSearchingSemantic(false));
      } else {
          setSemanticMatches([]);
          setIsSearchingSemantic(false);
      }
  }, [debouncedQuery, hasStandardResults, presets, templates, history]);


  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSemanticSelect = (item: SearchableItem) => {
      if (item.type === 'history') onSelectHistory(item.data);
      if (item.type === 'preset') onSelectPreset(item.data);
      if (item.type === 'template') onSelectTemplate(item.data);
      onClose();
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
                {isSearchingSemantic ? (
                    <Icon name="spinner" className="w-6 h-6 text-fuchsia-400 animate-spin" />
                ) : (
                    <Icon name="search" className="w-6 h-6 text-slate-400" />
                )}
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
            {!hasStandardResults && !isSearchingSemantic && semanticMatches.length === 0 && debouncedQuery.trim() !== '' && (
                <div className="text-center py-12 text-slate-500">
                    <p>{uiStrings.noResults}</p>
                </div>
            )}

            {/* --- Semantic Results Section --- */}
            {semanticMatches.length > 0 && (
                <section className="bg-fuchsia-900/10 rounded-xl p-3 border border-fuchsia-500/20">
                    <h3 className="px-2 mb-3 text-xs font-bold text-fuchsia-400 uppercase tracking-wider flex items-center gap-2">
                        <Icon name="sparkles" className="w-3.5 h-3.5" />
                        Smart Matches (By Meaning)
                    </h3>
                    <div className="space-y-2">
                        {semanticMatches.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleSemanticSelect(item)}
                                className="w-full flex items-center p-3 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-transparent hover:border-fuchsia-500/40 transition-all text-left group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-1.5 opacity-100">
                                    <span className="text-[9px] font-bold text-slate-900 bg-fuchsia-400 px-1.5 py-0.5 rounded shadow-sm">AI MATCH</span>
                                </div>

                                <div className="p-2 bg-slate-800 rounded-full text-slate-400 mr-3">
                                    <Icon 
                                        name={item.type === 'history' ? 'history' : item.type === 'template' ? 'template' : 'save'} 
                                        className="w-4 h-4" 
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-slate-200 group-hover:text-white truncate">
                                        {item.type === 'history' ? item.data.params.idea : item.data.name}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                                        {item.type === 'history' ? item.data.prompt : item.data.description || item.data.params.idea}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* --- Standard Results --- */}
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
