/**
 * OutputSection
 *
 * Right-column output panel extracted from App.tsx.
 * Contains: ActionBar, PromptOutput / PromptBuilderSummary, ExamplesCarousel.
 */

import React from 'react';
import { ExamplePrompt, PromptState, VeoPromptResponse } from '@core/types';
import { ActionBar } from '@shared/components/layout';
import PromptOutput from '@features/prompt/PromptOutput';
import PromptBuilderSummary from '@features/prompt/PromptBuilderSummary';
import ExamplesCarousel from '@features/prompt/ExamplesCarousel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationStrings = any;

interface OutputSectionProps {
  promptState: PromptState;
  generatedPrompt: VeoPromptResponse | null;
  isLoading: boolean;
  isEditing: boolean;
  editedPrompt: string;
  errors: Record<string, string>;
  t: TranslationStrings;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;

  // Action bar handlers
  onGeneratePrompt: () => void;
  onNewPrompt: () => void;
  onSavePrompt: (prompt: string) => void;
  onSetIsEditing: (editing: boolean) => void;
  onSetEditedPrompt: (prompt: string) => void;
  canUndoEdit: boolean;
  onUndoEdit: () => void;
  canRedoEdit: boolean;
  onRedoEdit: () => void;
  canUndoPromptState: boolean;
  onUndoPromptState: () => void;
  canRedoPromptState: boolean;
  onRedoPromptState: () => void;

  // Generation states
  isGeneratingArt: boolean;
  onGenerateArt: (prompt: string) => void;
  isGeneratingVideo: boolean;
  onGenerateVideo: (prompt?: string) => void;
  isGeneratingStoryboard: boolean;
  onGenerateStoryboard: (prompt: string) => void;
  isGeneratingVariations: boolean;
  onGenerateVariations: (prompt: string) => void;
  isRefining: boolean;
  onRefinePrompt: (text: string) => void;
  isRestructuring: boolean;
  onRestructurePrompt: (prompt: string) => void;
  onSaveToHistory: () => void;
  onShare: () => void;
  onDownload: (prompt: string) => void;
  onOpenSavePresetModal: () => void;
  onOpenTemplatesPanel: () => void;
  onCompareModels: () => void;
  onOpenVisualDNA: () => void;

  // Output display
  storyboardImages: string[];
  conceptArtImage: string | null;

  // Examples
  isExamplesVisible: boolean;
  onCloseExamples: () => void;
  examplePrompts: ExamplePrompt[];
  onUseExample: (example: ExamplePrompt) => void;
}

export function OutputSection({
  promptState,
  generatedPrompt,
  isLoading,
  isEditing,
  editedPrompt,
  errors,
  t,
  addToast,
  onGeneratePrompt,
  onNewPrompt,
  onSavePrompt,
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
  isRefining,
  onRefinePrompt,
  isRestructuring,
  onRestructurePrompt,
  onSaveToHistory,
  onShare,
  onDownload,
  onOpenSavePresetModal,
  onOpenTemplatesPanel,
  onCompareModels,
  onOpenVisualDNA,
  storyboardImages,
  conceptArtImage,
  isExamplesVisible,
  onCloseExamples,
  examplePrompts,
  onUseExample,
}: OutputSectionProps) {
  return (
    <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-24 self-start animate-fade-in-up animation-delay-300 w-full min-w-0">
      <ActionBar
        uiStrings={t}
        promptState={promptState}
        generatedPrompt={generatedPrompt}
        isLoading={isLoading}
        isEditing={isEditing}
        editedPrompt={editedPrompt}
        errors={errors}
        addToast={addToast}
        onGeneratePrompt={onGeneratePrompt}
        onNewPrompt={onNewPrompt}
        onSavePrompt={onSavePrompt}
        onSetIsEditing={(editing) => {
          onSetIsEditing(editing);
          if (editing && generatedPrompt) {
            onSetEditedPrompt(generatedPrompt.prompt);
          }
        }}
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
        isRefining={isRefining}
        onRefinePrompt={onRefinePrompt}
        isRestructuring={isRestructuring}
        onRestructurePrompt={onRestructurePrompt}
        onSaveToHistory={onSaveToHistory}
        onShare={onShare}
        onDownload={onDownload}
        onOpenSavePresetModal={onOpenSavePresetModal}
        onOpenTemplatesPanel={onOpenTemplatesPanel}
        onCompareModels={onCompareModels}
        onOpenVisualDNA={onOpenVisualDNA}
      />

      <div id="output-section" data-tutorial-id="output-section" className="min-h-[400px]">
        {generatedPrompt ? (
          <PromptOutput
            prompt={isEditing ? editedPrompt : generatedPrompt.prompt}
            groundingChunks={generatedPrompt.groundingChunks}
            storyboardImages={storyboardImages}
            conceptArtImage={conceptArtImage}
            isEditing={isEditing}
            editedPrompt={editedPrompt}
            onEditChange={onSetEditedPrompt}
            onEditKeyDown={() => {}}
            onRefine={onRefinePrompt}
            isRefining={isRefining}
          />
        ) : (
          <div className="h-full">
            <PromptBuilderSummary promptState={promptState} uiStrings={t.summary} />
          </div>
        )}
      </div>

      {isExamplesVisible && !generatedPrompt && (
        <div className="hidden xl:block">
          <ExamplesCarousel
            examples={examplePrompts}
            onUseExample={onUseExample}
            useExampleText={t.examplesCarousel.use}
            onClose={onCloseExamples}
            title={t.examplesCarousel.title}
          />
        </div>
      )}
    </div>
  );
}
