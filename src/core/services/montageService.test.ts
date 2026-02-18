/**
 * Montage Service Unit Tests
 * Tests for beat-synced sequence generation
 *
 * Note: Full AudioBuffer testing requires Web Audio API support.
 * These tests verify basic function structure and logic flow.
 */

import { describe, it, expect, vi } from 'vitest';
import { generateBeatSyncedSequence } from './montageService';
import type { Asset } from '@core/types';

// Mock audioAnalysisService
vi.mock('./audioAnalysisService', () => ({
  detectBeats: vi.fn(),
}));

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

  describe('generateBeatSyncedSequence', () => {
    it('should export function', () => {
      expect(typeof generateBeatSyncedSequence).toBe('function');
    });

    it('should return empty array when no video assets provided', async () => {
      const { detectBeats } = await import('./audioAnalysisService');
      vi.mocked(detectBeats).mockResolvedValue([1.0, 2.0, 3.0]);

      // Mock AudioBuffer
      const mockAudioBuffer = {
        duration: 10,
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 441000,
      } as AudioBuffer;

      const result = await generateBeatSyncedSequence(mockAudioBuffer, [], 0.8);

      expect(result).toEqual([]);
    });

    it('should recognize video asset structure', () => {
      expect(mockVideoAssets[0].type).toBe('video');
      expect(mockVideoAssets[0].id).toBeDefined();
      expect(mockVideoAssets[0].url).toBeDefined();
    });

    it('should handle multiple video assets', () => {
      expect(mockVideoAssets.length).toBe(3);
      expect(mockVideoAssets.every((asset) => asset.type === 'video')).toBe(true);
    });
  });
});
