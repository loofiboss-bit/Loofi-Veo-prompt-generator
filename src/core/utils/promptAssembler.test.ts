import { assemblePromptPreview } from './promptAssembler';
import type { PromptState } from '@core/types';

const base: PromptState = {
  idea: '',
  environment: '',
  environmentSensoryDetails: '',
  environmentDynamicEvents: '',
  architecturalStyle: '',
  characterActions: '',
  characterNuances: '',
  characterObjectInteraction: '',
  characterGender: '',
  characterEthnicity: '',
  characterClothing: '',
  characterArchetype: '',
  characterAge: '',
  characterMood: '',
  characterPose: '',
  characterSkinTone: '',
  characterSpecificClothing: '',
  characterAccessories: '',
  characterCameoTag: '',
  characterVisualDNA: '',
  characterFixedSeed: null,
  characterNegativePrompt: '',
  globalStyle: { description: '', strength: 50, isLocked: false },
  timeOfDay: '',
  weather: '',
  voiceOver: '',
  voiceStyle: '',
  ambientSound: '',
  soundEffectsIntensity: '',
  negativePrompt: '',
  optimizeFor8Seconds: false,
  artStyle: '',
  customArtStyle: '',
  lightingStyle: '',
  cameraMovement: '',
  cameraDistance: '',
  lensType: '',
  compositionalGuide: '',
  visualEffect: '',
  colorPalette: '',
  aspectRatio: '',
  resolution: '',
  animationPreset: '',
  motionIntensity: '',
  creativityLevel: '',
  includeOverlayText: false,
  overlayTextContent: '',
  useGoogleSearch: false,
  useGoogleMaps: false,
  generateAsSeries: false,
  thinkingMode: false,
  thinkingBudget: 0,
  youtubeUrl: '',
  imageStudioPrompt: '',
  uploadedImage: null,
  uploadedAudio: null,
  audioMix: { voice: 50, ambient: 50, sfx: 50 },
  useImageAsCameo: false,
  language: 'en',
  model: '',
  targetModel: 'veo',
  veoModel: 'fast',
  spatialMotions: {},
  style: '',
  mood: '',
  setting: '',
} as unknown as PromptState;

it('returns empty string when idea is blank', () => {
  expect(assemblePromptPreview({ ...base, idea: '' })).toBe('');
});

it('returns empty string for whitespace-only idea', () => {
  expect(assemblePromptPreview({ ...base, idea: '   ' })).toBe('');
});

it('includes idea in output', () => {
  const result = assemblePromptPreview({ ...base, idea: 'A sunset over mountains' });
  expect(result).toContain('A sunset over mountains');
});

it('includes artStyle when provided', () => {
  const result = assemblePromptPreview({ ...base, idea: 'Test', artStyle: 'cinematic' });
  expect(result).toContain('cinematic');
});

it('falls back to customArtStyle when artStyle is empty', () => {
  const result = assemblePromptPreview({
    ...base,
    idea: 'Test',
    artStyle: '',
    customArtStyle: 'watercolor',
  });
  expect(result).toContain('watercolor');
});

it('includes cameraMovement when provided', () => {
  const result = assemblePromptPreview({ ...base, idea: 'Dragon', cameraMovement: 'dolly in' });
  expect(result).toContain('dolly in');
});

it('includes timeOfDay and weather', () => {
  const result = assemblePromptPreview({
    ...base,
    idea: 'Scene',
    timeOfDay: 'dusk',
    weather: 'foggy',
  });
  expect(result).toContain('dusk');
  expect(result).toContain('foggy');
});

it('includes aspect ratio', () => {
  const result = assemblePromptPreview({ ...base, idea: 'Scene', aspectRatio: '16:9' });
  expect(result).toContain('16:9');
});
