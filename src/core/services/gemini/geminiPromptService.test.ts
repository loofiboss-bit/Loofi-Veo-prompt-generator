import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

vi.mock('../loggerService', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../apiKeyService', () => ({
  getStoredApiKey: vi.fn().mockReturnValue('test-api-key'),
}));

const mockGenerateContent = vi.fn().mockResolvedValue({ text: '{}' });
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    ARRAY: 'ARRAY',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
  },
  Modality: { IMAGE: 'IMAGE', AUDIO: 'AUDIO' },
}));

vi.mock('@core/utils/retry', () => ({
  retryOperation: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock('../promptBuilder', () => ({
  buildGeminiPrompt: vi.fn().mockReturnValue('built prompt'),
}));

vi.mock('@core/utils/apiErrors', () => ({
  parseAndThrowApiError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  generateVeoPrompt,
  generateBRollPrompt,
  analyzeIdeaForModifiers,
  generatePromptVariations,
  suggestPromptIdeas,
  enhancePrompt,
  refinePrompt,
  restructurePrompt,
  suggestFullAudioDesign,
  suggestEnvironmentDetails,
  suggestAdvancedSettings,
  suggestCameraSetup,
  suggestCharacterActionFlow,
  suggestArtStyles,
  suggestCharacterDetails,
  generateCharacterDNA,
} from './geminiPromptService';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('geminiPromptService — integration', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Core generation ───────────────────────────────────────────
  describe('generateVeoPrompt', () => {
    it('should call the AI model and return a prompt string', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'A sweeping drone shot over misty mountains at golden hour.',
        candidates: [{ groundingMetadata: { groundingChunks: [] } }],
      });

      const result = await generateVeoPrompt(
        { idea: 'mountains', useGoogleSearch: false, useGoogleMaps: false } as any,
        null,
      );

      expect(result.prompt).toContain('sweeping drone');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should add Google Search tool when useGoogleSearch is true', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'result', candidates: [] });

      await generateVeoPrompt(
        { idea: 'test', useGoogleSearch: true, useGoogleMaps: false } as any,
        null,
      );

      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg.config.tools).toEqual([{ googleSearch: {} }]);
    });

    it('should propagate API errors via parseAndThrowApiError', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Quota exceeded'));

      await expect(
        generateVeoPrompt(
          { idea: 'test', useGoogleSearch: false, useGoogleMaps: false } as any,
          null,
        ),
      ).rejects.toThrow('Quota exceeded');
    });
  });

  describe('generateBRollPrompt', () => {
    it('should return a B-Roll prompt string', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Abstract light particles floating in darkness',
      });

      const result = await generateBRollPrompt('dramatic dialogue scene', 'noir');
      expect(result).toContain('light particles');
    });
  });

  // ── Idea analysis ─────────────────────────────────────────────
  describe('analyzeIdeaForModifiers', () => {
    it('should return parsed modifier suggestions', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          artStyle: 'cinematic',
          cameraMovement: 'dolly zoom',
          environment: 'foggy forest',
        }),
      });

      const result = await analyzeIdeaForModifiers('A knight in a dark forest', 'en', {
        artStyle: ['cinematic', 'noir'],
        cameraMovement: ['pan', 'dolly zoom'],
      });

      expect(result.artStyle).toBe('cinematic');
      expect(result.cameraMovement).toBe('dolly zoom');
    });

    it('should propagate API errors via parseAndThrowApiError', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('fail'));
      await expect(analyzeIdeaForModifiers('test', 'en', {})).rejects.toThrow('fail');
    });
  });

  // ── Variations & ideas ────────────────────────────────────────
  describe('generatePromptVariations', () => {
    it('should return an array of prompt variations', async () => {
      const variations = [
        { label: 'Cinematic', prompt: 'A cinematic version...' },
        { label: 'Stylized', prompt: 'A stylized version...' },
      ];
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(variations) });

      const result = await generatePromptVariations('base prompt', 'en');
      expect(result).toHaveLength(2);
      expect(result[0].label).toBe('Cinematic');
    });
  });

  describe('suggestPromptIdeas', () => {
    it('should return brainstormed ideas', async () => {
      const ideas = [{ label: 'Idea 1', prompt: 'Detailed description...' }];
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(ideas) });

      const result = await suggestPromptIdeas('space exploration', 'en');
      expect(result).toHaveLength(1);
    });
  });

  // ── Enhancement & refinement ──────────────────────────────────
  describe('enhancePrompt', () => {
    it('should return an enhanced version of the idea', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Enhanced: dramatic sunrise with lens flare',
      });
      const result = await enhancePrompt('sunrise', 'cinematic');
      expect(result).toContain('Enhanced');
    });

    it('should return the original idea on error', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('fail'));
      const result = await enhancePrompt('sunrise', 'cinematic');
      expect(result).toBe('sunrise');
    });
  });

  describe('refinePrompt', () => {
    it('should return a refined prompt', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'Refined prompt text' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await refinePrompt('original', {} as any);
      expect(result).toBe('Refined prompt text');
    });
  });

  describe('restructurePrompt', () => {
    it('should restructure the prompt in logical order', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Subject → Action → Environment → Style',
      });
      const result = await restructurePrompt('messy prompt', 'gemini-3-pro-preview');
      expect(result).toContain('Subject');
    });
  });

  // ── Suggestion helpers ────────────────────────────────────────
  describe('suggestFullAudioDesign', () => {
    it('should return audio suggestions object', async () => {
      const audioSuggestions = {
        suggestedVoiceStyle: 'Narrator',
        suggestedVoiceOverScript: 'In a world...',
        suggestedAmbientSound: 'forest',
        suggestedSoundEffectsIntensity: 'Medium',
      };
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(audioSuggestions) });

      const result = await suggestFullAudioDesign(
        {
          artStyle: 'cinematic',
          cameraMovement: 'pan',
          idea: 'forest scene',
          environment: 'forest',
          characterActions: 'walking',
          characterMood: 'calm',
          voiceStyleOptions: ['Narrator', 'Whisper'],
        },
        'en',
        'gemini-3-pro-preview',
        ['forest', 'rain'],
        ['Low', 'Medium', 'High'],
      );

      expect(result.suggestedVoiceStyle).toBe('Narrator');
    });
  });

  describe('suggestEnvironmentDetails', () => {
    it('should return environment enhancement suggestions', async () => {
      const envSuggestions = {
        environment: 'Dense pine forest',
        environmentSensoryDetails: 'crisp pine scent, cold mist',
        environmentDynamicEvents: 'distant thunder',
      };
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(envSuggestions) });

      const result = await suggestEnvironmentDetails(
        'forest',
        'hiking scene',
        'en',
        'gemini-3-pro-preview',
      );
      expect(result.environment).toContain('pine');
    });
  });

  describe('suggestAdvancedSettings', () => {
    it('should return negative prompt and intensity settings', async () => {
      const settings = {
        negativePrompt: 'blurry, overexposed',
        motionIntensity: 'Medium',
        creativityLevel: 'High',
      };
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(settings) });

      const result = await suggestAdvancedSettings(
        {
          idea: 'test',
          environment: 'city',
          characterActions: 'running',
          artStyle: 'cinematic',
          customArtStyle: '',
          cameraMovement: 'tracking',
          targetModel: 'veo',
        },
        'en',
        'gemini-3-pro-preview',
        { motionIntensity: ['Low', 'Medium', 'High'], creativityLevel: ['Low', 'Medium', 'High'] },
      );

      expect(result.negativePrompt).toContain('blurry');
    });
  });

  describe('suggestCameraSetup', () => {
    it('should return camera setup recommendations', async () => {
      const camera = {
        cameraMovement: 'tracking shot',
        cameraDistance: 'medium',
        lensType: '35mm',
        compositionalGuide: 'rule of thirds',
      };
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(camera) });

      const result = await suggestCameraSetup(
        { idea: 'chase scene', artStyle: 'action', mood: 'tense' },
        { movements: [], distances: [], lenses: [], guides: [] },
        'gemini-3-pro-preview',
      );

      expect(result.cameraMovement).toBe('tracking shot');
    });
  });

  describe('suggestCharacterActionFlow', () => {
    it('should return a character action sequence', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'The detective takes a long drag from his cigarette, then stubs it out slowly.',
      });

      const result = await suggestCharacterActionFlow(
        { idea: 'noir scene', archetype: 'detective', environment: 'office', mood: 'brooding' },
        'gemini-3-pro-preview',
      );

      expect(result).toContain('detective');
    });
  });

  describe('suggestArtStyles', () => {
    it('should return an array of art style suggestions', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(['Film Noir', 'Neo-Noir', 'German Expressionism']),
      });

      const result = await suggestArtStyles('noir', 'en', 'gemini-3-pro-preview');
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('Film Noir');
    });

    it('should return empty array on error', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('fail'));
      const result = await suggestArtStyles('test', 'en', 'gemini-3-pro-preview');
      expect(result).toEqual([]);
    });
  });

  describe('suggestCharacterDetails', () => {
    it('should return clothing and accessory suggestions', async () => {
      const details = {
        clothingSuggestions: ['Leather trench coat', 'Fedora'],
        accessorySuggestions: ['Pocket watch', 'Revolver'],
      };
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(details) });

      const result = await suggestCharacterDetails(
        'detective',
        'noir city',
        'en',
        'gemini-3-pro-preview',
      );
      expect(result.clothingSuggestions).toHaveLength(2);
    });
  });

  describe('generateCharacterDNA', () => {
    it('should return a visual DNA description string', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Sharp jawline, deep-set hazel eyes, weathered leather coat with brass buttons.',
      });

      const result = await generateCharacterDNA('John', 'detective', 'leather coat');
      expect(result).toContain('jawline');
    });
  });
});
