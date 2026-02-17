import React from 'react';
import { TextAreaInput } from '@shared/components/ui';
import { SelectInput } from '@shared/components/ui';
import { Icon } from '@shared/components/ui';
import { PromptState, SelectOption } from '@core/types';
import { CHARACTER_LIMITS } from '@core/constants';
import { useTranslation } from 'react-i18next';

interface SceneTabProps {
  promptState: PromptState;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  errors: Partial<Record<keyof PromptState, string>>;
  architecturalStyleOptions: SelectOption[];
  timeOfDayOptions: SelectOption[];
  weatherOptions: SelectOption[];
  handleSuggestEnvironmentDetails: () => void;
  isSuggestingEnvironment: boolean;
  handleSuggestSensoryDetails: () => void;
  isSuggestingSensoryDetails: boolean;
}

const SceneTab: React.FC<SceneTabProps> = ({
  promptState,
  handleInputChange,
  errors,
  architecturalStyleOptions,
  timeOfDayOptions,
  weatherOptions,
  handleSuggestEnvironmentDetails,
  isSuggestingEnvironment,
  handleSuggestSensoryDetails,
  isSuggestingSensoryDetails,
}) => {
  const { t } = useTranslation(['prompt', 'tooltips', 'common']);
  const environmentDetailsButton = (
    <button
      onClick={handleSuggestEnvironmentDetails}
      disabled={isSuggestingEnvironment || !promptState.idea}
      className="p-2 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
      aria-label={t('tooltips:suggestEnvironmentButton')}
      title={t('tooltips:suggestEnvironmentButton')}
      data-tutorial-id="environment-ai-button"
    >
      {isSuggestingEnvironment ? (
        <Icon name="spinner" className="w-5 h-5 animate-spin" />
      ) : (
        <Icon name="magic" className="w-5 h-5" />
      )}
    </button>
  );

  const sensoryDetailsButton = (
    <button
      onClick={handleSuggestSensoryDetails}
      disabled={isSuggestingSensoryDetails || !promptState.environment}
      className="p-2 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
      aria-label={t('common:suggestSensoryDetailsButton')}
      title={t('common:suggestSensoryDetailsButton')}
    >
      {isSuggestingSensoryDetails ? (
        <Icon name="spinner" className="w-5 h-5 animate-spin" />
      ) : (
        <Icon name="magic" className="w-5 h-5" />
      )}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <TextAreaInput
        label={t('prompt:labelEnvironment')}
        name="environment"
        value={promptState.environment}
        onChange={handleInputChange}
        placeholder={t('prompt:placeholderEnvironment')}
        maxLength={CHARACTER_LIMITS.environment}
        actionButton={environmentDetailsButton}
        info={t('tooltips:environment')}
        error={errors.environment}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextAreaInput
          label={t('prompt:labelSensoryDetails')}
          name="environmentSensoryDetails"
          value={promptState.environmentSensoryDetails}
          onChange={handleInputChange}
          placeholder={t('prompt:placeholderSensoryDetails')}
          rows={3}
          maxLength={CHARACTER_LIMITS.environmentSensoryDetails}
          actionButton={sensoryDetailsButton}
          info={t('tooltips:sensoryDetails')}
          error={errors.environmentSensoryDetails}
        />
        <TextAreaInput
          label={t('prompt:labelEnvironmentDynamicEvents')}
          name="environmentDynamicEvents"
          value={promptState.environmentDynamicEvents}
          onChange={handleInputChange}
          placeholder={t('prompt:placeholderEnvironmentDynamicEvents')}
          rows={3}
          maxLength={CHARACTER_LIMITS.environmentDynamicEvents}
          info={t('tooltips:environmentDynamicEvents')}
          error={errors.environmentDynamicEvents}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t('prompt:labelArchitecturalStyle')}
          name="architecturalStyle"
          options={architecturalStyleOptions}
          value={promptState.architecturalStyle}
          onChange={handleInputChange}
          info={t('tooltips:architecturalStyle')}
          error={errors.architecturalStyle}
        />
        <div className="grid grid-cols-2 gap-4">
          <SelectInput
            label={t('prompt:labelTimeOfDay')}
            name="timeOfDay"
            options={timeOfDayOptions}
            value={promptState.timeOfDay}
            onChange={handleInputChange}
            info={t('tooltips:timeOfDay')}
            error={errors.timeOfDay}
          />
          <SelectInput
            label={t('prompt:labelWeather')}
            name="weather"
            options={weatherOptions}
            value={promptState.weather}
            onChange={handleInputChange}
            info={t('tooltips:weather')}
            error={errors.weather}
          />
        </div>
      </div>
    </div>
  );
};

export default SceneTab;
