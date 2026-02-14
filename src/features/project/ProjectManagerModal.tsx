import React, { useState } from 'react';
import Icon from '@shared/components/ui/Icon';
import {
  Project,
  ProjectMetadata,
  PromptState,
  CharacterProfile,
  VisualDNA,
  StoryboardState,
} from '@core/types';
import { useProjectManager } from '@shared/hooks/useProjectManager';
import { useLocationStore } from '@core/store/useLocationStore';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Current State for Saving
  currentProjectId: string | null;
  currentProjectName: string | null;
  currentPromptState: PromptState;
  currentCharacters: CharacterProfile[];
  currentDNAs: VisualDNA[];
  currentStoryboard: StoryboardState;

  // Actions
  onLoadProject: (project: Project) => void;
  onResetWorkspace: () => void;
  onUpdateProjectMeta: (id: string, name: string) => void;

  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  currentProjectName,
  currentPromptState,
  currentCharacters,
  currentDNAs,
  currentStoryboard,
  onLoadProject,
  onResetWorkspace,
  onUpdateProjectMeta,
  addToast,
}) => {
  const { projectList, createProject, saveProject, loadProject, deleteProject } =
    useProjectManager();
  const { locations } = useLocationStore();
  const [newProjectName, setNewProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    setIsSaving(true);
    try {
      const project = createProject(
        newProjectName,
        currentPromptState,
        currentCharacters,
        locations,
        currentDNAs,
        currentStoryboard,
      );
      onUpdateProjectMeta(project.id, project.name);
      setNewProjectName('');
      addToast('Project created successfully.', 'success');
    } catch (_e) {
      addToast('Failed to save project. Storage may be full.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCurrent = () => {
    if (!currentProjectId || !currentProjectName) return;
    setIsSaving(true);
    try {
      saveProject(
        currentProjectId,
        currentProjectName,
        currentPromptState,
        currentCharacters,
        locations,
        currentDNAs,
        currentStoryboard,
      );
      addToast('Project updated.', 'success');
    } catch (_e) {
      addToast('Failed to update project.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = (meta: ProjectMetadata) => {
    const project = loadProject(meta.id);
    if (project) {
      onLoadProject(project);
      onClose();
      addToast(`Loaded "${project.name}"`, 'info');
    } else {
      addToast('Failed to load project data. It may be corrupted.', 'error');
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      deleteProject(id);
      if (currentProjectId === id) {
        onResetWorkspace(); // If we deleted the active project, reset UI
      }
      addToast('Project deleted.', 'success');
    }
  };

  const handleNewWorkspace = () => {
    if (
      confirm('Start a new empty workspace? Unsaved changes to the current project will be lost.')
    ) {
      onResetWorkspace();
      onClose();
      addToast('New workspace created.', 'info');
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[90] p-4"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="bg-slate-900/80 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
        tabIndex={-1}
      >
        <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Icon name="folder" className="w-6 h-6 text-cyan-400" />
              Project Manager
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {currentProjectId ? `Active: ${currentProjectName}` : 'Unsaved Workspace'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleNewWorkspace}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-600 transition-colors"
            >
              <Icon name="plus" className="w-4 h-4" />
              New Workspace
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Icon name="cancel" className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="flex-grow p-6 overflow-y-auto">
          {/* Save Section */}
          <div className="mb-8 p-6 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
              Save Current Workspace
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow flex gap-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter new project name..."
                  className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newProjectName.trim() || isSaving}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Save as New
                </button>
              </div>

              {currentProjectId && (
                <>
                  <div className="hidden md:block w-px bg-slate-700 mx-2"></div>
                  <button
                    onClick={handleUpdateCurrent}
                    disabled={isSaving}
                    className="px-6 py-2 bg-slate-700 hover:bg-green-600 hover:text-white text-slate-200 font-bold rounded-lg transition-colors border border-slate-600 hover:border-green-500 shadow-lg disabled:opacity-50 flex items-center gap-2 justify-center"
                  >
                    <Icon name="save" className="w-4 h-4" />
                    Update &quot;{currentProjectName}&quot;
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Projects List */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
              Your Projects ({projectList.length})
            </h3>
            {projectList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                <Icon name="folder" className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No projects saved yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectList.map((meta) => {
                  const isActive = meta.id === currentProjectId;
                  return (
                    <div
                      key={meta.id}
                      className={`
                                                relative p-4 rounded-xl border transition-all group
                                                ${
                                                  isActive
                                                    ? 'bg-cyan-900/10 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                                                    : 'bg-slate-800/30 border-slate-700 hover:border-slate-500 hover:bg-slate-800/60'
                                                }
                                            `}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Icon
                            name="folder"
                            className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}
                          />
                          <div>
                            <h4
                              className={`font-bold text-lg truncate ${isActive ? 'text-cyan-100' : 'text-slate-200'}`}
                            >
                              {meta.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {new Date(meta.lastModified).toLocaleDateString()} at{' '}
                              {new Date(meta.lastModified).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleLoad(meta)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                            isActive
                              ? 'bg-cyan-900/30 text-cyan-300 border border-cyan-500/30 cursor-default'
                              : 'bg-slate-700 hover:bg-cyan-600 text-white shadow-md'
                          }`}
                          disabled={isActive}
                        >
                          {isActive ? 'Active' : 'Load'}
                        </button>
                        <button
                          onClick={(e) => handleDelete(meta.id, e)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-900/30"
                          title="Delete Project"
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectManagerModal;
