








import React from 'react';
import { useAppStore } from '@core/store/useAppStore';
import { useLocationStore } from '@core/store/useLocationStore';
import ShortcutsModal from '@features/settings/ShortcutsModal';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import TutorialGuide from '@features/onboarding/TutorialGuide';
import SuspenseFallback from '@shared/components/ui/SuspenseFallback';

const HistoryPanel = React.lazy(() => import('@features/history/HistoryPanel'));
const TemplatesPanel = React.lazy(() => import('@features/prompt/TemplatesPanel'));
const VariationsPanel = React.lazy(() => import('@shared/components/VariationsPanel'));
const VisualDNAModal = React.lazy(() => import('@features/studios/modals/VisualDNAModal'));
const WizardModal = React.lazy(() => import('@features/studios/modals/WizardModal'));
const CharacterBankModal = React.lazy(() => import('@features/studios/modals/CharacterBankModal'));
const ProjectManagerModal = React.lazy(() => import('@features/project/ProjectManagerModal'));
const ProjectManager = React.lazy(() => import('@features/project/ProjectManager'));
const SeriesBibleModal = React.lazy(() => import('@features/studios/modals/SeriesBibleModal'));
const LocationManagerModal = React.lazy(() => import('@features/studios/modals/LocationManagerModal'));
const VariablesPanel = React.lazy(() => import('@features/project/VariablesPanel'));
const NewProjectWizard = React.lazy(() => import('@features/onboarding/NewProjectWizard'));
const GlobalSearchModal = React.lazy(() => import('@features/studios/modals/GlobalSearchModal'));
const ImageStudio = React.lazy(() => import('@features/studios/ImageStudio'));
const SunoSongStudio = React.lazy(() => import('@features/studios/SunoSongStudio'));
const VideoAnalysisStudio = React.lazy(() => import('@features/studios/VideoAnalysisStudio'));
const VideoGenerationStudio = React.lazy(() => import('@features/studios/VideoGenerationStudio'));
const StoryBoard = React.lazy(() => import('@features/timeline/StoryBoard'));
const CompareModelsModal = React.lazy(() => import('@features/studios/modals/CompareModelsModal'));
const SpatialDirectorModal = React.lazy(() => import('@features/studios/modals/SpatialDirectorModal'));
const PronunciationGuide = React.lazy(() => import('@shared/components/PronunciationGuide'));
const ScriptBreakdown = React.lazy(() => import('@shared/components/ScriptBreakdown'));
import { getPromptTemplates } from '@core/constants/templates';
import { pronunciationGuides } from '@core/constants/translations';
import { HistoryEntry, PromptTemplate, CustomPreset, VisualDNA, CharacterProfile, Project, PromptState } from '@core/types';
import { CHARACTER_LIMITS } from '@core/constants';

interface ModalManagerProps {
  t: any;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  // Hooks passed down from App
  videoHooks: {
    videoTasks: any[];
    startVideoGeneration: any;
    isGeneratingVideo: boolean;
    startBatchVideoGeneration: any;
  };
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
    handleSelectTemplate: (template: any) => void;
    handleSelectCharacter: (profile: CharacterProfile) => void;
    handleUpdateSpatialMotion: (gridId: string, motion: string) => void;
    handleClearSpatialMotions: () => void;
    handleSelectVariation: (variation: string) => void;
    handleUseAnalysis: (text: string) => void;
    handleCompareSelect: (prompt: string, model: 'veo' | 'sora') => void;
    // New state specific
    promptVariations: any[];
    isGeneratingVariations: boolean;
    isBrainstorming: boolean;
    uploadedImageUrl: string | null;
    currentProjectName: string | null;
    currentProjectId: string | null;
    generatedPrompt: any;
  };
}

// Helper for save preset modal internal state
const SavePresetInternal = ({ 
    onSave, 
    onClose, 
    t 
}: { 
    onSave: (name: string) => void, 
    onClose: () => void, 
    t: any 
}) => {
    const [name, setName] = React.useState('');
    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-[200] p-4" role="dialog">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">{t.savePresetModal.title}</h3>
            <TextAreaInput
                label={t.savePresetModal.label}
                name="newPresetName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.savePresetModal.placeholder}
                rows={1}
                autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white">{t.savePresetModal.cancel}</button>
              <button onClick={() => onSave(name)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md">{t.savePresetModal.save}</button>
            </div>
          </div>
        </div>
    );
}

const ModalManager: React.FC<ModalManagerProps> = ({ t, addToast, videoHooks, handlers }) => {
  const store = useAppStore();
  const locationStore = useLocationStore();

  return (
    <>
      <ShortcutsModal 
        isOpen={store.isShortcutsOpen} 
        onClose={() => store.closeModal('isShortcutsOpen')} 
      />

      {store.isHistoryOpen && (
        <React.Suspense fallback={<SuspenseFallback message="Loading history..." />}>
          <HistoryPanel
            onSelect={handlers.handleUseHistoryEntry}
            onClear={handlers.handleClearHistory}
            onDelete={handlers.handleDeleteHistoryEntry}
            onClose={() => store.closeModal('isHistoryOpen')}
            uiStrings={t.history}
            language={store.promptState.language}
          />
        </React.Suspense>
      )}

      {store.isTemplatesOpen && (
        <React.Suspense fallback={<SuspenseFallback message="Loading templates..." />}>
          <TemplatesPanel
            builtInTemplates={getPromptTemplates(store.promptState.language)}
            customPresets={store.customPresets}
            onSelect={handlers.handleUsePresetOrTemplate}
            onDeletePreset={handlers.handleDeletePreset}
            onUpdatePreset={handlers.handleUpdatePreset}
            currentPromptState={store.promptState}
            onClose={() => store.closeModal('isTemplatesOpen')}
            uiStrings={t.templates}
          />
        </React.Suspense>
      )}

      {store.isDNAModalOpen && (
        <React.Suspense fallback={<SuspenseFallback message="Loading Visual DNA..." />}>
          <VisualDNAModal
            isOpen={store.isDNAModalOpen}
            onClose={() => store.closeModal('isDNAModalOpen')}
            savedDNAs={store.visualDNA}
            onSaveDNA={handlers.handleSaveDNA}
            onApplyDNA={handlers.handleApplyDNA}
            onDeleteDNA={handlers.handleDeleteDNA}
            currentPromptState={store.promptState}
            uiStrings={t}
          />
        </React.Suspense>
      )}

      {store.isCharacterBankOpen && (
        <React.Suspense fallback={<SuspenseFallback message="Loading character bank..." />}>
          <CharacterBankModal
            isOpen={store.isCharacterBankOpen}
            onClose={() => store.closeModal('isCharacterBankOpen')}
            onSelectCharacter={handlers.handleSelectCharacter}
            uiStrings={t}
            language={store.promptState.language}
          />
        </React.Suspense>
      )}

      {store.isLocationBankOpen && (
        <React.Suspense fallback={<SuspenseFallback message="Loading locations..." />}>
          <LocationManagerModal
            isOpen={store.isLocationBankOpen}
            onClose={() => store.closeModal('isLocationBankOpen')}
            addToast={addToast}
            uiStrings={t}
          />
        </React.Suspense>
      )}

      {store.isProjectManagerOpen && (
        <React.Suspense fallback={<SuspenseFallback message="Loading project manager..." />}>
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
                    currentTime: store.currentTime
                }
            }}
            onLoadProject={handlers.handleLoadProject}
            onResetWorkspace={handlers.handleResetAll}
            onUpdateProjectMeta={handlers.handleUpdateProjectMeta}
            addToast={addToast}
            onUpdateGlobalStyle={store.setGlobalStyle}
            uiStrings={t}
          />
        </React.Suspense>
      )}

      {store.isSeriesBibleOpen && (
        <React.Suspense fallback={<SuspenseFallback message="Loading series bible..." />}>
          <SeriesBibleModal
            isOpen={store.isSeriesBibleOpen}
            onClose={() => store.closeModal('isSeriesBibleOpen')}
            addToast={addToast}
          />
        </React.Suspense>
      )}

      {store.isWizardOpen && (
        <React.Suspense fallback={<SuspenseFallback message="Loading wizard..." />}>
          <WizardModal
            isOpen={store.isWizardOpen}
            onClose={() => store.closeModal('isWizardOpen')}
            onComplete={handlers.handleWizardComplete}
            uiStrings={t}
            language={store.promptState.language}
            addToast={addToast}
          />
        </React.Suspense>
      )}

      {store.isSavePresetModalOpen && (
        <SavePresetInternal 
            onSave={handlers.handleSavePreset} 
            onClose={() => store.closeModal('isSavePresetModalOpen')}
            t={t}
        />
      )}

      {store.isVariationsOpen && (
        <React.Suspense fallback={<SuspenseFallback message="Loading variations..." />}>
          <VariationsPanel
            variations={handlers.promptVariations}
            isLoading={handlers.isGeneratingVariations || handlers.isBrainstorming}
            onSelect={handlers.handleSelectVariation}
            onClose={() => store.closeModal('isVariationsOpen')}
            uiStrings={handlers.isBrainstorming ? t.promptIdeas : t.variations}
            language={store.promptState.language}
            model={store.promptState.model}
            addToast={addToast}
            targetModel={store.promptState.targetModel}
          />
        </React.Suspense>
      )}

      {store.activeStudio === 'story' && (
        <React.Suspense fallback={<SuspenseFallback message="Loading storyboard..." />}>
          <StoryBoard
            isOpen={store.activeStudio === 'story'}
            onClose={store.closeStudio}
            uiStrings={t}
            addToast={addToast}
            onGenerateBatch={(prompts) => {
                store.openStudio('video');
                videoHooks.startBatchVideoGeneration(prompts, {
                    aspectRatio: store.promptState.aspectRatio,
                    resolution: store.promptState.resolution,
                    veoModel: store.promptState.veoModel
                });
            }}
            startVideoGeneration={videoHooks.startVideoGeneration}
            videoTasks={videoHooks.videoTasks}
          />
        </React.Suspense>
      )}

      {store.activeStudio === 'image' && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <ImageStudio 
                onClose={store.closeStudio} 
                aspectRatioOptions={[]} // Pass empty or move options to constant if needed in component
                uiStrings={t}
                addToast={addToast}
            />
          </React.Suspense>
      )}
      
      {store.activeStudio === 'suno' && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <SunoSongStudio
                onClose={store.closeStudio}
                uiStrings={t}
                addToast={addToast}
                language={store.promptState.language}
                model={store.promptState.model}
            />
          </React.Suspense>
      )}

      {store.activeStudio === 'analysis' && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <VideoAnalysisStudio
                onClose={store.closeStudio}
                uiStrings={t}
                addToast={addToast}
                onUseAnalysis={handlers.handleUseAnalysis}
            />
          </React.Suspense>
      )}

      {store.activeStudio === 'video' && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <VideoGenerationStudio
                onClose={store.closeStudio}
                uiStrings={t}
                addToast={addToast}
                language={store.promptState.language}
                initialPrompt={handlers.generatedPrompt?.prompt || store.promptState.idea}
                initialSettings={{
                    aspectRatio: store.promptState.aspectRatio,
                    resolution: store.promptState.resolution,
                    veoModel: store.promptState.veoModel
                }}
                tasks={videoHooks.videoTasks}
                onGenerate={async (prompt, settings) => { await videoHooks.startVideoGeneration(prompt, settings); }}
                isGenerating={videoHooks.isGeneratingVideo}
            />
          </React.Suspense>
      )}
      
      {store.activeStudio === 'pronunciation' && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <PronunciationGuide
                guideData={pronunciationGuides[store.promptState.language]?.terms || []}
                onClose={store.closeStudio}
                uiStrings={t.pronunciationGuide}
            />
          </React.Suspense>
      )}

      {store.activeStudio === 'compare' && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <CompareModelsModal
                isOpen={store.activeStudio === 'compare'}
                onClose={store.closeStudio}
                idea={store.promptState.idea}
                language={store.promptState.language}
                uiStrings={t}
                addToast={addToast}
                onSelectPrompt={handlers.handleCompareSelect}
            />
          </React.Suspense>
      )}

      {store.activeStudio === 'spatial' && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <SpatialDirectorModal
                isOpen={store.activeStudio === 'spatial'}
                onClose={store.closeStudio}
                uploadedImageUrl={handlers.uploadedImageUrl}
                spatialMotions={store.promptState.spatialMotions}
                onUpdateMotion={handlers.handleUpdateSpatialMotion}
                onClearAll={handlers.handleClearSpatialMotions}
                uiStrings={t}
            />
          </React.Suspense>
      )}

      {store.activeStudio === 'script' && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <ScriptBreakdown
                onClose={store.closeStudio}
                uiStrings={t}
                addToast={addToast}
                onGenerateShot={(prompt) => {
                    store.setPromptState({ idea: prompt });
                    handlers.generatedPrompt = { prompt: prompt }; // Optimistic
                    store.openStudio('video');
                }}
            />
          </React.Suspense>
      )}

      <TutorialGuide
        isActive={false} // Tutorial logic needs to be connected to store later if moved completely
        steps={[]} 
        currentStepIndex={0}
        onNext={() => {}}
        onPrev={() => {}}
        onFinish={() => {}}
        uiStrings={t.tutorial}
      />

      <React.Suspense fallback={<SuspenseFallback message="Loading search..." />}>
        <GlobalSearchModal
          isOpen={store.isSearchOpen}
          onClose={() => store.closeModal('isSearchOpen')}
          history={store.history}
          presets={store.customPresets}
          templates={getPromptTemplates(store.promptState.language)}
          onSelectHistory={handlers.handleUseHistoryEntry}
          onSelectPreset={handlers.handleUsePresetOrTemplate}
          onSelectTemplate={handlers.handleUsePresetOrTemplate}
          uiStrings={t.search}
          language={store.promptState.language}
        />
      </React.Suspense>

      {/* Variables Panel */}
      <React.Suspense fallback={<SuspenseFallback message="Loading variables..." />}>
        <VariablesPanel
          isOpen={store.isVariablesPanelOpen}
          onClose={() => store.closeModal('isVariablesPanelOpen')}
        />
      </React.Suspense>

      {/* New Project Wizard Overlay */}
      <React.Suspense fallback={<SuspenseFallback message="Loading project wizard..." />}>
        <NewProjectWizard
          isOpen={store.isNewProjectWizardOpen}
          onClose={() => store.setNewProjectWizardOpen(false)}
          onSelectTemplate={handlers.handleSelectTemplate}
        />
      </React.Suspense>
    </>
  );
};

export default ModalManager;