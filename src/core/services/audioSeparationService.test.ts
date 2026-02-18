import { describe, it, expect, vi, beforeEach } from 'vitest';
import { separateStems } from './audioSeparationService';

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

// Mock OfflineAudioContext
class MockOfflineAudioContext {
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  destination = {};

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
    };
  }

  createBiquadFilter() {
    return {
      type: '',
      frequency: { value: 0 },
      Q: { value: 0 },
      gain: { value: 0 },
      connect: vi.fn(),
    };
  }

  async decodeAudioData(_arrayBuffer: ArrayBuffer) {
    return {
      duration: 1,
      sampleRate: 44100,
      numberOfChannels: 1,
      length: 44100,
      getChannelData: vi.fn(() => new Float32Array(44100)),
    };
  }

  async startRendering() {
    return {
      duration: 1,
      sampleRate: this.sampleRate,
      numberOfChannels: this.numberOfChannels,
      length: this.length,
      getChannelData: vi.fn(() => new Float32Array(this.length)),
    };
  }
}

// Make OfflineAudioContext available globally
global.OfflineAudioContext = MockOfflineAudioContext as never;
(global.window as never) = { OfflineAudioContext: MockOfflineAudioContext } as never;

describe('audioSeparationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('separateStems', () => {
    it('should fetch audio and return vocal and instrumental blobs', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);
      vi.mocked(fetch).mockResolvedValue({
        arrayBuffer: async () => mockArrayBuffer,
      } as Response);

      const result = await separateStems('http://test.com/audio.mp3');

      expect(fetch).toHaveBeenCalledWith('http://test.com/audio.mp3');
      expect(result).toHaveProperty('vocals');
      expect(result).toHaveProperty('instrumental');
      expect(result.vocals).toBeInstanceOf(Blob);
      expect(result.instrumental).toBeInstanceOf(Blob);
      expect(result.vocals.type).toBe('audio/wav');
      expect(result.instrumental.type).toBe('audio/wav');
    });

    it('should throw error when audioUrl is empty', async () => {
      // Empty string will cause fetch to fail
      vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'));

      await expect(separateStems('')).rejects.toThrow(
        'Failed to process audio for stem separation.',
      );
    });

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(separateStems('http://test.com/audio.mp3')).rejects.toThrow(
        'Failed to process audio for stem separation.',
      );
    });

    it('should handle decodeAudioData errors', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);

      vi.mocked(fetch).mockResolvedValue({
        arrayBuffer: async () => mockArrayBuffer,
      } as Response);

      // Mock OfflineAudioContext to throw during decodeAudioData
      const originalOfflineAudioContext = global.OfflineAudioContext;

      global.OfflineAudioContext = class {
        constructor() {
          // Constructor needs to work
        }

        async decodeAudioData() {
          throw new Error('Invalid audio format');
        }
      } as never;

      await expect(separateStems('http://test.com/audio.mp3')).rejects.toThrow(
        'Failed to process audio for stem separation.',
      );

      // Restore
      global.OfflineAudioContext = originalOfflineAudioContext;
    });

    it('should process audio with multiple channels', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);
      vi.mocked(fetch).mockResolvedValue({
        arrayBuffer: async () => mockArrayBuffer,
      } as Response);

      // Mock stereo audio
      const originalOfflineAudioContext = global.OfflineAudioContext;
      global.OfflineAudioContext = class extends MockOfflineAudioContext {
        async decodeAudioData() {
          return {
            duration: 2,
            sampleRate: 44100,
            numberOfChannels: 2,
            length: 88200,
            getChannelData: vi.fn(() => new Float32Array(88200)),
          };
        }
        async startRendering() {
          return {
            duration: 2,
            sampleRate: 44100,
            numberOfChannels: 2,
            length: 88200,
            getChannelData: vi.fn(() => new Float32Array(88200)),
          };
        }
      } as never;

      const result = await separateStems('http://test.com/stereo.mp3');

      expect(result.vocals).toBeInstanceOf(Blob);
      expect(result.instrumental).toBeInstanceOf(Blob);

      // Restore
      global.OfflineAudioContext = originalOfflineAudioContext;
    });

    it('should apply bandpass filter for vocals', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);
      vi.mocked(fetch).mockResolvedValue({
        arrayBuffer: async () => mockArrayBuffer,
      } as Response);

      const mockCreateBiquadFilter = vi.fn(() => ({
        type: '',
        frequency: { value: 0 },
        Q: { value: 0 },
        gain: { value: 0 },
        connect: vi.fn(),
      }));

      const originalOfflineAudioContext = global.OfflineAudioContext;
      global.OfflineAudioContext = class extends MockOfflineAudioContext {
        createBiquadFilter = mockCreateBiquadFilter;
      } as never;

      await separateStems('http://test.com/audio.mp3');

      // Should create filters for vocal isolation (highpass + lowpass)
      expect(mockCreateBiquadFilter).toHaveBeenCalled();

      // Restore
      global.OfflineAudioContext = originalOfflineAudioContext;
    });

    it('should return blobs with non-zero size', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);
      vi.mocked(fetch).mockResolvedValue({
        arrayBuffer: async () => mockArrayBuffer,
      } as Response);

      const result = await separateStems('http://test.com/audio.mp3');

      expect(result.vocals.size).toBeGreaterThan(0);
      expect(result.instrumental.size).toBeGreaterThan(0);
    });

    it('should handle different audio formats', async () => {
      const mockArrayBuffer = new ArrayBuffer(200);
      vi.mocked(fetch).mockResolvedValue({
        arrayBuffer: async () => mockArrayBuffer,
      } as Response);

      const formats = [
        'http://test.com/audio.mp3',
        'http://test.com/audio.wav',
        'http://test.com/audio.ogg',
      ];

      for (const url of formats) {
        const result = await separateStems(url);
        expect(result.vocals).toBeInstanceOf(Blob);
        expect(result.instrumental).toBeInstanceOf(Blob);
      }
    });
  });
});
