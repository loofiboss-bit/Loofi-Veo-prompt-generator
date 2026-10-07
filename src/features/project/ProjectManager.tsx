import React, { useState, useEffect, useRef } from 'react';
import Icon from '@shared/components/ui/Icon';
import {
  Project,
  ProjectMetadata,
  PromptState,
  CharacterProfile,
  VisualDNA,
  StoryboardState,
  GlobalStyle,
} from '@core/types';
import { useProjectManager } from '@shared/hooks/useProjectManager';
import { useLocationStore } from '@core/store/useLocationStore';
import { useAppStore } from '@core/store/useAppStore'; // Access global assets
import { logger } from '@core/services/loggerService';
import {
  exportPortableProject,
  importPortableProject,
  hydrateProjectMedia,
} from '@core/services/projectTransferService';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { usePromptStudioDraftStore } from '@core/store/usePromptStudioDraftStore';
import { useProjectStore } from '@core/store/useProjectStore';
import EmptyState from '@shared/components/EmptyState';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import RangeInput from '@shared/components/ui/RangeInput';
import { useTranslation } from 'react-i18next';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  // Current State for Saving
  currentPromptState: PromptState;
  currentCharacters: CharacterProfile[];
  currentDNAs: VisualDNA[];
  currentStoryboard: StoryboardState;
  // Load Handler
  onLoadProject: (project: Project) => void;
  onResetWorkspace: () => void; // Passed from ModalManager
  onUpdateProjectMeta: (id: string, name: string) => void; // Passed from ModalManager
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  // Update Handler
  onUpdateGlobalStyle?: (style: Partial<GlobalStyle>) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  isOpen,
  onClose,
  currentPromptState,
  currentCharacters,
  currentDNAs,
  currentStoryboard,
  onLoadProject,
  onResetWorkspace: _onResetWorkspace,
  onUpdateProjectMeta: _onUpdateProjectMeta,
  addToast,
  onUpdateGlobalStyle,
}) => {
  const { t } = useTranslation('project');
  const {
    projectList,
    flushPersistence,
    createProject,
    saveProject: _saveProject,
    loadProject,
    deleteProject,
    exportProject: _exportJson,
  } = useProjectManager();
  const { locations } = useLocationStore();
  const { productionBible } = useAppStore();

  const [projectName, setProjectName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Style State (Local mirroring for instant feedback in UI)
  const globalStyle = currentPromptState.globalStyle || {
    description: '',
    strength: 100,
    isLocked: false,
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    try {
      if (!(await usePromptStudioDraftStore.getState().flush()))
        throw new Error('Save the current Studio draft before changing projects.');
      if (!projectName.trim()) {
        addToast('Please enter a project name.', 'error');
        return;
      }
      const project = createProject(
        projectName,
        currentPromptState,
        currentCharacters,
        locations,
        currentDNAs,
        currentStoryboard,
        productionBible,
      );
      await flushPersistence();
      _onUpdateProjectMeta(project.id, project.name);
      setProjectName('');
      addToast('Project saved successfully.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save project.', 'error');
    }
  };

  const handleLoad = async (meta: ProjectMetadata) => {
    try {
      if (!(await usePromptStudioDraftStore.getState().flush()))
        throw new Error('Save the current Studio draft before changing projects.');
      if (confirm(t('projectManager.loadConfirm'))) {
        const project = await projectDocumentService.load(meta.id);
        if (project) {
          await hydrateProjectMedia(project);
          onLoadProject(project);
          onClose();
          addToast(`Loaded project: ${project.name}`, 'success');
        } else {
          addToast('Failed to load project data.', 'error');
        }
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load project.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (confirm(t('projectManager.deleteConfirm'))) {
        await deleteProject(id);
        addToast('Project deleted.', 'success');
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to delete project.', 'error');
    }
  };

  // Full Archive Export (Zip)
  const handleBackup = async (meta: ProjectMetadata) => {
    setIsProcessing(true);
    try {
      const project = loadProject(meta.id);
      if (!project) throw new Error('Project data not found');

      const blob = await exportPortableProject(project.id);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.loofi-project`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('Project archived successfully!', 'success');
    } catch (e) {
      logger.error('Failed to archive project', e);
      addToast('Failed to archive project.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Restore from Zip
  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreLatestAutomaticBackup = async (meta: ProjectMetadata) => {
    if (!window.electron?.listProjectBackups || !window.electron.restoreProjectBackup) {
      addToast('Automatic backups are available in the desktop app.', 'info');
      return;
    }
    if (!confirm(`Restore the latest verified automatic backup for "${meta.name}"?`)) return;
    setIsProcessing(true);
    try {
      if (!(await usePromptStudioDraftStore.getState().flush()))
        throw new Error('Save the current Studio draft before changing projects.');
      const backups = await window.electron.listProjectBackups(meta.id);
      const latest = backups.find((backup) => !backup.corrupt);
      if (!latest) throw new Error('No valid automatic backup is available.');
      const restored = await window.electron.restoreProjectBackup({
        projectId: meta.id,
        id: latest.id,
      });
      if (!restored.verified) throw new Error('Backup verification failed.');
      onLoadProject(restored.snapshot);
      addToast(
        `Restored verified backup from ${new Date(restored.createdAt).toLocaleString()}.`,
        'success',
      );
      onClose();
    } catch (error) {
      logger.error('Failed to restore automatic project backup', error);
      addToast(
        error instanceof Error ? error.message : 'Automatic backup restore failed.',
        'error',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      if (!(await usePromptStudioDraftStore.getState().flush()))
        throw new Error('Save the current Studio draft before changing projects.');
      const project = await importPortableProject(file);
      await useProjectStore.getState().refreshProjects();
      await useProjectStore.getState().setCurrentProject(project.id);
      onLoadProject(project);
      onClose();
      addToast(`Restored "${project.name}".`, 'success');

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      logger.error('Failed to restore project', error);
      addToast('Failed to restore project. Invalid file format.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStyleUpdate = (updates: Partial<GlobalStyle>) => {
    if (onUpdateGlobalStyle) {
      onUpdateGlobalStyle(updates);
    }
  };

  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Modal backdrop click-to-close; has role="dialog" and keyboard handler
    <div
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[90] p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Stops propagation to prevent backdrop dismiss; presentation-only interaction */}
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
              {t('projectManager.title')}
            </h2>
          </div>
          <div className="flex gap-2">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRestoreFile}
              accept=".loofi-project,.veo,.zip"
              aria-label="Import project backup"
              className="hidden"
            />
            <button
              onClick={handleRestoreClick}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 rounded-lg transition-colors"
              title="Import .loofi-project bundle"
            >
              <Icon name="upload" className="w-3.5 h-3.5" />
              Import Backup
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Close project manager"
              aria-label="Close project manager"
            >
              <Icon name="cancel" className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="flex-grow p-6 overflow-y-auto">
          {/* Project Look Card */}
          <div className="mb-6 p-6 bg-indigo-900/20 rounded-xl border border-indigo-500/30 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Icon name="palette" className="w-24 h-24 text-indigo-400" />
            </div>

            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                <Icon name="magic" className="w-4 h-4" />
                Project Look (Global Style)
              </h3>
              <button
                onClick={() => handleStyleUpdate({ isLocked: !globalStyle.isLocked })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  globalStyle.isLocked
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-indigo-300'
                }`}
              >
                <Icon name={globalStyle.isLocked ? 'lock' : 'unlock'} className="w-3 h-3" />
                {globalStyle.isLocked ? 'Look Locked' : 'Lock Look'}
              </button>
            </div>

            <div className="space-y-4 relative z-10">
              <TextAreaInput
                label="Global Style Description"
                name="globalStyleDesc"
                value={globalStyle.description}
                onChange={(e) => handleStyleUpdate({ description: e.target.value })}
                placeholder="e.g. Wes Anderson aesthetic, symmetrical composition, pastel colors, soft lighting..."
                rows={2}
                disabled={!onUpdateGlobalStyle}
                info="This description will be enforced across all generated clips in this project."
              />

              <div className="bg-slate-900/50 p-3 rounded-lg border border-indigo-500/20">
                <RangeInput
                  label="Enforcement Strength"
                  name="styleStrength"
                  value={globalStyle.strength}
                  onChange={(e) => handleStyleUpdate({ strength: parseInt(e.target.value) })}
                  min={0}
                  max={100}
                  disabled={!onUpdateGlobalStyle}
                />
              </div>
            </div>
          </div>

          {/* Save Section */}
          <div className="mb-8 p-6 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
              {t('projectManager.saveCurrentButton')}
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={t('projectManager.namePlaceholder')}
                className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
              />
              <button
                onClick={handleSave}
                disabled={!projectName.trim()}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <Icon name="save" className="w-4 h-4" />
                  <span>Save</span>
                </div>
              </button>
            </div>
          </div>

          {/* List Section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
              {t('projectManager.savedProjectsTitle')}
            </h3>
            {projectList.length === 0 ? (
              <div className="border-2 border-dashed border-slate-800 rounded-xl">
                <EmptyState
                  icon="📁"
                  title={t('projectManager.empty')}
                  description="Save your current workspace to build up a reusable project library."
                  className="py-12"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectList.map((meta) => (
                  <div
                    key={meta.id}
                    className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-slate-200 text-lg">{meta.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Last modified: {new Date(meta.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleBackup(meta)}
                          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
                          title="Archive Project (.loofi-project)"
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Icon name="spinner" className="w-4 h-4 animate-spin" />
                          ) : (
                            <Icon name="download" className="w-4 h-4" />
                          )}
                        </button>
                        {window.electron?.restoreProjectBackup && (
                          <button
                            onClick={() => void handleRestoreLatestAutomaticBackup(meta)}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded transition-colors"
                            title="Restore latest verified automatic backup"
                            disabled={isProcessing}
                          >
                            <Icon name="history" className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(meta.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                          title={t('projectManager.deleteButton')}
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoad(meta)}
                      className="w-full py-2 bg-slate-700 hover:bg-cyan-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Icon name="upload" className="w-4 h-4" />
                      {t('projectManager.loadButton')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;
