/**
 * ConflictResolutionPanel Component
 * v2.6.0 - Collaboration Suite
 *
 * Shows CRDT merge conflicts with options to accept, revert, or customize.
 * Displayed as a notification panel when conflicts are detected.
 */

import React, { useCallback } from 'react';
import { useCollaborationStore } from '@core/store/useCollaborationStore';
import type { ConflictEvent } from '@core/types';

// ─── Single Conflict Card ───────────────────────────────────────────

interface ConflictCardProps {
  conflict: ConflictEvent;
  onResolve: (conflictId: string, status: ConflictEvent['status']) => void;
}

function ConflictCard({ conflict, onResolve }: ConflictCardProps) {
  const timeAgo = getTimeAgo(conflict.timestamp);

  return (
    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {conflict.description}
          </span>
        </div>
        <span className="text-[10px] text-gray-500">{timeAgo}</span>
      </div>

      {/* Change info */}
      <div className="text-xs text-gray-600 dark:text-gray-400">
        Changed by <span className="font-medium">{conflict.remoteUserName}</span> on{' '}
        <span className="font-mono">{conflict.dataType}</span>
        {conflict.elementId && <span> (#{String(conflict.elementId)})</span>}
      </div>

      {/* Diff view */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          <div className="text-[10px] font-semibold text-red-600 dark:text-red-400 mb-1">
            Your version
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300 break-words font-mono max-h-20 overflow-y-auto">
            {truncate(conflict.localValue, 120)}
          </div>
        </div>
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
          <div className="text-[10px] font-semibold text-green-600 dark:text-green-400 mb-1">
            Remote version
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300 break-words font-mono max-h-20 overflow-y-auto">
            {truncate(conflict.remoteValue, 120)}
          </div>
        </div>
      </div>

      {/* Merged result */}
      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1">
          Auto-merged result (CRDT)
        </div>
        <div className="text-xs text-gray-700 dark:text-gray-300 break-words font-mono max-h-20 overflow-y-auto">
          {truncate(conflict.mergedValue, 120)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onResolve(conflict.id, 'accepted')}
          className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          Accept Merge
        </button>
        <button
          onClick={() => onResolve(conflict.id, 'reverted')}
          className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Use My Version
        </button>
        <button
          onClick={() => onResolve(conflict.id, 'custom')}
          className="px-3 py-1 text-xs font-medium bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Conflict Resolution Panel ───────────────────────────────────────

export function ConflictResolutionPanel() {
  const { conflicts, resolveConflict, clearResolvedConflicts } = useCollaborationStore();

  const pendingConflicts = conflicts.filter((c) => c.status === 'pending');

  const handleResolve = useCallback(
    (conflictId: string, status: ConflictEvent['status']) => {
      resolveConflict(conflictId, status);
    },
    [resolveConflict],
  );

  if (pendingConflicts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-96 max-h-[60vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-yellow-300 dark:border-yellow-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="text-yellow-500">⚠️</span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Merge Conflicts
          </h3>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
            {pendingConflicts.length}
          </span>
        </div>
        <button
          onClick={clearResolvedConflicts}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Clear all
        </button>
      </div>

      {/* Conflicts */}
      <div className="p-3 space-y-3">
        {pendingConflicts.map((conflict) => (
          <ConflictCard key={conflict.id} conflict={conflict} onResolve={handleResolve} />
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
