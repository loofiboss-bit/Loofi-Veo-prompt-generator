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

export function usePromptOptions(language: Language) {
  return useMemo(
    () => ({
      modelOptions: getModelOptions(language),
      artStyleOptions: getArtStyles(language),
      cameraMovementOptions: getCameraMovements(language),
      cameraDistanceOptions: getCameraDistances(language),
      lensTypeOptions: getLensTypes(language),
      visualEffectOptions: getVisualEffects(language),
      colorPaletteOptions: getColorPalettes(language),
      aspectRatioOptions: getAspectRatios(language),
      resolutionOptions: getResolutionOptions(language),
      animationPresetOptions: getAnimationPresets(language),
      voiceStyleOptions: getVoiceStyles(language),
      timeOfDayOptions: getTimeOfDayOptions(language),
      weatherOptions: getWeatherOptions(language),
      motionIntensityOptions: getMotionIntensityOptions(language),
      creativityLevelOptions: getCreativityLevelOptions(language),
      characterGenderOptions: getCharacterGenders(language),
      characterEthnicityOptions: getCharacterEthnicityOptions(language),
      characterClothingOptions: getCharacterClothings(language),
      characterArchetypeOptions: getCharacterArchetypes(language),
      characterAgeOptions: getCharacterAges(language),
      characterMoodOptions: getCharacterMoods(language),
      characterPoseOptions: getCharacterPoses(language),
      characterSkinToneOptions: getCharacterSkinTones(language),
      ambientSoundOptions: getAmbientSounds(language),
      soundEffectsIntensityOptions: getSoundEffectsIntensity(language),
      architecturalStyleOptions: getArchitecturalStyles(language),
      lightingStyleOptions: getLightingStyles(language),
      compositionalGuideOptions: getCompositionalGuides(language),
      examplePrompts: getStaticInspirationPrompts(language),
    }),
    [language],
  );
}
