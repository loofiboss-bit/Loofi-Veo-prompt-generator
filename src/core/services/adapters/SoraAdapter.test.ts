import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoraAdapter } from './SoraAdapter';
import type { PromptState } from '@core/types';
import { interpolateVariables } from '../promptBuilder';

// Mock promptBuilder
vi.mock('../promptBuilder', () => ({
  interpolateVariables: vi.fn((text: string) => text),
}));

// Mock translations
vi.mock('@core/constants/translations', () => ({
  soraPromptTemplate: {
    en: 'Create a highly realistic video of: {idea}\n\nParameters:\n{parameterList}',
    sv: 'Skapa en mycket realistisk video av: {idea}\n\nParametrar:\n{parameterList}',
    es: 'Crea un video altamente realista de: {idea}\n\nParámetros:\n{parameterList}',
    fr: 'Créez une vidéo très réaliste de : {idea}\n\nParamètres :\n{parameterList}',
    de: 'Erstellen Sie ein sehr realistisches Video von: {idea}\n\nParameter:\n{parameterList}',
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
    cameraMovement: 'Static shot',
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
    model: 'sora',
    targetModel: 'sora',
    veoModel: 'quality',
    spatialMotions: {},
  };
}

describe('SoraAdapter', () => {
  let adapter: SoraAdapter;

  beforeEach(() => {
    adapter = new SoraAdapter();
    vi.clearAllMocks();
  });

  // ─── validateConstraints ──────────────────────────────────────
  describe('validateConstraints', () => {
    it('should return warning for Imaginative creativity level', () => {
      const state = baseState();
      state.creativityLevel = 'Imaginative';

      const warnings = adapter.validateConstraints(state);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toBe(
        "Sora performs best with 'Grounded' or 'Balanced' creativity for physics simulation.",
      );
    });

    it('should return no warnings for Grounded creativity level', () => {
      const state = baseState();
      state.creativityLevel = 'Grounded';

      const warnings = adapter.validateConstraints(state);

      expect(warnings).toEqual([]);
    });

    it('should return no warnings for Balanced creativity level', () => {
      const state = baseState();
      state.creativityLevel = 'Balanced';

      const warnings = adapter.validateConstraints(state);

      expect(warnings).toEqual([]);
    });

    it('should return no warnings for empty creativity level', () => {
      const state = baseState();
      state.creativityLevel = '';

      const warnings = adapter.validateConstraints(state);

      expect(warnings).toEqual([]);
    });

    it('should return no warnings for undefined creativity level value', () => {
      const state = baseState();
      state.creativityLevel = 'Something Else';

      const warnings = adapter.validateConstraints(state);

      expect(warnings).toEqual([]);
    });
  });

  // ─── getEnhancements ──────────────────────────────────────
  describe('getEnhancements', () => {
    it('should return enhancement text for environmentDynamicEvents with value', () => {
      const result = adapter.getEnhancements('environmentDynamicEvents', 'water flowing');

      expect(result).toBe(' (Ensure causal consistency and fluid dynamics)');
    });

    it('should return empty string for environmentDynamicEvents with empty value', () => {
      const result = adapter.getEnhancements('environmentDynamicEvents', '');

      expect(result).toBe('');
    });

    it('should return empty string for environmentDynamicEvents with falsy value', () => {
      const result = adapter.getEnhancements('environmentDynamicEvents', '');

      expect(result).toBe('');
    });

    it('should return empty string for other keys with value', () => {
      const result = adapter.getEnhancements('artStyle', 'Cinematic');

      expect(result).toBe('');
    });

    it('should return empty string for other keys with empty value', () => {
      const result = adapter.getEnhancements('environment', '');

      expect(result).toBe('');
    });

    it('should return empty string for idea key', () => {
      const result = adapter.getEnhancements('idea', 'A great idea');

      expect(result).toBe('');
    });

    it('should return empty string for characterActions key', () => {
      const result = adapter.getEnhancements('characterActions', 'Running fast');

      expect(result).toBe('');
    });
  });

  // ─── buildPrompt ──────────────────────────────────────
  describe('buildPrompt', () => {
    beforeEach(() => {
      // Mock interpolateVariables to return the input text unchanged by default
      vi.mocked(interpolateVariables).mockImplementation((text: string) => text);
    });

    it('should use English template by default', () => {
      const state = baseState();
      state.idea = 'A cat walks across the field';
      state.language = 'en';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Create a highly realistic video of:');
      expect(prompt).toContain('A cat walks across the field');
      expect(prompt).toContain('Parameters:');
    });

    it('should use Swedish template when language is sv', () => {
      const state = baseState();
      state.idea = 'En katt går över fältet';
      state.language = 'sv';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Skapa en mycket realistisk video av:');
      expect(prompt).toContain('En katt går över fältet');
      expect(prompt).toContain('Parametrar:');
    });

    it('should use Spanish template when language is es', () => {
      const state = baseState();
      state.idea = 'Un gato camina por el campo';
      state.language = 'es';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Crea un video altamente realista de:');
      expect(prompt).toContain('Un gato camina por el campo');
      expect(prompt).toContain('Parámetros:');
    });

    it('should use French template when language is fr', () => {
      const state = baseState();
      state.idea = 'Un chat marche à travers le champ';
      state.language = 'fr';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Créez une vidéo très réaliste de :');
      expect(prompt).toContain('Un chat marche à travers le champ');
      expect(prompt).toContain('Paramètres :');
    });

    it('should use German template when language is de', () => {
      const state = baseState();
      state.idea = 'Eine Katze läuft über das Feld';
      state.language = 'de';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Erstellen Sie ein sehr realistisches Video von:');
      expect(prompt).toContain('Eine Katze läuft über das Feld');
      expect(prompt).toContain('Parameter:');
    });

    it('should fallback to English template for unsupported language', () => {
      const state = baseState();
      state.idea = 'A scene';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing unsupported language fallback
      state.language = 'jp' as any;

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Create a highly realistic video of:');
      expect(prompt).toContain('Parameters:');
    });

    it('should use fallback template when template is undefined', () => {
      const state = baseState();
      state.idea = 'A space station orbiting Earth';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing undefined language fallback
      state.language = undefined as any;

      const prompt = adapter.buildPrompt(state, {});

      // Should use fallback hardcoded template
      expect(prompt).toContain('Create a physics-compliant video simulation of:');
      expect(prompt).toContain('A space station orbiting Earth');
      expect(prompt).toContain('photorealism');
      expect(prompt).toContain('causal consistency');
    });

    it('should include environment in parameter list', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.environment = 'Abandoned warehouse with broken windows';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Environment: Abandoned warehouse with broken windows');
    });

    it('should include timeOfDay when not "Any"', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.timeOfDay = 'Golden Hour';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Time: Golden Hour');
    });

    it('should exclude timeOfDay when set to "Any"', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.timeOfDay = 'Any';
      state.environment = 'A park';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).not.toContain('Time:');
      expect(prompt).toContain('Environment: A park');
    });

    it('should include weather when not "Any"', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.weather = 'Stormy';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Weather: Stormy');
    });

    it('should exclude weather when set to "Any"', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.weather = 'Any';
      state.environment = 'A beach';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).not.toContain('Weather:');
    });

    it('should include artStyle when provided', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.artStyle = 'Cinematic';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Visual Style: Cinematic');
    });

    it('should exclude artStyle when empty', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.artStyle = '';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).not.toContain('Visual Style:');
    });

    it('should include cameraMovement when not "Static shot"', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.cameraMovement = 'Slow dolly forward';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Camera: Slow dolly forward');
    });

    it('should exclude cameraMovement when set to "Static shot"', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.cameraMovement = 'Static shot';
      state.environment = 'A room';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).not.toContain('Camera:');
    });

    it('should include motionIntensity when provided', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.motionIntensity = 'High energy';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Motion: High energy');
    });

    it('should include environmentDynamicEvents when provided', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.environmentDynamicEvents = 'Water flowing, leaves rustling';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Dynamics: Water flowing, leaves rustling');
    });

    it('should include environmentSensoryDetails when provided', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.environmentSensoryDetails = 'Misty atmosphere, soft light filtering through trees';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Sensory: Misty atmosphere, soft light filtering through trees');
    });

    it('should include spatialMotions when provided', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.spatialMotions = {
        A1: 'Pan left',
        B2: 'Zoom in',
        C3: 'Tilt down',
      };

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Spatial Directives:');
      expect(prompt).toContain('"A1":"Pan left"');
      expect(prompt).toContain('"B2":"Zoom in"');
      expect(prompt).toContain('"C3":"Tilt down"');
    });

    it('should exclude spatialMotions when empty', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.spatialMotions = {};

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).not.toContain('Spatial Directives:');
    });

    it('should filter out empty parameters from parameter list', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.environment = 'A room';
      state.timeOfDay = 'Any';
      state.weather = 'Any';
      state.artStyle = '';
      state.cameraMovement = 'Static shot';
      state.motionIntensity = '';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Environment: A room');
      expect(prompt).not.toContain('Time:');
      expect(prompt).not.toContain('Weather:');
      expect(prompt).not.toContain('Visual Style:');
      expect(prompt).not.toContain('Camera:');
      expect(prompt).not.toContain('Motion:');
    });

    it('should interpolate variables in idea field', () => {
      const state = baseState();
      state.idea = 'A {{HERO}} saves the {{LOCATION}}';

      vi.mocked(interpolateVariables).mockImplementation(
        (text: string, vars: Record<string, string>) => {
          if (text.includes('{{HERO}}')) {
            return text
              .replace('{{HERO}}', vars['HERO'] || '')
              .replace('{{LOCATION}}', vars['LOCATION'] || '');
          }
          return text;
        },
      );

      adapter.buildPrompt(state, { HERO: 'knight', LOCATION: 'castle' });

      expect(interpolateVariables).toHaveBeenCalledWith('A {{HERO}} saves the {{LOCATION}}', {
        HERO: 'knight',
        LOCATION: 'castle',
      });
    });

    it('should interpolate variables in environment field', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.environment = 'The streets of {{CITY}} at night';

      adapter.buildPrompt(state, { CITY: 'Tokyo' });

      expect(interpolateVariables).toHaveBeenCalledWith('The streets of {{CITY}} at night', {
        CITY: 'Tokyo',
      });
    });

    it('should interpolate variables in characterActions field', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.characterActions = 'Running towards the {{DESTINATION}}';

      adapter.buildPrompt(state, { DESTINATION: 'exit' });

      expect(interpolateVariables).toHaveBeenCalledWith('Running towards the {{DESTINATION}}', {
        DESTINATION: 'exit',
      });
    });

    it('should build complete prompt with all parameters', () => {
      const state = baseState();
      state.idea = 'A warrior prepares for battle';
      state.environment = 'Ancient battlefield at dawn';
      state.timeOfDay = 'Dawn';
      state.weather = 'Misty';
      state.artStyle = 'Cinematic';
      state.cameraMovement = 'Slow push in';
      state.motionIntensity = 'Moderate';
      state.environmentDynamicEvents = 'Fog rolling in, banners fluttering';
      state.environmentSensoryDetails = 'Cold air, distant war drums';
      state.spatialMotions = { A1: 'Tilt up' };

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('A warrior prepares for battle');
      expect(prompt).toContain('Environment: Ancient battlefield at dawn');
      expect(prompt).toContain('Time: Dawn');
      expect(prompt).toContain('Weather: Misty');
      expect(prompt).toContain('Visual Style: Cinematic');
      expect(prompt).toContain('Camera: Slow push in');
      expect(prompt).toContain('Motion: Moderate');
      expect(prompt).toContain('Dynamics: Fog rolling in, banners fluttering');
      expect(prompt).toContain('Sensory: Cold air, distant war drums');
      expect(prompt).toContain('Spatial Directives:');
      expect(prompt).toContain('"A1":"Tilt up"');
    });

    it('should not mutate original state', () => {
      const state = baseState();
      state.idea = 'Original idea';
      state.environment = 'Original environment';
      state.characterActions = 'Original actions';

      const originalIdea = state.idea;
      const originalEnvironment = state.environment;
      const originalCharacterActions = state.characterActions;

      adapter.buildPrompt(state, {});

      expect(state.idea).toBe(originalIdea);
      expect(state.environment).toBe(originalEnvironment);
      expect(state.characterActions).toBe(originalCharacterActions);
    });

    it('should call interpolateVariables for each interpolated field', () => {
      const state = baseState();
      state.idea = 'Idea with {{VAR1}}';
      state.environment = 'Environment with {{VAR2}}';
      state.characterActions = 'Actions with {{VAR3}}';

      const variables = { VAR1: 'value1', VAR2: 'value2', VAR3: 'value3' };

      adapter.buildPrompt(state, variables);

      expect(interpolateVariables).toHaveBeenCalledWith('Idea with {{VAR1}}', variables);
      expect(interpolateVariables).toHaveBeenCalledWith('Environment with {{VAR2}}', variables);
      expect(interpolateVariables).toHaveBeenCalledWith('Actions with {{VAR3}}', variables);
      expect(interpolateVariables).toHaveBeenCalledTimes(3);
    });

    it('should use fallback to English when language is null', () => {
      const state = baseState();
      state.idea = 'A scene';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing null language fallback
      state.language = null as any;

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('Create a highly realistic video of:');
    });

    it('should format spatial motions as JSON string', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.spatialMotions = {
        A1: 'Move forward',
        B2: 'Rotate 45 degrees',
      };

      const prompt = adapter.buildPrompt(state, {});

      // Should contain valid JSON
      expect(prompt).toContain('Spatial Directives: {');
      expect(prompt).toContain('"A1":"Move forward"');
      expect(prompt).toContain('"B2":"Rotate 45 degrees"');
    });

    it('should handle minimal state with only idea', () => {
      const state = baseState();
      state.idea = 'A simple scene';

      const prompt = adapter.buildPrompt(state, {});

      expect(prompt).toContain('A simple scene');
      expect(prompt).toContain('Parameters:');
      // Should not have many parameters
      expect(prompt.split('\n').length).toBeLessThan(10);
    });

    it('should join parameters with newlines', () => {
      const state = baseState();
      state.idea = 'A scene';
      state.environment = 'Forest';
      state.timeOfDay = 'Morning';
      state.weather = 'Sunny';

      const prompt = adapter.buildPrompt(state, {});

      const lines = prompt.split('\n');
      expect(lines).toContain('Environment: Forest');
      expect(lines).toContain('Time: Morning');
      expect(lines).toContain('Weather: Sunny');
    });
  });
});
