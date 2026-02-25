/**
 * BranchTreeView
 * Visual tree component for git-like prompt branching
 * Renders branch nodes as an interactive tree with fork/compare actions
 */

import React, { useMemo, useCallback, useState } from 'react';
import { useHistoryStore } from '@core/store/useHistoryStore';
import type { BranchNode, PromptBranch } from '@core/types';
import type { HistoryEntry } from '@core/services/historyService';
import Icon from '@shared/components/ui/Icon';
import EmptyState from '@shared/components/EmptyState';

interface BranchTreeViewProps {
  entries: HistoryEntry[];
  onSelectEntry: (entry: HistoryEntry) => void;
  onCompare: (entryA: HistoryEntry, entryB: HistoryEntry) => void;
}

interface TreeNodeProps {
  node: BranchNode;
  entry: HistoryEntry | undefined;
  branch: PromptBranch | undefined;
  isActive: boolean;
  isForkPoint: boolean;
  childBranches: PromptBranch[];
  onSelect: (node: BranchNode) => void;
  onFork: (nodeId: string) => void;
  onSelectEntry: (entry: HistoryEntry) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  entry,
  branch,
  isActive,
  isForkPoint,
  childBranches,
  onSelect,
  onFork,
  onSelectEntry,
}) => {
  const branchColor = branch?.color || '#64748b';
  const isRootPlaceholder = !entry || node.entryId === '';

  return (
    <div className="flex items-start gap-2 group">
      {/* Vertical line connector */}
      <div className="flex flex-col items-center pt-1" style={{ minWidth: 20 }}>
        <button
          onClick={() => onSelect(node)}
          className={`w-3 h-3 rounded-full border-2 transition-all flex-shrink-0 ${
            isActive ? 'scale-125 shadow-lg' : 'hover:scale-110 opacity-80 hover:opacity-100'
          }`}
          style={{
            borderColor: branchColor,
            backgroundColor: isActive ? branchColor : 'transparent',
            boxShadow: isActive ? `0 0 8px ${branchColor}40` : undefined,
          }}
          aria-label={`Select node ${entry?.params.idea || 'root'}`}
        />
        {isForkPoint && (
          <div className="w-px h-4" style={{ backgroundColor: `${branchColor}40` }} />
        )}
      </div>

      {/* Node content */}
      <div
        className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-all cursor-pointer ${
          isActive
            ? 'border-slate-500 bg-slate-800/80'
            : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
        }`}
        onClick={() => entry && onSelectEntry(entry)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && entry) onSelectEntry(entry);
        }}
      >
        {isRootPlaceholder ? (
          <span className="text-slate-500 text-xs italic">Branch root</span>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-slate-200 font-medium truncate text-xs">
                {entry?.params.idea || 'Untitled'}
              </p>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFork(node.id);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60"
                  title="Fork new branch from here"
                >
                  <Icon name="copy" className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-slate-500 text-[10px] font-mono truncate mt-0.5">
              {entry?.prompt.slice(0, 80)}...
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[9px] font-bold px-1 py-0.5 rounded"
                style={{
                  color: branchColor,
                  backgroundColor: `${branchColor}15`,
                  border: `1px solid ${branchColor}30`,
                }}
              >
                {branch?.name || 'unknown'}
              </span>
              <span className="text-[10px] text-slate-600">
                {entry &&
                  new Date(entry.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
              </span>
            </div>
          </>
        )}

        {/* Child branch indicators */}
        {childBranches.length > 0 && (
          <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-slate-700/30">
            {childBranches.map((cb) => (
              <span
                key={cb.id}
                className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{
                  color: cb.color,
                  backgroundColor: `${cb.color}10`,
                  border: `1px solid ${cb.color}25`,
                }}
              >
                ↳ {cb.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BranchTreeView: React.FC<BranchTreeViewProps> = ({ entries, onSelectEntry, onCompare }) => {
  const { branchTree, forkBranch, switchBranch, setActiveNode, renameBranch, deleteBranch } =
    useHistoryStore();

  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string | null>(null);
  const [renamingBranchId, setRenamingBranchId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const entryMap = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  const branches = useMemo(() => {
    if (!branchTree) return [];
    return Object.values(branchTree.branches).sort((a, b) => a.createdAt - b.createdAt);
  }, [branchTree]);

  const orderedNodes = useMemo(() => {
    if (!branchTree) return [];
    return Object.values(branchTree.nodes)
      .filter((n) => n.entryId !== '')
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [branchTree]);

  const childBranchesFor = useCallback(
    (nodeId: string): PromptBranch[] => {
      if (!branchTree) return [];
      return Object.values(branchTree.branches).filter((b) => b.forkNodeId === nodeId);
    },
    [branchTree],
  );

  const handleFork = useCallback(
    async (nodeId: string) => {
      const branchCount = branches.length;
      await forkBranch(nodeId, `branch-${branchCount}`);
    },
    [forkBranch, branches.length],
  );

  const handleNodeSelect = useCallback(
    async (node: BranchNode) => {
      if (compareMode) {
        const entry = entryMap.get(node.entryId);
        if (!entry) return;

        if (!compareSelection) {
          setCompareSelection(node.entryId);
        } else {
          const entryA = entryMap.get(compareSelection);
          if (entryA && entry) {
            onCompare(entryA, entry);
          }
          setCompareSelection(null);
          setCompareMode(false);
        }
      } else {
        await setActiveNode(node.id);
      }
    },
    [compareMode, compareSelection, entryMap, onCompare, setActiveNode],
  );

  const handleStartRename = (branchId: string, currentName: string) => {
    setRenamingBranchId(branchId);
    setRenameValue(currentName);
  };

  const handleConfirmRename = async () => {
    if (renamingBranchId && renameValue.trim()) {
      await renameBranch(renamingBranchId, renameValue.trim());
    }
    setRenamingBranchId(null);
    setRenameValue('');
  };

  if (!branchTree || orderedNodes.length === 0) {
    return (
      <EmptyState
        icon="🌿"
        title="No branches yet"
        description="Generate prompts to build your branching history. Fork from any point to explore alternatives."
        className="py-12"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Branch selector toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap flex-1">
          {branches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => switchBranch(branch.id)}
              onDoubleClick={() => handleStartRename(branch.id, branch.name)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                branchTree.activeBranchId === branch.id
                  ? 'shadow-sm'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                borderColor:
                  branchTree.activeBranchId === branch.id
                    ? `${branch.color}60`
                    : `${branch.color}30`,
                backgroundColor:
                  branchTree.activeBranchId === branch.id ? `${branch.color}15` : 'transparent',
                color: branch.color,
              }}
              title={`Switch to ${branch.name} (double-click to rename)`}
            >
              {renamingBranchId === branch.id ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.currentTarget.value)}
                  onBlur={handleConfirmRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmRename();
                    if (e.key === 'Escape') setRenamingBranchId(null);
                  }}
                  className="bg-transparent border-none text-xs w-20 focus:outline-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                branch.name
              )}
            </button>
          ))}
        </div>

        {/* Compare toggle */}
        <button
          onClick={() => {
            setCompareMode(!compareMode);
            setCompareSelection(null);
          }}
          className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
            compareMode
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
              : 'border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          <Icon name="layers" className="w-3 h-3 inline mr-1" />
          {compareMode ? (compareSelection ? 'Select second...' : 'Select first...') : 'Compare'}
        </button>

        {/* Delete branch (only if > 1) */}
        {branches.length > 1 && (
          <button
            onClick={() => deleteBranch(branchTree.activeBranchId)}
            className="p-1 text-xs rounded text-slate-500 hover:text-red-400 hover:bg-slate-700/60 transition-colors"
            title="Delete active branch"
          >
            <Icon name="trash" className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Compare mode hint */}
      {compareMode && (
        <div className="text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-md px-3 py-1.5">
          Click two nodes to compare their prompts side-by-side
          {compareSelection && (
            <span className="ml-2 text-amber-300">(1 selected — pick the second)</span>
          )}
        </div>
      )}

      {/* Tree nodes */}
      <div className="space-y-1.5">
        {orderedNodes.map((node) => {
          const entry = entryMap.get(node.entryId);
          const branch = branchTree.branches[node.branchId];
          const activeBranch = branchTree.branches[branchTree.activeBranchId];
          const isActive = activeBranch?.activeNodeId === node.id;
          const isForkPoint = childBranchesFor(node.id).length > 0;

          return (
            <TreeNode
              key={node.id}
              node={node}
              entry={entry}
              branch={branch}
              isActive={isActive}
              isForkPoint={isForkPoint}
              childBranches={childBranchesFor(node.id)}
              onSelect={handleNodeSelect}
              onFork={handleFork}
              onSelectEntry={onSelectEntry}
            />
          );
        })}
      </div>
    </div>
  );
};

export { BranchTreeView };
