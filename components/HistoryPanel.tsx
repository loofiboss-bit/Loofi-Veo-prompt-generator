
import React, { useEffect, useState, useMemo } from 'react';
import { HistoryEntry, PromptState } from '../types';
import Icon from './Icon';

interface HistoryPanelProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  uiStrings: {
    title: string;
    clear: string;
    clearConfirm: string;
    empty: string;
    use: string;
    delete: string;
    deleteConfirm: string;
    searchPlaceholder?: string;
  };
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onSelect, onClear, onDelete, onClose, uiStrings, language }) => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  const handleDelete = (id: string) => {
      if(window.confirm(uiStrings.deleteConfirm)) {
          onDelete(id);
      }
  };

  const handleClear = () => {
    if (window.confirm(uiStrings.clearConfirm)) {
      onClear();
    }
  };

  // Filter history based on search query
  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return history;
    return history.filter(entry => 
        entry.params.idea.toLowerCase().includes(q) || 
        entry.prompt.toLowerCase().includes(q) ||
        (entry.params.artStyle && entry.params.artStyle.toLowerCase().includes(q))
    );
  }, [history, searchQuery]);

  // Helper to extract key parameter badges
  const getBadges = (params: PromptState) => {
      const badges = [];
      if (params.artStyle && params.artStyle !== 'Cinematic') {
          badges.push(params.artStyle === 'Custom' ? params.customArtStyle || 'Custom' : params.artStyle);
      }
      if (params.timeOfDay && params.timeOfDay !== 'Any') badges.push(params.timeOfDay);
      if (params.weather && params.weather !== 'Any') badges.push(params.weather);
      if (params.cameraMovement && params.cameraMovement !== 'Static shot') badges.push(params.cameraMovement);
      if (params.targetModel === 'sora') badges.push('Sora Mode');
      
      // Limit to 4 badges to keep UI clean
      return badges.slice(0, 4);
  };

  return (
    <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-panel-title"
    >
      <div 
        className="bg-slate-900/70 backdrop-blur-xl w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="history-panel-title" className="text-lg font-semibold text-slate-100">{uiStrings.title}</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close history panel"
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>
        
        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="search" className="w-4 h-4 text-slate-400" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={uiStrings.searchPlaceholder || "Search history..."}
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                />
            </div>
        </div>
        
        <div className="p-4 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>{searchQuery ? "No matches found." : uiStrings.empty}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredHistory.map(entry => {
                const badges = getBadges(entry.params);
                return (
                    <li key={entry.id} className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between sm:justify-start gap-2 mb-1">
                                <p className="text-base font-semibold text-cyan-400 truncate" title={entry.params.idea}>
                                    {entry.params.idea || "Untitled Prompt"}
                                </p>
                                <span className="text-xs text-slate-500 sm:hidden">
                                    {new Date(entry.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                            
                            {/* Badges Row */}
                            {badges.length > 0 && (
                                <div className="flex flex-wrap gap-2 my-2">
                                    {badges.map((badge, i) => (
                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600">
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-slate-500 hidden sm:block mt-1">
                                Generated on {new Date(entry.timestamp).toLocaleString(language, { 
                                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                })}
                            </p>
                        </div>
                        
                        <div className="flex items-center w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/50">
                            <button
                                onClick={() => onSelect(entry)}
                                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500 shadow-sm"
                            >
                                {uiStrings.use}
                            </button>
                            <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-2 rounded-md transition-colors text-slate-400 hover:text-red-400 hover:bg-slate-700/80"
                                aria-label={`${uiStrings.delete} "${entry.params.idea}"`}
                            >
                                <Icon name="trash" className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    </li>
                );
              })}
            </ul>
          )}
        </div>

        {history.length > 0 && (
            <footer className="p-4 border-t border-slate-700 flex-shrink-0 bg-slate-900/50">
                <button
                    onClick={handleClear}
                    className="w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2.5 rounded-md transition-colors border border-transparent hover:border-red-900/30"
                >
                    {uiStrings.clear}
                </button>
            </footer>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
