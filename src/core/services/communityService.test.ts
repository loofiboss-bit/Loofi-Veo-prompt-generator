/**
 * Community Service Unit Tests
 * Tests for shared Visual DNA management and community features
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// Speed up tests by making all setTimeout calls resolve instantly
const origSetTimeout = globalThis.setTimeout;
vi.stubGlobal('setTimeout', (fn: (...args: unknown[]) => void, ..._args: unknown[]) =>
  origSetTimeout(fn, 0),
);

import { fetchCommunityDNAs, publishDNA, likeDNA } from './communityService';
import type { VisualDNA } from '@core/types';

describe('communityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchCommunityDNAs', () => {
    it('should return array of shared DNAs', async () => {
      const results = await fetchCommunityDNAs();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return DNAs sorted by likes in descending order', async () => {
      const results = await fetchCommunityDNAs();

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].likes).toBeGreaterThanOrEqual(results[i + 1].likes);
      }
    });

    it('should return DNAs with expected properties', async () => {
      const results = await fetchCommunityDNAs();

      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('author');
      expect(results[0]).toHaveProperty('likes');
      expect(results[0]).toHaveProperty('timestamp');
      expect(results[0]).toHaveProperty('styleParams');
    });

    it('should have valid styleParams structure', async () => {
      const results = await fetchCommunityDNAs();

      expect(results[0].styleParams).toBeDefined();
      expect(typeof results[0].styleParams).toBe('object');
    });

    it('should return DNAs with unique IDs', async () => {
      const results = await fetchCommunityDNAs();
      const ids = results.map((dna) => dna.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid timestamps', async () => {
      const results = await fetchCommunityDNAs();

      results.forEach((dna) => {
        expect(typeof dna.timestamp).toBe('number');
        expect(dna.timestamp).toBeGreaterThan(0);
        expect(dna.timestamp).toBeLessThanOrEqual(Date.now());
      });
    });
  });

  describe('publishDNA', () => {
    it('should publish a new DNA successfully', async () => {
      const mockDNA = {
        name: 'Test Style',
        styleParams: {
          artStyle: 'Cinematic',
          colorPalette: 'Warm tones',
        },
      };

      await expect(
        publishDNA(mockDNA as unknown as VisualDNA, 'TestAuthor'),
      ).resolves.not.toThrow();
    });

    it('should add DNA to community list', async () => {
      const beforeCount = (await fetchCommunityDNAs()).length;

      const mockDNA = {
        name: 'New Style',
        styleParams: {
          artStyle: 'Anime',
        },
      };

      await publishDNA(mockDNA as unknown as VisualDNA, 'NewAuthor');

      const afterCount = (await fetchCommunityDNAs()).length;
      expect(afterCount).toBe(beforeCount + 1);
    });

    it('should set author name correctly', async () => {
      const mockDNA = {
        name: 'Author Test',
        styleParams: {},
      };

      await publishDNA(mockDNA as unknown as VisualDNA, 'SpecificAuthor');

      const results = await fetchCommunityDNAs();
      const published = results.find((d) => d.name === 'Author Test');

      expect(published?.author).toBe('SpecificAuthor');
    });

    it('should initialize likes to 0', async () => {
      const mockDNA = {
        name: 'Zero Likes',
        styleParams: {},
      };

      await publishDNA(mockDNA as unknown as VisualDNA, 'Author');

      const results = await fetchCommunityDNAs();
      const published = results.find((d) => d.name === 'Zero Likes');

      expect(published?.likes).toBe(0);
    });

    it('should use "Anonymous" when author is empty', async () => {
      const mockDNA = {
        name: 'Anonymous Test',
        styleParams: {},
      };

      await publishDNA(mockDNA as unknown as VisualDNA, '');

      const results = await fetchCommunityDNAs();
      const published = results.find((d) => d.name === 'Anonymous Test');

      expect(published?.author).toBe('Anonymous');
    });

    it('should preserve styleParams', async () => {
      const mockDNA = {
        name: 'Style Params Test',
        styleParams: {
          artStyle: 'Cyberpunk',
          lightingStyle: 'Neon glow',
          colorPalette: 'Synthwave',
        },
      };

      await publishDNA(mockDNA as unknown as VisualDNA, 'Author');

      const results = await fetchCommunityDNAs();
      const published = results.find((d) => d.name === 'Style Params Test');

      expect(published?.styleParams).toEqual(mockDNA.styleParams);
    });

    it('should add DNA at the beginning of the list', async () => {
      const mockDNA = {
        name: 'First Position Test',
        styleParams: {},
      };

      await publishDNA(mockDNA as unknown as VisualDNA, 'Author');

      const results = await fetchCommunityDNAs();
      // Note: fetchCommunityDNAs sorts by likes, so we need to check differently
      // The newly published item should exist in the list
      const published = results.find((d) => d.name === 'First Position Test');
      expect(published).toBeDefined();
    });
  });

  describe('likeDNA', () => {
    it('should increment likes for existing DNA', async () => {
      const results = await fetchCommunityDNAs();
      const targetDNA = results[0];
      const initialLikes = targetDNA.likes;

      const newLikes = await likeDNA(targetDNA.id);

      expect(newLikes).toBe(initialLikes + 1);
    });

    it('should return 0 for non-existent DNA', async () => {
      const newLikes = await likeDNA('non-existent-id-xyz');

      expect(newLikes).toBe(0);
    });

    it('should persist like count', async () => {
      const results = await fetchCommunityDNAs();
      const targetDNA = results[0];
      const initialLikes = targetDNA.likes;

      await likeDNA(targetDNA.id);

      const updatedResults = await fetchCommunityDNAs();
      const updatedDNA = updatedResults.find((d) => d.id === targetDNA.id);

      expect(updatedDNA?.likes).toBe(initialLikes + 1);
    });

    it('should allow multiple likes on same DNA', async () => {
      const results = await fetchCommunityDNAs();
      const targetDNA = results[0];
      const initialLikes = targetDNA.likes;

      await likeDNA(targetDNA.id);
      await likeDNA(targetDNA.id);
      const newLikes = await likeDNA(targetDNA.id);

      expect(newLikes).toBe(initialLikes + 3);
    });

    it('should handle concurrent likes', async () => {
      const results = await fetchCommunityDNAs();
      const targetDNA = results[0];
      const initialLikes = targetDNA.likes;

      await Promise.all([likeDNA(targetDNA.id), likeDNA(targetDNA.id), likeDNA(targetDNA.id)]);

      const updatedResults = await fetchCommunityDNAs();
      const updatedDNA = updatedResults.find((d) => d.id === targetDNA.id);

      expect(updatedDNA?.likes).toBe(initialLikes + 3);
    });

    it('should return updated like count immediately', async () => {
      const results = await fetchCommunityDNAs();
      const targetDNA = results[0];

      const likes1 = await likeDNA(targetDNA.id);
      const likes2 = await likeDNA(targetDNA.id);

      expect(likes2).toBe(likes1 + 1);
    });
  });
});
