import React from 'react';
import { MODEL_CATALOG } from '@core/models/catalog';
import { useTranslation } from 'react-i18next';

export interface StudioAiControlBarProps {
  model: string;
  onModelChange: (model: string) => void;
  stylePreset: string;
  onStylePresetChange: (preset: string) => void;
  language: 'en' | 'sv';
  onLanguageChange: (lang: 'en' | 'sv') => void;
  overwriteAll: boolean;
  onOverwriteAllChange: (overwrite: boolean) => void;
  disabled?: boolean;
}

export const StudioAiControlBar: React.FC<StudioAiControlBarProps> = ({
  model,
  onModelChange,
  stylePreset,
  onStylePresetChange,
  language,
  onLanguageChange,
  overwriteAll,
  onOverwriteAllChange,
  disabled = false,
}) => {
  const { t } = useTranslation('studio');

  return (
    <div className="studio-ai-bar" role="region" aria-label={t('aiSettings')}>
      <div className="studio-ai-bar-header">
        <span className="studio-ai-bar-title">✨ {t('aiSettings')}</span>
        <label className="studio-ai-bar-toggle" title={t('smartMergeHint')}>
          <input
            type="checkbox"
            checked={overwriteAll}
            onChange={(e) => onOverwriteAllChange(e.target.checked)}
            disabled={disabled}
            aria-label={t('overwriteExisting')}
          />
          <span>{t('overwriteExisting')}</span>
        </label>
      </div>

      <div className="studio-ai-bar-controls">
        <div className="studio-ai-field">
          <label htmlFor="studio-ai-model">{t('model')}</label>
          <select
            id="studio-ai-model"
            aria-label={t('model')}
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={disabled}
          >
            {MODEL_CATALOG.filter(
              (entry) =>
                entry.lifecycle === 'stable' &&
                entry.capabilities.operations.includes('plan') &&
                entry.provider === 'gemini-api',
            ).map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="studio-ai-field">
          <label htmlFor="studio-ai-style">{t('stylePreset')}</label>
          <select
            id="studio-ai-style"
            aria-label={t('stylePreset')}
            value={stylePreset}
            onChange={(e) => onStylePresetChange(e.target.value)}
            disabled={disabled}
          >
            <option value="auto">{t('modern.autoStyle')}</option>
            <option value="cinematic">{t('presets.cinematic')}</option>
            <option value="documentary">{t('presets.documentary')}</option>
            <option value="commercial">{t('presets.commercial')}</option>
            <option value="stylized">{t('presets.stylized')}</option>
            <option value="scifi">{t('presets.scifi')}</option>
          </select>
        </div>

        <div className="studio-ai-field">
          <label htmlFor="studio-ai-language">{t('promptLanguage')}</label>
          <select
            id="studio-ai-language"
            aria-label={t('promptLanguage')}
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as 'en' | 'sv')}
            disabled={disabled}
          >
            <option value="en">English (Veo / Flow standard)</option>
            <option value="sv">Svenska</option>
          </select>
        </div>
      </div>
    </div>
  );
};
