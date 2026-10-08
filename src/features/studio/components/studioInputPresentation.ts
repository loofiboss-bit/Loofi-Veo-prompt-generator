import type { TFunction } from 'i18next';
import type { MusicPromptArtifactInput, VideoPromptArtifactInput } from '@core/types';
import { STUDIO_CAPABILITIES } from '@core/config/studioCapabilities';

/** Human-readable input values; technical media handles stay out of the copy desk. */
export function studioInputRows(
  input: VideoPromptArtifactInput | MusicPromptArtifactInput,
  t: TFunction<'studio'>,
): Array<{ label: string; value: string }> {
  const labelKeys: Record<string, string> = {
    mode: 'recipe',
    durationSeconds: 'length',
    language: 'lyricsLanguage',
    instrumental: 'instrumental',
    targetProfile: 'target',
    styleInfluence: 'inputLabels.styleInfluence',
    spatialCamera: 'spatialExperiment',
    referenceRoles: 'inputLabels.referenceRoles',
    rightsChecklist: 'inputLabels.rights',
  };
  return Object.entries(input)
    .filter(
      ([key, value]) =>
        value !== undefined &&
        value !== null &&
        value !== '' &&
        ![
          'firstFrameAssetId',
          'lastFrameAssetId',
          'referenceAssetIds',
          'extensionSourceTakeId',
          'extensionArtifact',
        ].includes(key),
    )
    .map(([key, value]) => {
      const label = t(labelKeys[key] ?? key, { defaultValue: key });
      const text =
        key === 'mode'
          ? t('modes.' + String(value))
          : key === 'durationSeconds'
            ? t('seconds', { count: Number(value) })
            : key === 'target'
              ? STUDIO_CAPABILITIES[value as VideoPromptArtifactInput['target']].label
              : typeof value === 'boolean'
                ? t(value ? 'inputLabels.yes' : 'inputLabels.no')
                : typeof value === 'object'
                  ? Object.entries(value)
                      .map(([part, item]) => {
                        const partLabel = t('inputLabels.' + part, { defaultValue: part });
                        const rendered =
                          typeof item === 'boolean'
                            ? t(item ? 'inputLabels.yes' : 'inputLabels.no')
                            : typeof item === 'object' && item !== null
                              ? Object.values(item).join(', ')
                              : String(item);
                        return `${partLabel}: ${rendered}`;
                      })
                      .join('\n')
                  : String(value);
      return { label, value: text };
    });
}
