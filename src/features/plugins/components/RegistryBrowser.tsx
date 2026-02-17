/**
 * RegistryBrowser
 * Browse/search panel for discovering remote plugins from the registry.
 * v1.9.0 - Platform Foundations (Sprint 3, Task 3.5)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRegistryStore } from '@core/store/useRegistryStore';
import EmptyState from '@shared/components/EmptyState';
import Icon from '@shared/components/ui/Icon';
import { RegistryEntryCard } from './RegistryEntryCard';
import type { RegistryEntry, RegistryCategory, RegistrySearchParams } from '@core/types/registry';

// ─── Constants ──────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: RegistryCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'studio', label: 'Studio' },
  { value: 'export', label: 'Export' },
  { value: 'prompt-enhancement', label: 'Prompt Enhancement' },
  { value: 'template', label: 'Template' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'integration', label: 'Integration' },
  { value: 'ui-theme', label: 'UI Theme' },
  { value: 'utility', label: 'Utility' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'downloads', label: 'Most Downloaded' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'updatedAt', label: 'Recently Updated' },
  { value: 'name', label: 'Name (A-Z)' },
];

const PAGE_SIZE = 12;

// ─── Component ──────────────────────────────────────────────────────

export function RegistryBrowser() {
  const {
    entries,
    isLoading,
    isFetching,
    error,
    lastFetched,
    selectedEntry,
    searchResult,
    initialize,
    fetchIndex,
    search,
    selectEntry,
  } = useRegistryStore();

  // Search / filter state
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<RegistryCategory | ''>('');
  const [sortBy, setSortBy] = useState('downloads');
  const [page, setPage] = useState(1);
  const [initialized, setInitialized] = useState(false);

  // Initialize on mount
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      initialize();
    }
  }, [initialized, initialize]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params: RegistrySearchParams = {
        query: query || undefined,
        category: category || undefined,
        sortBy: sortBy as RegistrySearchParams['sortBy'],
        order: sortBy === 'name' ? 'asc' : 'desc',
        page,
        limit: PAGE_SIZE,
      };
      search(params);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category, sortBy, page, search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [query, category, sortBy]);

  const handleRefresh = useCallback(async () => {
    await fetchIndex(true);
  }, [fetchIndex]);

  const handleSelectEntry = useCallback(
    (entry: RegistryEntry) => {
      selectEntry(selectedEntry?.id === entry.id ? null : entry);
    },
    [selectedEntry, selectEntry],
  );

  const displayEntries = useMemo(() => searchResult?.entries ?? entries, [searchResult, entries]);

  const totalResults = searchResult?.total ?? entries.length;
  const hasMore = searchResult?.hasMore ?? false;
  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  // ─── Loading Skeleton ─────────────────────────────────────────────

  if (isLoading && entries.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-700 animate-pulse" />
          <div>
            <div className="h-5 w-40 bg-slate-700 rounded animate-pulse mb-1" />
            <div className="h-3 w-64 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-10 bg-slate-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-fuchsia-900/20">
            <Icon name="globe" className="w-5 h-5 text-fuchsia-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Plugin Registry</h3>
            <p className="text-xs text-slate-500">
              {totalResults} plugin{totalResults !== 1 ? 's' : ''} available
              {lastFetched && <> &middot; Updated {new Date(lastFetched).toLocaleTimeString()}</>}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          title="Refresh registry"
          aria-label="Refresh plugin registry"
        >
          <Icon name="clock" className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        {/* Search bar */}
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plugins..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
            aria-label="Search plugins"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <Icon name="cancel" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RegistryCategory | '')}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
            aria-label="Filter by category"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-3">
          <Icon name="alert-triangle" className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-300 font-medium">Unable to connect to registry</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {error}. Showing cached data if available.
            </p>
          </div>
        </div>
      )}

      {/* Results grid */}
      {displayEntries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayEntries.map((entry) => (
            <RegistryEntryCard
              key={entry.id}
              entry={entry}
              isSelected={selectedEntry?.id === entry.id}
              onSelect={handleSelectEntry}
            />
          ))}
        </div>
      ) : (
        !isLoading && (
          <EmptyState
            icon="REG"
            title={entries.length === 0 ? 'No registry available' : 'No plugins match your filters'}
            description={
              entries.length === 0
                ? 'Plugin registry will be available when a registry server is configured.'
                : 'Try adjusting your search criteria.'
            }
            className="bg-slate-800/20 rounded-xl border border-dashed border-slate-700 py-12"
          />
        )
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore && page >= totalPages}
            className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}

      {/* Selected entry detail panel */}
      {selectedEntry && (
        <RegistryEntryDetail entry={selectedEntry} onClose={() => selectEntry(null)} />
      )}
    </div>
  );
}

// ─── Detail Sub-Component ───────────────────────────────────────────

interface RegistryEntryDetailProps {
  entry: RegistryEntry;
  onClose: () => void;
}

function RegistryEntryDetail({ entry, onClose }: RegistryEntryDetailProps) {
  return (
    <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/60 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-lg font-bold text-white">{entry.name}</h4>
          <p className="text-sm text-slate-400">
            by {entry.author} &middot; v{entry.version}
            {entry.license && <> &middot; {entry.license}</>}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-500 hover:text-white transition-colors"
          aria-label="Close detail"
        >
          <Icon name="cancel" className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-300">{entry.description}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-2 bg-slate-900/50 rounded-lg">
          <div className="text-lg font-bold text-white">{entry.downloads.toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Downloads</div>
        </div>
        <div className="p-2 bg-slate-900/50 rounded-lg">
          <div className="text-lg font-bold text-white">{entry.rating.toFixed(1)}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            Rating ({entry.ratingCount})
          </div>
        </div>
        <div className="p-2 bg-slate-900/50 rounded-lg">
          <div className="text-lg font-bold text-white">{(entry.size / 1024).toFixed(0)} KB</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Size</div>
        </div>
        <div className="p-2 bg-slate-900/50 rounded-lg">
          <div className="text-lg font-bold text-white">{entry.permissions.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Permissions</div>
        </div>
      </div>

      {/* Permissions */}
      {entry.permissions.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Required Permissions
          </h5>
          <div className="flex flex-wrap gap-1">
            {entry.permissions.map((perm) => (
              <span
                key={perm}
                className="px-2 py-1 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded"
              >
                {perm}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Tags
          </h5>
          <div className="flex flex-wrap gap-1">
            {entry.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 text-xs bg-slate-700/50 text-slate-400 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="flex gap-3 text-xs">
        {entry.homepage && (
          <a
            href={entry.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Homepage
          </a>
        )}
        {entry.repository && (
          <a
            href={entry.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Repository
          </a>
        )}
      </div>

      {/* Install button (disabled for v1.9.0) */}
      <button
        disabled
        className="w-full px-4 py-3 bg-slate-700 text-slate-400 font-semibold rounded-xl cursor-not-allowed"
        title="Plugin installation from registry will be available in v2.0.0"
        aria-label="Install not yet available"
      >
        <span className="flex items-center justify-center gap-2">
          <Icon name="download" className="w-4 h-4" />
          Install — Coming in v2.0
        </span>
      </button>
    </div>
  );
}
