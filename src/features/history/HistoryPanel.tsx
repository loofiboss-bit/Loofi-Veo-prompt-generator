/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useEffect, useState, useMemo } from 'react';
import { useHistoryStore } from '@core/store/useHistoryStore';
import { HistoryEntry } from '@core/services/historyService';
import { PromptState } from '@core/types';
import EmptyState from '@shared/components/EmptyState';
import Icon from '@shared/components/ui/Icon';
import AppDialog from '@shared/components/ui/AppDialog';
import { ConfirmDialog } from '@shared/components/ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import { BranchTreeView } from './BranchTreeView';
import DiffViewer from './DiffViewer';
import { StarRating } from '@shared/components/ui/StarRating';

interface HistoryPanelProps {
  onSelect: (entry: HistoryEntry) => void;
  onClose: () => void;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  // Optional external props passed from ModalManager
  history?: HistoryEntry[];
  onClear?: () => void;
  onDelete?: (id: string) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ onSelect, onClose, language }) => {
  const { t } = useTranslation('history');
  const { entries, deleteEntry, clearHistory, exportHistory, viewMode, setViewMode, rateEntry } =
    useHistoryStore();
  const [history, setHistory] = useState<HistoryEntry[]>(entries);

  // Diff viewer state
  const [diffEntries, setDiffEntries] = useState<{
    entry1: HistoryEntry;
    entry2: HistoryEntry;
  } | null>(null);

  // Sync with store
  useEffect(() => {
    setHistory(entries);
  }, [entries]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'veo' | 'sora'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingClear, setPendingClear] = useState(false);

  const _handleExport = async (format: 'json' | 'csv') => {
    const data = await exportHistory(format);
    if (data) {
      const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `history_export.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDelete = (id: string) => setPendingDeleteId(id);

  const handleConfirmDelete = () => {
    if (pendingDeleteId) deleteEntry(pendingDeleteId);
    setPendingDeleteId(null);
  };

  const handleClear = () => setPendingClear(true);

  const handleConfirmClear = () => {
    clearHistory();
    setPendingClear(false);
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

  const hasActiveFilters =
    searchQuery !== '' || activeFilter !== 'all' || dateRange.start !== '' || dateRange.end !== '';

  // Filter history based on search query, active filter, and date range
  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const startDate = dateRange.start ? new Date(dateRange.start).setHours(0, 0, 0, 0) : null;
    const endDate = dateRange.end ? new Date(dateRange.end).setHours(23, 59, 59, 999) : null;

    return history.filter((entry) => {
      // Text Search
      const matchesSearch =
        !q ||
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
      badges.push(
        params.artStyle === 'Custom' ? params.customArtStyle || 'Custom' : params.artStyle,
      );
    }
    if (params.timeOfDay && params.timeOfDay !== 'Any') badges.push(params.timeOfDay);
    if (params.weather && params.weather !== 'Any') badges.push(params.weather);
    if (params.cameraMovement && params.cameraMovement !== 'Static shot')
      badges.push(params.cameraMovement);

    // Limit to 4 badges to keep UI clean
    return badges.slice(0, 4);
  };

  return (
    <AppDialog
      isOpen={true}
      onClose={onClose}
      size="xl"
      showCloseButton={false}
      bodyClassName="!p-0"
      dialogClassName="max-h-[85vh] max-w-3xl"
      ariaLabelledBy="history-panel-title"
    >
      <div className="flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 id="history-panel-title" className="text-lg font-semibold text-slate-100">
              {t('title')}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400 border border-slate-700">
              {filteredHistory.length}
            </span>
            {/* View mode toggle */}
            <div className="flex bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 text-xs transition-colors ${
                  viewMode === 'list'
                    ? 'bg-cyan-500/15 text-cyan-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="List view"
              >
                <Icon name="list" className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-2 py-1 text-xs transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-cyan-500/15 text-cyan-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Branch tree view"
              >
                <Icon name="layers" className="w-3.5 h-3.5" />
              </button>
            </div>
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
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                placeholder={t('searchPlaceholder') || 'Search history...'}
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
                {(['all', 'veo', 'sora'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all capitalize whitespace-nowrap ${
                      activeFilter === filter
                        ? filter === 'sora'
                          ? 'bg-fuchsia-500/10 border-fuchsia-500/50 text-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.2)]'
                          : 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
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
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: e.currentTarget.value }))
                  }
                  className="bg-transparent text-xs text-slate-300 focus:outline-none w-full sm:w-auto [color-scheme:dark]"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-1 w-full sm:w-auto focus-within:border-slate-500 transition-colors">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">To</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: e.currentTarget.value }))
                  }
                  className="bg-transparent text-xs text-slate-300 focus:outline-none w-full sm:w-auto [color-scheme:dark]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 overflow-y-auto">
          {/* DiffViewer overlay */}
          {diffEntries && (
            <DiffViewer
              entry1={diffEntries.entry1}
              entry2={diffEntries.entry2}
              onClose={() => setDiffEntries(null)}
              onRestore={(entry) => {
                onSelect(entry);
                setDiffEntries(null);
              }}
            />
          )}

          {/* Branch Tree View */}
          {!diffEntries && viewMode === 'tree' && (
            <BranchTreeView
              entries={filteredHistory}
              onSelectEntry={(entry) => handleApply(entry)}
              onCompare={(entryA, entryB) => setDiffEntries({ entry1: entryA, entry2: entryB })}
            />
          )}

          {/* List View (original) */}
          {!diffEntries && viewMode === 'list' && (
            <>
              {filteredHistory.length === 0 ? (
                <EmptyState
                  icon={hasActiveFilters ? '🔎' : '🗂️'}
                  title={hasActiveFilters ? 'No matches found' : t('empty')}
                  description={
                    hasActiveFilters
                      ? 'Try adjusting your search or clearing filters to see your history entries.'
                      : 'Generated prompts you save will appear here.'
                  }
                  actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
                  onAction={hasActiveFilters ? handleResetFilters : undefined}
                  className="py-12"
                />
              ) : (
                <ul className="space-y-3">
                  {filteredHistory.map((entry) => {
                    const badges = getBadges(entry.params);
                    const isSora = entry.params.targetModel === 'sora';

                    return (
                      <li
                        key={entry.id}
                        className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors group"
                      >
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span
                                  className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${isSora ? 'bg-fuchsia-500' : 'bg-cyan-500'}`}
                                />
                                <p
                                  className="text-base font-semibold text-slate-200 truncate"
                                  title={entry.params.idea}
                                >
                                  {entry.params.idea || 'Untitled Prompt'}
                                </p>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${isSora ? 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10' : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'}`}
                              >
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
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50"
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>

                              <div className="flex items-center gap-3">
                                <StarRating
                                  value={entry.rating ?? 0}
                                  onChange={(rating) => rateEntry(entry.id, rating)}
                                />
                                <p className="text-[10px] text-slate-500">
                                  {new Date(entry.timestamp).toLocaleString(language, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
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
                              ) : (
                                t('use')
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-2 rounded-md transition-colors text-slate-400 hover:text-red-400 hover:bg-slate-700/80"
                              aria-label={`${t('delete')} "${entry.params.idea}"`}
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
            </>
          )}
        </div>

        {history.length > 0 && (
          <footer className="p-4 border-t border-slate-700 flex-shrink-0 bg-slate-900/50">
            <button
              onClick={handleClear}
              className="w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2.5 rounded-md transition-colors border border-transparent hover:border-red-900/30"
            >
              {t('clear')}
            </button>
          </footer>
        )}
      </div>

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
        title={t('deleteConfirmTitle', { defaultValue: 'Delete Entry' })}
        message={t('deleteConfirm', { defaultValue: 'Delete this history entry?' })}
        confirmLabel={t('delete', { defaultValue: 'Delete' })}
        danger
      />

      <ConfirmDialog
        isOpen={pendingClear}
        onConfirm={handleConfirmClear}
        onCancel={() => setPendingClear(false)}
        title={t('clearConfirmTitle', { defaultValue: 'Clear History' })}
        message={t('clearConfirm', {
          defaultValue: 'Clear all history entries? This cannot be undone.',
        })}
        confirmLabel={t('clear', { defaultValue: 'Clear All' })}
        danger
      />
    </AppDialog>
  );
};

export default HistoryPanel;
