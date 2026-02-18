import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSound, getAmbience, searchFreeSound } from './sfxService';

// Create hoisted mocks for idb-keyval (though not used in sfxService, following pattern)
const { mockGenerateSoundEffect } = vi.hoisted(() => ({
  mockGenerateSoundEffect: vi.fn(),
}));

// Mock geminiService
vi.mock('./geminiService', () => ({
  generateSoundEffect: mockGenerateSoundEffect,
}));

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock audio utils
vi.mock('@core/utils/audio', () => ({
  createWavHeader: vi.fn(() => {
    // Return a simple mock WAV header (44 bytes)
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    view.setUint32(0, 0x46464952, false); // "RIFF"
    return header;
  }),
}));

// Mock global atob
global.atob = vi.fn((_str: string) => {
  // Simple mock that returns a fixed byte string
  return '\x00\x01\x02\x03\x04';
});

describe('sfxService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSound', () => {
    it('should generate sound from text prompt', async () => {
      const mockBase64Audio = 'bW9ja0F1ZGlvRGF0YQ==';
      mockGenerateSoundEffect.mockResolvedValue(mockBase64Audio);

      const result = await generateSound('Heavy rain on tin roof');

      expect(mockGenerateSoundEffect).toHaveBeenCalledWith('Heavy rain on tin roof');
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should throw error for empty prompt', async () => {
      await expect(generateSound('')).rejects.toThrow('Prompt is empty');
      expect(mockGenerateSoundEffect).not.toHaveBeenCalled();
    });

    it('should throw error for whitespace-only prompt', async () => {
      await expect(generateSound('   ')).rejects.toThrow('Prompt is empty');
      expect(mockGenerateSoundEffect).not.toHaveBeenCalled();
    });

    it('should throw error when audio generation fails', async () => {
      mockGenerateSoundEffect.mockResolvedValue(null);

      await expect(generateSound('Thunder')).rejects.toThrow('Audio generation failed');
    });

    it('should handle Gemini API errors', async () => {
      mockGenerateSoundEffect.mockRejectedValue(new Error('API error'));

      await expect(generateSound('Explosion')).rejects.toThrow('API error');
    });

    it('should decode base64 audio correctly', async () => {
      const mockBase64Audio = 'AQIDBA=='; // Base64 for [1, 2, 3, 4]
      mockGenerateSoundEffect.mockResolvedValue(mockBase64Audio);

      const result = await generateSound('Door slam');

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should create WAV blob with correct header', async () => {
      const { createWavHeader } = await import('@core/utils/audio');
      const mockBase64Audio = 'bW9ja0F1ZGlv';
      mockGenerateSoundEffect.mockResolvedValue(mockBase64Audio);

      await generateSound('Birds chirping');

      expect(createWavHeader).toHaveBeenCalledWith(
        expect.any(Number), // byte array length
        24000, // sample rate
        1, // num channels
        16, // bits per sample
      );
    });

    it('should handle various prompt types', async () => {
      const prompts = [
        'Heavy rain on tin roof',
        'Spaceship engine hum',
        'Medieval sword clash',
        'Forest ambience with birds',
        'City traffic noise',
      ];

      for (const prompt of prompts) {
        mockGenerateSoundEffect.mockResolvedValue('bW9ja0F1ZGlv');
        const result = await generateSound(prompt);
        expect(result).toBeInstanceOf(Blob);
        expect(mockGenerateSoundEffect).toHaveBeenCalledWith(prompt);
        vi.clearAllMocks();
      }
    });

    it('should return blob with audio/wav MIME type', async () => {
      mockGenerateSoundEffect.mockResolvedValue('bW9ja0F1ZGlv');

      const result = await generateSound('Footsteps on wood');

      expect(result.type).toBe('audio/wav');
    });

    it('should log errors when generation fails', async () => {
      const { logger } = await import('./loggerService');
      mockGenerateSoundEffect.mockRejectedValue(new Error('Network error'));

      await expect(generateSound('Gunshot')).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith('SFX Generation Error:', expect.any(Error));
    });

    it('should handle empty base64 response', async () => {
      mockGenerateSoundEffect.mockResolvedValue('');

      await expect(generateSound('Wind howl')).rejects.toThrow('Audio generation failed');
    });

    it('should handle malformed base64 data', async () => {
      mockGenerateSoundEffect.mockResolvedValue('not-valid-base64!!!');

      // atob will be called with invalid data
      global.atob = vi.fn(() => {
        throw new Error('Invalid base64');
      });

      await expect(generateSound('Glass break')).rejects.toThrow();

      // Restore atob
      global.atob = vi.fn((_str: string) => '\x00\x01\x02\x03\x04');
    });

    it('should handle long prompts', async () => {
      const longPrompt =
        'A very detailed and long description of a complex soundscape including multiple elements like rain, thunder, wind, distant traffic, birds chirping, and various other environmental sounds that create a rich audio texture';
      mockGenerateSoundEffect.mockResolvedValue('bW9ja0F1ZGlv');

      const result = await generateSound(longPrompt);

      expect(result).toBeInstanceOf(Blob);
      expect(mockGenerateSoundEffect).toHaveBeenCalledWith(longPrompt);
    });
  });

  describe('getAmbience', () => {
    it('should generate ambience sound with modified prompt', async () => {
      mockGenerateSoundEffect.mockResolvedValue('bW9ja0F1ZGlv');

      const result = await getAmbience('Beach at sunset');

      expect(mockGenerateSoundEffect).toHaveBeenCalledWith(
        'Looping background ambience, no music, environmental texture, continuous sound for: Beach at sunset',
      );
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should handle various scene types', async () => {
      const scenes = [
        'Beach at sunset',
        'Cyberpunk city',
        'Medieval tavern',
        'Space station interior',
        'Underground cave',
      ];

      for (const scene of scenes) {
        mockGenerateSoundEffect.mockResolvedValue('bW9ja0F1ZGlv');
        const result = await getAmbience(scene);
        expect(result).toBeInstanceOf(Blob);
        expect(mockGenerateSoundEffect).toHaveBeenCalledWith(expect.stringContaining(scene));
        vi.clearAllMocks();
      }
    });

    it('should append ambience keywords to scene description', async () => {
      mockGenerateSoundEffect.mockResolvedValue('bW9ja0F1ZGlv');

      await getAmbience('Forest');

      const callArgs = mockGenerateSoundEffect.mock.calls[0][0];
      expect(callArgs).toContain('Looping background ambience');
      expect(callArgs).toContain('no music');
      expect(callArgs).toContain('environmental texture');
      expect(callArgs).toContain('continuous sound');
      expect(callArgs).toContain('Forest');
    });

    it('should handle empty scene type', async () => {
      // getAmbience wraps the scene type in a prompt that includes text, so it won't be empty
      // The final prompt will be "Looping background ambience, no music, environmental texture, continuous sound for: "
      // which is not empty, so generateSound won't throw. This tests that edge case.
      mockGenerateSoundEffect.mockResolvedValue('bW9ja0F1ZGlv');

      const result = await getAmbience('');

      // Should still work - the prompt template adds text
      expect(result).toBeInstanceOf(Blob);
      expect(mockGenerateSoundEffect).toHaveBeenCalledWith(
        'Looping background ambience, no music, environmental texture, continuous sound for: ',
      );
    });

    it('should propagate errors from generateSound', async () => {
      mockGenerateSoundEffect.mockRejectedValue(new Error('Generation failed'));

      await expect(getAmbience('Desert')).rejects.toThrow('Generation failed');
    });
  });

  describe('searchFreeSound', () => {
    it('should return null as placeholder', async () => {
      const result = await searchFreeSound('door slam');

      expect(result).toBeNull();
    });

    it('should log debug message', async () => {
      const { logger } = await import('./loggerService');

      await searchFreeSound('footsteps');

      expect(logger.debug).toHaveBeenCalledWith('Mock searching Freesound for: footsteps');
    });

    it('should handle various queries', async () => {
      const queries = ['gunshot', 'explosion', 'laughter', 'wind'];

      for (const query of queries) {
        const result = await searchFreeSound(query);
        expect(result).toBeNull();
      }
    });

    it('should handle empty query', async () => {
      const result = await searchFreeSound('');

      expect(result).toBeNull();
    });
  });
});
