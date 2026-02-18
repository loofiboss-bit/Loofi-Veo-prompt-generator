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

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY', BOOLEAN: 'BOOLEAN' },
  Modality: { IMAGE: 'IMAGE', AUDIO: 'AUDIO' },
}));

vi.mock('@core/utils/retry', () => ({
  retryOperation: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock('@core/utils/apiErrors', () => ({
  parseAndThrowApiError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import {
  generateSpeech,
  generateSoundEffect,
  analyzeAudio,
  generateAmbiencePrompt,
  generateAmbienceAudio,
  generateSunoPack,
  extendSunoLyrics,
} from '../gemini/geminiAudioService';

function mockAudioResponse(data = 'base64audiodata') {
  return {
    candidates: [
      {
        content: {
          parts: [{ inlineData: { mimeType: 'audio/wav', data } }],
        },
      },
    ],
  };
}

describe('geminiAudioService — integration', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Speech & sound effects ────────────────────────────────────
  describe('generateSpeech', () => {
    it('should return audio data from the AI model', async () => {
      mockGenerateContent.mockResolvedValueOnce(mockAudioResponse());

      const result = await generateSpeech('Hello world');
      expect(result).toBe('base64audiodata');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should use the specified voice name', async () => {
      mockGenerateContent.mockResolvedValueOnce(mockAudioResponse());

      await generateSpeech('Hello', 'Puck');
      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Puck');
    });

    it('should default to Kore voice', async () => {
      mockGenerateContent.mockResolvedValueOnce(mockAudioResponse());

      await generateSpeech('Hello');
      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Kore');
    });

    it('should throw when no audio is generated', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [{ content: { parts: [] } }],
      });

      await expect(generateSpeech('test')).rejects.toThrow('No audio generated');
    });
  });

  describe('generateSoundEffect', () => {
    it('should prefix description with "(Sound Effect)" and use Fenrir voice', async () => {
      mockGenerateContent.mockResolvedValueOnce(mockAudioResponse());

      await generateSoundEffect('explosion');
      const callArg = mockGenerateContent.mock.calls[0][0];
      const text = JSON.stringify(callArg.contents);
      expect(text).toContain('(Sound Effect) explosion');
      expect(callArg.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Fenrir');
    });
  });

  // ── Audio analysis ────────────────────────────────────────────
  describe('analyzeAudio', () => {
    it('should return audio analysis text', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Distant traffic, birdsong, and light wind.',
      });

      const result = await analyzeAudio('audiodata', 'audio/mp3');
      expect(result).toContain('traffic');
    });

    it('should return empty string when AI returns nothing', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: '' });
      const result = await analyzeAudio('data', 'audio/wav');
      expect(result).toBe('');
    });
  });

  // ── Ambience ──────────────────────────────────────────────────
  describe('generateAmbiencePrompt', () => {
    it('should return an ambience description', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Gentle waves lapping, distant seagulls, soft wind.',
      });

      const result = await generateAmbiencePrompt('beach at sunset');
      expect(result).toContain('waves');
    });
  });

  describe('generateAmbienceAudio', () => {
    it('should prefix description with "(Ambience)" and use Fenrir voice', async () => {
      mockGenerateContent.mockResolvedValueOnce(mockAudioResponse());

      await generateAmbienceAudio('forest rain');
      const callArg = mockGenerateContent.mock.calls[0][0];
      const text = JSON.stringify(callArg.contents);
      expect(text).toContain('(Ambience) forest rain');
    });
  });

  // ── Suno music generation ─────────────────────────────────────
  describe('generateSunoPack', () => {
    it('should return a complete Suno pack with title, style, lyrics, and explanation', async () => {
      const sunoPack = {
        title: 'Neon Dreams',
        style: 'Synthwave, dark, 80bpm, female vocals, reverb',
        lyrics:
          '[Verse]\nNeon lights in the midnight rain\n[Chorus]\nDreaming under electric skies',
        explanation: 'A synthwave track inspired by retro futurism.',
      };
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(sunoPack) });

      const result = await generateSunoPack({
        topic: 'cyberpunk city',
        genre: 'Synthwave',
        mood: 'dark',
        voice: 'Female',
        tempo: '80 BPM',
        structure: 'Verse-Chorus',
      } as unknown as Parameters<typeof generateSunoPack>[0]);

      expect(result.title).toBe('Neon Dreams');
      expect(result.style).toContain('Synthwave');
      expect(result.lyrics).toContain('[Verse]');
    });

    it('should propagate API errors', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('rate limit'));
      await expect(
        generateSunoPack({
          topic: 'test',
          genre: 'pop',
          mood: 'happy',
          voice: 'Male',
          tempo: '120 BPM',
          structure: 'Verse-Chorus',
        } as unknown as Parameters<typeof generateSunoPack>[0]),
      ).rejects.toThrow('rate limit');
    });
  });

  describe('extendSunoLyrics', () => {
    it('should return new lyric lines matching the style', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '[Bridge]\nWalking through the neon maze\nLost in the electric haze',
      });

      const result = await extendSunoLyrics(
        '[Verse]\nNeon lights...',
        'cyberpunk city',
        'Synthwave',
      );
      expect(result).toContain('[Bridge]');
    });

    it('should propagate errors via parseAndThrowApiError', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('fail'));
      await expect(extendSunoLyrics('lyrics', 'topic', 'style')).rejects.toThrow('fail');
    });
  });
});
