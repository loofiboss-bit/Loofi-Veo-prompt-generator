import React from 'react';
import { useAppStore } from '@core/store/useAppStore';
import { performanceProfiler } from '@core/services/performanceProfiler';
import { useLocationStore } from '@core/store/useLocationStore';
import { pluginService } from '@core/services/pluginService';
import ShortcutsModal from '@features/settings/ShortcutsModal';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import AppDialog from '@shared/components/ui/AppDialog';
import TutorialGuide from '@features/onboarding/TutorialGuide';
import { StudioSkeleton, ModalSkeleton, TimelineSkeleton } from '@shared/components/ui/Skeleton';
import ErrorBoundary from '@shared/components/ErrorBoundary';

const HistoryPanel = React.lazy(() => import('@features/history/HistoryPanel'));
const TemplatesPanel = React.lazy(() => import('@features/prompt/TemplatesPanel'));
const VariationsPanel = React.lazy(() => import('@shared/components/VariationsPanel'));
const VisualDNAModal = React.lazy(() => import('@features/studios/modals/VisualDNAModal'));
const WizardModal = React.lazy(() => import('@features/studios/modals/WizardModal'));
const CharacterBankModal = React.lazy(() => import('@features/studios/modals/CharacterBankModal'));
const ProjectManager = React.lazy(() => import('@features/project/ProjectManager'));
const SeriesBibleModal = React.lazy(() => import('@features/studios/modals/SeriesBibleModal'));
const LocationManagerModal = React.lazy(
  () => import('@features/studios/modals/LocationManagerModal'),
);
const VariablesPanel = React.lazy(() => import('@features/project/VariablesPanel'));
const NewProjectWizard = React.lazy(() => import('@features/onboarding/NewProjectWizard'));
const GlobalSearchModal = React.lazy(() => import('@features/studios/modals/GlobalSearchModal'));
const VideoAnalysisStudio = React.lazy(() => import('@features/studios/VideoAnalysisStudio'));

const StoryBoard = React.lazy(() => import('@features/timeline/StoryBoard'));
const CompareModelsModal = React.lazy(() => import('@features/studios/modals/CompareModelsModal'));
const SpatialDirectorModal = React.lazy(
  () => import('@features/studios/modals/SpatialDirectorModal'),
);
const PronunciationGuide = React.lazy(() => import('@shared/components/PronunciationGuide'));
const ScriptBreakdown = React.lazy(() => import('@shared/components/ScriptBreakdown'));
import { getPromptTemplates } from '@core/constants/templates';
import { pronunciationGuides } from '@core/constants/translations';
import {
  HistoryEntry,
  PromptTemplate,
  CustomPreset,
  VisualDNA,
  CharacterProfile,
  Project,
  PromptState,
  VeoPromptResponse,
  PromptVariation,
} from '@core/types';
import type { ProjectTemplate } from '@core/config/projectTemplates';
import { useTranslation } from 'react-i18next';

interface ModalManagerProps {
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  // Hooks passed down from App

  // Handlers from App.tsx logic
  handlers: {
    handleUseHistoryEntry: (entry: HistoryEntry) => void;
    handleClearHistory: () => void;
    handleDeleteHistoryEntry: (id: string) => void;
    handleUsePresetOrTemplate: (item: PromptTemplate | CustomPreset) => void;
    handleSavePreset: (name: string) => void;
    handleDeletePreset: (id: string) => void;
    handleUpdatePreset: (preset: CustomPreset) => void;
    handleSaveDNA: (name: string, styleParams: Partial<PromptState>) => void;
    handleApplyDNA: (dna: VisualDNA) => void;
    handleDeleteDNA: (id: string) => void;
    handleLoadProject: (project: Project) => void;
    handleUpdateProjectMeta: (id: string, name: string) => void;
    handleResetAll: () => void;
    handleWizardComplete: (newState: Partial<PromptState>) => void;
    handleSelectTemplate: (template: ProjectTemplate) => void;
    handleSelectCharacter: (profile: CharacterProfile) => void;
    handleUpdateSpatialMotion: (gridId: string, motion: string) => void;
    handleClearSpatialMotions: () => void;
    handleSelectVariation: (variation: string) => void;
    handleUseAnalysis: (text: string) => void;
    handleCompareSelect: (prompt: string, model: 'veo' | 'sora') => void;
    // New state specific
    promptVariations: PromptVariation[];
    isGeneratingVariations: boolean;
    isBrainstorming: boolean;
    uploadedImageUrl: string | null;
    currentProjectName: string | null;
    currentProjectId: string | null;
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
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md"
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
  const _locationStore = useLocationStore();
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
      <ErrorBoundary panelId="modal-shortcuts-panel">
        <ShortcutsModal
          isOpen={store.isShortcutsOpen}
          onClose={() => store.closeModal('isShortcutsOpen')}
        />
      </ErrorBoundary>

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

      {store.isDNAModalOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-visual-dna">
            <VisualDNAModal
              isOpen={store.isDNAModalOpen}
              onClose={() => store.closeModal('isDNAModalOpen')}
              savedDNAs={store.visualDNA}
              onSaveDNA={handlers.handleSaveDNA}
              onApplyDNA={handlers.handleApplyDNA}
              onDeleteDNA={handlers.handleDeleteDNA}
              currentPromptState={store.promptState}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.isCharacterBankOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-character-bank">
            <CharacterBankModal
              isOpen={store.isCharacterBankOpen}
              onClose={() => store.closeModal('isCharacterBankOpen')}
              onSelectCharacter={handlers.handleSelectCharacter}
              language={store.promptState.language}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.isLocationBankOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-location-manager">
            <LocationManagerModal
              isOpen={store.isLocationBankOpen}
              onClose={() => store.closeModal('isLocationBankOpen')}
              addToast={addToast}
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

      {store.isSeriesBibleOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-series-bible">
            <SeriesBibleModal
              isOpen={store.isSeriesBibleOpen}
              onClose={() => store.closeModal('isSeriesBibleOpen')}
              addToast={addToast}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.isWizardOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-wizard">
            <WizardModal
              isOpen={store.isWizardOpen}
              onClose={() => store.closeModal('isWizardOpen')}
              onComplete={handlers.handleWizardComplete}
              language={store.promptState.language}
              addToast={addToast}
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

      {store.isVariationsOpen && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="modal-variations-panel">
            <VariationsPanel
              variations={handlers.promptVariations}
              isLoading={handlers.isGeneratingVariations || handlers.isBrainstorming}
              onSelect={handlers.handleSelectVariation}
              onClose={() => store.closeModal('isVariationsOpen')}
              language={store.promptState.language}
              model={store.promptState.model}
              addToast={addToast}
              targetModel={store.promptState.targetModel}
            />
          </ErrorBoundary>
        </React.Suspense>
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

      {store.activeStudio === 'analysis' && (
        <React.Suspense fallback={<StudioSkeleton />}>
          <ErrorBoundary panelId="studio-video-analysis">
            <StudioMountMetric metric="studio.open.analysis" />
            <VideoAnalysisStudio
              onClose={store.closeStudio}
              addToast={addToast}
              onUseAnalysis={handlers.handleUseAnalysis}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.activeStudio === 'pronunciation' && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="studio-pronunciation-guide">
            <PronunciationGuide
              guideData={pronunciationGuides[store.promptState.language]?.terms || []}
              onClose={store.closeStudio}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.activeStudio === 'compare' && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="studio-compare-models">
            <CompareModelsModal
              isOpen={store.activeStudio === 'compare'}
              onClose={store.closeStudio}
              idea={store.promptState.idea}
              language={store.promptState.language}
              addToast={addToast}
              onSelectPrompt={handlers.handleCompareSelect}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      {store.activeStudio === 'spatial' && (
        <React.Suspense fallback={<ModalSkeleton />}>
          <ErrorBoundary panelId="studio-spatial-director">
            <StudioMountMetric metric="studio.open.spatial" />
            <SpatialDirectorModal
              isOpen={store.activeStudio === 'spatial'}
              onClose={store.closeStudio}
              uploadedImageUrl={handlers.uploadedImageUrl}
              spatialMotions={store.promptState.spatialMotions}
              onUpdateMotion={handlers.handleUpdateSpatialMotion}
              onClearAll={handlers.handleClearSpatialMotions}
            />
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
                handlers.generatedPrompt = { prompt: prompt }; // Optimistic
                store.openStudio('video');
              }}
            />
          </ErrorBoundary>
        </React.Suspense>
      )}

      <ErrorBoundary panelId="modal-tutorial-guide-panel">
        <TutorialGuide
          isActive={false} // Tutorial logic needs to be connected to store later if moved completely
          steps={[]}
          currentStepIndex={0}
          onNext={() => {}}
          onPrev={() => {}}
          onFinish={() => {}}
        />
      </ErrorBoundary>

      <React.Suspense fallback={<ModalSkeleton />}>
        <ErrorBoundary panelId="modal-global-search">
          <GlobalSearchModal
            isOpen={store.isSearchOpen}
            onClose={() => store.closeModal('isSearchOpen')}
            history={store.history}
            presets={store.customPresets}
            templates={getPromptTemplates(store.promptState.language)}
            onSelectHistory={handlers.handleUseHistoryEntry}
            onSelectPreset={handlers.handleUsePresetOrTemplate}
            onSelectTemplate={handlers.handleUsePresetOrTemplate}
            language={store.promptState.language}
            // Add PanelErrorBoundary here if needed, but ErrorBoundary is fine
          />
        </ErrorBoundary>
      </React.Suspense>

      {/* Variables Panel */}
      <React.Suspense fallback={<ModalSkeleton />}>
        <ErrorBoundary panelId="modal-variables-panel">
          <VariablesPanel
            isOpen={store.isVariablesPanelOpen}
            onClose={() => store.closeModal('isVariablesPanelOpen')}
          />
        </ErrorBoundary>
      </React.Suspense>

      {/* New Project Wizard Overlay */}
      <React.Suspense fallback={<ModalSkeleton />}>
        <ErrorBoundary panelId="modal-new-project-wizard">
          <NewProjectWizard
            isOpen={store.isNewProjectWizardOpen}
            onClose={() => store.setNewProjectWizardOpen(false)}
            onSelectTemplate={handlers.handleSelectTemplate}
          />
        </ErrorBoundary>
      </React.Suspense>
    </>
  );
};

export default ModalManager;
