import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalLLMAdapter } from './LocalLLMAdapter';
import type { PromptState } from '@core/types';

vi.mock('../promptBuilder', () => ({
  interpolateVariables: vi.fn((text: string) => text),
}));

vi.mock('../loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

function baseState(): PromptState {
  return {
    idea: '',
    environment: '',
    environmentSensoryDetails: '',
    environmentDynamicEvents: '',
    architecturalStyle: '',
    characterActions: '',
    characterNuances: '',
    characterObjectInteraction: '',
    characterGender: 'Any',
    characterEthnicity: '',
    characterClothing: 'Any',
    characterArchetype: 'Any',
    characterAge: 'Any',
    characterMood: '',
    characterPose: '',
    characterSkinTone: '',
    characterSpecificClothing: '',
    characterAccessories: '',
    characterCameoTag: '',
    characterVisualDNA: '',
    characterFixedSeed: null,
    characterNegativePrompt: '',
    globalStyle: {
      description: '',
      strength: 0,
      isLocked: false,
    },
    timeOfDay: 'Any',
    weather: 'Any',
    voiceOver: '',
    voiceStyle: '',
    ambientSound: '',
    soundEffectsIntensity: '',
    negativePrompt: '',
    optimizeFor8Seconds: false,
    artStyle: '',
    customArtStyle: '',
    lightingStyle: 'Any',
    cameraMovement: '',
    cameraDistance: '',
    lensType: '',
    compositionalGuide: 'Any',
    visualEffect: 'None',
    colorPalette: '',
    aspectRatio: '16:9',
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
    model: 'veo',
    targetModel: 'local',
    veoModel: 'quality',
    spatialMotions: {},
  };
}

describe('LocalLLMAdapter', () => {
  let adapter: LocalLLMAdapter;

  beforeEach(() => {
    adapter = new LocalLLMAdapter();
    vi.clearAllMocks();
  });

  // ─── validateConstraints ──────────────────────────────────────
  describe('validateConstraints', () => {
    it('should return no warnings for a valid state with idea', () => {
      const state = baseState();
      state.idea = 'A dragon flying over mountains';
      const warnings = adapter.validateConstraints(state);
      expect(warnings).toEqual([]);
    });

    it('should warn when idea is empty', () => {
      const state = baseState();
      state.idea = '';
      const warnings = adapter.validateConstraints(state);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('detailed core idea');
    });

    it('should warn when idea is only whitespace', () => {
      const state = baseState();
      state.idea = '   ';
      const warnings = adapter.validateConstraints(state);
      expect(warnings.some((w) => w.includes('detailed core idea'))).toBe(true);
    });

    it('should warn when Google Search is enabled', () => {
      const state = baseState();
      state.idea = 'test';
      state.useGoogleSearch = true;
      const warnings = adapter.validateConstraints(state);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Google Search/Maps');
    });

    it('should warn when Google Maps is enabled', () => {
      const state = baseState();
      state.idea = 'test';
      state.useGoogleMaps = true;
      const warnings = adapter.validateConstraints(state);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Google Search/Maps');
    });

    it('should warn when thinking mode is enabled', () => {
      const state = baseState();
      state.idea = 'test';
      state.thinkingMode = true;
      const warnings = adapter.validateConstraints(state);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Thinking mode');
    });

    it('should return multiple warnings when applicable', () => {
      const state = baseState();
      state.idea = '';
      state.useGoogleSearch = true;
      state.thinkingMode = true;
      const warnings = adapter.validateConstraints(state);
      expect(warnings).toHaveLength(3);
    });
  });

  // ─── getEnhancements ──────────────────────────────────────
  describe('getEnhancements', () => {
    it('should return empty string for empty value', () => {
      expect(adapter.getEnhancements('artStyle', '')).toBe('');
    });

    it('should enhance cinematic art style', () => {
      const result = adapter.getEnhancements('artStyle', 'cinematic');
      expect(result).toContain('cinematic film quality');
      expect(result).toContain('color grading');
    });

    it('should enhance Cinematic Drama (case-insensitive)', () => {
      const result = adapter.getEnhancements('artStyle', 'Cinematic Drama');
      expect(result).toContain('cinematic film quality');
    });

    it('should enhance photorealistic art style', () => {
      const result = adapter.getEnhancements('artStyle', 'photorealistic');
      expect(result).toContain('ultra-realistic textures');
      expect(result).toContain('ray-traced');
    });

    it('should enhance anime art style', () => {
      const result = adapter.getEnhancements('artStyle', 'anime');
      expect(result).toContain('anime studio');
      expect(result).toContain('vibrant colors');
    });

    it('should return professional stabilized for cameraMovement', () => {
      const result = adapter.getEnhancements('cameraMovement', 'dolly zoom');
      expect(result).toContain('professional stabilized movement');
    });

    it('should return volumetric lighting for lightingStyle', () => {
      const result = adapter.getEnhancements('lightingStyle', 'soft');
      expect(result).toContain('volumetric lighting');
    });

    it('should return empty string for unknown key', () => {
      expect(adapter.getEnhancements('resolution', '4K')).toBe('');
    });
  });

  // ─── buildPrompt ──────────────────────────────────────────
  describe('buildPrompt', () => {
    it('should include [INSTRUCTION] section', () => {
      const state = baseState();
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[INSTRUCTION]');
      expect(prompt).toContain('Generate a detailed video generation prompt');
    });

    it('should use "A cinematic scene." as default when idea is empty', () => {
      const state = baseState();
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[SCENE] A cinematic scene.');
    });

    it('should include idea in SCENE section', () => {
      const state = baseState();
      state.idea = 'A dragon over mountains';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[SCENE] A dragon over mountains.');
    });

    it('should not double-terminate sentences', () => {
      const state = baseState();
      state.idea = 'A dragon over mountains.';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[SCENE] A dragon over mountains.');
      expect(prompt).not.toContain('..');
    });

    it('should include CHARACTER section for characterVisualDNA', () => {
      const state = baseState();
      state.idea = 'test';
      state.characterVisualDNA = 'A tall warrior with scarred face';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[CHARACTER] A tall warrior with scarred face');
    });

    it('should build CHARACTER from archetype/gender when no DNA', () => {
      const state = baseState();
      state.idea = 'test';
      state.characterArchetype = 'Hero';
      state.characterGender = 'Male';
      state.characterAge = 'Young Adult';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[CHARACTER] Hero, Male, Young Adult');
    });

    it('should include clothing with specific clothing detail', () => {
      const state = baseState();
      state.idea = 'test';
      state.characterArchetype = 'Hero';
      state.characterClothing = 'Formal';
      state.characterSpecificClothing = 'black tuxedo';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('Formal (black tuxedo)');
    });

    it('should include ACTION section for characterActions', () => {
      const state = baseState();
      state.idea = 'test';
      state.characterActions = 'running through the forest';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[ACTION] running through the forest');
    });

    it('should include STYLE section with enhancement', () => {
      const state = baseState();
      state.idea = 'test';
      state.artStyle = 'cinematic';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[STYLE] cinematic');
      expect(prompt).toContain('cinematic film quality');
    });

    it('should use customArtStyle when artStyle is Custom', () => {
      const state = baseState();
      state.idea = 'test';
      state.artStyle = 'Custom';
      state.customArtStyle = 'watercolor dreamscape';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[STYLE] watercolor dreamscape');
    });

    it('should include ENVIRONMENT section', () => {
      const state = baseState();
      state.idea = 'test';
      state.environment = 'dense tropical rainforest';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[ENVIRONMENT] dense tropical rainforest');
    });

    it('should include LIGHTING section with combined data', () => {
      const state = baseState();
      state.idea = 'test';
      state.timeOfDay = 'Golden Hour';
      state.weather = 'Foggy';
      state.lightingStyle = 'Dramatic';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[LIGHTING] Golden Hour, Foggy, Dramatic');
    });

    it('should skip lighting when all are Any', () => {
      const state = baseState();
      state.idea = 'test';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).not.toContain('[LIGHTING]');
    });

    it('should include CAMERA section', () => {
      const state = baseState();
      state.idea = 'test';
      state.cameraMovement = 'tracking shot';
      state.cameraDistance = 'Medium Close-Up';
      state.lensType = 'Telephoto';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[CAMERA]');
      expect(prompt).toContain('tracking shot');
      expect(prompt).toContain('Medium Close-Up');
      expect(prompt).toContain('Telephoto');
    });

    it('should include compositional guide in CAMERA when not Any', () => {
      const state = baseState();
      state.idea = 'test';
      state.compositionalGuide = 'Rule of Thirds';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('Composition: Rule of Thirds');
    });

    it('should include SPECS section', () => {
      const state = baseState();
      state.idea = 'test';
      state.resolution = '4K';
      state.aspectRatio = '16:9';
      state.visualEffect = 'Blur';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[SPECS]');
      expect(prompt).toContain('Resolution: 4K');
      expect(prompt).toContain('Aspect Ratio: 16:9');
      expect(prompt).toContain('Effect: Blur');
    });

    it('should skip visual effect None in SPECS', () => {
      const state = baseState();
      state.idea = 'test';
      state.resolution = '4K';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).not.toContain('Effect: None');
    });

    it('should include GLOBAL STYLE LOCK when style is locked', () => {
      const state = baseState();
      state.idea = 'test';
      state.globalStyle = { description: 'dark noir', strength: 80, isLocked: true };
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[GLOBAL STYLE LOCK]');
      expect(prompt).toContain('dark noir');
      expect(prompt).toContain('Strength: 80%');
    });

    it('should skip GLOBAL STYLE LOCK when not locked', () => {
      const state = baseState();
      state.idea = 'test';
      state.globalStyle = { description: 'dark noir', strength: 80, isLocked: false };
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).not.toContain('[GLOBAL STYLE LOCK]');
    });

    it('should include EXCLUDE section for negative prompts', () => {
      const state = baseState();
      state.idea = 'test';
      state.negativePrompt = 'blurry, low quality';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[EXCLUDE] blurry, low quality');
    });

    it('should merge negative prompts', () => {
      const state = baseState();
      state.idea = 'test';
      state.negativePrompt = 'blurry';
      state.characterNegativePrompt = 'disfigured';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[EXCLUDE] blurry, disfigured');
    });

    it('should add style inconsistency to EXCLUDE when global style locked', () => {
      const state = baseState();
      state.idea = 'test';
      state.globalStyle = { description: 'dark noir', strength: 80, isLocked: true };
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('style inconsistency');
    });

    it('should include SPATIAL section for spatial motions', () => {
      const state = baseState();
      state.idea = 'test';
      state.spatialMotions = { '1,1': 'pan left', '2,2': 'zoom in' };
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('[SPATIAL]');
      expect(prompt).toContain('Grid 1,1: pan left');
      expect(prompt).toContain('Grid 2,2: zoom in');
    });

    it('should skip SPATIAL when spatialMotions is empty', () => {
      const state = baseState();
      state.idea = 'test';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).not.toContain('[SPATIAL]');
    });

    it('should separate sections with double newlines', () => {
      const state = baseState();
      state.idea = 'Dragons';
      state.environment = 'Mountains';
      const prompt = adapter.buildPrompt(state, {});
      expect(prompt).toContain('\n\n');
    });
  });
});
