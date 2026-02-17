/**
 * WorkspaceManagerModal
 * Full workspace management modal (create, rename, delete, reorder).
 * v1.9.0 - Platform Foundations (Sprint 3, Task 1.8)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '@core/store/useWorkspaceStore';
import Icon from '@shared/components/ui/Icon';
import AppDialog from '@shared/components/ui/AppDialog';
import EmptyState from '@shared/components/EmptyState';
import type { Workspace } from '@core/types/workspace';
import { WorkspaceSettingsPanel } from './WorkspaceSettingsPanel';

// ─── Constants ──────────────────────────────────────────────────────

const WORKSPACE_COLORS = [
  { id: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { id: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { id: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { id: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { id: 'green', label: 'Green', class: 'bg-green-500' },
  { id: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { id: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { id: 'red', label: 'Red', class: 'bg-red-500' },
];

type ModalView = 'list' | 'create' | 'settings';

// ─── Props ──────────────────────────────────────────────────────────

interface WorkspaceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function WorkspaceManagerModal({ isOpen, onClose }: WorkspaceManagerModalProps) {
  const {
    workspaces,
    currentWorkspaceId,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setCurrentWorkspace,
    isLoading,
  } = useWorkspaceStore();

  const [view, setView] = useState<ModalView>('list');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('cyan');

  const editInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setView('list');
      setSelectedWorkspace(null);
      setEditingId(null);
      setDeleteConfirmId(null);
      setNewName('');
      setNewDescription('');
      setNewColor('cyan');
    }
  }, [isOpen]);

  // Focus edit input
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // ─── Handlers ─────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    await createWorkspace({
      name: trimmed,
      description: newDescription.trim() || undefined,
      color: newColor,
    });

    setNewName('');
    setNewDescription('');
    setNewColor('cyan');
    setView('list');
  }, [newName, newDescription, newColor, createWorkspace]);

  const handleStartRename = useCallback((workspace: Workspace) => {
    setEditingId(workspace.id);
    setEditName(workspace.name);
  }, []);

  const handleSaveRename = useCallback(
    async (id: string) => {
      const trimmed = editName.trim();
      if (!trimmed) return;

      await updateWorkspace(id, { name: trimmed });
      setEditingId(null);
      setEditName('');
    },
    [editName, updateWorkspace],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteWorkspace(id);
      setDeleteConfirmId(null);
    },
    [deleteWorkspace],
  );

  const handleOpenSettings = useCallback((workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setView('settings');
  }, []);

  const handleSwitchTo = useCallback(
    async (workspace: Workspace) => {
      await setCurrentWorkspace(workspace.id);
    },
    [setCurrentWorkspace],
  );

  if (!isOpen) return null;

  const getColorClass = (color?: string): string => {
    return WORKSPACE_COLORS.find((c) => c.id === color)?.class ?? 'bg-cyan-500';
  };

  return (
    <>
      <AppDialog
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        showCloseButton={false}
        bodyClassName="!p-0"
        dialogClassName="max-h-[80vh] max-w-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            {view !== 'list' && (
              <button
                onClick={() => setView('list')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Back to workspace list"
              >
                <Icon name="arrow-right" className="w-4 h-4 rotate-180" />
              </button>
            )}
            <h2 className="text-lg font-bold text-white">
              {view === 'create' && 'New Workspace'}
              {view === 'settings' && `${selectedWorkspace?.name ?? ''} Settings`}
              {view === 'list' && 'Manage Workspaces'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close workspace manager"
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ─── List View ───────────────────────────────────────── */}
          {view === 'list' && (
            <div className="p-4 space-y-2">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className={`group flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                    workspace.id === currentWorkspaceId
                      ? 'border-cyan-500/30 bg-cyan-500/5'
                      : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
                  }`}
                >
                  {/* Color dot */}
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${getColorClass(workspace.metadata.color)}`}
                  />

                  {/* Name (editable) */}
                  <div className="flex-1 min-w-0">
                    {editingId === workspace.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(workspace.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onBlur={() => handleSaveRename(workspace.id)}
                        className="w-full px-2 py-1 bg-slate-900 border border-cyan-500 rounded text-sm text-white focus:outline-none"
                        aria-label="Rename workspace"
                        maxLength={50}
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 truncate">
                            {workspace.name}
                          </span>
                          {workspace.id === currentWorkspaceId && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 rounded">
                              Active
                            </span>
                          )}
                          {workspace.id === 'default' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-400 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        {workspace.description && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {workspace.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5">
                          {workspace.metadata.projectCount} project
                          {workspace.metadata.projectCount !== 1 ? 's' : ''}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {editingId !== workspace.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {workspace.id !== currentWorkspaceId && (
                        <button
                          onClick={() => handleSwitchTo(workspace)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                          title="Switch to this workspace"
                          aria-label={`Switch to ${workspace.name}`}
                        >
                          <Icon name="arrow-up-right" className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleStartRename(workspace)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Rename"
                        aria-label={`Rename ${workspace.name}`}
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenSettings(workspace)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Settings"
                        aria-label={`Settings for ${workspace.name}`}
                      >
                        <Icon name="settings" className="w-4 h-4" />
                      </button>
                      {workspace.id !== 'default' && (
                        <button
                          onClick={() => setDeleteConfirmId(workspace.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                          title="Delete"
                          aria-label={`Delete ${workspace.name}`}
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {workspaces.length === 0 && (
                <EmptyState
                  icon="🧭"
                  title="No workspaces found."
                  description="Create your first workspace to organize projects by client, team, or theme."
                  className="py-12"
                />
              )}
            </div>
          )}

          {/* ─── Create View ─────────────────────────────────────── */}
          {view === 'create' && (
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="ws-name"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Workspace Name
                </label>
                <input
                  id="ws-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Client Project, Personal"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                  maxLength={50}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="ws-desc"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Description
                  <span className="text-slate-500 font-normal"> (optional)</span>
                </label>
                <textarea
                  id="ws-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is this workspace used for?"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 resize-none"
                  maxLength={200}
                />
              </div>

              {/* Color */}
              <div>
                <span className="block text-sm font-medium text-slate-300 mb-2">Color</span>
                <div className="flex gap-2 flex-wrap">
                  {WORKSPACE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setNewColor(c.id)}
                      className={`w-8 h-8 rounded-lg ${c.class} transition-all ${
                        newColor === c.id
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      title={c.label}
                      aria-label={`Color: ${c.label}`}
                      aria-pressed={newColor === c.id ? true : undefined}
                    />
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || isLoading}
                className="w-full px-4 py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          )}

          {/* ─── Settings View ───────────────────────────────────── */}
          {view === 'settings' && selectedWorkspace && (
            <WorkspaceSettingsPanel workspace={selectedWorkspace} />
          )}
        </div>

        {/* Footer (list view only) */}
        {view === 'list' && (
          <div className="px-6 py-4 border-t border-slate-700/50">
            <button
              onClick={() => setView('create')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-500 transition-colors"
            >
              <Icon name="plus" className="w-4 h-4" />
              <span>New Workspace</span>
            </button>
          </div>
        )}
      </AppDialog>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <AppDialog
          isOpen={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Workspace"
          size="sm"
          layer="overlay"
          bodyClassName="space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <Icon name="alert-triangle" className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete &quot;
              {workspaces.find((w) => w.id === deleteConfirmId)?.name}&quot;?
            </p>
          </div>
          <p className="text-xs text-slate-500">
            All projects will be moved to the Default workspace. This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 rounded-xl bg-slate-800 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteConfirmId)}
              disabled={isLoading}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </AppDialog>
      )}
    </>
  );
}
