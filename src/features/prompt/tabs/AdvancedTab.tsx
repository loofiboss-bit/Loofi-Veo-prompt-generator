import React from 'react';
import { TextAreaInput } from '@shared/components/ui';
import { SelectInput } from '@shared/components/ui';
import { CheckboxInput } from '@shared/components/ui';
import { Icon } from '@shared/components/ui';
import PhysicsValidator from '@shared/components/PhysicsValidator';
import CinematographyValidator from '@shared/components/CinematographyValidator';
import { PromptState, SelectOption, ToastMessage } from '@core/types';
import { CHARACTER_LIMITS } from '@core/constants';
import { useUIStrings } from '@shared/hooks/useUIStrings';

interface AdvancedTabProps {
  promptState: PromptState;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: Partial<Record<keyof PromptState, string>>;
  motionIntensityOptions: SelectOption[];
  creativityLevelOptions: SelectOption[];
  modelOptions: SelectOption[];
  handleSuggestAdvancedSettings: () => void;
  isSuggestingAdvanced: boolean;
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const AdvancedTab: React.FC<AdvancedTabProps> = ({
  promptState,
  handleInputChange,
  handleCheckboxChange,
  errors,
  motionIntensityOptions,
  creativityLevelOptions,
  modelOptions,
  handleSuggestAdvancedSettings,
  isSuggestingAdvanced,
  addToast,
}) => {
  const t = useUIStrings();
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-end">
        <button
          onClick={handleSuggestAdvancedSettings}
          disabled={isSuggestingAdvanced}
          className="flex items-center text-xs font-bold text-cyan-400 hover:text-cyan-300 disabled:opacity-50 tracking-wide uppercase"
        >
          {isSuggestingAdvanced ? (
            <Icon name="spinner" className="w-3 h-3 animate-spin mr-2" />
          ) : (
            <Icon name="magic" className="w-3 h-3 mr-2" />
          )}
          {t.suggestAdvancedButton}
        </button>
      </div>
      <TextAreaInput
        label={t.labelNegativePrompt}
        name="negativePrompt"
        value={promptState.negativePrompt}
        onChange={handleInputChange}
        placeholder={t.placeholderNegativePrompt}
        rows={2}
        maxLength={CHARACTER_LIMITS.negativePrompt}
        info={t.tooltips.negativePrompt}
        error={errors.negativePrompt}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t.labelMotionIntensity}
          name="motionIntensity"
          options={motionIntensityOptions}
          value={promptState.motionIntensity}
          onChange={handleInputChange}
          info={t.tooltips.motionIntensity}
          error={errors.motionIntensity}
        />
        <SelectInput
          label={t.labelCreativityLevel}
          name="creativityLevel"
          options={creativityLevelOptions}
          value={promptState.creativityLevel}
          onChange={handleInputChange}
          info={t.tooltips.creativityLevel}
          error={errors.creativityLevel}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t.labelModel}
          name="model"
          options={modelOptions}
          value={promptState.model}
          onChange={handleInputChange}
          info={t.tooltips.model}
          error={errors.model}
        />
        <TextAreaInput
          label={t.labelYoutubeUrl}
          name="youtubeUrl"
          value={promptState.youtubeUrl}
          onChange={handleInputChange}
          placeholder={t.placeholderYoutubeUrl}
          rows={1}
          maxLength={CHARACTER_LIMITS.youtubeUrl}
          error={errors.youtubeUrl}
          info={t.tooltips.youtubeUrl}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        <CheckboxInput
          id="optimizeFor8Seconds"
          name="optimizeFor8Seconds"
          label={
            promptState.targetModel === 'sora'
              ? t.labelOptimizeFor15Seconds
              : t.labelOptimizeFor8Seconds
          }
          checked={promptState.optimizeFor8Seconds}
          onChange={handleCheckboxChange}
          tooltipText={
            promptState.targetModel === 'sora'
              ? t.tooltips.optimizeFor15Seconds
              : t.tooltips.optimizeFor8Seconds
          }
        />
        <div className="flex flex-col gap-2">
          <CheckboxInput
            id="includeOverlayText"
            name="includeOverlayText"
            label={t.labelIncludeOverlayText}
            checked={promptState.includeOverlayText}
            onChange={handleCheckboxChange}
            tooltipText={t.tooltips.includeOverlayText}
          />
          {promptState.includeOverlayText && (
            <div className="pl-4 border-l-2 border-slate-700 animate-fade-in-up">
              <TextAreaInput
                label={t.labelOverlayTextContent}
                name="overlayTextContent"
                value={promptState.overlayTextContent}
                onChange={handleInputChange}
                placeholder={t.placeholderOverlayTextContent}
                rows={1}
                maxLength={CHARACTER_LIMITS.overlayTextContent}
                info={t.tooltips.overlayTextContent}
                error={errors.overlayTextContent}
              />
            </div>
          )}
        </div>
        <CheckboxInput
          id="useGoogleSearch"
          name="useGoogleSearch"
          label={t.labelUseGoogleSearch}
          checked={promptState.useGoogleSearch}
          onChange={handleCheckboxChange}
          tooltipText={t.tooltips.useGoogleSearch}
        />
        <CheckboxInput
          id="generateAsSeries"
          name="generateAsSeries"
          label={t.labelGenerateAsSeries}
          checked={promptState.generateAsSeries}
          onChange={handleCheckboxChange}
          tooltipText={t.tooltips.generateAsSeries}
        />
        <CheckboxInput
          id="useGoogleMaps"
          name="useGoogleMaps"
          label="Use Google Maps Grounding"
          checked={promptState.useGoogleMaps}
          onChange={handleCheckboxChange}
          color="fuchsia"
        />
      </div>

      <PhysicsValidator promptState={promptState} addToast={addToast} />

      <CinematographyValidator promptState={promptState} addToast={addToast} />
    </div>
  );
};

export default AdvancedTab;
