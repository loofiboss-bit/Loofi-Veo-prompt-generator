/**
 * RegistryEntryCard
 * Card component for displaying a single plugin from the remote registry.
 * v1.9.0 - Platform Foundations (Sprint 3, Task 3.5)
 */

import React from 'react';
import Icon from '@shared/components/ui/Icon';
import type { RegistryEntry, RegistryCategory } from '@core/types/registry';

// ─── Helpers ────────────────────────────────────────────────────────

const formatDownloads = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const formatDate = (ts: number): string => {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatSize = (bytes: number): string => {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
};

const CATEGORY_LABELS: Record<RegistryCategory, string> = {
  studio: 'Studio',
  export: 'Export',
  'prompt-enhancement': 'Prompt Enhancement',
  template: 'Template',
  analysis: 'Analysis',
  integration: 'Integration',
  'ui-theme': 'UI Theme',
  utility: 'Utility',
  other: 'Other',
};

const CATEGORY_COLORS: Record<RegistryCategory, string> = {
  studio: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  export: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'prompt-enhancement': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  template: 'bg-green-500/15 text-green-400 border-green-500/20',
  analysis: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  integration: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'ui-theme': 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  utility: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  other: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

// ─── Star Rating ────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3.5 h-3.5 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-slate-600'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs text-slate-500">({count})</span>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────

interface RegistryEntryCardProps {
  entry: RegistryEntry;
  isSelected?: boolean;
  onSelect: (entry: RegistryEntry) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function RegistryEntryCard({ entry, isSelected, onSelect }: RegistryEntryCardProps) {
  return (
    <button
      onClick={() => onSelect(entry)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? 'border-cyan-500/40 bg-cyan-500/5 shadow-lg shadow-cyan-500/5'
          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
      }`}
      aria-label={`Plugin: ${entry.name} by ${entry.author}`}
    >
      {/* Top row: name + version + category */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-200 text-sm truncate">{entry.name}</h4>
          <p className="text-xs text-slate-500">
            {entry.author} &middot; v{entry.version}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border flex-shrink-0 ${CATEGORY_COLORS[entry.category]}`}
        >
          {CATEGORY_LABELS[entry.category]}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 line-clamp-2 mb-3">{entry.description}</p>

      {/* Bottom row: stats */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <StarRating rating={entry.rating} count={entry.ratingCount} />
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Icon name="download" className="w-3 h-3" />
            {formatDownloads(entry.downloads)}
          </span>
          <span className="text-xs text-slate-600">{formatSize(entry.size)}</span>
        </div>
        <span className="text-[10px] text-slate-600">{formatDate(entry.updatedAt)}</span>
      </div>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {entry.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] bg-slate-700/50 text-slate-400 rounded"
            >
              {tag}
            </span>
          ))}
          {entry.tags.length > 4 && (
            <span className="text-[10px] text-slate-600">+{entry.tags.length - 4}</span>
          )}
        </div>
      )}
    </button>
  );
}
