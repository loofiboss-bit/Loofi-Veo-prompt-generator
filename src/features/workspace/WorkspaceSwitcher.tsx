/**
 * WorkspaceSwitcher Component
 * Dropdown selector in the sidebar for switching between workspaces.
 * v1.9.0 - Platform Foundations (Sprint 3, Task 1.7)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '@core/store/useWorkspaceStore';
import Icon from '@shared/components/ui/Icon';
import type { Workspace } from '@core/types/workspace';

// ─── Constants ──────────────────────────────────────────────────────

const WORKSPACE_COLORS: Record<string, string> = {
  cyan: 'bg-cyan-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
};

const DEFAULT_COLOR = 'cyan';

// ─── Props ──────────────────────────────────────────────────────────

interface WorkspaceSwitcherProps {
  /** Whether sidebar is collapsed (icon-only mode) */
  isCollapsed?: boolean;
  /** Callback when workspace manager should open */
  onOpenManager?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function WorkspaceSwitcher({ isCollapsed = false, onOpenManager }: WorkspaceSwitcherProps) {
  const { workspaces, currentWorkspaceId, setCurrentWorkspace, createWorkspace } =
    useWorkspaceStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setNewName('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleSwitch = useCallback(
    async (workspace: Workspace) => {
      if (workspace.id === currentWorkspaceId) {
        setIsOpen(false);
        return;
      }
      await setCurrentWorkspace(workspace.id);
      setIsOpen(false);
    },
    [currentWorkspaceId, setCurrentWorkspace],
  );

  const handleCreate = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    await createWorkspace({ name: trimmed });
    setNewName('');
    setIsCreating(false);
  }, [newName, createWorkspace]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleCreate();
      } else if (e.key === 'Escape') {
        setIsCreating(false);
        setNewName('');
      }
    },
    [handleCreate],
  );

  const getColorClass = (color?: string): string => {
    return WORKSPACE_COLORS[color || DEFAULT_COLOR] || WORKSPACE_COLORS[DEFAULT_COLOR];
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      {isCollapsed ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-center p-3"
          title={currentWorkspace?.name ?? 'Workspaces'}
          aria-label={`Switch workspace. Current: ${currentWorkspace?.name ?? 'None'}`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div
            className={`w-3 h-3 rounded-full ${getColorClass(currentWorkspace?.metadata.color)}`}
          />
        </button>
      ) : isOpen ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors group"
          aria-expanded="true"
          aria-haspopup="listbox"
          aria-label={`Switch workspace. Current: ${currentWorkspace?.name ?? 'None'}`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getColorClass(currentWorkspace?.metadata.color)}`}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 leading-tight">
              Workspace
            </div>
            <div className="text-sm font-semibold text-slate-200 truncate">
              {currentWorkspace?.name ?? 'Default'}
            </div>
          </div>
          <Icon
            name="chevron-down"
            className="w-4 h-4 text-slate-400 transition-transform rotate-180"
          />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-slate-800/60 transition-colors group border-b border-slate-800/60"
          aria-expanded="false"
          aria-haspopup="listbox"
          aria-label={`Switch workspace. Current: ${currentWorkspace?.name ?? 'None'}`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${getColorClass(currentWorkspace?.metadata.color)}`}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 leading-tight">
              Workspace
            </div>
            <div className="text-sm font-semibold text-slate-200 truncate">
              {currentWorkspace?.name ?? 'Default'}
            </div>
          </div>
          <Icon
            name="chevron-down"
            className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform"
          />
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${isCollapsed ? 'start-full top-0 w-60' : 'start-0 end-0 top-full'} mt-1.5 mx-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/10`}
        >
          {/* Workspace list */}
          <div className="max-h-48 overflow-y-auto py-1" role="listbox" aria-label="Workspaces">
            {workspaces.map((workspace) =>
              workspace.id === currentWorkspaceId ? (
                <button
                  key={workspace.id}
                  onClick={() => handleSwitch(workspace)}
                  role="option"
                  aria-selected="true"
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors bg-blue-600/20 text-blue-200 font-medium border-l-2 border-blue-400"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${getColorClass(workspace.metadata.color)}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate block">{workspace.name}</span>
                    <span className="text-xs text-blue-300/70">
                      {workspace.metadata.projectCount} project
                      {workspace.metadata.projectCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Icon name="check" className="w-4 h-4 text-blue-400 flex-shrink-0" />
                </button>
              ) : (
                <button
                  key={workspace.id}
                  onClick={() => handleSwitch(workspace)}
                  role="option"
                  aria-selected="false"
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors text-slate-300 hover:bg-slate-800/70"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${getColorClass(workspace.metadata.color)}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{workspace.name}</span>
                    <span className="text-xs text-slate-500">
                      {workspace.metadata.projectCount} project
                      {workspace.metadata.projectCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>
              ),
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800/80" />

          {/* Create new workspace */}
          {isCreating ? (
            <div className="p-2">
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Workspace name..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                aria-label="New workspace name"
                maxLength={50}
              />
              <div className="flex gap-1 mt-1">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="flex-1 px-2 py-1.5 bg-cyan-600 text-white text-xs font-medium rounded-lg hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewName('');
                  }}
                  className="px-2 py-1.5 text-slate-400 text-xs hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <Icon name="plus" className="w-4 h-4" />
              <span>New Workspace</span>
            </button>
          )}

          {/* Manage workspaces */}
          {onOpenManager && (
            <>
              <div className="border-t border-slate-700" />
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenManager();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              >
                <Icon name="settings" className="w-4 h-4" />
                <span>Manage Workspaces</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
