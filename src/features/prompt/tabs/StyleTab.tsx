import React from 'react';
import { SelectInput } from '@shared/components/ui';
import { TextAreaInput } from '@shared/components/ui';
import { Icon } from '@shared/components/ui';
import { PromptState, SelectOption } from '@core/types';
import { CHARACTER_LIMITS } from '@core/constants';
import { useTranslation } from 'react-i18next';

interface StyleTabProps {
  promptState: PromptState;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  errors: Partial<Record<keyof PromptState, string>>;
  artStyleOptions: SelectOption[];
  visualEffectOptions: SelectOption[];
  lightingStyleOptions: SelectOption[];
  colorPaletteOptions: SelectOption[];
  animationPresetOptions: SelectOption[];
  handleSuggestArtStyles: () => void;
  isSuggestingArtStyle: boolean;
  handleSuggestVisualEffect: () => void;
  isSuggestingEffect: boolean;
}

const StyleTab: React.FC<StyleTabProps> = ({
  promptState,
  handleInputChange,
  errors,
  artStyleOptions,
  visualEffectOptions,
  lightingStyleOptions,
  colorPaletteOptions,
  animationPresetOptions,
  handleSuggestArtStyles,
  isSuggestingArtStyle,
  handleSuggestVisualEffect,
  isSuggestingEffect,
}) => {
  const { t } = useTranslation(['prompt', 'tooltips']);
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <SelectInput
            label={t('prompt:labelArtStyle')}
            name="artStyle"
            options={artStyleOptions}
            value={promptState.artStyle}
            onChange={handleInputChange}
            info={t('tooltips:artStyle')}
            error={errors.artStyle}
          />
          {promptState.artStyle === 'Custom' && (
            <div className="mt-4">
              <TextAreaInput
                label={t('prompt:labelCustomArtStyle')}
                name="customArtStyle"
                value={promptState.customArtStyle}
                onChange={handleInputChange}
                placeholder={t('prompt:placeholderCustomArtStyle')}
                rows={2}
                maxLength={CHARACTER_LIMITS.customArtStyle}
                error={errors.customArtStyle}
                actionButton={
                  <button
                    onClick={handleSuggestArtStyles}
                    disabled={isSuggestingArtStyle}
                    className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Suggest Styles"
                  >
                    {isSuggestingArtStyle ? (
                      <Icon name="spinner" className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon name="magic" className="w-5 h-5" />
                    )}
                  </button>
                }
                info={t('tooltips:customArtStyle')}
              />
            </div>
          )}
        </div>
        <div className="space-y-6">
          <SelectInput
            label={t('prompt:labelVisualEffect')}
            name="visualEffect"
            options={visualEffectOptions}
            value={promptState.visualEffect}
            onChange={handleInputChange}
            info={t('tooltips:visualEffect')}
            error={errors.visualEffect}
            actionButton={
              <button
                onClick={handleSuggestVisualEffect}
                disabled={isSuggestingEffect}
                className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 transition-colors"
                title="Suggest Effect"
              >
                {isSuggestingEffect ? (
                  <Icon name="spinner" className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon name="magic" className="w-5 h-5" />
                )}
              </button>
            }
          />
          <SelectInput
            label={t('prompt:labelLightingStyle')}
            name="lightingStyle"
            options={lightingStyleOptions}
            value={promptState.lightingStyle}
            onChange={handleInputChange}
            info={t('tooltips:lightingStyle')}
            error={errors.lightingStyle}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t('prompt:labelColorPalette')}
          name="colorPalette"
          options={colorPaletteOptions}
          value={promptState.colorPalette}
          onChange={handleInputChange}
          info={t('tooltips:colorPalette')}
          error={errors.colorPalette}
        />
        <SelectInput
          label={t('prompt:labelAnimationPreset')}
          name="animationPreset"
          options={animationPresetOptions}
          value={promptState.animationPreset}
          onChange={handleInputChange}
          info={t('tooltips:animationPreset')}
          error={errors.animationPreset}
        />
      </div>
    </div>
  );
};

export default StyleTab;
