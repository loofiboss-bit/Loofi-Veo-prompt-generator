import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateBeatSyncedSequence } from './montageService';
import { detectBeats } from './audioAnalysisService';
import type { Asset } from '@core/types';

// Mock audioAnalysisService
vi.mock('./audioAnalysisService', () => ({
  detectBeats: vi.fn(),
}));

const createAudioBuffer = (duration: number): AudioBuffer =>
  ({
    duration,
    numberOfChannels: 2,
    sampleRate: 44100,
    length: Math.floor(duration * 44100),
  }) as AudioBuffer;

describe('montageService', () => {
  // Create mock video assets
  const mockVideoAssets: Asset[] = [
    {
      id: 'video-1',
      type: 'video',
      url: '/videos/clip1.mp4',
      name: 'Clip 1',
      data: '',
      mimeType: 'video/mp4',
    },
    {
      id: 'video-2',
      type: 'video',
      url: '/videos/clip2.mp4',
      name: 'Clip 2',
      data: '',
      mimeType: 'video/mp4',
    },
    {
      id: 'video-3',
      type: 'video',
      url: '/videos/clip3.mp4',
      name: 'Clip 3',
      data: '',
      mimeType: 'video/mp4',
    },
  ];

  const mockDetectBeats = vi.mocked(detectBeats);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateBeatSyncedSequence', () => {
    it('returns empty array when no video assets are provided', async () => {
      mockDetectBeats.mockResolvedValue([1.0, 2.0, 3.0]);

      const result = await generateBeatSyncedSequence(createAudioBuffer(10), [], 0.8);

      expect(result).toEqual([]);
      expect(mockDetectBeats).not.toHaveBeenCalled();
    });

    it('filters beats by minimum shot duration and appends final cut point', async () => {
      mockDetectBeats.mockResolvedValue([0.2, 0.9, 1.6, 2.7, 4.0]);
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const clips = await generateBeatSyncedSequence(createAudioBuffer(5.2), mockVideoAssets, 1.0);

      expect(clips).toHaveLength(4);
      expect(clips[0].startTime).toBe(0);
      expect(clips[0].duration).toBeCloseTo(1.6);
      expect(clips[3].startTime).toBe(4.0);
      expect(clips[3].duration).toBeCloseTo(1.2);
    });

    it('rotates assets in round-robin order and computes deterministic offsets', async () => {
      mockDetectBeats.mockResolvedValue([1.0, 2.0, 3.0]);
      vi.spyOn(Date, 'now').mockReturnValue(1700000001111);
      vi.spyOn(Math, 'random').mockReturnValue(0.25);

      const clips = await generateBeatSyncedSequence(createAudioBuffer(4.5), mockVideoAssets, 0.8);

      expect(clips).toHaveLength(4);
      expect(clips.map((c) => c.resourceId)).toEqual(['video-1', 'video-2', 'video-3', 'video-1']);
      clips.forEach((clip, index) => {
        const expectedId = `auto_montage_1700000001111_${index}`;
        expect(clip.id).toBe(expectedId);
        const maxOffset = Math.max(0, 10 - clip.duration);
        expect(clip.offset).toBeCloseTo(maxOffset * 0.25);
      });
    });

    it('returns no clips when all beats are below threshold and end is not far enough', async () => {
      mockDetectBeats.mockResolvedValue([0.1, 0.2, 0.3]);

      const clips = await generateBeatSyncedSequence(createAudioBuffer(0.6), mockVideoAssets, 0.8);

      expect(clips).toEqual([]);
    });
  });
});
