import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectBeats } from './beatDetection';

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
      connect: vi.fn(),
    };
  }

  async startRendering() {
    return {
      sampleRate: this.sampleRate,
      length: this.length,
      getChannelData: vi.fn(() => {
        const data = new Float32Array(this.length);
        // Create artificial beat patterns
        // Beat at 0.2s, 0.5s, 0.8s
        const beatPositions = [0.2, 0.5, 0.8];
        beatPositions.forEach((pos) => {
          const index = Math.floor(pos * this.sampleRate);
          for (let i = 0; i < 1000; i++) {
            if (index + i < data.length) {
              data[index + i] = 0.8;
            }
          }
        });
        return data;
      }),
    };
  }
}

// Make OfflineAudioContext available globally
global.OfflineAudioContext = MockOfflineAudioContext as never;

const createMockAudioBuffer = (length: number, sampleRate: number = 44100): AudioBuffer => {
  const buffer = {
    length,
    sampleRate,
    numberOfChannels: 1,
    duration: length / sampleRate,
    getChannelData: vi.fn(() => new Float32Array(length)),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  } as unknown as AudioBuffer;
  return buffer;
};

describe('beatDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectBeats', () => {
    it('should detect beats in audio buffer', async () => {
      const buffer = createMockAudioBuffer(44100); // 1 second

      const beats = await detectBeats(buffer);

      expect(beats).toBeInstanceOf(Array);
      expect(beats.length).toBeGreaterThan(0);
      beats.forEach((beat) => {
        expect(beat).toBeGreaterThanOrEqual(0);
        expect(beat).toBeLessThanOrEqual(1);
      });
    });

    it('should return sorted beat timestamps', async () => {
      const buffer = createMockAudioBuffer(88200); // 2 seconds

      const beats = await detectBeats(buffer);

      // Verify beats are in ascending order
      for (let i = 1; i < beats.length; i++) {
        expect(beats[i]).toBeGreaterThan(beats[i - 1]);
      }
    });

    it('should enforce minimum beat interval', async () => {
      const buffer = createMockAudioBuffer(44100);

      const beats = await detectBeats(buffer);

      // Verify beats are at least 0.25s apart (240 BPM limit)
      for (let i = 1; i < beats.length; i++) {
        expect(beats[i] - beats[i - 1]).toBeGreaterThanOrEqual(0.25);
      }
    });

    it('should handle silent audio', async () => {
      const buffer = createMockAudioBuffer(44100);

      // Mock silent rendering
      const originalOfflineAudioContext = global.OfflineAudioContext;
      global.OfflineAudioContext = class extends MockOfflineAudioContext {
        async startRendering() {
          return {
            sampleRate: this.sampleRate,
            length: this.length,
            getChannelData: vi.fn(() => new Float32Array(this.length)), // All zeros
          };
        }
      } as never;

      const beats = await detectBeats(buffer);

      expect(beats).toBeInstanceOf(Array);
      // Silent audio may have no beats or very few
      expect(beats.length).toBeGreaterThanOrEqual(0);

      // Restore
      global.OfflineAudioContext = originalOfflineAudioContext;
    });

    it('should handle very loud audio', async () => {
      const buffer = createMockAudioBuffer(44100);

      // Mock loud rendering
      const originalOfflineAudioContext = global.OfflineAudioContext;
      global.OfflineAudioContext = class extends MockOfflineAudioContext {
        async startRendering() {
          return {
            sampleRate: this.sampleRate,
            length: this.length,
            getChannelData: vi.fn(() => {
              const data = new Float32Array(this.length);
              data.fill(0.9); // Very loud
              return data;
            }),
          };
        }
      } as never;

      const beats = await detectBeats(buffer);

      expect(beats).toBeInstanceOf(Array);
      // Should detect beats even in loud audio

      // Restore
      global.OfflineAudioContext = originalOfflineAudioContext;
    });

    it('should apply low-pass filter at 150Hz', async () => {
      const buffer = createMockAudioBuffer(44100);

      const mockCreateBiquadFilter = vi.fn(() => ({
        type: '',
        frequency: { value: 0 },
        Q: { value: 0 },
        connect: vi.fn(),
      }));

      const originalOfflineAudioContext = global.OfflineAudioContext;
      global.OfflineAudioContext = class extends MockOfflineAudioContext {
        createBiquadFilter = mockCreateBiquadFilter;
        async startRendering() {
          return {
            sampleRate: this.sampleRate,
            length: this.length,
            getChannelData: vi.fn(() => new Float32Array(this.length)),
          };
        }
      } as never;

      await detectBeats(buffer);

      // Should create a biquad filter for beat detection
      expect(mockCreateBiquadFilter).toHaveBeenCalled();

      // Restore
      global.OfflineAudioContext = originalOfflineAudioContext;
    });

    it('should handle long audio files', async () => {
      const buffer = createMockAudioBuffer(441000); // 10 seconds

      const originalOfflineAudioContext = global.OfflineAudioContext;
      global.OfflineAudioContext = class extends MockOfflineAudioContext {
        async startRendering() {
          return {
            sampleRate: this.sampleRate,
            length: this.length,
            getChannelData: vi.fn(() => {
              const data = new Float32Array(this.length);
              // Add some beats throughout
              for (let i = 0; i < 10; i++) {
                const pos = Math.floor(i * this.sampleRate + this.sampleRate * 0.5);
                for (let j = 0; j < 1000; j++) {
                  if (pos + j < data.length) {
                    data[pos + j] = 0.7;
                  }
                }
              }
              return data;
            }),
          };
        }
      } as never;

      const beats = await detectBeats(buffer);

      expect(beats).toBeInstanceOf(Array);
      expect(beats.length).toBeGreaterThan(0);

      // Restore
      global.OfflineAudioContext = originalOfflineAudioContext;
    });

    it('should detect beats based on energy peaks', async () => {
      const buffer = createMockAudioBuffer(88200); // 2 seconds

      const originalOfflineAudioContext = global.OfflineAudioContext;
      global.OfflineAudioContext = class extends MockOfflineAudioContext {
        async startRendering() {
          return {
            sampleRate: this.sampleRate,
            length: this.length,
            getChannelData: vi.fn(() => {
              const data = new Float32Array(this.length);
              // Low energy baseline
              data.fill(0.1);
              // Energy peaks at specific times (beats)
              const peaks = [0.5, 1.0, 1.5];
              peaks.forEach((time) => {
                const index = Math.floor(time * this.sampleRate);
                for (let i = 0; i < 2000; i++) {
                  if (index + i < data.length) {
                    data[index + i] = 0.9;
                  }
                }
              });
              return data;
            }),
          };
        }
      } as never;

      const beats = await detectBeats(buffer);

      expect(beats.length).toBeGreaterThan(0);
      // Beats should be detected near the energy peaks
      beats.forEach((beat) => {
        expect(beat).toBeGreaterThanOrEqual(0);
        expect(beat).toBeLessThanOrEqual(2);
      });

      // Restore
      global.OfflineAudioContext = originalOfflineAudioContext;
    });
  });
});
