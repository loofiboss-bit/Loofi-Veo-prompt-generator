/**
 * PromptWorkspace Component
 * v2.9.0 — Extracted from App.tsx
 *
 * Renders the main prompt builder workspace with three sections:
 * CoreConcept (left), Details (left), and Output (right).
 */

import React from 'react';
import { ExamplePrompt, PromptState, VeoPromptResponse } from '@core/types';
import { StudioType } from '@shared/hooks/useStudios';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { CoreConceptSection, DetailsSection, OutputSection } from '@features/prompt/sections';
import { InlineSuggestions } from '@features/optimization';

interface PromptWorkspaceProps {
  promptState: PromptState;
  promptId?: string;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  handleCheckboxChangeWithCoords: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTargetModelChange: (model: 'veo' | 'sora') => void;
  handleImageUpload: (image: { data: string; mimeType: string; url: string }) => void;
  handleImageClear: () => void;
  uploadedImageUrl: string | null;
  handleAudioMixChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAudioUpload: (audio: { data: string; mimeType: string; name: string }) => void;
  handleAudioClear: () => void;
  errors: Record<string, string>;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  openHelpPanel: (topic?: string, category?: string) => void;
  ideaInputRef: React.RefObject<HTMLTextAreaElement | null>;
  openSections: string[];
  onToggleSection: (section: string) => void;
  activeTabIndex: number;
  onTabChange: (index: number) => void;
  openStudioSafely: (studio: NonNullable<StudioType>) => void;
  promptOptions: Record<string, unknown>;
  // Generation state
  isBrainstorming: boolean;
  isAutoFilling: boolean;
  handleBrainstormIdeas: () => void;
  handleAutoFillModifiers: () => void;
  handleEnhanceIdea: () => void;
  isEnhancingIdea: boolean;
  // Prompt logic (pass-through for DetailsSection + OutputSection)
  promptLogic: {
    generatedPrompt: VeoPromptResponse | null;
    isLoading: boolean;
    isRefining: boolean;
    isRestructuring: boolean;
    handleGeneratePrompt: () => void;
    handleRefinePrompt: (text: string) => Promise<void>;
    handleRestructurePrompt: (prompt: string) => void;
    handleSuggestArtStyles: () => void;
    isSuggestingArtStyle: boolean;
    handleSuggestVisualEffect: () => void;
    isSuggestingEffect: boolean;
    handleSuggestCameraSetup: () => void;
    isSuggestingCamera: boolean;
    handleSuggestEnvironmentDetails: () => void;
    isSuggestingEnvironment: boolean;
    handleSuggestSensoryDetails: () => void;
    isSuggestingSensoryDetails: boolean;
    handleSuggestCharacterActions: () => void;
    isSuggestingActions: boolean;
    handleGenerateVisualDNA: () => void;
    isGeneratingVisualDNA: boolean;
    handleSuggestFullAudioDesign: () => void;
    isSuggestingFullAudio: boolean;
    handleAnalyzeAudio: () => void;
    isAnalyzingAudio: boolean;
    handleSuggestAdvancedSettings: () => void;
    isSuggestingAdvanced: boolean;
  };
  // Output section props
  isEditing: boolean;
  editedPrompt: string;
  onSetIsEditing: (editing: boolean) => void;
  onSetEditedPrompt: (text: string) => void;
  canUndoEdit: boolean;
  onUndoEdit: () => void;
  canRedoEdit: boolean;
  onRedoEdit: () => void;
  canUndoPromptState: boolean;
  onUndoPromptState: () => void;
  canRedoPromptState: boolean;
  onRedoPromptState: () => void;
  // Generation actions
  isGeneratingArt: boolean;
  onGenerateArt: (prompt: string) => void;
  isGeneratingVideo: boolean;
  onGenerateVideo: (prompt?: string) => void;
  isGeneratingStoryboard: boolean;
  onGenerateStoryboard: (prompt: string) => void;
  isGeneratingVariations: boolean;
  onGenerateVariations: (basePrompt: string) => void;
  onRefinePromptWrapper: (text: string) => Promise<void>;
  // History/Export
  handleNewPrompt: () => void;
  handleSavePrompt: (newPrompt: string) => void;
  saveToHistory: () => void;
  handleShare: () => void;
  handleDownloadPrompt: (promptText: string) => void;
  onOpenSavePresetModal: () => void;
  onOpenTemplatesPanel: () => void;
  onCompareModels: () => void;
  onOpenVisualDNA: () => void;
  storyboardImages: string[];
  conceptArtImage: string | null;
  isExamplesVisible: boolean;
  onCloseExamples: () => void;
  examplePrompts: ExamplePrompt[];
  handleUseExample: (example: ExamplePrompt) => void;
}

export function PromptWorkspace({
  promptState,
  promptId,
  handleInputChange,
  handleCheckboxChangeWithCoords,
  handleTargetModelChange,
  handleImageUpload,
  handleImageClear,
  uploadedImageUrl,
  handleAudioMixChange,
  handleAudioUpload,
  handleAudioClear,
  errors,
  addToast,
  openHelpPanel,
  ideaInputRef,
  openSections,
  onToggleSection,
  activeTabIndex,
  onTabChange,
  openStudioSafely,
  promptOptions,
  isBrainstorming,
  isAutoFilling,
  handleBrainstormIdeas,
  handleAutoFillModifiers,
  handleEnhanceIdea,
  isEnhancingIdea,
  promptLogic,
  isEditing,
  editedPrompt,
  onSetIsEditing,
  onSetEditedPrompt,
  canUndoEdit,
  onUndoEdit,
  canRedoEdit,
  onRedoEdit,
  canUndoPromptState,
  onUndoPromptState,
  canRedoPromptState,
  onRedoPromptState,
  isGeneratingArt,
  onGenerateArt,
  isGeneratingVideo,
  onGenerateVideo,
  isGeneratingStoryboard,
  onGenerateStoryboard,
  isGeneratingVariations,
  onGenerateVariations,
  onRefinePromptWrapper,
  handleNewPrompt,
  handleSavePrompt,
  saveToHistory,
  handleShare,
  handleDownloadPrompt,
  onOpenSavePresetModal,
  onOpenTemplatesPanel,
  onCompareModels,
  onOpenVisualDNA,
  storyboardImages,
  conceptArtImage,
  isExamplesVisible,
  onCloseExamples,
  examplePrompts,
  handleUseExample,
}: PromptWorkspaceProps) {
  return (
    <main className="mt-8 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* Left Column: Input Form */}
      <ErrorBoundary panelId="app-input-panel">
        <div className="xl:col-span-7 space-y-8 animate-fade-in-up w-full min-w-0">
          <CoreConceptSection
            promptState={promptState}
            handleInputChange={handleInputChange}
            handleCheckboxChange={handleCheckboxChangeWithCoords}
            handleTargetModelChange={handleTargetModelChange}
            handleImageUpload={handleImageUpload}
            handleImageClear={handleImageClear}
            uploadedImageUrl={uploadedImageUrl}
            errors={errors}
            openHelpPanel={openHelpPanel}
            ideaInputRef={ideaInputRef}
            openSections={openSections}
            onToggleSection={onToggleSection}
            isBrainstorming={isBrainstorming}
            isAutoFilling={isAutoFilling}
            handleBrainstormIdeas={handleBrainstormIdeas}
            handleAutoFillModifiers={handleAutoFillModifiers}
            handleEnhanceIdea={handleEnhanceIdea}
            isEnhancingIdea={isEnhancingIdea}
          />

          <DetailsSection
            promptState={promptState}
            handleInputChange={handleInputChange}
            handleCheckboxChange={handleCheckboxChangeWithCoords}
            handleAudioMixChange={handleAudioMixChange}
            handleAudioUpload={handleAudioUpload}
            handleAudioClear={handleAudioClear}
            errors={errors}
            addToast={addToast}
            activeTabIndex={activeTabIndex}
            onTabChange={onTabChange}
            openSections={openSections}
            onToggleSection={onToggleSection}
            openStudioSafely={openStudioSafely}
            promptOptions={promptOptions}
            handleSuggestArtStyles={promptLogic.handleSuggestArtStyles}
            isSuggestingArtStyle={promptLogic.isSuggestingArtStyle}
            handleSuggestVisualEffect={promptLogic.handleSuggestVisualEffect}
            isSuggestingEffect={promptLogic.isSuggestingEffect}
            handleSuggestCameraSetup={promptLogic.handleSuggestCameraSetup}
            isSuggestingCamera={promptLogic.isSuggestingCamera}
            handleSuggestEnvironmentDetails={promptLogic.handleSuggestEnvironmentDetails}
            isSuggestingEnvironment={promptLogic.isSuggestingEnvironment}
            handleSuggestSensoryDetails={promptLogic.handleSuggestSensoryDetails}
            isSuggestingSensoryDetails={promptLogic.isSuggestingSensoryDetails}
            handleSuggestCharacterActions={promptLogic.handleSuggestCharacterActions}
            isSuggestingActions={promptLogic.isSuggestingActions}
            handleGenerateVisualDNA={promptLogic.handleGenerateVisualDNA}
            isGeneratingVisualDNA={promptLogic.isGeneratingVisualDNA}
            handleSuggestFullAudioDesign={promptLogic.handleSuggestFullAudioDesign}
            isSuggestingFullAudio={promptLogic.isSuggestingFullAudio}
            handleAnalyzeAudio={promptLogic.handleAnalyzeAudio}
            isAnalyzingAudio={promptLogic.isAnalyzingAudio}
            handleSuggestAdvancedSettings={promptLogic.handleSuggestAdvancedSettings}
            isSuggestingAdvanced={promptLogic.isSuggestingAdvanced}
          />
        </div>
      </ErrorBoundary>

      {/* Right Column: Output & Visualization */}
      <ErrorBoundary panelId="app-output-panel">
        <OutputSection
          promptState={promptState}
          generatedPrompt={promptLogic.generatedPrompt}
          isLoading={promptLogic.isLoading}
          isEditing={isEditing}
          editedPrompt={editedPrompt}
          errors={errors}
          addToast={addToast}
          onGeneratePrompt={promptLogic.handleGeneratePrompt}
          onNewPrompt={handleNewPrompt}
          onSavePrompt={handleSavePrompt}
          onSetIsEditing={onSetIsEditing}
          onSetEditedPrompt={onSetEditedPrompt}
          canUndoEdit={canUndoEdit}
          onUndoEdit={onUndoEdit}
          canRedoEdit={canRedoEdit}
          onRedoEdit={onRedoEdit}
          canUndoPromptState={canUndoPromptState}
          onUndoPromptState={onUndoPromptState}
          canRedoPromptState={canRedoPromptState}
          onRedoPromptState={onRedoPromptState}
          isGeneratingArt={isGeneratingArt}
          onGenerateArt={onGenerateArt}
          isGeneratingVideo={isGeneratingVideo}
          onGenerateVideo={onGenerateVideo}
          isGeneratingStoryboard={isGeneratingStoryboard}
          onGenerateStoryboard={onGenerateStoryboard}
          isGeneratingVariations={isGeneratingVariations}
          onGenerateVariations={onGenerateVariations}
          isRefining={promptLogic.isRefining}
          onRefinePrompt={onRefinePromptWrapper}
          isRestructuring={promptLogic.isRestructuring}
          onRestructurePrompt={promptLogic.handleRestructurePrompt}
          onSaveToHistory={saveToHistory}
          onShare={handleShare}
          onDownload={handleDownloadPrompt}
          onOpenSavePresetModal={onOpenSavePresetModal}
          onOpenTemplatesPanel={onOpenTemplatesPanel}
          onCompareModels={onCompareModels}
          onOpenVisualDNA={onOpenVisualDNA}
          storyboardImages={storyboardImages}
          conceptArtImage={conceptArtImage}
          isExamplesVisible={isExamplesVisible}
          onCloseExamples={onCloseExamples}
          examplePrompts={examplePrompts}
          onUseExample={handleUseExample}
        />
      </ErrorBoundary>

      {/* AI Inline Suggestions (v3.4.0) — shown when optimization has suggestions */}
      {promptId && (
        <ErrorBoundary panelId="app-inline-suggestions-panel">
          <div className="xl:col-span-12">
            <InlineSuggestions promptId={promptId} />
          </div>
        </ErrorBoundary>
      )}
    </main>
  );
}
