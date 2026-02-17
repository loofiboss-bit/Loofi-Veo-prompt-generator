/**
 * QueuePanel — shows the unified generation queue with status, retry, and cancel.
 * Designed as a slide-out panel or modal overlay.
 *
 * @module shared/components/resilience/QueuePanel
 */
import React from 'react';
import { useGenerationQueueStore } from '@core/store/useGenerationQueueStore';
import type { GenerationQueueItem } from '@core/types';

interface QueuePanelProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: 'text-slate-400', icon: '⏳' },
  'waiting-online': { label: 'Waiting for connection', color: 'text-amber-400', icon: '📡' },
  active: { label: 'Processing', color: 'text-cyan-400', icon: '⚡' },
  completed: { label: 'Completed', color: 'text-emerald-400', icon: '✓' },
  failed: { label: 'Failed', color: 'text-red-400', icon: '✗' },
  cancelled: { label: 'Cancelled', color: 'text-slate-500', icon: '—' },
};

const QueueItem: React.FC<{
  item: GenerationQueueItem;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}> = ({ item, onCancel, onRetry }) => {
  const config = statusConfig[item.status] || statusConfig.pending;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
      {/* Status icon */}
      <span className="text-sm w-5 text-center">{config.icon}</span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-200 truncate">{item.label}</div>
        <div className="flex items-center gap-2 text-xs">
          <span className={config.color}>{config.label}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-500 capitalize">{item.type}</span>
          {item.costEstimate && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500 font-mono">
                ~${item.costEstimate.estimatedCostUsd.toFixed(4)}
              </span>
            </>
          )}
        </div>

        {/* Progress bar for active items */}
        {item.status === 'active' && item.progress > 0 && (
          <div className="mt-1.5 h-1 rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(item.progress, 100)}%` }}
            />
          </div>
        )}

        {/* Error message */}
        {item.error && <div className="mt-1 text-xs text-red-400 truncate">{item.error}</div>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {(item.status === 'pending' || item.status === 'active') && (
          <button
            onClick={() => onCancel(item.id)}
            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-700/50 transition-colors"
            title="Cancel"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 16 16"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        )}
        {item.status === 'failed' && (
          <button
            onClick={() => onRetry(item.id)}
            className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-700/50 transition-colors"
            title="Retry"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 16 16"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M2 8a6 6 0 0110.197-4.318M14 8a6 6 0 01-10.197 4.318" />
              <path d="M12.5 1.5v3h-3M3.5 14.5v-3h3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export const QueuePanel: React.FC<QueuePanelProps> = ({ isOpen, onClose }) => {
  const items = useGenerationQueueStore((s) => s.items);
  const activeCount = useGenerationQueueStore((s) => s.activeCount);
  const pendingCount = useGenerationQueueStore((s) => s.pendingCount);
  const cancel = useGenerationQueueStore((s) => s.cancel);
  const retry = useGenerationQueueStore((s) => s.retry);

  if (!isOpen) return null;

  const sortedItems = [...items].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      active: 0,
      pending: 1,
      'waiting-online': 2,
      failed: 3,
      completed: 4,
      cancelled: 5,
    };
    return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close queue panel"
      />

      {/* Panel */}
      <div className="relative w-96 max-w-full h-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Generation Queue</h2>
            <p className="text-xs text-slate-500">
              {activeCount} active · {pendingCount} pending
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Close queue panel"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 16 16"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Queue list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <span className="text-2xl mb-2">📋</span>
              <span className="text-sm">Queue is empty</span>
            </div>
          ) : (
            sortedItems.map((item) => (
              <QueueItem key={item.id} item={item} onCancel={cancel} onRetry={retry} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
