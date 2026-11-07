/**
 * usePromptOptions Hook
 *
 * Extracts all memoized dropdown option lists from App.tsx.
 * All options are pure derivations from the current language — a single
 * useMemo recomputes every list only when the language changes
 * (1 memo check instead of 29).
 */

import { useMemo } from 'react';
import {
  getModelOptions,
  getArtStyles,
  getCameraMovements,
  getCameraDistances,
  getLensTypes,
  getVisualEffects,
  getColorPalettes,
  getAspectRatios,
  getAnimationPresets,
  getVoiceStyles,
  getTimeOfDayOptions,
  getWeatherOptions,
  getMotionIntensityOptions,
  getCreativityLevelOptions,
  getCharacterGenders,
  getCharacterEthnicityOptions,
  getCharacterClothings,
  getCharacterArchetypes,
  getCharacterAges,
  getCharacterMoods,
  getCharacterPoses,
  getCharacterSkinTones,
  getAmbientSounds,
  getSoundEffectsIntensity,
  getStaticInspirationPrompts,
  getResolutionOptions,
  getArchitecturalStyles,
  getLightingStyles,
  getCompositionalGuides,
} from '@core/constants';
import type { Language } from '@core/types';

const SUPPORTED_DICTIONARY_LANGUAGES: readonly Language[] = ['en', 'sv', 'es', 'fr', 'de'] as const;

export function usePromptOptions(language: Language) {
  const safeLang: Language = SUPPORTED_DICTIONARY_LANGUAGES.includes(language) ? language : 'en';

  return useMemo(
    () => ({
      modelOptions: getModelOptions(language),
      artStyleOptions: getArtStyles(safeLang),
      cameraMovementOptions: getCameraMovements(safeLang),
      cameraDistanceOptions: getCameraDistances(safeLang),
      lensTypeOptions: getLensTypes(safeLang),
      visualEffectOptions: getVisualEffects(safeLang),
      colorPaletteOptions: getColorPalettes(safeLang),
      aspectRatioOptions: getAspectRatios(safeLang),
      resolutionOptions: getResolutionOptions(safeLang),
      animationPresetOptions: getAnimationPresets(safeLang),
      voiceStyleOptions: getVoiceStyles(safeLang),
      timeOfDayOptions: getTimeOfDayOptions(safeLang),
      weatherOptions: getWeatherOptions(safeLang),
      motionIntensityOptions: getMotionIntensityOptions(safeLang),
      creativityLevelOptions: getCreativityLevelOptions(safeLang),
      characterGenderOptions: getCharacterGenders(safeLang),
      characterEthnicityOptions: getCharacterEthnicityOptions(safeLang),
      characterClothingOptions: getCharacterClothings(safeLang),
      characterArchetypeOptions: getCharacterArchetypes(safeLang),
      characterAgeOptions: getCharacterAges(safeLang),
      characterMoodOptions: getCharacterMoods(safeLang),
      characterPoseOptions: getCharacterPoses(safeLang),
      characterSkinToneOptions: getCharacterSkinTones(safeLang),
      ambientSoundOptions: getAmbientSounds(safeLang),
      soundEffectsIntensityOptions: getSoundEffectsIntensity(safeLang),
      architecturalStyleOptions: getArchitecturalStyles(safeLang),
      lightingStyleOptions: getLightingStyles(safeLang),
      compositionalGuideOptions: getCompositionalGuides(safeLang),
      examplePrompts: getStaticInspirationPrompts(safeLang),
    }),
    [language, safeLang],
  );
}

export type PromptOptions = ReturnType<typeof usePromptOptions>;
