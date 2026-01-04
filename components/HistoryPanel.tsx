
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'veo' | 'sora'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [applyingId, setApplyingId] = useState<string | null>(null);

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

  const handleApply = (entry: HistoryEntry) => {
      setApplyingId(entry.id);
      setTimeout(() => {
          onSelect(entry);
          setApplyingId(null);
      }, 500);
  };

  const handleResetFilters = () => {
      setSearchQuery('');
      setActiveFilter('all');
      setDateRange({ start: '', end: '' });
  };

  const hasActiveFilters = searchQuery !== '' || activeFilter !== 'all' || dateRange.start !== '' || dateRange.end !== '';

  // Filter history based on search query, active filter, and date range
  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const startDate = dateRange.start ? new Date(dateRange.start).setHours(0, 0, 0, 0) : null;
    const endDate = dateRange.end ? new Date(dateRange.end).setHours(23, 59, 59, 999) : null;
    
    return history.filter(entry => {
        // Text Search
        const matchesSearch = !q || 
            entry.params.idea.toLowerCase().includes(q) || 
            entry.prompt.toLowerCase().includes(q) ||
            (entry.params.artStyle && entry.params.artStyle.toLowerCase().includes(q));
        
        // Category Filter
        const matchesFilter = activeFilter === 'all' || entry.params.targetModel === activeFilter;

        // Date Range Filter
        let matchesDate = true;
        if (startDate) {
            matchesDate = matchesDate && entry.timestamp >= startDate;
        }
        if (endDate) {
            matchesDate = matchesDate && entry.timestamp <= endDate;
        }

        return matchesSearch && matchesFilter && matchesDate;
    });
  }, [history, searchQuery, activeFilter, dateRange]);

  // Helper to extract key parameter badges
  const getBadges = (params: PromptState) => {
      const badges = [];
      if (params.artStyle && params.artStyle !== 'Cinematic') {
          badges.push(params.artStyle === 'Custom' ? params.customArtStyle || 'Custom' : params.artStyle);
      }
      if (params.timeOfDay && params.timeOfDay !== 'Any') badges.push(params.timeOfDay);
      if (params.weather && params.weather !== 'Any') badges.push(params.weather);
      if (params.cameraMovement && params.cameraMovement !== 'Static shot') badges.push(params.cameraMovement);
      
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
          <div className="flex items-center gap-3">
            <h2 id="history-panel-title" className="text-lg font-semibold text-slate-100">{uiStrings.title}</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400 border border-slate-700">
                {filteredHistory.length}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close history panel"
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>
        
        {/* Search Bar, Model Filter, and Date Range */}
        <div className="flex flex-col gap-3 px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
            <div className="flex gap-2">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon name="search" className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={uiStrings.searchPlaceholder || "Search history..."}
                        className="w-full bg-slate-900/60 border border-slate-600 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                        >
                            <Icon name="cancel" className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-hidden">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                        {(['all', 'veo', 'sora'] as const).map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all capitalize whitespace-nowrap ${
                                    activeFilter === filter 
                                    ? (filter === 'sora' 
                                        ? 'bg-fuchsia-500/10 border-fuchsia-500/50 text-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.2)]'
                                        : 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]')
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                                }`}
                            >
                                {filter === 'all' ? 'All Models' : filter}
                            </button>
                        ))}
                    </div>
                    {hasActiveFilters && (
                        <button 
                            onClick={handleResetFilters}
                            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ml-auto sm:ml-0"
                            title="Reset all filters"
                        >
                            <Icon name="undo" className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-1 w-full sm:w-auto focus-within:border-slate-500 transition-colors">
                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">From</span>
                        <input 
                            type="date" 
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-transparent text-xs text-slate-300 focus:outline-none w-full sm:w-auto [color-scheme:dark]" 
                        />
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-1 w-full sm:w-auto focus-within:border-slate-500 transition-colors">
                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">To</span>
                        <input 
                            type="date" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-transparent text-xs text-slate-300 focus:outline-none w-full sm:w-auto [color-scheme:dark]" 
                        />
                    </div>
                </div>
            </div>
        </div>
        
        <div className="p-4 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center">
              <Icon name="search" className="w-12 h-12 text-slate-700 mb-3" />
              <p className="mb-4">{hasActiveFilters ? "No matches found with current filters." : uiStrings.empty}</p>
              {hasActiveFilters && (
                  <button 
                    onClick={handleResetFilters}
                    className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
                  >
                      Clear Filters
                  </button>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredHistory.map(entry => {
                const badges = getBadges(entry.params);
                const isSora = entry.params.targetModel === 'sora';
                
                return (
                    <li key={entry.id} className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors group">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${isSora ? 'bg-fuchsia-500' : 'bg-cyan-500'}`} />
                                    <p className="text-base font-semibold text-slate-200 truncate" title={entry.params.idea}>
                                        {entry.params.idea || "Untitled Prompt"}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${isSora ? 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10' : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'}`}>
                                    {isSora ? 'SORA' : 'VEO'}
                                </span>
                            </div>
                            
                            {/* Prompt Snippet */}
                            <div className="mb-3 bg-slate-900/50 p-2.5 rounded-md border border-slate-700/30">
                                <p className="text-xs text-slate-400 font-mono line-clamp-2 leading-relaxed opacity-90">
                                    {entry.prompt}
                                </p>
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-between gap-y-2">
                                {/* Badges Row */}
                                <div className="flex flex-wrap gap-2">
                                    {badges.map((badge, i) => (
                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">
                                            {badge}
                                        </span>
                                    ))}
                                </div>

                                <p className="text-[10px] text-slate-500">
                                    {new Date(entry.timestamp).toLocaleString(language, { 
                                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                    })}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/50 self-start sm:self-center">
                            <button
                                onClick={() => handleApply(entry)}
                                disabled={applyingId === entry.id}
                                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-md transition-all duration-300 flex items-center justify-center gap-2 ${
                                    applyingId === entry.id
                                    ? 'bg-green-600 text-white'
                                    : 'bg-cyan-600 text-white hover:bg-cyan-500'
                                } shadow-sm`}
                            >
                                {applyingId === entry.id ? (
                                    <>
                                        <Icon name="check" className="w-3 h-3" />
                                        <span>Applied</span>
                                    </>
                                ) : uiStrings.use}
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
