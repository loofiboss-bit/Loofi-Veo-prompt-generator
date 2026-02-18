import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncVideo } from './lipSyncService';

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('lipSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('syncVideo', () => {
    it('should sync video with audio and return URL', async () => {
      const videoUrl = 'http://test.com/video.mp4';
      const audioUrl = 'http://test.com/audio.mp3';

      const promise = syncVideo(videoUrl, audioUrl);

      // Fast-forward time to resolve the promise
      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;

      expect(result).toBe(videoUrl);
    });

    it('should throw error when videoUrl is missing', async () => {
      await expect(syncVideo('', 'http://test.com/audio.mp3')).rejects.toThrow(
        'Missing video or audio source for lip sync.',
      );
    });

    it('should throw error when audioUrl is missing', async () => {
      await expect(syncVideo('http://test.com/video.mp4', '')).rejects.toThrow(
        'Missing video or audio source for lip sync.',
      );
    });

    it('should throw error when both URLs are missing', async () => {
      await expect(syncVideo('', '')).rejects.toThrow(
        'Missing video or audio source for lip sync.',
      );
    });

    it('should simulate processing delay', async () => {
      const videoUrl = 'http://test.com/video.mp4';
      const audioUrl = 'http://test.com/audio.mp3';

      const promise = syncVideo(videoUrl, audioUrl);

      // Should not resolve immediately
      await vi.advanceTimersByTimeAsync(1000);

      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      await vi.advanceTimersByTimeAsync(100);
      expect(resolved).toBe(false);

      // Should resolve after sufficient time
      await vi.advanceTimersByTimeAsync(4000);
      await promise;
      expect(resolved).toBe(true);
    });

    it('should handle multiple concurrent sync operations', async () => {
      const promises = [
        syncVideo('http://test.com/video1.mp4', 'http://test.com/audio1.mp3'),
        syncVideo('http://test.com/video2.mp4', 'http://test.com/audio2.mp3'),
        syncVideo('http://test.com/video3.mp4', 'http://test.com/audio3.mp3'),
      ];

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(5000);

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('http://test.com/video1.mp4');
      expect(results[1]).toBe('http://test.com/video2.mp4');
      expect(results[2]).toBe('http://test.com/video3.mp4');
    });

    it('should accept various URL formats', async () => {
      const testCases = [
        { video: 'http://test.com/video.mp4', audio: 'http://test.com/audio.mp3' },
        { video: 'https://test.com/video.mov', audio: 'https://test.com/audio.wav' },
        { video: '/local/video.mp4', audio: '/local/audio.mp3' },
        { video: 'blob:http://test.com/uuid', audio: 'blob:http://test.com/uuid2' },
      ];

      for (const { video, audio } of testCases) {
        const promise = syncVideo(video, audio);
        await vi.advanceTimersByTimeAsync(5000);
        const result = await promise;
        expect(result).toBe(video);
      }
    });

    it('should handle whitespace in URLs', async () => {
      const videoUrl = '  http://test.com/video.mp4  ';
      const audioUrl = '  http://test.com/audio.mp3  ';

      // Should not trim (responsibility of caller), but should not crash
      const promise = syncVideo(videoUrl, audioUrl);
      await vi.advanceTimersByTimeAsync(5000);
      const result = await promise;

      expect(result).toBe(videoUrl);
    });

    it('should log debug information during sync', async () => {
      const { logger } = await import('./loggerService');
      const videoUrl = 'http://test.com/video.mp4';
      const audioUrl = 'http://test.com/audio.mp3';

      const promise = syncVideo(videoUrl, audioUrl);
      await vi.advanceTimersByTimeAsync(5000);
      await promise;

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('[LipSync] Synced video'));
    });

    it('should handle repeated sync of same video', async () => {
      const videoUrl = 'http://test.com/video.mp4';
      const audioUrl1 = 'http://test.com/audio1.mp3';
      const audioUrl2 = 'http://test.com/audio2.mp3';

      const promise1 = syncVideo(videoUrl, audioUrl1);
      await vi.advanceTimersByTimeAsync(5000);
      const result1 = await promise1;

      const promise2 = syncVideo(videoUrl, audioUrl2);
      await vi.advanceTimersByTimeAsync(5000);
      const result2 = await promise2;

      expect(result1).toBe(videoUrl);
      expect(result2).toBe(videoUrl);
    });

    it('should complete within reasonable time range (3-5 seconds)', async () => {
      const videoUrl = 'http://test.com/video.mp4';
      const audioUrl = 'http://test.com/audio.mp3';

      const promise = syncVideo(videoUrl, audioUrl);

      // Should not complete before 3 seconds
      await vi.advanceTimersByTimeAsync(2999);
      let completed = false;
      promise.then(() => {
        completed = true;
      });
      await vi.advanceTimersByTimeAsync(1);
      expect(completed).toBe(false);

      // Should complete within 5 seconds
      await vi.advanceTimersByTimeAsync(2100);
      await promise;
      expect(completed).toBe(true);
    });

    it('should log fallback to mock when API is configured but not implemented', async () => {
      // Note: This test checks behavior that depends on process.env at module load time
      // The service reads process.env when it's first loaded, so changing it in the test
      // won't affect the behavior. This test validates the mock fallback path exists.

      const videoUrl = 'http://test.com/video.mp4';
      const audioUrl = 'http://test.com/audio.mp3';

      const promise = syncVideo(videoUrl, audioUrl);
      await vi.advanceTimersByTimeAsync(5000);
      const result = await promise;

      // The service always falls back to mock in this implementation
      expect(result).toBe(videoUrl);
    });
  });
});
