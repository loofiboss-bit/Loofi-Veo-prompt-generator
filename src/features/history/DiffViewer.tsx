/**
 * Diff Viewer Component
 * Side-by-side comparison of prompts with diff highlighting
 * v1.3.0 - Workflow Integration
 */

import React, { useMemo } from 'react';
import { diffService } from '@core/services/diffService';
import type { HistoryEntry } from '@core/services/historyService';
import Icon from '@shared/components/ui/Icon';

interface DiffViewerProps {
  entry1: HistoryEntry;
  entry2: HistoryEntry;
  onClose: () => void;
  onRestore: (entry: HistoryEntry) => void;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ entry1, entry2, onClose, onRestore }) => {
  // Compute diff
  const diff = useMemo(() => {
    return diffService.compareEntries(entry1, entry2);
  }, [entry1, entry2]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderDiffLine = (change: any, index: number) => {
    const bgColor =
      change.type === 'add'
        ? 'bg-green-900/30'
        : change.type === 'remove'
          ? 'bg-red-900/30'
          : change.type === 'modify'
            ? 'bg-yellow-900/30'
            : 'bg-transparent';

    const borderColor =
      change.type === 'add'
        ? 'border-l-2 border-green-500'
        : change.type === 'remove'
          ? 'border-l-2 border-red-500'
          : change.type === 'modify'
            ? 'border-l-2 border-yellow-500'
            : '';

    const icon =
      change.type === 'add'
        ? '+'
        : change.type === 'remove'
          ? '-'
          : change.type === 'modify'
            ? '~'
            : ' ';

    return (
      <div key={index} className={`${bgColor} ${borderColor} px-3 py-1 font-mono text-xs`}>
        <span className="text-slate-500 mr-2 select-none">{icon}</span>
        <span className="text-slate-200">{change.content}</span>
      </div>
    );
  };

  const renderMetadataDiff = () => {
    const metadataKeys = Object.keys(diff.metadata) as Array<keyof typeof diff.metadata>;

    if (metadataKeys.length === 0) {
      return <div className="text-center py-4 text-slate-500 text-sm">No metadata changes</div>;
    }

    return (
      <div className="space-y-2">
        {metadataKeys.map((key) => {
          const change = diff.metadata[key];
          if (!change) return null;

          return (
            <div key={key} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="text-xs font-semibold text-slate-400 mb-2 uppercase">{key}</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-red-900/20 border border-red-900/30 rounded px-2 py-1">
                  <span className="text-red-400 text-xs font-mono">
                    {String(change.old) || '(empty)'}
                  </span>
                </div>
                <Icon name="arrow-right" className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div className="flex-1 bg-green-900/20 border border-green-900/30 rounded px-2 py-1">
                  <span className="text-green-400 text-xs font-mono">
                    {String(change.new) || '(empty)'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTagDiff = () => {
    const { added, removed, unchanged } = diff.tags;

    if (added.length === 0 && removed.length === 0) {
      return <div className="text-center py-4 text-slate-500 text-sm">No tag changes</div>;
    }

    return (
      <div className="space-y-3">
        {removed.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-red-400 mb-2">Removed Tags</div>
            <div className="flex flex-wrap gap-2">
              {removed.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-red-900/20 border border-red-900/30 rounded text-xs text-red-400"
                >
                  - {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {added.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-green-400 mb-2">Added Tags</div>
            <div className="flex flex-wrap gap-2">
              {added.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-green-900/20 border border-green-900/30 rounded text-xs text-green-400"
                >
                  + {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {unchanged.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2">Unchanged Tags</div>
            <div className="flex flex-wrap gap-2">
              {unchanged.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 90) return 'text-green-400';
    if (similarity >= 70) return 'text-yellow-400';
    if (similarity >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="button"
      tabIndex={0}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="bg-slate-900/90 backdrop-blur-xl w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Icon name="compare" className="w-6 h-6 text-cyan-400" />
              Prompt Comparison
            </h2>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400">Similarity:</span>
              <span
                className={`text-sm font-bold ${getSimilarityColor(diff.prompt.summary.similarity)}`}
              >
                {diff.prompt.summary.similarity.toFixed(1)}%
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </header>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 px-5 py-3 bg-slate-800/30 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-slate-400">
              <span className="font-semibold text-green-400">{diff.prompt.summary.additions}</span>{' '}
              additions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs text-slate-400">
              <span className="font-semibold text-red-400">{diff.prompt.summary.deletions}</span>{' '}
              deletions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-slate-400">
              <span className="font-semibold text-yellow-400">
                {diff.prompt.summary.modifications}
              </span>{' '}
              modifications
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-500"></div>
            <span className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">{diff.prompt.summary.unchanged}</span>{' '}
              unchanged
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Prompt Diff */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
              <Icon name="document" className="w-4 h-4" />
              Prompt Changes
            </h3>
            <div className="bg-slate-950/50 rounded-lg border border-slate-700 overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {diff.prompt.changes.map((change, index) => renderDiffLine(change, index))}
              </div>
            </div>
          </div>

          {/* Metadata Diff */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
              <Icon name="settings" className="w-4 h-4" />
              Metadata Changes
            </h3>
            {renderMetadataDiff()}
          </div>

          {/* Tag Diff */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
              <Icon name="tag" className="w-4 h-4" />
              Tag Changes
            </h3>
            {renderTagDiff()}
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="flex items-center justify-between p-5 border-t border-slate-700 flex-shrink-0 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onRestore(entry1)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Icon name="undo" className="w-4 h-4" />
              Restore Original
            </button>
            <button
              onClick={() => onRestore(entry2)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Icon name="check" className="w-4 h-4" />
              Use Modified
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default DiffViewer;
