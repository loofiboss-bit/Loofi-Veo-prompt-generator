/**
 * DetailsSection
 *
 * The "Step 2 — Refine Details" collapsible section extracted from App.tsx.
 * Contains the tabbed interface: Style, Camera, Scene, Character, Audio, Advanced.
 */

import React, { Suspense } from 'react';
import { PromptState, SelectOption } from '@core/types';
import type { StudioType } from '@shared/hooks/useStudios';
import CollapsibleSection from '@shared/components/ui/CollapsibleSection';
import Tabs from '@shared/components/ui/Tabs';
import { useTranslation } from 'react-i18next';

// Lazy-loaded tab components
const StyleTab = React.lazy(() => import('@features/prompt/tabs/StyleTab'));
const CameraTab = React.lazy(() => import('@features/prompt/tabs/CameraTab'));
const SceneTab = React.lazy(() => import('@features/prompt/tabs/SceneTab'));
const CharacterTab = React.lazy(() => import('@features/prompt/tabs/CharacterTab'));
const AudioTab = React.lazy(() => import('@features/prompt/tabs/AudioTab'));
const AdvancedTab = React.lazy(() => import('@features/prompt/tabs/AdvancedTab'));

const TabLoadingFallback = () => (
  <div className="flex items-center justify-center p-12 bg-slate-900/35">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-500 text-sm">Loading module...</span>
    </div>
  </div>
);

interface DetailsSectionProps {
  promptState: PromptState;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAudioMixChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAudioUpload: (audio: { data: string; mimeType: string; name: string }) => void;
  handleAudioClear: () => void;
  errors: Record<string, string>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;

  // Tab index
  activeTabIndex: number;
  onTabChange: (index: number) => void;

  // Section collapse
  openSections: string[];
  onToggleSection: (section: string) => void;

  // Studio opener
  openStudioSafely: (studio: NonNullable<StudioType>) => void;

  // Prompt options
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixed types (SelectOption[] + ExamplePrompt[])
  promptOptions: Record<string, any>;

  // AI suggestion handlers + loading states
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
}

export function DetailsSection({
  promptState,
  handleInputChange,
  handleCheckboxChange,
  handleAudioMixChange,
  handleAudioUpload,
  handleAudioClear,
  errors,
  addToast,
  activeTabIndex,
  onTabChange,
  openSections,
  onToggleSection,
  openStudioSafely,
  promptOptions,
  handleSuggestArtStyles,
  isSuggestingArtStyle,
  handleSuggestVisualEffect,
  isSuggestingEffect,
  handleSuggestCameraSetup,
  isSuggestingCamera,
  handleSuggestEnvironmentDetails,
  isSuggestingEnvironment,
  handleSuggestSensoryDetails,
  isSuggestingSensoryDetails,
  handleSuggestCharacterActions,
  isSuggestingActions,
  handleGenerateVisualDNA,
  isGeneratingVisualDNA,
  handleSuggestFullAudioDesign,
  isSuggestingFullAudio,
  handleAnalyzeAudio,
  isAnalyzingAudio,
  handleSuggestAdvancedSettings,
  isSuggestingAdvanced,
}: DetailsSectionProps) {
  const { t } = useTranslation(['prompt']);
  return (
    <CollapsibleSection
      title="2. Refine Details"
      isOpen={openSections.includes('details-tabs')}
      onToggle={() => onToggleSection('details-tabs')}
      stepNumber={2}
      tutorialId="details-tabs"
    >
      <div className="pt-2">
        <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900/60 to-slate-900/35 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
          <Tabs
            activeTabIndex={activeTabIndex}
            onTabChange={onTabChange}
            tabs={[
              {
                label: t('prompt:tabStyle'),
                icon: 'palette',
                content: (
                  <Suspense fallback={<TabLoadingFallback />}>
                    <StyleTab
                      promptState={promptState}
                      handleInputChange={handleInputChange}
                      errors={errors}
                      artStyleOptions={promptOptions.artStyleOptions}
                      visualEffectOptions={promptOptions.visualEffectOptions}
                      lightingStyleOptions={promptOptions.lightingStyleOptions}
                      colorPaletteOptions={promptOptions.colorPaletteOptions}
                      animationPresetOptions={promptOptions.animationPresetOptions}
                      handleSuggestArtStyles={handleSuggestArtStyles}
                      isSuggestingArtStyle={isSuggestingArtStyle}
                      handleSuggestVisualEffect={handleSuggestVisualEffect}
                      isSuggestingEffect={isSuggestingEffect}
                    />
                  </Suspense>
                ),
              },
              {
                label: t('prompt:tabCamera'),
                icon: 'video',
                content: (
                  <Suspense fallback={<TabLoadingFallback />}>
                    <CameraTab
                      promptState={promptState}
                      handleInputChange={handleInputChange}
                      errors={errors}
                      cameraMovementOptions={promptOptions.cameraMovementOptions}
                      cameraDistanceOptions={promptOptions.cameraDistanceOptions}
                      lensTypeOptions={promptOptions.lensTypeOptions}
                      compositionalGuideOptions={promptOptions.compositionalGuideOptions}
                      aspectRatioOptions={promptOptions.aspectRatioOptions}
                      resolutionOptions={promptOptions.resolutionOptions}
                      handleSuggestCameraSetup={handleSuggestCameraSetup}
                      isSuggestingCamera={isSuggestingCamera}
                      onOpenSpatialDirector={() => openStudioSafely('spatial')}
                    />
                  </Suspense>
                ),
              },
              {
                label: t('prompt:tabScene'),
                icon: 'image',
                content: (
                  <Suspense fallback={<TabLoadingFallback />}>
                    <SceneTab
                      promptState={promptState}
                      handleInputChange={handleInputChange}
                      errors={errors}
                      architecturalStyleOptions={promptOptions.architecturalStyleOptions}
                      timeOfDayOptions={promptOptions.timeOfDayOptions}
                      weatherOptions={promptOptions.weatherOptions}
                      handleSuggestEnvironmentDetails={handleSuggestEnvironmentDetails}
                      isSuggestingEnvironment={isSuggestingEnvironment}
                      handleSuggestSensoryDetails={handleSuggestSensoryDetails}
                      isSuggestingSensoryDetails={isSuggestingSensoryDetails}
                    />
                  </Suspense>
                ),
              },
              {
                label: t('prompt:tabCharacter'),
                icon: 'user',
                content: (
                  <Suspense fallback={<TabLoadingFallback />}>
                    <CharacterTab
                      promptState={promptState}
                      handleInputChange={handleInputChange}
                      errors={errors}
                      characterArchetypeOptions={promptOptions.characterArchetypeOptions}
                      characterAgeOptions={promptOptions.characterAgeOptions}
                      characterGenderOptions={promptOptions.characterGenderOptions}
                      characterMoodOptions={promptOptions.characterMoodOptions}
                      characterPoseOptions={promptOptions.characterPoseOptions}
                      characterEthnicityOptions={promptOptions.characterEthnicityOptions}
                      characterSkinToneOptions={promptOptions.characterSkinToneOptions}
                      characterClothingOptions={promptOptions.characterClothingOptions}
                      handleSuggestCharacterActions={handleSuggestCharacterActions}
                      isSuggestingActions={isSuggestingActions}
                      handleGenerateVisualDNA={handleGenerateVisualDNA}
                      isGeneratingVisualDNA={isGeneratingVisualDNA}
                    />
                  </Suspense>
                ),
              },
              {
                label: t('prompt:tabAudio'),
                icon: 'audio',
                content: (
                  <Suspense fallback={<TabLoadingFallback />}>
                    <AudioTab
                      promptState={promptState}
                      handleInputChange={handleInputChange}
                      errors={errors}
                      voiceStyleOptions={promptOptions.voiceStyleOptions}
                      ambientSoundOptions={promptOptions.ambientSoundOptions as SelectOption[]}
                      soundEffectsIntensityOptions={
                        promptOptions.soundEffectsIntensityOptions as SelectOption[]
                      }
                      handleSuggestFullAudioDesign={handleSuggestFullAudioDesign}
                      isSuggestingFullAudio={isSuggestingFullAudio}
                      onOpenPronunciation={() => openStudioSafely('pronunciation')}
                      handleAudioMixChange={handleAudioMixChange}
                      handleAudioUpload={handleAudioUpload}
                      handleAudioClear={handleAudioClear}
                      handleAnalyzeAudio={handleAnalyzeAudio}
                      isAnalyzingAudio={isAnalyzingAudio}
                    />
                  </Suspense>
                ),
              },
              {
                label: t('prompt:tabAdvanced'),
                icon: 'sliders',
                content: (
                  <Suspense fallback={<TabLoadingFallback />}>
                    <AdvancedTab
                      promptState={promptState}
                      handleInputChange={handleInputChange}
                      handleCheckboxChange={handleCheckboxChange}
                      errors={errors}
                      motionIntensityOptions={
                        promptOptions.motionIntensityOptions as SelectOption[]
                      }
                      creativityLevelOptions={
                        promptOptions.creativityLevelOptions as SelectOption[]
                      }
                      modelOptions={promptOptions.modelOptions as SelectOption[]}
                      handleSuggestAdvancedSettings={handleSuggestAdvancedSettings}
                      isSuggestingAdvanced={isSuggestingAdvanced}
                      addToast={addToast}
                    />
                  </Suspense>
                ),
              },
            ]}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}
