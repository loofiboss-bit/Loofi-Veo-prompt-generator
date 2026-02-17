/**
 * MarketplacePanel
 * Full Extension Marketplace panel with browse/installed/updates views.
 * Replaces the disabled-install RegistryBrowser from v1.9.0.
 * v2.0.0 - Platform Transformation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMarketplaceStore } from '@core/store/useMarketplaceStore';
import { useRegistryStore } from '@core/store/useRegistryStore';
import EmptyState from '@shared/components/EmptyState';
import Icon from '@shared/components/ui/Icon';
import { RegistryEntryCard } from './RegistryEntryCard';
import { TrustBadge } from './TrustBadge';
import { InstallConfirmDialog } from './InstallConfirmDialog';
import type { RegistryEntry, RegistryCategory, RegistrySearchParams } from '@core/types/registry';
import type { MarketplaceView, InstalledPluginBundle } from '@core/types/marketplace';

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

const VIEW_TABS: { id: MarketplaceView; label: string; icon: string }[] = [
  { id: 'browse', label: 'Browse', icon: 'globe' },
  { id: 'installed', label: 'Installed', icon: 'code' },
  { id: 'updates', label: 'Updates', icon: 'clock' },
];

// ─── Component ──────────────────────────────────────────────────────

export function MarketplacePanel() {
  const {
    view,
    setView,
    installedBundles,
    activeOperations,
    availableUpdates,
    isCheckingUpdates,
    pendingConfirmation,
    isLoading: marketplaceLoading,
    error: marketplaceError,
    initialize: initMarketplace,
    installPlugin,
    uninstallPlugin,
    updatePlugin,
    checkForUpdates,
    isInstalled,
    clearError,
  } = useMarketplaceStore();

  const {
    entries,
    isLoading: registryLoading,
    isFetching,
    error: registryError,
    lastFetched,
    searchResult,
    initialize: initRegistry,
    fetchIndex,
    search,
  } = useRegistryStore();

  // Search / filter state
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<RegistryCategory | ''>('');
  const [sortBy, setSortBy] = useState('downloads');
  const [page, setPage] = useState(1);
  const [initialized, setInitialized] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RegistryEntry | null>(null);

  // Initialize on mount
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      initRegistry();
      initMarketplace();
    }
  }, [initialized, initRegistry, initMarketplace]);

  // Debounced search
  useEffect(() => {
    if (view !== 'browse') return;

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
  }, [query, category, sortBy, page, search, view]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [query, category, sortBy]);

  const handleRefresh = useCallback(async () => {
    await fetchIndex(true);
  }, [fetchIndex]);

  const handleSelectEntry = useCallback(
    (entry: RegistryEntry) => {
      setSelectedEntry(selectedEntry?.id === entry.id ? null : entry);
    },
    [selectedEntry],
  );

  const handleInstall = useCallback(
    async (entry: RegistryEntry) => {
      await installPlugin(entry);
    },
    [installPlugin],
  );

  const handleUninstall = useCallback(
    async (pluginId: string) => {
      await uninstallPlugin(pluginId);
    },
    [uninstallPlugin],
  );

  const handleUpdate = useCallback(
    async (pluginId: string) => {
      await updatePlugin(pluginId);
    },
    [updatePlugin],
  );

  const displayEntries = useMemo(() => searchResult?.entries ?? entries, [searchResult, entries]);
  const totalResults = searchResult?.total ?? entries.length;
  const hasMore = searchResult?.hasMore ?? false;
  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  const isLoading = registryLoading || marketplaceLoading;
  const error = registryError || marketplaceError;

  // Active operations count for badge
  const activeOpCount = Object.values(activeOperations).filter(
    (op) => op.state !== 'complete' && op.state !== 'failed' && op.state !== 'idle',
  ).length;

  // ─── Loading Skeleton ─────────────────────────────────────────────

  if (isLoading && entries.length === 0 && installedBundles.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-700 animate-pulse" />
          <div>
            <div className="h-5 w-48 bg-slate-700 rounded animate-pulse mb-1" />
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
            <h3 className="text-lg font-bold text-white">Extension Marketplace</h3>
            <p className="text-xs text-slate-500">
              {totalResults} plugin{totalResults !== 1 ? 's' : ''} available
              {lastFetched && <> &middot; Updated {new Date(lastFetched).toLocaleTimeString()}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeOpCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-600 text-white rounded-full animate-pulse">
              {activeOpCount} active
            </span>
          )}
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
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === tab.id
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Icon name={tab.icon as 'globe'} className="w-4 h-4" />
            {tab.label}
            {tab.id === 'installed' && installedBundles.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-600 rounded-full">
                {installedBundles.length}
              </span>
            )}
            {tab.id === 'updates' && availableUpdates.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-cyan-600 text-white rounded-full">
                {availableUpdates.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-3">
          <Icon name="alert-triangle" className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-yellow-300 font-medium">Something went wrong</p>
            <p className="text-xs text-slate-400 mt-0.5">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="p-1 text-slate-500 hover:text-white transition-colors"
            aria-label="Dismiss error"
          >
            <Icon name="cancel" className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Browse View */}
      {view === 'browse' && (
        <BrowseView
          entries={displayEntries}
          query={query}
          setQuery={setQuery}
          category={category}
          setCategory={setCategory}
          sortBy={sortBy}
          setSortBy={setSortBy}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          hasMore={hasMore}
          totalResults={totalResults}
          isLoading={registryLoading}
          selectedEntry={selectedEntry}
          onSelectEntry={handleSelectEntry}
          onInstall={handleInstall}
          isInstalled={isInstalled}
          activeOperations={activeOperations}
        />
      )}

      {/* Installed View */}
      {view === 'installed' && (
        <InstalledView
          bundles={installedBundles}
          onUninstall={handleUninstall}
          activeOperations={activeOperations}
        />
      )}

      {/* Updates View */}
      {view === 'updates' && (
        <UpdatesView
          updates={availableUpdates}
          isChecking={isCheckingUpdates}
          onCheckUpdates={checkForUpdates}
          onUpdate={handleUpdate}
          activeOperations={activeOperations}
        />
      )}

      {/* Confirmation Dialog */}
      {pendingConfirmation && <InstallConfirmDialog />}
    </div>
  );
}

// ─── Browse Sub-View ────────────────────────────────────────────────

interface BrowseViewProps {
  entries: RegistryEntry[];
  query: string;
  setQuery: (q: string) => void;
  category: RegistryCategory | '';
  setCategory: (c: RegistryCategory | '') => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  totalPages: number;
  hasMore: boolean;
  totalResults: number;
  isLoading: boolean;
  selectedEntry: RegistryEntry | null;
  onSelectEntry: (entry: RegistryEntry) => void;
  onInstall: (entry: RegistryEntry) => Promise<void>;
  isInstalled: (pluginId: string) => boolean;
  activeOperations: Record<string, import('@core/types/marketplace').InstallProgress>;
}

function BrowseView({
  entries,
  query,
  setQuery,
  category,
  setCategory,
  sortBy,
  setSortBy,
  page,
  setPage,
  totalPages,
  hasMore,
  isLoading,
  selectedEntry,
  onSelectEntry,
  onInstall,
  isInstalled,
  activeOperations,
}: BrowseViewProps) {
  return (
    <>
      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search extensions..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
            aria-label="Search extensions"
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

      {/* Results Grid */}
      {entries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {entries.map((entry) => (
            <RegistryEntryCard
              key={entry.id}
              entry={entry}
              isSelected={selectedEntry?.id === entry.id}
              onSelect={onSelectEntry}
            />
          ))}
        </div>
      ) : (
        !isLoading && (
          <EmptyState
            icon="EXT"
            title="No extensions match your search"
            description="Try adjusting your search criteria."
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

      {/* Entry Detail */}
      {selectedEntry && (
        <MarketplaceEntryDetail
          entry={selectedEntry}
          isInstalled={isInstalled(selectedEntry.id)}
          installProgress={activeOperations[selectedEntry.id]}
          onClose={() => onSelectEntry(selectedEntry)}
          onInstall={() => onInstall(selectedEntry)}
        />
      )}
    </>
  );
}

// ─── Installed Sub-View ─────────────────────────────────────────────

interface InstalledViewProps {
  bundles: InstalledPluginBundle[];
  onUninstall: (pluginId: string) => Promise<void>;
  activeOperations: Record<string, import('@core/types/marketplace').InstallProgress>;
}

function InstalledView({ bundles, onUninstall, activeOperations }: InstalledViewProps) {
  if (bundles.length === 0) {
    return (
      <EmptyState
        icon="ADD"
        title="No extensions installed"
        description="Browse the marketplace to discover and install extensions."
        className="bg-slate-800/20 rounded-xl border border-dashed border-slate-700 py-16"
      />
    );
  }

  return (
    <div className="space-y-2">
      {bundles.map((bundle) => {
        const op = activeOperations[bundle.pluginId];
        const isOperating =
          op && op.state !== 'complete' && op.state !== 'idle' && op.state !== 'failed';

        return (
          <div
            key={bundle.pluginId}
            className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrustBadge trustLevel={bundle.trustLevel} size="sm" />
                <div>
                  <h4 className="text-sm font-bold text-white">{bundle.manifest.name}</h4>
                  <p className="text-xs text-slate-500">
                    v{bundle.version} &middot; by {bundle.manifest.author} &middot;{' '}
                    {(bundle.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOperating && (
                  <span className="text-xs text-cyan-400 animate-pulse">{op.message}</span>
                )}
                <button
                  onClick={() => onUninstall(bundle.pluginId)}
                  disabled={!!isOperating}
                  className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                  aria-label={`Uninstall ${bundle.manifest.name}`}
                >
                  <span className="flex items-center gap-1">
                    <Icon name="trash" className="w-3 h-3" />
                    Uninstall
                  </span>
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">{bundle.manifest.description}</p>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600">
              <span>Installed {new Date(bundle.installedAt).toLocaleDateString()}</span>
              {bundle.autoUpdate && <span className="text-cyan-500">Auto-update enabled</span>}
              <span>Sandbox: {bundle.trustLevel === 'trusted' ? 'Restricted' : 'Worker'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Updates Sub-View ───────────────────────────────────────────────

interface UpdatesViewProps {
  updates: import('@core/types/marketplace').PluginUpdateInfo[];
  isChecking: boolean;
  onCheckUpdates: () => Promise<void>;
  onUpdate: (pluginId: string) => Promise<void>;
  activeOperations: Record<string, import('@core/types/marketplace').InstallProgress>;
}

function UpdatesView({
  updates,
  isChecking,
  onCheckUpdates,
  onUpdate,
  activeOperations,
}: UpdatesViewProps) {
  return (
    <div className="space-y-4">
      {/* Check for Updates button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {updates.length > 0
            ? `${updates.length} update${updates.length === 1 ? '' : 's'} available`
            : 'All extensions are up to date'}
        </p>
        <button
          onClick={onCheckUpdates}
          disabled={isChecking}
          className="px-4 py-2 text-sm text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/20 disabled:opacity-50 transition-colors"
          aria-label="Check for updates"
        >
          <span className="flex items-center gap-2">
            <Icon name="clock" className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check for Updates'}
          </span>
        </button>
      </div>

      {/* Update list */}
      {updates.length === 0 ? (
        <EmptyState
          icon="UPD"
          title="Everything is up to date"
          description="Check back later for new versions of your installed extensions."
          className="bg-slate-800/20 rounded-xl border border-dashed border-slate-700 py-12"
        />
      ) : (
        <div className="space-y-2">
          {updates.map((update) => {
            const op = activeOperations[update.pluginId];
            const isUpdating =
              op && op.state !== 'complete' && op.state !== 'idle' && op.state !== 'failed';

            return (
              <div
                key={update.pluginId}
                className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{update.pluginId}</h4>
                    <p className="text-xs text-slate-500">
                      v{update.currentVersion} → v{update.latestVersion} &middot;{' '}
                      {(update.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => onUpdate(update.pluginId)}
                    disabled={!!isUpdating}
                    className="px-4 py-2 text-sm text-white bg-cyan-600 rounded-xl hover:bg-cyan-500 disabled:opacity-50 transition-colors"
                    aria-label={`Update ${update.pluginId}`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon
                        name="clock"
                        className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`}
                      />
                      {isUpdating ? op.message : 'Update'}
                    </span>
                  </button>
                </div>

                {/* Progress bar */}
                {isUpdating && op.progress > 0 && (
                  <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                      style={{ width: `${op.progress}%` }}
                    />
                  </div>
                )}

                {/* New permissions warning */}
                {update.hasNewPermissions && (
                  <div className="mt-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-[10px] text-orange-400 font-medium">
                      New permissions required: {update.newPermissions.join(', ')}
                    </p>
                  </div>
                )}

                {/* Changelog */}
                {update.changelog && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{update.changelog}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Entry Detail (with Install Button) ─────────────────────────────

interface MarketplaceEntryDetailProps {
  entry: RegistryEntry;
  isInstalled: boolean;
  installProgress?: import('@core/types/marketplace').InstallProgress;
  onClose: () => void;
  onInstall: () => void;
}

function MarketplaceEntryDetail({
  entry,
  isInstalled,
  installProgress,
  onClose,
  onInstall,
}: MarketplaceEntryDetailProps) {
  const isInstalling =
    installProgress &&
    installProgress.state !== 'complete' &&
    installProgress.state !== 'failed' &&
    installProgress.state !== 'idle';

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

      {/* Install / Progress / Installed Badge */}
      {isInstalling ? (
        <div className="space-y-2">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${installProgress.progress}%` }}
            />
          </div>
          <p className="text-xs text-center text-cyan-400 animate-pulse">
            {installProgress.message}
          </p>
        </div>
      ) : isInstalled ? (
        <div className="w-full px-4 py-3 bg-green-600/10 text-green-400 font-semibold rounded-xl text-center border border-green-500/20">
          <span className="flex items-center justify-center gap-2">
            <Icon name="check" className="w-4 h-4" />
            Installed
          </span>
        </div>
      ) : (
        <button
          onClick={onInstall}
          className="w-full px-4 py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-500 transition-colors"
          aria-label={`Install ${entry.name}`}
        >
          <span className="flex items-center justify-center gap-2">
            <Icon name="download" className="w-4 h-4" />
            Install
          </span>
        </button>
      )}

      {/* Failed state */}
      {installProgress?.state === 'failed' && (
        <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-2">
            <Icon name="alert-triangle" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{installProgress.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
