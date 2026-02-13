/**
 * usePromptOptions Hook
 *
 * Extracts all memoized dropdown option lists from App.tsx.
 * These are pure derivations from the current language setting.
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
  const modelOptions = useMemo(() => getModelOptions(language), [language]);
  const artStyleOptions = useMemo(() => getArtStyles(language), [language]);
  const cameraMovementOptions = useMemo(() => getCameraMovements(language), [language]);
  const cameraDistanceOptions = useMemo(() => getCameraDistances(language), [language]);
  const lensTypeOptions = useMemo(() => getLensTypes(language), [language]);
  const visualEffectOptions = useMemo(() => getVisualEffects(language), [language]);
  const colorPaletteOptions = useMemo(() => getColorPalettes(language), [language]);
  const aspectRatioOptions = useMemo(() => getAspectRatios(language), [language]);
  const resolutionOptions = useMemo(() => getResolutionOptions(language), [language]);
  const animationPresetOptions = useMemo(() => getAnimationPresets(language), [language]);
  const voiceStyleOptions = useMemo(() => getVoiceStyles(language), [language]);
  const timeOfDayOptions = useMemo(() => getTimeOfDayOptions(language), [language]);
  const weatherOptions = useMemo(() => getWeatherOptions(language), [language]);
  const motionIntensityOptions = useMemo(() => getMotionIntensityOptions(language), [language]);
  const creativityLevelOptions = useMemo(() => getCreativityLevelOptions(language), [language]);
  const characterGenderOptions = useMemo(() => getCharacterGenders(language), [language]);
  const characterEthnicityOptions = useMemo(
    () => getCharacterEthnicityOptions(language),
    [language],
  );
  const characterClothingOptions = useMemo(() => getCharacterClothings(language), [language]);
  const characterArchetypeOptions = useMemo(() => getCharacterArchetypes(language), [language]);
  const characterAgeOptions = useMemo(() => getCharacterAges(language), [language]);
  const characterMoodOptions = useMemo(() => getCharacterMoods(language), [language]);
  const characterPoseOptions = useMemo(() => getCharacterPoses(language), [language]);
  const characterSkinToneOptions = useMemo(() => getCharacterSkinTones(language), [language]);
  const ambientSoundOptions = useMemo(() => getAmbientSounds(language), [language]);
  const soundEffectsIntensityOptions = useMemo(
    () => getSoundEffectsIntensity(language),
    [language],
  );
  const architecturalStyleOptions = useMemo(() => getArchitecturalStyles(language), [language]);
  const lightingStyleOptions = useMemo(() => getLightingStyles(language), [language]);
  const compositionalGuideOptions = useMemo(() => getCompositionalGuides(language), [language]);
  const examplePrompts = useMemo(() => getStaticInspirationPrompts(language), [language]);

  return {
    modelOptions,
    artStyleOptions,
    cameraMovementOptions,
    cameraDistanceOptions,
    lensTypeOptions,
    visualEffectOptions,
    colorPaletteOptions,
    aspectRatioOptions,
    resolutionOptions,
    animationPresetOptions,
    voiceStyleOptions,
    timeOfDayOptions,
    weatherOptions,
    motionIntensityOptions,
    creativityLevelOptions,
    characterGenderOptions,
    characterEthnicityOptions,
    characterClothingOptions,
    characterArchetypeOptions,
    characterAgeOptions,
    characterMoodOptions,
    characterPoseOptions,
    characterSkinToneOptions,
    ambientSoundOptions,
    soundEffectsIntensityOptions,
    architecturalStyleOptions,
    lightingStyleOptions,
    compositionalGuideOptions,
    examplePrompts,
  };
}
