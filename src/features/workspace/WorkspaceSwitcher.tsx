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

  // Collapsed mode: just show color dot
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center p-2"
        title={currentWorkspace?.name ?? 'Workspaces'}
        aria-label={`Current workspace: ${currentWorkspace?.name ?? 'None'}`}
      >
        <div
          className={`w-3 h-3 rounded-full ${getColorClass(currentWorkspace?.metadata.color)}`}
        />
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors group"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Switch workspace. Current: ${currentWorkspace?.name ?? 'None'}`}
      >
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getColorClass(currentWorkspace?.metadata.color)}`}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 leading-tight">Workspace</div>
          <div className="text-sm font-semibold text-slate-200 truncate">
            {currentWorkspace?.name ?? 'Default'}
          </div>
        </div>
        <Icon
          name="chevron-down"
          className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1 mx-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
          role="listbox"
          aria-label="Workspaces"
        >
          {/* Workspace list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleSwitch(workspace)}
                role="option"
                aria-selected={workspace.id === currentWorkspaceId}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  workspace.id === currentWorkspaceId
                    ? 'bg-cyan-600/15 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
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
                {workspace.id === currentWorkspaceId && (
                  <Icon name="check" className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700" />

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
