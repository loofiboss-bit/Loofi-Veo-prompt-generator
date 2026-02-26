import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Language } from '@core/types';

vi.mock('@core/constants', () => {
  const makeGetter = (label: string) => (lang: string) => [
    { value: `${label}-1`, label: `${label} 1 (${lang})` },
    { value: `${label}-2`, label: `${label} 2 (${lang})` },
  ];
  return {
    getModelOptions: makeGetter('model'),
    getArtStyles: makeGetter('art'),
    getCameraMovements: makeGetter('camera-move'),
    getCameraDistances: makeGetter('camera-dist'),
    getLensTypes: makeGetter('lens'),
    getVisualEffects: makeGetter('visual'),
    getColorPalettes: makeGetter('color'),
    getAspectRatios: makeGetter('aspect'),
    getAnimationPresets: makeGetter('anim'),
    getVoiceStyles: makeGetter('voice'),
    getTimeOfDayOptions: makeGetter('time'),
    getWeatherOptions: makeGetter('weather'),
    getMotionIntensityOptions: makeGetter('motion'),
    getCreativityLevelOptions: makeGetter('creativity'),
    getCharacterGenders: makeGetter('gender'),
    getCharacterEthnicityOptions: makeGetter('ethnicity'),
    getCharacterClothings: makeGetter('clothing'),
    getCharacterArchetypes: makeGetter('archetype'),
    getCharacterAges: makeGetter('age'),
    getCharacterMoods: makeGetter('mood'),
    getCharacterPoses: makeGetter('pose'),
    getCharacterSkinTones: makeGetter('skin'),
    getAmbientSounds: makeGetter('ambient'),
    getSoundEffectsIntensity: makeGetter('sfx'),
    getStaticInspirationPrompts: makeGetter('prompt'),
    getResolutionOptions: makeGetter('resolution'),
    getArchitecturalStyles: makeGetter('arch-style'),
    getLightingStyles: makeGetter('lighting'),
    getCompositionalGuides: makeGetter('comp'),
  };
});

import { usePromptOptions } from './usePromptOptions';

describe('usePromptOptions', () => {
  it('should return all 29 option categories', () => {
    const { result } = renderHook(() => usePromptOptions('en'));

    const keys = Object.keys(result.current);
    expect(keys).toHaveLength(29);
  });

  it('should include expected option keys', () => {
    const { result } = renderHook(() => usePromptOptions('en'));

    expect(result.current.modelOptions).toBeDefined();
    expect(result.current.artStyleOptions).toBeDefined();
    expect(result.current.cameraMovementOptions).toBeDefined();
    expect(result.current.colorPaletteOptions).toBeDefined();
    expect(result.current.aspectRatioOptions).toBeDefined();
    expect(result.current.characterGenderOptions).toBeDefined();
    expect(result.current.examplePrompts).toBeDefined();
    expect(result.current.lightingStyleOptions).toBeDefined();
    expect(result.current.compositionalGuideOptions).toBeDefined();
  });

  it('should return arrays of options for each category', () => {
    const { result } = renderHook(() => usePromptOptions('en'));

    expect(Array.isArray(result.current.artStyleOptions)).toBe(true);
    expect(result.current.artStyleOptions.length).toBeGreaterThan(0);
    expect(result.current.artStyleOptions[0]).toHaveProperty('value');
    expect(result.current.artStyleOptions[0]).toHaveProperty('label');
  });

  it('should memoize results for same language', () => {
    const { result, rerender } = renderHook(
      ({ lang }: { lang: Language }) => usePromptOptions(lang),
      {
        initialProps: { lang: 'en' as Language },
      },
    );

    const first = result.current;
    rerender({ lang: 'en' });
    const second = result.current;

    expect(first).toBe(second);
  });

  it('should recompute when language changes', () => {
    const { result, rerender } = renderHook(
      ({ lang }: { lang: Language }) => usePromptOptions(lang),
      {
        initialProps: { lang: 'en' as Language },
      },
    );

    const firstLabel = result.current.artStyleOptions[0].label;
    rerender({ lang: 'sv' });
    const secondLabel = result.current.artStyleOptions[0].label;

    expect(firstLabel).toContain('(en)');
    expect(secondLabel).toContain('(sv)');
  });
});
