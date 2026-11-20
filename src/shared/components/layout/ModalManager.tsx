import React from 'react';
import { useAppStore } from '@core/store/useAppStore';
import { useHistoryStore } from '@core/store/useHistoryStore';
import { performanceProfiler } from '@core/services/performanceProfiler';
import { pluginService } from '@core/services/pluginService';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import AppDialog from '@shared/components/ui/AppDialog';
import { StudioSkeleton, ModalSkeleton, TimelineSkeleton } from '@shared/components/ui/Skeleton';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import { getPromptTemplates } from '@core/constants/templates';
import {
  HistoryEntry,
  PromptTemplate,
  CustomPreset,
  Project,
  VeoPromptResponse,
} from '@core/types';
import { useTranslation } from 'react-i18next';

const ShortcutsModal = React.lazy(() => import('@features/settings/ShortcutsModal'));
const HistoryPanel = React.lazy(() => import('@features/history/HistoryPanel'));
const TemplatesPanel = React.lazy(() => import('@features/prompt/TemplatesPanel'));
const ProjectManager = React.lazy(() => import('@features/project/ProjectManager'));
const VariablesPanel = React.lazy(() => import('@features/project/VariablesPanel'));
const GlobalSearchModal = React.lazy(() => import('@features/studios/modals/GlobalSearchModal'));
const StoryBoard = React.lazy(() => import('@features/timeline/StoryBoard'));
const ScriptBreakdown = React.lazy(() => import('@shared/components/ScriptBreakdown'));

const LegacySunoRedirect = ({ onClose }: { onClose: () => void }) => {
  React.useEffect(() => {
    onClose();
    window.location.hash = '#/studio?mode=music';
  }, [onClose]);
  return (
    <div className="sr-only" role="status" aria-live="polite">
      Opening Prompt Studio in Music and Lyrics mode.
    </div>
  );
};

interface ModalManagerProps {
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  handlers: {
    handleUseHistoryEntry: (entry: HistoryEntry) => void;
    handleClearHistory: () => void;
    handleDeleteHistoryEntry: (id: string) => void;
    handleUsePresetOrTemplate: (item: PromptTemplate | CustomPreset) => void;
    handleSavePreset: (name: string) => void;
    handleDeletePreset: (id: string) => void;
    handleUpdatePreset: (preset: CustomPreset) => void;
    handleLoadProject: (project: Project) => void;
    handleUpdateProjectMeta: (id: string, name: string) => void;
    handleResetAll: () => void;
    generatedPrompt: VeoPromptResponse | null;
  };
}

// Helper for save preset modal internal state
const SavePresetInternal = ({
  onSave,
  onClose,
}: {
  onSave: (name: string) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation('templates');
  const [name, setName] = React.useState('');
  return (
    <AppDialog
      isOpen={true}
      onClose={onClose}
      size="sm"
      layer="overlay"
      showCloseButton={false}
      bodyClassName="!p-0"
      dialogClassName="max-w-md"
    >
      <div className="w-full rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-100 mb-4">{t('savePresetModal.title')}</h3>
        <TextAreaInput
          label={t('savePresetModal.label')}
          name="newPresetName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('savePresetModal.placeholder')}
          rows={1}
          autoFocus
        />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white">
            {t('savePresetModal.cancel')}
          </button>
          <button
            onClick={() => onSave(name)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md"
          >
            {t('savePresetModal.save')}
          </button>
        </div>
      </div>
    </AppDialog>
  );
};

const StudioMountMetric: React.FC<{ metric: string }> = ({ metric }) => {
  React.useEffect(() => {
    performanceProfiler.end(metric);
  }, [metric]);

  return null;
};

const ModalManager: React.FC<ModalManagerProps> = ({ addToast, handlers }) => {
  const store = useAppStore();
  const historyEntries = useHistoryStore((state) => state.entries);
  const [pluginStudios, setPluginStudios] = React.useState(pluginService.getStudios());

  React.useEffect(() => {
    const unsubscribe = pluginService.subscribe(() => {
      setPluginStudios(pluginService.getStudios());
    });
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    if (!store.activeStudio) return;

    performanceProfiler.start(`studio.open.${store.activeStudio}`);
  }, [store.activeStudio]);

  const activePluginStudio = pluginStudios.find((s) => s.id === store.activeStudio);

  return (
    <>
      {store.isShortcutsOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-shortcuts-panel">
            <ShortcutsModal
              isOpen={store.isShortcutsOpen}
              onClose={() => store.closeModal('isShortcutsOpen')}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.isHistoryOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-history-panel">
            <HistoryPanel
              onSelect={handlers.handleUseHistoryEntry}
              onClear={handlers.handleClearHistory}
              onDelete={handlers.handleDeleteHistoryEntry}
              onClose={() => store.closeModal('isHistoryOpen')}
              language={store.promptState.language}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.isTemplatesOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-templates-panel">
            <TemplatesPanel
              builtInTemplates={getPromptTemplates(store.promptState.language)}
              customPresets={store.customPresets}
              onSelect={handlers.handleUsePresetOrTemplate}
              onDeletePreset={handlers.handleDeletePreset}
              onUpdatePreset={handlers.handleUpdatePreset}
              currentPromptState={store.promptState}
              onClose={() => store.closeModal('isTemplatesOpen')}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.isProjectManagerOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-project-manager">
            <ProjectManager
              isOpen={store.isProjectManagerOpen}
              onClose={() => store.closeModal('isProjectManagerOpen')}
              currentPromptState={store.promptState}
              currentCharacters={store.characterBank}
              currentDNAs={store.visualDNA}
              currentStoryboard={{
                globalContext: store.sbGlobalContext,
                shots: store.sbShots,
                timeline: {
                  tracks: store.tracks,
                  clips: store.clips,
                  zoomLevel: store.zoomLevel,
                  currentTime: store.currentTime,
                },
              }}
              onLoadProject={handlers.handleLoadProject}
              onResetWorkspace={handlers.handleResetAll}
              onUpdateProjectMeta={handlers.handleUpdateProjectMeta}
              addToast={addToast}
              onUpdateGlobalStyle={store.setGlobalStyle}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.isSavePresetModalOpen && (
        <ErrorBoundary panelId="modal-save-preset-panel">
          <SavePresetInternal
            onSave={handlers.handleSavePreset}
            onClose={() => store.closeModal('isSavePresetModalOpen')}
          />
        </ErrorBoundary>
      )}

      {store.activeStudio === 'story' && (
        <React.Suspense fallback={<TimelineSkeleton />}>
          <ErrorBoundary panelId="studio-story-board">
            <StudioMountMetric metric="studio.open.story" />
            <StoryBoard
              isOpen={store.activeStudio === 'story'}
              onClose={store.closeStudio}
              addToast={addToast}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {/* Dynamic Plugin Studios */}
      {activePluginStudio && (
        <React.Suspense fallback={<StudioSkeleton />}>
          <ErrorBoundary panelId={`studio-${activePluginStudio.id}`}>
            <StudioMountMetric metric={`studio.open.${activePluginStudio.id}`} />
            <activePluginStudio.component
              onClose={store.closeStudio}
              addToast={addToast}
              {...activePluginStudio.props}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {!activePluginStudio && store.activeStudio === 'suno' && (
        <React.Suspense fallback={<StudioSkeleton />}>
          <ErrorBoundary panelId="studio-suno-fallback">
            <StudioMountMetric metric="studio.open.suno" />
            <LegacySunoRedirect onClose={store.closeStudio} />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.activeStudio === 'script' && (
        <React.Suspense fallback={<StudioSkeleton />}>
          <ErrorBoundary panelId="studio-script-breakdown">
            <StudioMountMetric metric="studio.open.script" />
            <ScriptBreakdown
              onClose={store.closeStudio}
              addToast={addToast}
              onGenerateShot={(prompt) => {
                store.setPromptState({ idea: prompt });
                handlers.generatedPrompt = { prompt };
                store.openStudio('video');
              }}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.isSearchOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-global-search">
            <GlobalSearchModal
              isOpen={store.isSearchOpen}
              onClose={() => store.closeModal('isSearchOpen')}
              history={historyEntries}
              presets={store.customPresets}
              templates={getPromptTemplates(store.promptState.language)}
              onSelectHistory={handlers.handleUseHistoryEntry}
              onSelectPreset={handlers.handleUsePresetOrTemplate}
              onSelectTemplate={handlers.handleUsePresetOrTemplate}
              language={store.promptState.language}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {/* Variables Panel */}
      {store.isVariablesPanelOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-variables-panel">
            <VariablesPanel
              isOpen={store.isVariablesPanelOpen}
              onClose={() => store.closeModal('isVariablesPanelOpen')}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}
    </>
  );
};

export default ModalManager;
