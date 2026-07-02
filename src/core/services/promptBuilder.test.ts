import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock adapters
const mockBuildPrompt = vi.fn().mockReturnValue('Generated prompt text');
const mockValidateConstraints = vi.fn().mockReturnValue([]);

vi.mock('./adapters/FlowVeoAdapter', () => {
  return {
    FlowVeoAdapter: class {
      buildPrompt = mockBuildPrompt;
      validateConstraints = mockValidateConstraints;
    },
  };
});

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock dependencies used only by enforceLore
vi.mock('./apiKeyService', () => ({
  getStoredApiKey: vi.fn().mockReturnValue('test-api-key'),
  getStoredApiKeyAsync: vi.fn().mockResolvedValue('test-api-key'),
}));

const mockGenerateContent = vi.fn().mockResolvedValue({ text: 'NO_CHANGE' });

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = { generateContent: mockGenerateContent };
    },
  };
});

vi.mock('@core/utils/retry', () => ({
  retryOperation: vi.fn((fn: () => unknown) => fn()),
}));

import {
  interpolateVariables,
  buildGeminiPrompt,
  buildShotPrompt,
  enforceLore,
} from './promptBuilder';
import type { PromptState, CharacterProfile, Shot, LocationProfile } from '@core/types';
import { logger } from './loggerService';
import { getStoredApiKeyAsync } from './apiKeyService';

describe('promptBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── interpolateVariables ──────────────────────────────────────
  describe('interpolateVariables', () => {
    it('should replace {{KEY}} with the corresponding value', () => {
      const result = interpolateVariables('Hello {{NAME}}, welcome to {{PLACE}}!', {
        NAME: 'Alice',
        PLACE: 'Wonderland',
      });
      expect(result).toBe('Hello Alice, welcome to Wonderland!');
    });

    it('should handle whitespace inside braces', () => {
      const result = interpolateVariables('{{ NAME }} and {{  PLACE  }}', {
        NAME: 'Alice',
        PLACE: 'Wonderland',
      });
      expect(result).toBe('Alice and Wonderland');
    });

    it('should leave unresolved placeholders intact', () => {
      const result = interpolateVariables('Hello {{NAME}}, {{UNKNOWN}} here', {
        NAME: 'Alice',
      });
      expect(result).toBe('Hello Alice, {{UNKNOWN}} here');
    });

    it('should return empty string for empty/null input', () => {
      expect(interpolateVariables('', { NAME: 'Alice' })).toBe('');
    });

    it('should handle text with no placeholders', () => {
      const result = interpolateVariables('No placeholders here', { NAME: 'Alice' });
      expect(result).toBe('No placeholders here');
    });

    it('should handle numeric and underscore keys', () => {
      const result = interpolateVariables('{{VAR_1}} and {{VAR2}}', {
        VAR_1: 'first',
        VAR2: 'second',
      });
      expect(result).toBe('first and second');
    });
  });

  // ─── buildGeminiPrompt ─────────────────────────────────────────
  describe('buildGeminiPrompt', () => {
    const mockState = {
      targetModel: 'flow-veo',
      idea: 'A sunset over the ocean',
    } as PromptState;

    it('should use FlowVeoAdapter for flow-veo target model', () => {
      buildGeminiPrompt(mockState);
      expect(mockBuildPrompt).toHaveBeenCalledWith(mockState, {});
    });

    it('should use FlowVeoAdapter for veo-api target model', () => {
      const apiState = { ...mockState, targetModel: 'veo-api' } as PromptState;
      buildGeminiPrompt(apiState);
      expect(mockBuildPrompt).toHaveBeenCalledWith(apiState, {});
    });

    it('should pass variables to adapter.buildPrompt', () => {
      const variables = { HERO: 'Detective', LOCATION: 'Dark alley' };
      buildGeminiPrompt(mockState, variables);
      expect(mockBuildPrompt).toHaveBeenCalledWith(mockState, variables);
    });

    it('should return the prompt from the adapter', () => {
      const result = buildGeminiPrompt(mockState);
      expect(result).toBe('Generated prompt text');
    });

    it('should log warnings when constraints are violated', () => {
      mockValidateConstraints.mockReturnValueOnce(['Duration exceeds limit']);
      buildGeminiPrompt(mockState);
      expect(logger.warn).toHaveBeenCalledWith('Prompt constraints', 'PromptBuilder', {
        warnings: ['Duration exceeds limit'],
      });
    });

    it('should not log warnings when no constraints are violated', () => {
      mockValidateConstraints.mockReturnValueOnce([]);
      buildGeminiPrompt(mockState);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  // ─── buildShotPrompt ───────────────────────────────────────────
  describe('buildShotPrompt', () => {
    const globalContext = {
      style: 'Cinematic, dark mood',
      character: 'A detective',
      setting: 'Urban noir street',
    };

    const basicShot: Partial<Shot> = {
      action: 'walking through the rain',
      camera: 'Tracking shot, low angle',
    };

    it('should build a basic shot prompt with global context', () => {
      const result = buildShotPrompt(globalContext, basicShot);
      expect(result).toContain('Visual Style: Cinematic, dark mood');
      expect(result).toContain('Setting: Urban noir street');
      expect(result).toContain('A detective is walking through the rain');
      expect(result).toContain('Camera: Tracking shot, low angle');
      expect(result.endsWith('.')).toBe(true);
    });

    it('should use LocationProfile over global setting', () => {
      const locationProfile: LocationProfile = {
        id: 'loc1',
        name: 'Dark Alley',
        description: 'A narrow, rain-soaked alley with neon reflections',
        visualTags: ['noir', 'rain'],
      };
      const result = buildShotPrompt(globalContext, basicShot, undefined, locationProfile);
      expect(result).toContain('Setting: A narrow, rain-soaked alley with neon reflections');
      expect(result).not.toContain('Urban noir street');
    });

    it('should fall back to LocationProfile name if no description', () => {
      const locationProfile: LocationProfile = {
        id: 'loc1',
        name: 'Dark Alley',
        description: '',
        visualTags: [],
      };
      const result = buildShotPrompt(globalContext, basicShot, undefined, locationProfile);
      expect(result).toContain('Setting: Dark Alley');
    });

    it('should build detailed character description from CharacterProfile', () => {
      const charProfile: CharacterProfile = {
        id: 'char1',
        name: 'Detective Noir',
        attributes: {
          age: '40s',
          gender: 'Male',
          ethnicity: 'Any',
          bodyType: 'Athletic',
          skinTone: 'Any',
        },
        appearance: {
          hair: 'Slicked back dark hair',
          eyes: 'Steel grey eyes',
          distinguishingFeatures: 'Scar across left cheek',
        },
        wardrobe: 'a long black trenchcoat',
        visualPrompt: '',
        fixedSeed: null,
        negativePrompt: '',
      };
      const result = buildShotPrompt(globalContext, basicShot, charProfile);
      expect(result).toContain('The character Detective Noir');
      expect(result).toContain('40s');
      expect(result).toContain('Male');
      expect(result).toContain('Athletic');
      expect(result).not.toContain('Any'); // 'Any' values should be filtered out
      expect(result).toContain('Slicked back dark hair');
      expect(result).toContain('Steel grey eyes');
      expect(result).toContain('Scar across left cheek');
      expect(result).toContain('wearing a long black trenchcoat');
    });

    it('should add green screen instruction when isGreenScreen is true', () => {
      const greenScreenShot: Partial<Shot> = {
        ...basicShot,
        isGreenScreen: true,
      };
      const result = buildShotPrompt(globalContext, greenScreenShot);
      expect(result).toContain('chroma-key green background');
    });

    it('should not add green screen instruction when isGreenScreen is false', () => {
      const result = buildShotPrompt(globalContext, basicShot);
      expect(result).not.toContain('chroma-key');
    });

    it('should interpolate variables in all inputs', () => {
      const contextWithVars = {
        style: '{{THEME}} style',
        character: '{{HERO}}',
        setting: '{{LOCATION}}',
      };
      const shotWithVars: Partial<Shot> = {
        action: 'exploring {{LOCATION}}',
      };
      const variables = {
        THEME: 'Cyberpunk',
        HERO: 'Agent Zero',
        LOCATION: 'Neo Tokyo',
      };
      const result = buildShotPrompt(
        contextWithVars,
        shotWithVars,
        undefined,
        undefined,
        variables,
      );
      expect(result).toContain('Cyberpunk style');
      expect(result).toContain('Agent Zero');
      expect(result).toContain('Neo Tokyo');
    });

    it('should handle empty global context gracefully', () => {
      const emptyContext = { style: '', character: '', setting: '' };
      const result = buildShotPrompt(emptyContext, { action: 'running' });
      expect(result).not.toContain('Visual Style:');
      expect(result).not.toContain('Setting:');
      expect(result).toContain('A character is running');
    });

    it('should handle shot with no action', () => {
      const result = buildShotPrompt(globalContext, {});
      expect(result).toContain('A detective is .');
    });
  });

  // ─── enforceLore ───────────────────────────────────────────────
  describe('enforceLore', () => {
    it('should return original prompt when bible is empty', async () => {
      const result = await enforceLore('A dragon flies', '');
      expect(result).toBe('A dragon flies');
    });

    it('should return original prompt when bible is whitespace', async () => {
      const result = await enforceLore('A dragon flies', '   ');
      expect(result).toBe('A dragon flies');
    });

    it('should throw when no API key is configured', async () => {
      vi.mocked(getStoredApiKeyAsync).mockResolvedValueOnce(null);
      const originalEnv = process.env.API_KEY;
      delete process.env.API_KEY;

      await expect(enforceLore('prompt', 'bible')).rejects.toThrow('No API key configured');

      process.env.API_KEY = originalEnv;
    });

    it('should return original prompt when AI responds with NO_CHANGE', async () => {
      const result = await enforceLore('A dragon flies over a castle', 'No magic in this world');
      expect(result).toBe('A dragon flies over a castle');
    });

    it('should return rewritten prompt when AI detects violation', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'A bird flies over a castle' });

      const result = await enforceLore('A dragon flies over a castle', 'No dragons exist');
      expect(result).toBe('A bird flies over a castle');
    });

    it('should return original prompt when API call fails', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API Error'));

      const result = await enforceLore('A dragon flies', 'Some bible');
      expect(result).toBe('A dragon flies');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
