import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '@core/types';
import type {
  StudioCreativeDetails,
  StudioSceneField,
  VideoPromptArtifactInput,
} from '@core/types/promptArtifact';
import { useAppStore } from '@core/store/useAppStore';
import { getAllPresets, type Preset } from '@core/services/presetManager';
import { continuityService } from '@core/services/continuityService';
import { usePromptOptions } from '@shared/hooks/usePromptOptions';

interface StudioCreativeControlsProps {
  input: VideoPromptArtifactInput;
  onChange: (updates: Partial<VideoPromptArtifactInput>) => void;
  onRegenerate: (field: StudioSceneField) => void;
  lockedFields: string[];
  fieldOrigins: Record<string, 'manual' | 'ai' | 'default'>;
  onProtectionChange: (field: StudioSceneField, protect: boolean) => void;
  disabled: boolean;
  nativeAudio: boolean;
  supportsNegative: boolean;
}

export function StudioCreativeControls(props: StudioCreativeControlsProps) {
  const { t, i18n } = useTranslation('studio');
  const options = usePromptOptions((i18n.resolvedLanguage as Language) ?? 'en');
  const characters = useAppStore((state) => state.characterBank);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetError, setPresetError] = useState('');
  useEffect(() => {
    let active = true;
    void getAllPresets()
      .then((items) => {
        if (active) setPresets(items);
      })
      .catch(() => {
        if (active) setPresetError(t('modern.presetError'));
      });
    return () => {
      active = false;
    };
  }, [t]);

  const detail = (
    key: keyof StudioCreativeDetails,
    choices?: { value: string; label: string }[],
  ) => (
    <label className="studio-field" key={key}>
      <span>{t(`modern.fields.${key}`)}</span>
      <input
        aria-label={t(`modern.fields.${key}`)}
        data-studio-field={key}
        list={choices ? `studio-options-${key}` : undefined}
        value={props.input.creativeDetails?.[key] ?? ''}
        onChange={(event) =>
          props.onChange({
            creativeDetails: { ...props.input.creativeDetails, [key]: event.target.value },
          })
        }
      />
      {choices ? (
        <datalist id={`studio-options-${key}`}>
          {choices
            .filter((item) => item.value && !/^(any|none|auto)$/i.test(item.value))
            .map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
        </datalist>
      ) : null}
    </label>
  );

  const sceneField = (field: StudioSceneField) => {
    const value = props.input[field] ?? '';
    const protectedField =
      props.lockedFields.includes(field) ||
      (Boolean(value.trim()) && props.fieldOrigins[field] !== 'ai');
    return (
      <div key={field}>
        <label className="studio-field">
          <span>
            {t(field)}
            {field === 'audio' && !props.nativeAudio ? ` (${t('modern.postProduction')})` : ''}
          </span>
          <textarea
            rows={2}
            aria-label={t(field)}
            data-studio-field={field}
            value={value}
            onChange={(event) => props.onChange({ [field]: event.target.value })}
          />
        </label>
        <div className="studio-actions">
          <label className="studio-check">
            <input
              type="checkbox"
              checked={protectedField}
              onChange={(event) => props.onProtectionChange(field, event.target.checked)}
              aria-label={t('modern.protectField', { field: t(field) })}
            />
            {t('modern.protected')}
          </label>
          <button
            type="button"
            disabled={props.disabled || protectedField}
            onClick={() => props.onRegenerate(field)}
          >
            {t('modern.regenerateField', { field: t(field) })}
          </button>
        </div>
      </div>
    );
  };

  const applyPreset = (id: string) => {
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;
    const mapping: Record<string, StudioSceneField> = {
      cameraMovement: 'camera',
      lightingStyle: 'lighting',
      artStyle: 'style',
      customArtStyle: 'style',
      ambientSound: 'audio',
    };
    const patch: Partial<VideoPromptArtifactInput> = {};
    const creativeDetails = { ...props.input.creativeDetails };
    const detailKeys: (keyof StudioCreativeDetails)[] = [
      'cameraDistance',
      'lensType',
      'compositionalGuide',
      'timeOfDay',
      'weather',
      'motionIntensity',
      'colorPalette',
      'soundEffectsIntensity',
      'voiceStyle',
    ];
    for (const [key, value] of Object.entries(preset.params)) {
      if (typeof value !== 'string') continue;
      const field = mapping[key];
      if (field && !props.input[field]?.trim()) patch[field] = value;
      if (
        detailKeys.includes(key as keyof StudioCreativeDetails) &&
        !creativeDetails[key as keyof StudioCreativeDetails]?.trim()
      )
        creativeDetails[key as keyof StudioCreativeDetails] = value;
    }
    props.onChange({ ...patch, creativeDetails });
  };

  return (
    <fieldset disabled={props.disabled} className="studio-variant-body">
      <label className="studio-field">
        <span>{t('modern.preset')}</span>
        <select
          aria-label={t('modern.preset')}
          value=""
          onChange={(event) => applyPreset(event.target.value)}
        >
          <option value="">{t('modern.presetPlaceholder')}</option>
          {presets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {presetError ? <p role="alert">{presetError}</p> : null}
      <p className="studio-hint">{t('modern.presetHint')}</p>
      <details className="studio-details" open>
        <summary>{t('modern.scene')}</summary>
        <div className="studio-fields">
          {(
            [
              'subject',
              'action',
              'environment',
              'camera',
              'lighting',
              'style',
              'audio',
              'dialogue',
              ...(props.supportsNegative ? ['negativePrompt'] : []),
            ] as StudioSceneField[]
          ).map(sceneField)}
        </div>
      </details>
      <details className="studio-details">
        <summary>{t('modern.camera')}</summary>
        <div className="studio-fields">
          {detail('cameraDistance', options.cameraDistanceOptions)}
          {detail('lensType', options.lensTypeOptions)}
          {detail('compositionalGuide', options.compositionalGuideOptions)}
          {detail('motionIntensity', options.motionIntensityOptions)}
        </div>
      </details>
      <details className="studio-details">
        <summary>{t('modern.character')}</summary>
        <label className="studio-field">
          <span>{t('modern.characterBank')}</span>
          <select
            aria-label={t('modern.characterBank')}
            value=""
            onChange={(event) => {
              const character = characters.find((item) => item.id === event.target.value);
              if (!character) return;
              const profile = continuityService.createProfileFromCharacter(character);
              props.onChange({
                subject: props.input.subject?.trim() ? props.input.subject : profile.description,
                creativeDetails: {
                  ...props.input.creativeDetails,
                  characterVisualDNA:
                    props.input.creativeDetails?.characterVisualDNA ||
                    [
                      profile.description,
                      ...Object.entries(profile.lockedAttributes).map(
                        ([key, value]) => `${key}: ${value}`,
                      ),
                    ]
                      .filter(Boolean)
                      .join('; '),
                },
              });
            }}
          >
            <option value="">{t('modern.characterPlaceholder')}</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
        </label>
        <div className="studio-fields">
          {detail('characterVisualDNA')}
          {detail('characterNuances')}
          {detail('characterClothing', options.characterClothingOptions)}
        </div>
      </details>
      <details className="studio-details">
        <summary>{t('modern.environment')}</summary>
        <div className="studio-fields">
          {detail('timeOfDay', options.timeOfDayOptions)}
          {detail('weather', options.weatherOptions)}
          {detail('architecturalStyle', options.architecturalStyleOptions)}
          {detail('environmentSensoryDetails')}
          {detail('environmentDynamicEvents')}
        </div>
      </details>
      <details className="studio-details">
        <summary>{t('modern.soundStyle')}</summary>
        {!props.nativeAudio ? (
          <p className="studio-hint">{t('modern.postProductionHint')}</p>
        ) : null}
        <div className="studio-fields">
          {detail('colorPalette', options.colorPaletteOptions)}
          {detail('ambientSound', options.ambientSoundOptions)}
          {detail('soundEffectsIntensity', options.soundEffectsIntensityOptions)}
          {detail('voiceStyle', options.voiceStyleOptions)}
        </div>
      </details>
    </fieldset>
  );
}
