


import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { useLocationStore } from '../store/useLocationStore';
import HistoryPanel from './HistoryPanel';
import TemplatesPanel from './TemplatesPanel';
import VariationsPanel from './VariationsPanel';
import VisualDNAModal from './VisualDNAModal';
import WizardModal from './WizardModal';
import CharacterBankModal from './CharacterBankModal';
import ProjectManagerModal from './ProjectManagerModal';
import ShortcutsModal from './ShortcutsModal';
import SeriesBibleModal from './SeriesBibleModal';
import LocationManagerModal from './LocationManagerModal';
import VariablesPanel from './VariablesPanel';
import NewProjectWizard from './Onboarding/NewProjectWizard';
import GlobalSearchModal from './GlobalSearchModal';
import ImageStudio from './ImageStudio';
import SunoSongStudio from './SunoSongStudio';
import VideoAnalysisStudio from './VideoAnalysisStudio';
import VideoGenerationStudio from './VideoGenerationStudio';
import StoryBoard from './StoryBoard';
import CompareModelsModal from './CompareModelsModal';
import SpatialDirectorModal from './SpatialDirectorModal';
import PronunciationGuide from './PronunciationGuide';
import ScriptBreakdown from './ScriptBreakdown';
import TextAreaInput from './TextAreaInput';
import TutorialGuide from './TutorialGuide';
import { getPromptTemplates } from '../templates';
import { pronunciationGuides } from '../translations';
import { HistoryEntry, PromptTemplate, CustomPreset, VisualDNA, CharacterProfile, Project, PromptState } from '../types';
import { CHARACTER_LIMITS } from '../constants';

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
        <HistoryPanel
          history={store.history}
          onSelect={handlers.handleUseHistoryEntry}
          onClear={handlers.handleClearHistory}
          onDelete={handlers.handleDeleteHistoryEntry}
          onClose={() => store.closeModal('isHistoryOpen')}
          uiStrings={t.history}
          language={store.promptState.language}
        />
      )}

      {store.isTemplatesOpen && (
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
      )}

      {store.isDNAModalOpen && (
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
      )}

      {store.isCharacterBankOpen && (
          <CharacterBankModal
            isOpen={store.isCharacterBankOpen}
            onClose={() => store.closeModal('isCharacterBankOpen')}
            onSelectCharacter={handlers.handleSelectCharacter}
            uiStrings={t}
            language={store.promptState.language}
          />
      )}

      {store.isLocationBankOpen && (
          <LocationManagerModal
            isOpen={store.isLocationBankOpen}
            onClose={() => store.closeModal('isLocationBankOpen')}
            addToast={addToast}
            uiStrings={t}
          />
      )}

      {store.isProjectManagerOpen && (
          <ProjectManagerModal
            isOpen={store.isProjectManagerOpen}
            onClose={() => store.closeModal('isProjectManagerOpen')}
            currentProjectId={handlers.currentProjectId}
            currentProjectName={handlers.currentProjectName}
            currentPromptState={store.promptState}
            currentCharacters={store.characterBank}
            currentDNAs={store.visualDNA}
            currentStoryboard={{ 
                globalContext: store.sbGlobalContext, 
                shots: store.sbShots, 
                timeline: store.sbTimeline 
            }}
            onLoadProject={handlers.handleLoadProject}
            onResetWorkspace={handlers.handleResetAll}
            onUpdateProjectMeta={handlers.handleUpdateProjectMeta}
            addToast={addToast}
          />
      )}

      {store.isSeriesBibleOpen && (
          <SeriesBibleModal
            isOpen={store.isSeriesBibleOpen}
            onClose={() => store.closeModal('isSeriesBibleOpen')}
            addToast={addToast}
          />
      )}

      {store.isWizardOpen && (
          <WizardModal
            isOpen={store.isWizardOpen}
            onClose={() => store.closeModal('isWizardOpen')}
            onComplete={handlers.handleWizardComplete}
            uiStrings={t}
            language={store.promptState.language}
            addToast={addToast}
          />
      )}

      {store.isSavePresetModalOpen && (
        <SavePresetInternal 
            onSave={handlers.handleSavePreset} 
            onClose={() => store.closeModal('isSavePresetModalOpen')}
            t={t}
        />
      )}

      {store.isVariationsOpen && (
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
      )}

      {store.activeStudio === 'story' && (
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

      {/* Variables Panel */}
      <VariablesPanel 
        isOpen={store.isVariablesPanelOpen} 
        onClose={() => store.closeModal('isVariablesPanelOpen')} 
      />

      {/* New Project Wizard Overlay */}
      <NewProjectWizard 
          isOpen={store.isNewProjectWizardOpen} 
          onClose={() => store.setNewProjectWizardOpen(false)}
          onSelectTemplate={handlers.handleSelectTemplate}
      />
    </>
  );
};

export default ModalManager;