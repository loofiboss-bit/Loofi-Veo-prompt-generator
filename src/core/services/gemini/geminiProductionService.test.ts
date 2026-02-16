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
const mockSendMessage = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
    chats = {
      create: vi.fn().mockReturnValue({ sendMessage: mockSendMessage }),
    };
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

vi.mock('@core/utils/apiErrors', () => ({
  parseAndThrowApiError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import {
  calculateColorGrade,
  generateColorGrade,
  bridgeScenes,
  generateLocationDescription,
  interpretCameraPath,
  createAppChat,
  analyzeScriptBreakdown,
  generateBlockingFromScript,
} from '../gemini/geminiProductionService';

describe('geminiProductionService — integration', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Color grading ─────────────────────────────────────────────
  describe('calculateColorGrade', () => {
    it('should return a color grade object from two frames', async () => {
      const colorGrade = {
        temperature: 5500,
        tint: 10,
        contrast: 20,
        saturation: 15,
        shadows: '#1a1a2e',
        midtones: '#4a4a6a',
        highlights: '#f0e6d3',
      };
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(colorGrade) });

      const result = await calculateColorGrade('sourceframe', 'targetframe');
      expect(result.temperature).toBe(5500);
      expect(result.shadows).toBe('#1a1a2e');
    });
  });

  describe('generateColorGrade', () => {
    it('should return a color grade from a text description', async () => {
      const colorGrade = {
        temperature: 3200,
        tint: -5,
        contrast: 30,
        saturation: -20,
        shadows: '#0a0a1a',
        midtones: '#2a2a4a',
        highlights: '#ccccff',
      };
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(colorGrade) });

      const result = await generateColorGrade('cold blue noir');
      expect(result.temperature).toBe(3200);
    });
  });

  // ── Scene bridging ────────────────────────────────────────────
  describe('bridgeScenes', () => {
    it('should return transition shots between two scenes', async () => {
      const shots = [
        { prompt: 'Dissolve from forest to city skyline', duration: 2 },
        { prompt: 'Light particles transition', duration: 1.5 },
      ];
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(shots) });

      const result = await bridgeScenes('dense forest at night', 'bustling city at dawn');
      expect(result).toHaveLength(2);
    });

    it('should propagate errors', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('fail'));
      await expect(bridgeScenes('a', 'b')).rejects.toThrow('fail');
    });
  });

  describe('generateLocationDescription', () => {
    it('should return a detailed location description', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'A dimly lit alley with flickering neon signs and wet cobblestones.',
      });

      const result = await generateLocationDescription('dark alley', 'noir', 'en');
      expect(result).toContain('neon');
    });
  });

  describe('interpretCameraPath', () => {
    it('should return a camera movement description from coordinates', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Smooth tracking shot from left to right with a subtle dolly-in.',
      });

      const result = await interpretCameraPath([
        { x: 0, y: 50 },
        { x: 25, y: 50 },
        { x: 50, y: 45 },
        { x: 75, y: 40 },
      ]);
      expect(result).toContain('tracking');
    });
  });

  // ── Chat ──────────────────────────────────────────────────────
  describe('createAppChat', () => {
    it('should return a chat instance with sendMessage', async () => {
      const chat = createAppChat();
      // createAppChat returns the raw SDK chat object from ai.chats.create
      expect(chat).toHaveProperty('sendMessage');
    });
  });

  // ── Script breakdown ──────────────────────────────────────────
  describe('analyzeScriptBreakdown', () => {
    it('should return a structured shot list from script text', async () => {
      const breakdown = [
        {
          scene_number: '1A',
          action_summary: 'A wide angle view of a gothic castle at night.',
          visual_prompt: 'Establishing wide shot of a gothic castle...',
          duration: 3,
        },
        {
          scene_number: '1B',
          action_summary: 'A hooded figure approaching the castle gate.',
          visual_prompt: 'Medium shot of hooded figure...',
          duration: 4,
        },
      ];
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(breakdown) });

      const result = await analyzeScriptBreakdown(
        'INT. CASTLE - NIGHT\nA hooded figure approaches.',
      );
      expect(result).toHaveLength(2);
      expect(result[0].scene).toBe('1A');
      expect(result[0].description).toBe('A wide angle view of a gothic castle at night.');
    });

    it('should propagate errors via parseAndThrowApiError', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('fail'));
      await expect(analyzeScriptBreakdown('test')).rejects.toThrow('fail');
    });
  });

  // ── Blocking from script ──────────────────────────────────────
  describe('generateBlockingFromScript', () => {
    it('should return shot blocking from a script with characters', async () => {
      const shots = [
        {
          prompt: 'JACK stands at the window, looking out.',
          characterPositions: { JACK: 'left-center' },
          cameraMovement: 'static medium',
        },
      ];
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(shots) });

      const result = await generateBlockingFromScript('JACK looks out the window.', [
        { name: 'JACK', archetype: 'protagonist' } as any,
      ]);
      expect(result).toHaveLength(1);
    });
  });
});
