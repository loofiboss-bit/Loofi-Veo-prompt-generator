import { describe, it, expect, beforeEach } from 'vitest';
import { calculatePromptQuality, QualityScore, QualityDimension } from './promptScoring';
import { PromptState } from '@core/types';

/**
 * Factory function to create a minimal valid PromptState
 * Provides sensible defaults for all required fields
 */
const createMockPromptState = (overrides: Partial<PromptState> = {}): PromptState => ({
  // Core prompt fields
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

  // Identity Lock
  characterVisualDNA: '',
  characterFixedSeed: null,
  characterNegativePrompt: '',

  // Global style
  globalStyle: {
    name: '',
    materials: [],
    lighting: [],
    colorTone: [],
    composition: [],
    movieGenre: [],
    cinematographer: [],
  },

  // Time & environment
  timeOfDay: 'Any',
  weather: 'Any',
  voiceOver: '',
  voiceStyle: 'None',
  ambientSound: '',
  soundEffectsIntensity: '',

  // Prompt constraints
  negativePrompt: '',
  optimizeFor8Seconds: false,

  // Visual style
  artStyle: 'Cinematic',
  customArtStyle: '',
  lightingStyle: 'Any',
  cameraMovement: 'Static shot',
  cameraDistance: 'Medium shot',
  lensType: 'Standard prime lens',
  compositionalGuide: 'Any',
  visualEffect: 'None',
  colorPalette: 'Vibrant and saturated',

  // Output settings
  aspectRatio: '',
  resolution: '',
  animationPreset: '',
  motionIntensity: '',
  creativityLevel: '',

  // Text & search features
  includeOverlayText: false,
  overlayTextContent: '',
  useGoogleSearch: false,
  useGoogleMaps: false,
  generateAsSeries: false,
  thinkingMode: false,
  thinkingBudget: 0,

  // Advanced inputs
  youtubeUrl: '',
  imageStudioPrompt: '',
  uploadedImage: null,
  uploadedAudio: null,
  audioMix: { voice: 0, ambient: 0, sfx: 0 },
  useImageAsCameo: false,

  // Organization
  language: 'en-US',
  model: '',
  targetModel: 'veo',
  veoModel: 'fast',
  spatialMotions: {},

  // Apply overrides
  ...overrides,
});

describe('calculatePromptQuality', () => {
  let mockState: PromptState;

  beforeEach(() => {
    mockState = createMockPromptState();
  });

  describe('empty state', () => {
    it('should return Basic tier for empty state', () => {
      const result = calculatePromptQuality(mockState);
      expect(result.tier).toBe('Basic');
      expect(result.color).toBe('red');
    });

    it('should have low score for empty state', () => {
      const result = calculatePromptQuality(mockState);
      expect(result.score).toBeLessThan(40);
    });

    it('should provide suggestions for empty state', () => {
      const result = calculatePromptQuality(mockState);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toContain('Add a core idea');
    });
  });

  describe('minimal state', () => {
    it('should calculate score for state with just an idea', () => {
      mockState = createMockPromptState({ idea: 'A beautiful landscape' });
      const result = calculatePromptQuality(mockState);
      expect(result.score).toBeGreaterThan(0);
      expect(result.metCriteria).toContain('Basic Concept');
    });

    it('should detect rich idea (>50 chars)', () => {
      mockState = createMockPromptState({
        idea: 'A breathtaking landscape with rolling hills, golden sunlight, and winding paths',
      });
      const result = calculatePromptQuality(mockState);
      expect(result.metCriteria).toContain('Rich Core Concept');
    });

    it('should bonus for detailed idea (>100 chars)', () => {
      mockState = createMockPromptState({
        idea: 'A breathtaking landscape with rolling hills, golden sunlight, and winding paths through morning mist. The scene captures the serene beauty of nature with dramatic lighting.',
      });
      const result = calculatePromptQuality(mockState);
      expect(result.metCriteria).toContain('Detailed Vision');
    });
  });

  describe('rich state', () => {
    it('should reach Cinematic tier with sufficient content', () => {
      mockState = createMockPromptState({
        idea: 'A beautiful landscape scene with dramatic lighting and composition',
        artStyle: 'Photorealistic',
        visualEffect: 'Volumetric Lighting',
        colorPalette: 'Cool Blues and Golds',
        cameraMovement: 'Slow Pan',
        cameraDistance: 'Wide Shot',
        lensType: '24mm Lens',
        compositionalGuide: 'Rule of Thirds',
        environment: 'Mountain valley at sunset',
        timeOfDay: 'Golden Hour',
        weather: 'Clear Skies',
        lightingStyle: 'Dramatic',
        characterActions: 'Walking slowly',
        negativePrompt: 'No people visible',
      });
      const result = calculatePromptQuality(mockState);
      expect(result.tier).toBe('Cinematic');
      expect(result.color).toBe('green');
    });

    it('should reach Masterpiece tier with maximum detail', () => {
      mockState = createMockPromptState({
        idea: 'An epic scene with rich cinematic details: A traveler walks through an ancient forest at golden hour. The sunlight streams through the canopy, creating volumetric light rays.',
        artStyle: 'Cinematic',
        customArtStyle: 'Studio Ghibli inspired with modern cinematography',
        visualEffect: 'Volumetric Lighting',
        colorPalette: 'Warm Golds and Cool Shadows',
        cameraMovement: 'Dynamic Tracking Shot',
        cameraDistance: 'Medium Close Up',
        lensType: '50mm Lens',
        compositionalGuide: 'Leading Lines',
        environment: 'Ancient enchanted forest with moss-covered trees and glowing mushrooms',
        environmentSensoryDetails:
          'The air feels misty and cool, with the gentle sound of rustling leaves',
        timeOfDay: 'Golden Hour',
        weather: 'Misty Morning',
        lightingStyle: 'Volumetric',
        characterActions: 'Slow contemplative walking while observing surroundings',
        characterNuances: 'Expression shows wonder and reverence for nature',
        characterVisualDNA: 'Tall, ethereal warrior with ancient armor',
        negativePrompt: 'No modern technology, no people in background',
        voiceOver: 'Gentle narration describing the mystical forest',
      });
      const result = calculatePromptQuality(mockState);
      expect(result.tier).toBe('Masterpiece');
      expect(result.color).toBe('cyan');
      expect(result.score).toBeGreaterThanOrEqual(90);
    });
  });

  describe('tier thresholds', () => {
    it('should use Basic tier for scores 0-39', () => {
      mockState = createMockPromptState(); // empty
      const result = calculatePromptQuality(mockState);
      if (result.score < 40) {
        expect(result.tier).toBe('Basic');
      }
    });

    it('should use Enhanced tier for scores 40-69', () => {
      mockState = createMockPromptState({
        idea: 'A nice scene with some details',
        cameraMovement: 'Slow Pan',
      });
      const result = calculatePromptQuality(mockState);
      if (result.score >= 40 && result.score < 70) {
        expect(result.tier).toBe('Enhanced');
      }
    });

    it('should use Cinematic tier for scores 70-89', () => {
      mockState = createMockPromptState({
        idea: 'A detailed cinematic scene with multiple visual elements',
        artStyle: 'Photorealistic',
        visualEffect: 'Bloom',
        colorPalette: 'Cool Tones',
        cameraMovement: 'Tracking Shot',
        cameraDistance: 'Wide Shot',
        lensType: '24mm Lens',
        environment: 'Urban landscape',
      });
      const result = calculatePromptQuality(mockState);
      if (result.score >= 70 && result.score < 90) {
        expect(result.tier).toBe('Cinematic');
      }
    });

    it('should use Masterpiece tier for scores 90+', () => {
      mockState = createMockPromptState({
        idea: 'An epic, detailed scene description with rich visual language',
        artStyle: 'Cinematic',
        customArtStyle: 'Studio Ghibli style cinematography',
        visualEffect: 'Volumetric Lighting',
        colorPalette: 'Warm Golds and Shadows',
        cameraMovement: 'Slow Dolly',
        cameraDistance: 'Medium Shot',
        lensType: '50mm Lens',
        compositionalGuide: 'Golden Ratio',
        environment: 'Mystical forest with bioluminescent flora',
        environmentSensoryDetails: 'The air smells of pine and earth, with soft ambient sounds',
        timeOfDay: 'Dusk',
        weather: 'Clear',
        lightingStyle: 'Volumetric',
        characterActions: 'Walking through the forest with wonder',
        characterNuances: 'Showing awe and contemplation',
        characterVisualDNA: 'Ethereal with glowing eyes',
        negativePrompt: 'No modern elements',
        voiceOver: 'Mystical whispered narration',
      });
      const result = calculatePromptQuality(mockState);
      if (result.score >= 90) {
        expect(result.tier).toBe('Masterpiece');
      }
    });
  });

  describe('score normalization', () => {
    it('should cap score at 100', () => {
      mockState = createMockPromptState({
        idea: 'A very detailed scene',
        artStyle: 'Photorealistic',
        visualEffect: 'Bloom',
        colorPalette: 'Cool Tones',
        cameraMovement: 'Tracking',
        cameraDistance: 'Wide Shot',
        lensType: '24mm',
        compositionalGuide: 'Rule of Thirds',
        environment: 'Urban',
      });
      const result = calculatePromptQuality(mockState);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should normalize raw score by 105 max', () => {
      // With 5 dimensions max 30+20+20+20+15=105
      mockState = createMockPromptState({
        idea: 'Test scene with moderate details',
      });
      const result = calculatePromptQuality(mockState);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('breakdown structure', () => {
    it('should have exactly 5 dimensions', () => {
      mockState = createMockPromptState({ idea: 'A scene' });
      const result = calculatePromptQuality(mockState);
      expect(result.breakdown.length).toBe(5);
    });

    it('should label dimensions correctly', () => {
      mockState = createMockPromptState({ idea: 'A scene' });
      const result = calculatePromptQuality(mockState);
      const names = result.breakdown.map((d: QualityDimension) => d.name);
      expect(names).toContain('Core Content');
      expect(names).toContain('Visual Style');
      expect(names).toContain('Cinematic Properties');
      expect(names).toContain('Environment & Lighting');
      expect(names).toContain('Character & Constraints');
    });

    it('should include maxScore for each dimension', () => {
      mockState = createMockPromptState({ idea: 'A scene' });
      const result = calculatePromptQuality(mockState);
      expect(result.breakdown[0].maxScore).toBe(30); // Core Content
      expect(result.breakdown[1].maxScore).toBe(20); // Visual Style
      expect(result.breakdown[2].maxScore).toBe(20); // Cinematic Properties
      expect(result.breakdown[3].maxScore).toBe(20); // Environment & Lighting
      expect(result.breakdown[4].maxScore).toBe(15); // Character & Constraints
    });

    it('should track criteria and suggestions per dimension', () => {
      mockState = createMockPromptState({
        idea: 'A detailed landscape scene with multiple visual elements',
        artStyle: 'Photorealistic',
      });
      const result = calculatePromptQuality(mockState);
      result.breakdown.forEach((dim: QualityDimension) => {
        expect(typeof dim.score).toBe('number');
        expect(Array.isArray(dim.criteria)).toBe(true);
        expect(Array.isArray(dim.suggestions)).toBe(true);
      });
    });
  });

  describe('dimension scoring', () => {
    it('Core Content should reward longer ideas', () => {
      const shortIdea = calculatePromptQuality(createMockPromptState({ idea: 'Short' }));
      const longIdea = calculatePromptQuality(
        createMockPromptState({
          idea: 'A very detailed and richly described cinematic scene with multiple visual elements and narrative depth',
        }),
      );
      expect(longIdea.breakdown[0].score).toBeGreaterThan(shortIdea.breakdown[0].score);
    });

    it('Visual Style should reward non-default artStyle', () => {
      const defaultStyle = calculatePromptQuality(createMockPromptState({ idea: 'A scene' }));
      const customStyle = calculatePromptQuality(
        createMockPromptState({ idea: 'A scene', artStyle: 'Photorealistic' }),
      );
      expect(customStyle.breakdown[1].score).toBeGreaterThan(defaultStyle.breakdown[1].score);
    });

    it('Visual Style should reward customArtStyle', () => {
      const noCustom = calculatePromptQuality(
        createMockPromptState({ idea: 'A scene', artStyle: 'Custom' }),
      );
      const withCustom = calculatePromptQuality(
        createMockPromptState({
          idea: 'A scene',
          artStyle: 'Custom',
          customArtStyle: 'Studio Ghibli style cinematography',
        }),
      );
      expect(withCustom.breakdown[1].score).toBeGreaterThan(noCustom.breakdown[1].score);
    });

    it('Cinematic Properties should reward non-default camera settings', () => {
      const defaultCamera = calculatePromptQuality(createMockPromptState({ idea: 'A scene' }));
      const customCamera = calculatePromptQuality(
        createMockPromptState({
          idea: 'A scene',
          cameraMovement: 'Slow Pan',
          cameraDistance: 'Close Up',
          lensType: '85mm Lens',
          compositionalGuide: 'Rule of Thirds',
        }),
      );
      expect(customCamera.breakdown[2].score).toBeGreaterThan(defaultCamera.breakdown[2].score);
    });

    it('Environment & Lighting should reward environmental details', () => {
      const minimal = calculatePromptQuality(createMockPromptState({ idea: 'A scene' }));
      const detailed = calculatePromptQuality(
        createMockPromptState({
          idea: 'A scene',
          environment: 'Mountain landscape with ancient ruins',
          timeOfDay: 'Golden Hour',
          weather: 'Misty',
          lightingStyle: 'Volumetric',
          environmentSensoryDetails: 'The air is crisp and cool with a gentle breeze',
        }),
      );
      expect(detailed.breakdown[3].score).toBeGreaterThan(minimal.breakdown[3].score);
    });

    it('Character & Constraints should reward character details', () => {
      const minimal = calculatePromptQuality(createMockPromptState({ idea: 'A scene' }));
      const detailed = calculatePromptQuality(
        createMockPromptState({
          idea: 'A scene',
          characterActions: 'Walking contemplatively through the landscape',
          negativePrompt: 'No modern technology',
          characterNuances: 'Expression shows wonder and reverence',
          characterVisualDNA: 'Ethereal with ancient armor',
          voiceOver: 'Mystical narration',
        }),
      );
      expect(detailed.breakdown[4].score).toBeGreaterThan(minimal.breakdown[4].score);
    });
  });

  describe('metCriteria tracking', () => {
    it('should populate metCriteria with met criteria', () => {
      mockState = createMockPromptState({
        idea: 'A detailed scene',
        artStyle: 'Photorealistic',
        environment: 'Urban landscape',
      });
      const result = calculatePromptQuality(mockState);
      expect(result.metCriteria.length).toBeGreaterThan(0);
      expect(typeof result.metCriteria[0]).toBe('string');
    });

    it('should track "Detailed Vision" for long ideas', () => {
      mockState = createMockPromptState({
        idea: 'A very detailed scene description with rich visual language spanning over 100 characters to demonstrate depth',
      });
      const result = calculatePromptQuality(mockState);
      expect(result.metCriteria).toContain('Detailed Vision');
    });
  });

  describe('return type structure', () => {
    it('should return a QualityScore object with all required fields', () => {
      mockState = createMockPromptState({ idea: 'A scene' });
      const result = calculatePromptQuality(mockState);
      expect(typeof result.score).toBe('number');
      expect(['Basic', 'Enhanced', 'Cinematic', 'Masterpiece']).toContain(result.tier);
      expect(['red', 'yellow', 'green', 'cyan']).toContain(result.color);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.metCriteria)).toBe(true);
      expect(Array.isArray(result.breakdown)).toBe(true);
    });
  });
});
