import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectBeats,
  detectSilence,
  calculateDuckingEnvelope,
  createSpatialPanner,
  updateSpatialPanner,
  getFrequencyEnergy,
} from './audioAnalysisService';

// Mock AudioContext and related APIs for jsdom
const mockAudioContext = {
  createPanner: vi.fn(() => ({
    panningModel: '',
    distanceModel: '',
    refDistance: 0,
    maxDistance: 0,
    rolloffFactor: 0,
    coneInnerAngle: 0,
    coneOuterAngle: 0,
    coneOuterGain: 0,
    setPosition: vi.fn(),
    positionX: { value: 0 },
    positionZ: { value: 0 },
  })),
  sampleRate: 44100,
};

const createMockAudioBuffer = (
  length: number,
  sampleRate: number = 44100,
  numberOfChannels: number = 1,
): AudioBuffer => {
  const buffer = {
    length,
    sampleRate,
    numberOfChannels,
    duration: length / sampleRate,
    getChannelData: vi.fn((channel: number) => {
      if (channel >= numberOfChannels) throw new Error('Invalid channel');
      return new Float32Array(length);
    }),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  } as unknown as AudioBuffer;
  return buffer;
};

describe('audioAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectBeats', () => {
    it('should detect beats in audio with sufficient energy peaks', () => {
      const buffer = createMockAudioBuffer(44100); // 1 second
      const channelData = new Float32Array(44100);

      // Create artificial beats at 0.2s, 0.5s, 0.8s
      for (let i = 0; i < 3; i++) {
        const peakIndex = Math.floor((0.2 + i * 0.3) * 44100);
        for (let j = 0; j < 100; j++) {
          channelData[peakIndex + j] = 0.8;
        }
      }

      vi.mocked(buffer.getChannelData).mockReturnValue(channelData);

      const beats = detectBeats(buffer, 1.2, 0.3);

      expect(beats).toBeInstanceOf(Array);
      expect(beats.length).toBeGreaterThan(0);
      beats.forEach((beat) => {
        expect(beat).toBeGreaterThanOrEqual(0);
        expect(beat).toBeLessThanOrEqual(1);
      });
    });

    it('should return empty array for silent audio', () => {
      const buffer = createMockAudioBuffer(44100);
      const silentData = new Float32Array(44100); // All zeros

      vi.mocked(buffer.getChannelData).mockReturnValue(silentData);

      const beats = detectBeats(buffer);

      expect(beats).toEqual([]);
    });

    it('should respect minimum peak distance parameter', () => {
      const buffer = createMockAudioBuffer(44100);
      const channelData = new Float32Array(44100);

      // Create two beats very close together (0.1s apart)
      channelData.fill(0.8, 4410, 4510); // 0.1s
      channelData.fill(0.8, 8820, 8920); // 0.2s

      vi.mocked(buffer.getChannelData).mockReturnValue(channelData);

      const beats = detectBeats(buffer, 1.2, 0.15);

      // With minPeakDistance of 0.15s, beats closer than that should be filtered
      for (let i = 1; i < beats.length; i++) {
        expect(beats[i] - beats[i - 1]).toBeGreaterThanOrEqual(0.15);
      }
    });

    it('should handle custom threshold parameter', () => {
      const buffer = createMockAudioBuffer(44100);
      const channelData = new Float32Array(44100);

      // Create moderate energy peak
      channelData.fill(0.3, 22050, 22150);

      vi.mocked(buffer.getChannelData).mockReturnValue(channelData);

      const beatsLowThreshold = detectBeats(buffer, 1.0, 0.3);
      const beatsHighThreshold = detectBeats(buffer, 2.0, 0.3);

      // Lower threshold should detect more beats
      expect(beatsLowThreshold.length).toBeGreaterThanOrEqual(beatsHighThreshold.length);
    });
  });

  describe('detectSilence', () => {
    it('should detect silence periods in audio', () => {
      const buffer = createMockAudioBuffer(88200); // 2 seconds
      const channelData = new Float32Array(88200);

      // Create pattern: loud -> silent -> loud
      channelData.fill(0.5, 0, 22050); // 0-0.5s: loud
      channelData.fill(0.001, 22050, 66150); // 0.5-1.5s: silent
      channelData.fill(0.5, 66150, 88200); // 1.5-2s: loud

      vi.mocked(buffer.getChannelData).mockReturnValue(channelData);

      const silences = detectSilence(buffer, -40, 0.5);

      expect(silences).toBeInstanceOf(Array);
      expect(silences.length).toBeGreaterThan(0);

      // Should detect the silence in the middle
      const silence = silences[0];
      expect(silence.start).toBeGreaterThan(0.4);
      expect(silence.start).toBeLessThan(0.6);
      expect(silence.end).toBeGreaterThan(1.4);
      expect(silence.end).toBeLessThan(1.6);
    });

    it('should return empty array for continuously loud audio', () => {
      const buffer = createMockAudioBuffer(44100);
      const loudData = new Float32Array(44100);
      loudData.fill(0.5); // Continuously loud

      vi.mocked(buffer.getChannelData).mockReturnValue(loudData);

      const silences = detectSilence(buffer, -40, 0.5);

      expect(silences).toEqual([]);
    });

    it('should not detect silence shorter than minimum duration', () => {
      const buffer = createMockAudioBuffer(44100);
      const channelData = new Float32Array(44100);

      // Create short silence (0.2s) with minDuration of 0.5s
      channelData.fill(0.5, 0, 17640); // Loud
      channelData.fill(0.001, 17640, 26460); // 0.2s silence
      channelData.fill(0.5, 26460, 44100); // Loud

      vi.mocked(buffer.getChannelData).mockReturnValue(channelData);

      const silences = detectSilence(buffer, -40, 0.5);

      expect(silences).toEqual([]);
    });

    it('should handle audio ending in silence', () => {
      const buffer = createMockAudioBuffer(44100);
      const channelData = new Float32Array(44100);

      // Loud then silent to end
      channelData.fill(0.5, 0, 22050);
      channelData.fill(0.001, 22050, 44100);

      vi.mocked(buffer.getChannelData).mockReturnValue(channelData);

      const silences = detectSilence(buffer, -40, 0.3);

      expect(silences.length).toBeGreaterThan(0);
      const lastSilence = silences[silences.length - 1];
      expect(lastSilence.end).toBeCloseTo(1, 1);
    });
  });

  describe('calculateDuckingEnvelope', () => {
    it('should generate volume keyframes for ducking', () => {
      const dialogueBuffer = createMockAudioBuffer(44100);
      const musicBuffer = createMockAudioBuffer(44100);
      const channelData = new Float32Array(44100);

      // Create speech pattern
      channelData.fill(0.05, 11025, 33075); // Speech from 0.25s to 0.75s

      vi.mocked(dialogueBuffer.getChannelData).mockReturnValue(channelData);

      const keyframes = calculateDuckingEnvelope(dialogueBuffer, musicBuffer);

      expect(keyframes).toBeInstanceOf(Array);
      expect(keyframes.length).toBeGreaterThan(0);

      // First keyframe should start at time 0
      expect(keyframes[0].time).toBe(0);
      expect(keyframes[0].value).toBe(1);

      // All keyframes should have valid values
      keyframes.forEach((kf) => {
        expect(kf.time).toBeGreaterThanOrEqual(0);
        expect(kf.value).toBeGreaterThanOrEqual(0);
        expect(kf.value).toBeLessThanOrEqual(1);
      });
    });

    it('should return sorted keyframes', () => {
      const dialogueBuffer = createMockAudioBuffer(44100);
      const musicBuffer = createMockAudioBuffer(44100);
      const channelData = new Float32Array(44100);

      channelData.fill(0.05, 11025, 22050);

      vi.mocked(dialogueBuffer.getChannelData).mockReturnValue(channelData);

      const keyframes = calculateDuckingEnvelope(dialogueBuffer, musicBuffer);

      // Verify keyframes are sorted by time
      for (let i = 1; i < keyframes.length; i++) {
        expect(keyframes[i].time).toBeGreaterThanOrEqual(keyframes[i - 1].time);
      }
    });

    it('should handle silent dialogue buffer', () => {
      const dialogueBuffer = createMockAudioBuffer(44100);
      const musicBuffer = createMockAudioBuffer(44100);
      const silentData = new Float32Array(44100); // All zeros

      vi.mocked(dialogueBuffer.getChannelData).mockReturnValue(silentData);

      const keyframes = calculateDuckingEnvelope(dialogueBuffer, musicBuffer);

      // Should have minimal keyframes (start at 100%)
      expect(keyframes.length).toBeGreaterThan(0);
      expect(keyframes[0].time).toBe(0);
      expect(keyframes[0].value).toBe(1);
    });

    it('should include ducked volume values during speech', () => {
      const dialogueBuffer = createMockAudioBuffer(44100);
      const musicBuffer = createMockAudioBuffer(44100);
      const channelData = new Float32Array(44100);

      // Strong speech signal
      channelData.fill(0.1, 11025, 33075);

      vi.mocked(dialogueBuffer.getChannelData).mockReturnValue(channelData);

      const keyframes = calculateDuckingEnvelope(dialogueBuffer, musicBuffer);

      // Should have some keyframes with ducked volume (< 1.0)
      const duckedKeyframes = keyframes.filter((kf) => kf.value < 1.0);
      expect(duckedKeyframes.length).toBeGreaterThan(0);
    });
  });

  describe('createSpatialPanner', () => {
    it('should create and configure a PannerNode', () => {
      const ctx = mockAudioContext as unknown as AudioContext;

      const panner = createSpatialPanner(ctx, 0.5, -0.5);

      expect(ctx.createPanner).toHaveBeenCalled();
      expect(panner).toBeDefined();
      expect(panner.panningModel).toBe('HRTF');
      expect(panner.distanceModel).toBe('linear');
    });

    it('should set position based on x and z coordinates', () => {
      const mockSetPosition = vi.fn();
      const mockPanner = {
        panningModel: '',
        distanceModel: '',
        refDistance: 0,
        maxDistance: 0,
        rolloffFactor: 0,
        coneInnerAngle: 0,
        coneOuterAngle: 0,
        coneOuterGain: 0,
        setPosition: mockSetPosition,
        positionX: { value: 0 },
        positionZ: { value: 0 },
      };

      const ctx = {
        createPanner: vi.fn(() => mockPanner),
        sampleRate: 44100,
      } as unknown as AudioContext;

      createSpatialPanner(ctx, 0.5, -0.5);

      expect(mockSetPosition).toHaveBeenCalledWith(2.5, 0, -2.5);
    });

    it('should handle center position (0, 0)', () => {
      const mockSetPosition = vi.fn();
      const mockPanner = {
        panningModel: '',
        distanceModel: '',
        refDistance: 0,
        maxDistance: 0,
        rolloffFactor: 0,
        coneInnerAngle: 0,
        coneOuterAngle: 0,
        coneOuterGain: 0,
        setPosition: mockSetPosition,
        positionX: { value: 0 },
        positionZ: { value: 0 },
      };

      const ctx = {
        createPanner: vi.fn(() => mockPanner),
        sampleRate: 44100,
      } as unknown as AudioContext;

      createSpatialPanner(ctx, 0, 0);

      expect(mockSetPosition).toHaveBeenCalledWith(0, 0, 0);
    });

    it('should handle extreme positions', () => {
      const mockSetPosition = vi.fn();
      const mockPanner = {
        panningModel: '',
        distanceModel: '',
        refDistance: 0,
        maxDistance: 0,
        rolloffFactor: 0,
        coneInnerAngle: 0,
        coneOuterAngle: 0,
        coneOuterGain: 0,
        setPosition: mockSetPosition,
        positionX: { value: 0 },
        positionZ: { value: 0 },
      };

      const ctx = {
        createPanner: vi.fn(() => mockPanner),
        sampleRate: 44100,
      } as unknown as AudioContext;

      createSpatialPanner(ctx, 1, 1);

      expect(mockSetPosition).toHaveBeenCalledWith(5, 0, 5);
    });
  });

  describe('updateSpatialPanner', () => {
    it('should update panner position using positionX/positionZ properties', () => {
      const mockPanner = {
        positionX: { value: 0 },
        positionZ: { value: 0 },
        setPosition: vi.fn(),
      } as unknown as PannerNode;

      updateSpatialPanner(mockPanner, 0.5, -0.5);

      expect(mockPanner.positionX.value).toBe(2.5);
      expect(mockPanner.positionZ.value).toBe(-2.5);
      expect(mockPanner.setPosition).not.toHaveBeenCalled();
    });

    it('should fall back to setPosition if positionX is not available', () => {
      const mockPanner = {
        positionX: undefined,
        setPosition: vi.fn(),
      } as unknown as PannerNode;

      updateSpatialPanner(mockPanner, 0.5, -0.5);

      expect(mockPanner.setPosition).toHaveBeenCalledWith(2.5, 0, -2.5);
    });

    it('should handle zero coordinates', () => {
      const mockPanner = {
        positionX: { value: 10 },
        positionZ: { value: 10 },
        setPosition: vi.fn(),
      } as unknown as PannerNode;

      updateSpatialPanner(mockPanner, 0, 0);

      expect(mockPanner.positionX.value).toBe(0);
      expect(mockPanner.positionZ.value).toBe(0);
    });
  });

  describe('getFrequencyEnergy', () => {
    it('should calculate bass energy correctly', () => {
      const mockAnalyser = {
        frequencyBinCount: 1024,
        context: { sampleRate: 44100 },
        getByteFrequencyData: vi.fn((dataArray: Uint8Array) => {
          // Fill bass range (20-140 Hz) with high values
          for (let i = 0; i < 10; i++) {
            dataArray[i] = 200;
          }
        }),
      } as unknown as AnalyserNode;

      const energy = getFrequencyEnergy(mockAnalyser, 'bass');

      expect(energy).toBeGreaterThan(0);
      expect(energy).toBeLessThanOrEqual(1);
      expect(mockAnalyser.getByteFrequencyData).toHaveBeenCalled();
    });

    it('should calculate mids energy correctly', () => {
      const mockAnalyser = {
        frequencyBinCount: 1024,
        context: { sampleRate: 44100 },
        getByteFrequencyData: vi.fn((dataArray: Uint8Array) => {
          // Fill mids range (140-2000 Hz) with medium values
          for (let i = 10; i < 100; i++) {
            dataArray[i] = 128;
          }
        }),
      } as unknown as AnalyserNode;

      const energy = getFrequencyEnergy(mockAnalyser, 'mids');

      expect(energy).toBeGreaterThan(0);
      expect(energy).toBeLessThanOrEqual(1);
    });

    it('should calculate highs energy correctly', () => {
      const mockAnalyser = {
        frequencyBinCount: 1024,
        context: { sampleRate: 44100 },
        getByteFrequencyData: vi.fn((dataArray: Uint8Array) => {
          // Fill highs range (2000-16000 Hz) with low values
          for (let i = 100; i < 1024; i++) {
            dataArray[i] = 50;
          }
        }),
      } as unknown as AnalyserNode;

      const energy = getFrequencyEnergy(mockAnalyser, 'highs');

      expect(energy).toBeGreaterThan(0);
      expect(energy).toBeLessThanOrEqual(1);
    });

    it('should return 0 for silent frequency data', () => {
      const mockAnalyser = {
        frequencyBinCount: 1024,
        context: { sampleRate: 44100 },
        getByteFrequencyData: vi.fn((dataArray: Uint8Array) => {
          dataArray.fill(0); // Silent
        }),
      } as unknown as AnalyserNode;

      const energy = getFrequencyEnergy(mockAnalyser, 'bass');

      expect(energy).toBe(0);
    });

    it('should normalize values to 0-1 range', () => {
      const mockAnalyser = {
        frequencyBinCount: 1024,
        context: { sampleRate: 44100 },
        getByteFrequencyData: vi.fn((dataArray: Uint8Array) => {
          dataArray.fill(255); // Max values
        }),
      } as unknown as AnalyserNode;

      const energy = getFrequencyEnergy(mockAnalyser, 'bass');

      expect(energy).toBeCloseTo(1, 2);
    });
  });
});
