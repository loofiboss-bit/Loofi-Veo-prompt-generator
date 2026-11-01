import type { PromptState, VideoPromptArtifactInput } from '@core/types';

/** Restore the original generator's reusable creative controls. */
export const legacyCreativeDetails = (
  params: Partial<PromptState>,
): NonNullable<VideoPromptArtifactInput['creativeDetails']> => {
  const keys = [
    'cameraDistance',
    'lensType',
    'compositionalGuide',
    'characterVisualDNA',
    'characterNuances',
    'characterClothing',
    'timeOfDay',
    'weather',
    'environmentSensoryDetails',
    'environmentDynamicEvents',
    'architecturalStyle',
    'ambientSound',
    'soundEffectsIntensity',
    'voiceStyle',
    'motionIntensity',
    'colorPalette',
  ] as const;
  return Object.fromEntries(
    keys.flatMap((key) => {
      const value = params[key];
      return typeof value === 'string' && value.trim() && !/^(any|none|auto)$/i.test(value.trim())
        ? [[key, value]]
        : [];
    }),
  );
};

/** Keep authored identity traits when the compact Studio subject replaces legacy fields. */
export const legacySubjectDescription = (params: Partial<PromptState>): string =>
  [
    ...new Set(
      [
        params.characterArchetype,
        params.characterAge,
        params.characterGender,
        params.characterEthnicity,
        params.characterSkinTone,
        params.characterSpecificClothing,
        params.characterAccessories,
        params.characterMood,
        params.characterPose,
        params.characterCameoTag,
      ].filter(
        (value): value is string =>
          typeof value === 'string' &&
          Boolean(value.trim()) &&
          !/^(any|none|auto)$/i.test(value.trim()),
      ),
    ),
  ].join(', ');
