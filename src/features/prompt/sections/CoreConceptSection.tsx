/**
 * CoreConceptSection
 *
 * The "Step 1 — Core Concept" collapsible section extracted from App.tsx.
 * Contains: target model toggle, idea textarea, image upload, cameo controls.
 */

import React, { Suspense } from 'react';
import { PromptState } from '@core/types';
import { CHARACTER_LIMITS } from '@core/constants';
import CollapsibleSection from '@shared/components/ui/CollapsibleSection';
import TargetModelToggle from '@features/prompt/TargetModelToggle';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import CheckboxInput from '@shared/components/ui/CheckboxInput';
import ImageUploadInput from '@features/prompt/ImageUploadInput';
import Icon from '@shared/components/ui/Icon';

const ContextualHelp = React.lazy(() =>
  import('@features/help').then((module) => ({ default: module.ContextualHelp })),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationStrings = any;

interface CoreConceptSectionProps {
  promptState: PromptState;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTargetModelChange: (model: 'veo' | 'sora') => void;
  handleImageUpload: (image: { data: string; mimeType: string; url: string }) => void;
  handleImageClear: () => void;
  uploadedImageUrl: string | null;
  errors: Record<string, string>;
  t: TranslationStrings;
  openHelpPanel: (topic?: string, category?: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ideaInputRef: any;
  openSections: string[];
  onToggleSection: (section: string) => void;
  // Idea action buttons
  isBrainstorming: boolean;
  isAutoFilling: boolean;
  handleBrainstormIdeas: () => void;
  handleAutoFillModifiers: () => void;
  handleEnhanceIdea: () => void;
  isEnhancingIdea: boolean;
}

export function CoreConceptSection({
  promptState,
  handleInputChange,
  handleCheckboxChange,
  handleTargetModelChange,
  handleImageUpload,
  handleImageClear,
  uploadedImageUrl,
  errors,
  t,
  openHelpPanel,
  ideaInputRef,
  openSections,
  onToggleSection,
  isBrainstorming,
  isAutoFilling,
  handleBrainstormIdeas,
  handleAutoFillModifiers,
  handleEnhanceIdea,
  isEnhancingIdea,
}: CoreConceptSectionProps) {
  const ideaActionButtons = (
    <div className="flex gap-1">
      <button
        onClick={handleBrainstormIdeas}
        disabled={isBrainstorming || isAutoFilling}
        className="p-2 rounded-full text-slate-400 hover:text-yellow-400 hover:bg-slate-800 transition-colors"
        aria-label={t.brainstormButton}
        title={t.brainstormButton}
      >
        {isBrainstorming ? (
          <Icon name="spinner" className="w-5 h-5 animate-spin" />
        ) : (
          <Icon name="lightbulb" className="w-5 h-5" />
        )}
      </button>
      <button
        onClick={handleAutoFillModifiers}
        disabled={isAutoFilling || !promptState.idea || isBrainstorming}
        className="p-2 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
        aria-label={t.autofillButton}
        title={t.autofillButton}
        data-tutorial-id="autofill-button"
      >
        {isAutoFilling ? (
          <Icon name="spinner" className="w-5 h-5 animate-spin" />
        ) : (
          <Icon name="magic" className="w-5 h-5" />
        )}
      </button>
    </div>
  );

  return (
    <CollapsibleSection
      title={t.sectionCoreConcept}
      isOpen={openSections.includes('core-concept')}
      onToggle={() => onToggleSection('core-concept')}
      stepNumber={1}
      tutorialId="core-concept"
    >
      <div className="space-y-8">
        <TargetModelToggle
          value={promptState.targetModel}
          onChange={handleTargetModelChange}
          uiStrings={{
            label: t.labelTargetModel,
            veoLabel: t.toggleVeoLabel,
            veoDescription: t.toggleVeoDescription,
            soraLabel: t.toggleSoraLabel,
            soraDescription: t.toggleSoraDescription,
          }}
          info={t.tooltips.targetModel}
        />

        <TextAreaInput
          label={
            <div className="flex items-center gap-1">
              {t.labelIdea}
              <Suspense fallback={null}>
                <ContextualHelp
                  topic="Prompt Idea"
                  content="Enter your core video concept here. Be descriptive but concise."
                  topicId="create-prompt"
                  onOpenHelp={openHelpPanel}
                />
              </Suspense>{' '}
            </div>
          }
          name="idea"
          value={promptState.idea}
          onChange={handleInputChange}
          placeholder={t.placeholderIdea}
          ref={ideaInputRef}
          maxLength={CHARACTER_LIMITS.idea}
          actionButton={ideaActionButtons}
          info={t.tooltips.idea}
          error={errors.idea}
          rows={6}
          autoFocus
          onEnhance={handleEnhanceIdea}
          isEnhancing={isEnhancingIdea}
        />

        <div className="bg-slate-900/40 rounded-xl border border-white/5 p-5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Reference &amp; Consistency
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUploadInput
              onImageSelect={handleImageUpload}
              onImageClear={handleImageClear}
              uploadedImageUrl={uploadedImageUrl}
              label={
                <div className="flex items-center gap-1">
                  {t.imageUploadLabel}
                  <Suspense fallback={null}>
                    <ContextualHelp
                      topic="Reference Image"
                      content={t.tooltips.imageUpload}
                      topicId="create-prompt"
                      onOpenHelp={openHelpPanel}
                    />
                  </Suspense>{' '}
                </div>
              }
              placeholder={t.imageUploadPlaceholder}
              info={t.tooltips.imageUpload}
            />
            {uploadedImageUrl ? (
              <div className="flex flex-col justify-center space-y-4">
                <CheckboxInput
                  id="useImageAsCameo"
                  name="useImageAsCameo"
                  label={t.labelUseImageAsCameo}
                  checked={promptState.useImageAsCameo}
                  onChange={handleCheckboxChange}
                  tooltipText={t.tooltips.useImageAsCameo}
                />
                {promptState.useImageAsCameo && (
                  <TextAreaInput
                    label={t.labelCharacterCameoTag}
                    name="characterCameoTag"
                    value={promptState.characterCameoTag}
                    onChange={handleInputChange}
                    placeholder={t.placeholderCharacterCameoTag}
                    maxLength={CHARACTER_LIMITS.characterCameoTag}
                    error={errors.characterCameoTag}
                    rows={1}
                    info={t.tooltips.characterCameoTag}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center p-4 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm italic">
                Upload a reference image to unlock cameo controls.
              </div>
            )}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
