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
import { Skeleton } from '@shared/components/ui/Skeleton';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { useTranslation } from 'react-i18next';

const ContextualHelp = React.lazy(() =>
  import('@features/help').then((module) => ({ default: module.ContextualHelp })),
);

interface CoreConceptSectionProps {
  promptState: PromptState;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTargetModelChange: (model: 'veo' | 'sora' | 'local') => void;
  handleImageUpload: (image: { data: string; mimeType: string; url: string }) => void;
  handleImageClear: () => void;
  uploadedImageUrl: string | null;
  errors: Record<string, string>;
  openHelpPanel: (topic?: string, category?: string) => void;
  ideaInputRef: React.Ref<HTMLTextAreaElement>;
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
  const { t } = useTranslation(['prompt', 'common', 'tooltips']);
  const ideaActionButtons = (
    <div className="flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-900/70 p-1">
      <button
        onClick={handleBrainstormIdeas}
        disabled={isBrainstorming || isAutoFilling}
        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-yellow-300 disabled:opacity-50"
        aria-label={t('common:brainstormButton')}
        title={t('common:brainstormButton')}
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
        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-cyan-300 disabled:opacity-50"
        aria-label={t('common:autofillButton')}
        title={t('common:autofillButton')}
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
      title={t('common:sectionCoreConcept')}
      isOpen={openSections.includes('core-concept')}
      onToggle={() => onToggleSection('core-concept')}
      stepNumber={1}
      tutorialId="core-concept"
    >
      <div className="space-y-7">
        <TargetModelToggle
          value={promptState.targetModel}
          onChange={handleTargetModelChange}
          info={t('tooltips:targetModel')}
        />

        <TextAreaInput
          label={
            <div className="flex items-center gap-1">
              {t('prompt:labelIdea')}
              <ErrorBoundary panelId="core-concept-context-help-idea">
                <Suspense
                  fallback={
                    <Skeleton variant="circular" width={16} height={16} className="inline-flex" />
                  }
                >
                  <ContextualHelp
                    topic="Prompt Idea"
                    content="Enter your core video concept here. Be descriptive but concise."
                    topicId="create-prompt"
                    onOpenHelp={openHelpPanel}
                  />
                </Suspense>
              </ErrorBoundary>{' '}
            </div>
          }
          name="idea"
          value={promptState.idea}
          onChange={handleInputChange}
          placeholder={t('prompt:placeholderIdea')}
          ref={ideaInputRef}
          maxLength={CHARACTER_LIMITS.idea}
          actionButton={ideaActionButtons}
          info={t('tooltips:idea')}
          error={errors.idea}
          rows={6}
          autoFocus
          onEnhance={handleEnhanceIdea}
          isEnhancing={isEnhancingIdea}
        />

        <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900/55 to-slate-900/35 p-5 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Reference &amp; Consistency
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUploadInput
              onImageSelect={handleImageUpload}
              onImageClear={handleImageClear}
              uploadedImageUrl={uploadedImageUrl}
              label={
                <div className="flex items-center gap-1">
                  {t('prompt:imageUploadLabel')}
                  <ErrorBoundary panelId="core-concept-context-help-image">
                    <Suspense
                      fallback={
                        <Skeleton
                          variant="circular"
                          width={16}
                          height={16}
                          className="inline-flex"
                        />
                      }
                    >
                      <ContextualHelp
                        topic="Reference Image"
                        content={t('tooltips:imageUpload')}
                        topicId="create-prompt"
                        onOpenHelp={openHelpPanel}
                      />
                    </Suspense>
                  </ErrorBoundary>{' '}
                </div>
              }
              placeholder={t('prompt:imageUploadPlaceholder')}
              info={t('tooltips:imageUpload')}
            />
            {uploadedImageUrl ? (
              <div className="flex flex-col justify-center space-y-4">
                <CheckboxInput
                  id="useImageAsCameo"
                  name="useImageAsCameo"
                  label={t('prompt:labelUseImageAsCameo')}
                  checked={promptState.useImageAsCameo}
                  onChange={handleCheckboxChange}
                  tooltipText={t('tooltips:useImageAsCameo')}
                />
                {promptState.useImageAsCameo && (
                  <TextAreaInput
                    label={t('prompt:labelCharacterCameoTag')}
                    name="characterCameoTag"
                    value={promptState.characterCameoTag}
                    onChange={handleInputChange}
                    placeholder={t('prompt:placeholderCharacterCameoTag')}
                    maxLength={CHARACTER_LIMITS.characterCameoTag}
                    error={errors.characterCameoTag}
                    rows={1}
                    info={t('tooltips:characterCameoTag')}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-700 p-4 text-sm italic text-slate-500">
                Upload a reference image to unlock cameo controls.
              </div>
            )}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
