import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

vi.mock('../loggerService', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../apiKeyService', () => ({
  getStoredApiKey: vi.fn().mockReturnValue('test-api-key'),
  getStoredApiKeyAsync: vi.fn().mockResolvedValue('test-api-key'),
}));

const {
  mockGenerateContent,
  mockGenerateVideos,
  mockGetVideosOperation,
  mockChatsCreate,
  mockParseAndThrowApiError,
} = vi.hoisted(() => {
  const sendMessage = vi.fn();
  return {
    mockGenerateContent: vi.fn(),
    mockGenerateVideos: vi.fn(),
    mockGetVideosOperation: vi.fn(),
    mockSendMessage: sendMessage,
    mockChatsCreate: vi.fn().mockReturnValue({ sendMessage }),
    mockParseAndThrowApiError: vi.fn((error: unknown) => {
      throw error;
    }),
  };
});

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent, generateVideos: mockGenerateVideos };
    operations = { getVideosOperation: mockGetVideosOperation };
    chats = {
      create: mockChatsCreate,
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
  parseAndThrowApiError: mockParseAndThrowApiError,
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
  generateBridgeVideo,
  generateBlockingFromScript,
} from '../gemini/geminiProductionService';

describe('geminiProductionService — integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      expect((result as unknown as Record<string, unknown>).temperature).toBe(5500);
      expect((result as unknown as Record<string, unknown>).shadows).toBe('#1a1a2e');
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
      expect((result as unknown as Record<string, unknown>).temperature).toBe(3200);
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

    it('returns empty string when model response has no text', async () => {
      mockGenerateContent.mockResolvedValueOnce({});

      const result = await generateLocationDescription('desert', 'minimal', 'en');
      expect(result).toBe('');
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

    it('returns empty string when camera path response has no text', async () => {
      mockGenerateContent.mockResolvedValueOnce({});

      const result = await interpretCameraPath([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]);
      expect(result).toBe('');
    });
  });

  // ── Chat ──────────────────────────────────────────────────────
  describe('createAppChat', () => {
    it('should return a chat instance with sendMessage', async () => {
      const chat = await createAppChat();
      // createAppChat returns the raw SDK chat object from ai.chats.create
      expect(chat).toHaveProperty('sendMessage');
      expect(mockChatsCreate).toHaveBeenCalledTimes(1);
      const config = mockChatsCreate.mock.calls[0][0];
      expect(config.model).toBe('gemini-3.5-flash');
      expect(config.config.tools[0].functionDeclarations).toHaveLength(4);
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
      expect(result[0].id).toContain('breakdown_');
      expect(result[0].scene).toBe('1A');
      expect(result[0].description).toBe('A wide angle view of a gothic castle at night.');
      expect(result[0].status).toBe('pending');
    });

    it('should propagate errors via parseAndThrowApiError', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('fail'));
      await expect(analyzeScriptBreakdown('test')).rejects.toThrow('fail');
      expect(mockParseAndThrowApiError).toHaveBeenCalled();
    });
  });

  // ── Bridge video ─────────────────────────────────────────────
  describe('generateBridgeVideo', () => {
    it('returns authenticated video URL when operation completes immediately', async () => {
      mockGenerateVideos.mockResolvedValueOnce({
        done: true,
        response: {
          generatedVideos: [{ video: { uri: 'https://video.example/bridge.mp4' } }],
        },
      });

      const result = await generateBridgeVideo('start-frame', 'end-frame');

      expect(result).toBe('https://video.example/bridge.mp4?key=test-api-key');
      expect(mockGenerateVideos).toHaveBeenCalledTimes(1);
      expect(mockGetVideosOperation).not.toHaveBeenCalled();
    });

    it('polls operations API until done', async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => {
        if (typeof fn === 'function') fn();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      });

      const pendingOperation = { done: false, name: 'op-1' };
      mockGenerateVideos.mockResolvedValueOnce(pendingOperation);
      mockGetVideosOperation.mockResolvedValueOnce({
        done: true,
        response: {
          generatedVideos: [{ video: { uri: 'https://video.example/polled.mp4' } }],
        },
      });

      const result = await generateBridgeVideo('start-frame', 'end-frame', 'custom prompt');

      expect(result).toBe('https://video.example/polled.mp4?key=test-api-key');
      expect(mockGetVideosOperation).toHaveBeenCalledTimes(1);
      setTimeoutSpy.mockRestore();
    });

    it('propagates error handler when no video URI is produced', async () => {
      mockGenerateVideos.mockResolvedValueOnce({ done: true, response: { generatedVideos: [] } });

      await expect(generateBridgeVideo('start-frame', 'end-frame')).rejects.toThrow(
        'Bridge generation failed to return video URI.',
      );
      expect(mockParseAndThrowApiError).toHaveBeenCalled();
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
        { name: 'JACK', archetype: 'protagonist' } as unknown as Parameters<
          typeof generateBlockingFromScript
        >[1][number],
      ]);
      expect(result).toHaveLength(1);
    });

    it('propagates blocking errors through parser helper', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('blocking-failed'));

      await expect(generateBlockingFromScript('scene text', [])).rejects.toThrow('blocking-failed');
      expect(mockParseAndThrowApiError).toHaveBeenCalled();
    });
  });
});
