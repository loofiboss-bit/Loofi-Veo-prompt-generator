/**
 * Stock Media Service Unit Tests
 * Tests for mock stock video and audio search functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchStockVideo, searchStockAudio } from './stockMediaService';

describe('stockMediaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchStockVideo', () => {
    it('should return all videos when query is empty', async () => {
      const results = await searchStockVideo('');

      expect(results).toHaveLength(6);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('type', 'video');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('author');
      expect(results[0]).toHaveProperty('duration');
      expect(results[0]).toHaveProperty('url');
      expect(results[0]).toHaveProperty('thumbnailUrl');
    });

    it('should filter videos by title', async () => {
      const results = await searchStockVideo('city');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title.toLowerCase()).toContain('city');
    });

    it('should filter videos by author', async () => {
      const results = await searchStockVideo('tom');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].author.toLowerCase()).toContain('tom');
    });

    it('should be case-insensitive', async () => {
      const resultsLower = await searchStockVideo('ocean');
      const resultsUpper = await searchStockVideo('OCEAN');

      expect(resultsLower).toEqual(resultsUpper);
    });

    it('should return empty array when no matches found', async () => {
      const results = await searchStockVideo('nonexistent-query-xyz');

      expect(results).toEqual([]);
    });

    it('should simulate network latency', async () => {
      const start = Date.now();
      await searchStockVideo('');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(400); // Allow some margin
    });

    it('should return videos with expected properties', async () => {
      const results = await searchStockVideo('forest');

      if (results.length > 0) {
        const video = results[0];
        expect(video.id).toBeDefined();
        expect(typeof video.id).toBe('string');
        expect(video.type).toBe('video');
        expect(typeof video.title).toBe('string');
        expect(typeof video.author).toBe('string');
        expect(typeof video.duration).toBe('number');
        expect(video.duration).toBeGreaterThan(0);
        expect(video.url).toMatch(/^https?:\/\//);
        expect(video.thumbnailUrl).toMatch(/^https?:\/\//);
      }
    });
  });

  describe('searchStockAudio', () => {
    it('should return all audio when query is empty', async () => {
      const results = await searchStockAudio('');

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('type', 'audio');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('author');
      expect(results[0]).toHaveProperty('duration');
      expect(results[0]).toHaveProperty('url');
      expect(results[0]).not.toHaveProperty('thumbnailUrl');
    });

    it('should filter audio by title', async () => {
      const results = await searchStockAudio('ambient');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title.toLowerCase()).toContain('ambient');
    });

    it('should filter audio by author', async () => {
      const results = await searchStockAudio('soundbay');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].author.toLowerCase()).toContain('soundbay');
    });

    it('should be case-insensitive', async () => {
      const resultsLower = await searchStockAudio('corporate');
      const resultsUpper = await searchStockAudio('CORPORATE');

      expect(resultsLower).toEqual(resultsUpper);
    });

    it('should return empty array when no matches found', async () => {
      const results = await searchStockAudio('nonexistent-audio-xyz');

      expect(results).toEqual([]);
    });

    it('should simulate network latency', async () => {
      const start = Date.now();
      await searchStockAudio('');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(400); // Allow some margin
    });

    it('should return audio with expected properties', async () => {
      const results = await searchStockAudio('cinematic');

      if (results.length > 0) {
        const audio = results[0];
        expect(audio.id).toBeDefined();
        expect(typeof audio.id).toBe('string');
        expect(audio.type).toBe('audio');
        expect(typeof audio.title).toBe('string');
        expect(typeof audio.author).toBe('string');
        expect(typeof audio.duration).toBe('number');
        expect(audio.duration).toBeGreaterThan(0);
        expect(audio.url).toMatch(/^https?:\/\//);
      }
    });
  });
});
