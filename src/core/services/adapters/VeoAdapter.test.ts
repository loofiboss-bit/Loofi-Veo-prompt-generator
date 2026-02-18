import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VeoAdapter } from './VeoAdapter';
import type { PromptState } from '@core/types';
import { interpolateVariables } from '../promptBuilder';

// Mock promptBuilder
vi.mock('../promptBuilder', () => ({
  interpolateVariables: vi.fn((text: string) => text),
}));

// Mock logger service
vi.mock('../loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

/**
 * Helper function to create a minimal valid PromptState
 */
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
    targetModel: 'veo',
    veoModel: 'quality',
    spatialMotions: {},
  };
}

describe('VeoAdapter', () => {
  let adapter: VeoAdapter;

  beforeEach(() => {
    adapter = new VeoAdapter();
    vi.clearAllMocks();
  });

  // ─── validateConstraints ──────────────────────────────────────
  describe('validateConstraints', () => {
    it('should return no warnings for 16:9 aspect ratio', () => {
      const state = baseState();
      state.aspectRatio = '16:9';

      const warnings = adapter.validateConstraints(state);

      expect(warnings).toEqual([]);
    });

    it('should return no warnings for 9:16 aspect ratio', () => {
      const state = baseState();
      state.aspectRatio = '9:16';

      const warnings = adapter.validateConstraints(state);

      expect(warnings).toEqual([]);
    });

    it('should return warning for 1:1 aspect ratio', () => {
      const state = baseState();
      state.aspectRatio = '1:1';

      const warnings = adapter.validateConstraints(state);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toBe(
        'Veo is optimized for 16:9 and 9:16. Other ratios may result in cropping.',
      );
    });

    it('should return warning for 4:3 aspect ratio', () => {
      const state = baseState();
      state.aspectRatio = '4:3';

      const warnings = adapter.validateConstraints(state);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Veo is optimized for 16:9 and 9:16');
    });

    it('should return warning for 21:9 aspect ratio', () => {
      const state = baseState();
      state.aspectRatio = '21:9';

      const warnings = adapter.validateConstraints(state);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('may result in cropping');
    });
  });

  // ─── getEnhancements ──────────────────────────────────────
  describe('getEnhancements', () => {
    it('should return empty string for empty value', () => {
      const result = adapter.getEnhancements('artStyle', '');

      expect(result).toBe('');
    });

    it('should return empty string for null-like value', () => {
      const result = adapter.getEnhancements('artStyle', '');

      expect(result).toBe('');
    });

    describe('artStyle enhancements', () => {
      it('should enhance cinematic art style (lowercase)', () => {
        const result = adapter.getEnhancements('artStyle', 'cinematic');

        expect(result).toContain('IMAX digital quality');
        expect(result).toContain('35mm film stock');
        expect(result).toContain('Arri Alexa');
      });

      it('should enhance Cinematic art style (mixed case)', () => {
        const result = adapter.getEnhancements('artStyle', 'Cinematic Drama');

        expect(result).toContain('IMAX digital quality');
      });

      it('should enhance photorealistic art style', () => {
        const result = adapter.getEnhancements('artStyle', 'photorealistic');

        expect(result).toContain('8k raw photography');
        expect(result).toContain('ultra-realistic textures');
        expect(result).toContain('ray-traced reflections');
      });

      it('should enhance anime art style', () => {
        const result = adapter.getEnhancements('artStyle', 'anime');

        expect(result).toContain('High-budget studio');
        expect(result).toContain('Makoto Shinkai');
        expect(result).toContain('cell shading');
      });

      it('should enhance vintage art style', () => {
        const result = adapter.getEnhancements('artStyle', 'vintage');

        expect(result).toContain('Authentic period film stock');
        expect(result).toContain('color bleed');
        expect(result).toContain('analog saturation');
      });

      it('should enhance found footage art style', () => {
        const result = adapter.getEnhancements('artStyle', 'found footage');

        expect(result).toContain('Handheld camcorder');
        expect(result).toContain('damaged film grain');
        expect(result).toContain('light leaks');
      });

      it('should return empty string for unrecognized art style', () => {
        const result = adapter.getEnhancements('artStyle', 'abstract expressionism');

        expect(result).toBe('');
      });
    });

    describe('cameraMovement enhancements', () => {
      it('should enhance any camera movement', () => {
        const result = adapter.getEnhancements('cameraMovement', 'dolly zoom');

        expect(result).toContain('Professional stabilization');
        expect(result).toContain('cinematic velocity curves');
        expect(result).toContain('parallax effect');
      });

      it('should enhance pan camera movement', () => {
        const result = adapter.getEnhancements('cameraMovement', 'pan left to right');

        expect(result).toContain('Professional stabilization');
      });
    });

    describe('lightingStyle enhancements', () => {
      it('should enhance any lighting style', () => {
        const result = adapter.getEnhancements('lightingStyle', 'dramatic lighting');

        expect(result).toContain('Volumetric fog effects');
        expect(result).toContain('subsurface scattering');
        expect(result).toContain('physically based light falloff');
      });

      it('should enhance soft lighting', () => {
        const result = adapter.getEnhancements('lightingStyle', 'soft light');

        expect(result).toContain('high contrast ratios');
      });
    });

    describe('visualEffect enhancements', () => {
      it('should return empty string for "None" visual effect', () => {
        const result = adapter.getEnhancements('visualEffect', 'None');

        expect(result).toBe('');
      });

      it('should enhance non-None visual effect', () => {
        const result = adapter.getEnhancements('visualEffect', 'Lens Flare');

        expect(result).toContain('Integrated via optical simulation');
        expect(result).toContain('consistent with scene lighting');
      });

      it('should enhance particle effects', () => {
        const result = adapter.getEnhancements('visualEffect', 'Particle Effects');

        expect(result).toContain('optical simulation');
      });
    });

    describe('characterClothing enhancements', () => {
      it('should enhance any character clothing', () => {
        const result = adapter.getEnhancements('characterClothing', 'formal suit');

        expect(result).toContain('High-resolution fabric weave');
        expect(result).toContain('realistic cloth physics');
        expect(result).toContain('tangible material weight');
      });

      it('should enhance casual clothing', () => {
        const result = adapter.getEnhancements('characterClothing', 'casual wear');

        expect(result).toContain('accurate draping');
      });
    });

    describe('environment enhancements', () => {
      it('should enhance any environment', () => {
        const result = adapter.getEnhancements('environment', 'urban street');

        expect(result).toContain('Richly populated background');
        expect(result).toContain('atmospheric depth');
        expect(result).toContain('photogrammetry-level texture');
      });

      it('should enhance forest environment', () => {
        const result = adapter.getEnhancements('environment', 'dense forest');

        expect(result).toContain('ambient occlusion');
      });
    });

    describe('lensType enhancements', () => {
      it('should enhance Macro lens type', () => {
        const result = adapter.getEnhancements('lensType', 'Macro 100mm');

        expect(result).toContain('Extremely shallow depth of field');
        expect(result).toContain('sharp focus plane');
        expect(result).toContain('smooth creamy bokeh');
      });

      it('should enhance Anamorphic lens type', () => {
        const result = adapter.getEnhancements('lensType', 'Anamorphic 50mm');

        expect(result).toContain('Oval bokeh');
        expect(result).toContain('horizontal lens flares');
        expect(result).toContain('cinematic aspect ratio');
      });

      it('should return empty string for standard lens', () => {
        const result = adapter.getEnhancements('lensType', 'Standard 50mm');

        expect(result).toBe('');
      });

      it('should return empty string for wide angle lens', () => {
        const result = adapter.getEnhancements('lensType', 'Wide Angle 24mm');

        expect(result).toBe('');
      });
    });
  });

  // ─── buildPrompt ──────────────────────────────────────
  describe('buildPrompt', () => {
    beforeEach(() => {
      // Mock interpolateVariables to return the input text unchanged by default
      vi.mocked(interpolateVariables).mockImplementation((text: string) => text);
    });

    it('should build prompt with minimal state (only idea)', () => {
      const state = baseState();
      state.idea = 'A cat walking across a field';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('A cat walking across a field.');
      expect(interpolateVariables).toHaveBeenCalledWith('A cat walking across a field', {});
    });

    it('should add period to idea if missing', () => {
      const state = baseState();
      state.idea = 'A dog running';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('A dog running.');
    });

    it('should use default text when idea is empty', () => {
      const state = baseState();
      state.idea = '';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('A cinematic scene.');
    });

    it('should not add extra period if idea already has punctuation', () => {
      const state = baseState();
      state.idea = 'An exciting scene!';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('An exciting scene!');
      expect(prompt).not.toContain('scene!.');
    });

    it('should include character actions when provided', () => {
      const state = baseState();
      state.idea = 'A hero stands';
      state.characterActions = 'Drawing a sword and preparing to fight';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Action: Drawing a sword and preparing to fight');
    });

    it('should include art style with enhancements', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.artStyle = 'Cinematic';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Style: Cinematic');
      expect(prompt).toContain('IMAX digital quality');
    });

    it('should use custom art style when artStyle is Custom', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.artStyle = 'Custom';
      state.customArtStyle = 'Hand-painted watercolor';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Style: Hand-painted watercolor');
      expect(prompt).not.toContain('Style: Custom');
    });

    it('should include environment with enhancements', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.environment = 'Abandoned warehouse';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Setting: Abandoned warehouse');
      expect(prompt).toContain('Richly populated background');
    });

    it('should include character visual DNA when provided', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.characterVisualDNA = 'Tall male, brown hair, blue eyes, scar on left cheek';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('CHARACTER APPEARANCE (VISUAL DNA)');
      expect(prompt).toContain('Tall male, brown hair, blue eyes, scar on left cheek');
    });

    it('should use standard character fields when visual DNA is not provided', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.characterArchetype = 'Warrior';
      state.characterGender = 'Male';
      state.characterAge = '30s';
      state.characterClothing = 'Armor';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Character: Warrior, Male, 30s, Armor');
    });

    it('should include specific clothing details with enhancements', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.characterArchetype = 'Knight';
      state.characterClothing = 'Medieval Armor';
      state.characterSpecificClothing = 'chainmail with red cape';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Medieval Armor (chainmail with red cape)');
      expect(prompt).toContain('High-resolution fabric weave');
    });

    it('should skip character section when all character fields are "Any"', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.characterArchetype = 'Any';
      state.characterGender = 'Any';
      state.characterClothing = 'Any';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).not.toContain('Character:');
    });

    it('should include lighting and atmosphere when provided', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.timeOfDay = 'Golden Hour';
      state.weather = 'Foggy';
      state.lightingStyle = 'Dramatic backlight';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Lighting/Atmosphere: Golden Hour, Foggy, Dramatic backlight');
      expect(prompt).toContain('Volumetric fog effects');
    });

    it('should skip lighting section when all fields are "Any"', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.timeOfDay = 'Any';
      state.weather = 'Any';
      state.lightingStyle = 'Any';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).not.toContain('Lighting/Atmosphere:');
    });

    it('should include cinematography with camera movement, distance, lens, and composition', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.cameraMovement = 'Slow dolly forward';
      state.cameraDistance = 'Medium Shot';
      state.lensType = 'Anamorphic 50mm';
      state.compositionalGuide = 'Rule of Thirds';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Cinematography:');
      expect(prompt).toContain('Slow dolly forward');
      expect(prompt).toContain('Medium Shot');
      expect(prompt).toContain('Anamorphic 50mm');
      expect(prompt).toContain('Composition: Rule of Thirds');
      expect(prompt).toContain('Oval bokeh');
    });

    it('should skip cinematography section when all fields are empty', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.cameraMovement = '';
      state.cameraDistance = '';
      state.lensType = '';
      state.compositionalGuide = 'Any';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).not.toContain('Cinematography:');
    });

    it('should include technical specs with resolution, aspect ratio, and visual effects', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.resolution = '4K';
      state.aspectRatio = '21:9';
      state.visualEffect = 'Lens Flare';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Technical Specs:');
      expect(prompt).toContain('Resolution: 4K');
      expect(prompt).toContain('Aspect Ratio: 21:9');
      expect(prompt).toContain('Effect: Lens Flare');
      expect(prompt).toContain('optical simulation');
    });

    it('should skip visual effect when set to "None"', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.resolution = '4K';
      state.visualEffect = 'None';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Resolution: 4K');
      expect(prompt).not.toContain('Effect:');
    });

    it('should include negative prompts when provided', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.negativePrompt = 'blurry, low quality';
      state.characterNegativePrompt = 'deformed hands, extra fingers';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain(
        'Negative Prompt (Exclude): blurry, low quality, deformed hands, extra fingers',
      );
    });

    it('should add style consistency negative prompt when global style is locked', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.globalStyle = {
        description: 'Noir detective aesthetic with high contrast shadows',
        strength: 85,
        isLocked: true,
      };

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Negative Prompt (Exclude)');
      expect(prompt).toContain('style inconsistency');
      expect(prompt).toContain('varying art styles');
      expect(prompt).toContain('deviation from project look');
    });

    it('should include global style directive when locked', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.globalStyle = {
        description: 'Noir detective aesthetic with high contrast shadows',
        strength: 85,
        isLocked: true,
      };

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('PROJECT VISUAL STYLE (STRICT)');
      expect(prompt).toContain('Noir detective aesthetic');
      expect(prompt).toContain('Consistency Strength: 85%');
      expect(prompt).toContain('matches this specific visual aesthetic exactly');
    });

    it('should not include global style when not locked', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.globalStyle = {
        description: 'Some style description',
        strength: 50,
        isLocked: false,
      };

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).not.toContain('PROJECT VISUAL STYLE');
    });

    it('should not include global style when description is empty', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.globalStyle = {
        description: '',
        strength: 85,
        isLocked: true,
      };

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).not.toContain('PROJECT VISUAL STYLE');
    });

    it('should include spatial motions when provided', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.spatialMotions = {
        A1: 'Move left',
        B2: 'Zoom in',
        C3: 'Rotate clockwise',
      };

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Spatial Directives:');
      expect(prompt).toContain('Grid A1: Move left');
      expect(prompt).toContain('Grid B2: Zoom in');
      expect(prompt).toContain('Grid C3: Rotate clockwise');
    });

    it('should not include spatial directives when empty', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.spatialMotions = {};

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).not.toContain('Spatial Directives');
    });

    it('should interpolate variables in idea field', () => {
      const state = baseState();
      state.idea = 'A {{HERO}} saves the {{LOCATION}}';

      vi.mocked(interpolateVariables).mockImplementation(
        (text: string, vars: Record<string, string>) => {
          if (text.includes('{{HERO}}')) {
            return text.replace('{{HERO}}', vars['HERO']).replace('{{LOCATION}}', vars['LOCATION']);
          }
          return text;
        },
      );

      adapter.buildPrompt(state, { HERO: 'knight', LOCATION: 'kingdom' });

      expect(interpolateVariables).toHaveBeenCalledWith('A {{HERO}} saves the {{LOCATION}}', {
        HERO: 'knight',
        LOCATION: 'kingdom',
      });
    });

    it('should interpolate variables in environment field', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.environment = 'The streets of {{CITY}}';

      adapter.buildPrompt(state, { CITY: 'Paris' });

      expect(interpolateVariables).toHaveBeenCalledWith('The streets of {{CITY}}', {
        CITY: 'Paris',
      });
    });

    it('should interpolate variables in characterActions field', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.characterActions = 'Running towards {{TARGET}}';

      adapter.buildPrompt(state, { TARGET: 'the exit' });

      expect(interpolateVariables).toHaveBeenCalledWith('Running towards {{TARGET}}', {
        TARGET: 'the exit',
      });
    });

    it('should interpolate variables in characterVisualDNA field', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.characterVisualDNA = '{{AGE}} year old with {{FEATURE}}';

      adapter.buildPrompt(state, { AGE: '25', FEATURE: 'red hair' });

      expect(interpolateVariables).toHaveBeenCalledWith('{{AGE}} year old with {{FEATURE}}', {
        AGE: '25',
        FEATURE: 'red hair',
      });
    });

    it('should build complete prompt with all fields populated', () => {
      const state = baseState();
      state.idea = 'A warrior prepares for battle';
      state.characterActions = 'Drawing weapon and assuming combat stance';
      state.artStyle = 'Cinematic';
      state.environment = 'Ancient battlefield at dawn';
      state.characterArchetype = 'Warrior';
      state.characterGender = 'Female';
      state.characterAge = '30s';
      state.characterClothing = 'Battle Armor';
      state.characterSpecificClothing = 'scarred plate armor with clan insignia';
      state.timeOfDay = 'Dawn';
      state.weather = 'Misty';
      state.lightingStyle = 'Dramatic side light';
      state.cameraMovement = 'Slow push in';
      state.cameraDistance = 'Medium Close-Up';
      state.lensType = 'Anamorphic 85mm';
      state.compositionalGuide = 'Center Frame';
      state.resolution = '4K';
      state.aspectRatio = '2.39:1';
      state.visualEffect = 'Atmospheric Dust';
      state.negativePrompt = 'blurry, low quality';
      state.characterNegativePrompt = 'modern clothing';
      state.spatialMotions = { A1: 'Tilt up slowly' };
      state.globalStyle = {
        description: 'Epic medieval fantasy with muted earth tones',
        strength: 90,
        isLocked: true,
      };

      const prompt = adapter.buildPrompt(state, {});

      // Verify all major sections are present
      expect(prompt).toContain('PROJECT VISUAL STYLE (STRICT)');
      expect(prompt).toContain('A warrior prepares for battle.');
      expect(prompt).toContain('Action: Drawing weapon');
      expect(prompt).toContain('Style: Cinematic');
      expect(prompt).toContain('Setting: Ancient battlefield');
      expect(prompt).toContain('Character: Warrior, Female, 30s');
      expect(prompt).toContain('Battle Armor (scarred plate armor');
      expect(prompt).toContain('Lighting/Atmosphere: Dawn, Misty');
      expect(prompt).toContain('Cinematography: Slow push in');
      expect(prompt).toContain('Technical Specs: Resolution: 4K');
      expect(prompt).toContain('Negative Prompt (Exclude)');
      expect(prompt).toContain('Spatial Directives: Grid A1: Tilt up slowly');

      // Verify enhancements are applied
      expect(prompt).toContain('IMAX digital quality');
      expect(prompt).toContain('Oval bokeh');
      expect(prompt).toContain('Volumetric fog');
      expect(prompt).toContain('style inconsistency');
    });

    it('should separate sections with double newlines', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.environment = 'A room';
      state.artStyle = 'Photorealistic';

      const prompt = adapter.buildPrompt(state, {});

      // Check that sections are separated by \n\n
      expect(prompt).toMatch(/A scene\.\n\n/);
      expect(prompt).toMatch(/Style: Photorealistic.*\n\n/);
    });
  });
});
