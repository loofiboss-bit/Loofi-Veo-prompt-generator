import { describe, it, expect } from 'vitest';
import { MODEL_PROFILES, getProfilesByModel, getProfileById, applyProfile } from './modelProfiles';
import type { PromptState } from '@core/types';

describe('modelProfiles', () => {
  describe('MODEL_PROFILES', () => {
    it('should have 7 profiles total', () => {
      expect(MODEL_PROFILES).toHaveLength(7);
    });

    it('should have all required fields for each profile', () => {
      MODEL_PROFILES.forEach((profile) => {
        expect(profile).toHaveProperty('id');
        expect(profile).toHaveProperty('label');
        expect(profile).toHaveProperty('description');
        expect(profile).toHaveProperty('targetModel');
        expect(profile).toHaveProperty('icon');
        expect(profile).toHaveProperty('defaults');
        expect(profile).toHaveProperty('recommendedAspectRatios');
        expect(profile).toHaveProperty('maxDurationSeconds');
        expect(profile).toHaveProperty('tags');

        // Verify types
        expect(typeof profile.id).toBe('string');
        expect(typeof profile.label).toBe('string');
        expect(typeof profile.description).toBe('string');
        expect(['veo', 'sora']).toContain(profile.targetModel);
        expect(typeof profile.icon).toBe('string');
        expect(Array.isArray(profile.defaults)).toBe(false);
        expect(Array.isArray(profile.recommendedAspectRatios)).toBe(true);
        expect(typeof profile.maxDurationSeconds).toBe('number');
        expect(Array.isArray(profile.tags)).toBe(true);
      });
    });

    it('should have unique IDs for each profile', () => {
      const ids = MODEL_PROFILES.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have at least one recommended aspect ratio per profile', () => {
      MODEL_PROFILES.forEach((profile) => {
        expect(profile.recommendedAspectRatios.length).toBeGreaterThan(0);
      });
    });

    it('should have defaults that are partial PromptState', () => {
      MODEL_PROFILES.forEach((profile) => {
        // defaults should have targetModel set
        expect(profile.defaults.targetModel).toBeDefined();
        expect(['veo', 'sora']).toContain(profile.defaults.targetModel);
      });
    });

    it('should have at least one tag per profile', () => {
      MODEL_PROFILES.forEach((profile) => {
        expect(profile.tags.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getProfilesByModel', () => {
    it('should return 4 profiles for veo', () => {
      const veoProfiles = getProfilesByModel('veo');
      expect(veoProfiles).toHaveLength(4);
      veoProfiles.forEach((profile) => {
        expect(profile.targetModel).toBe('veo');
      });
    });

    it('should return 3 profiles for sora', () => {
      const soraProfiles = getProfilesByModel('sora');
      expect(soraProfiles).toHaveLength(3);
      soraProfiles.forEach((profile) => {
        expect(profile.targetModel).toBe('sora');
      });
    });

    it('should return correct veo profile IDs', () => {
      const veoProfiles = getProfilesByModel('veo');
      const ids = veoProfiles.map((p) => p.id);
      expect(ids).toContain('veo-cinematic');
      expect(ids).toContain('veo-social');
      expect(ids).toContain('veo-abstract');
      expect(ids).toContain('veo-fast-draft');
    });

    it('should return correct sora profile IDs', () => {
      const soraProfiles = getProfilesByModel('sora');
      const ids = soraProfiles.map((p) => p.id);
      expect(ids).toContain('sora-cinematic');
      expect(ids).toContain('sora-social');
      expect(ids).toContain('sora-extended');
    });

    it('should return a new array each time', () => {
      const profiles1 = getProfilesByModel('veo');
      const profiles2 = getProfilesByModel('veo');
      expect(profiles1).not.toBe(profiles2);
      expect(profiles1).toEqual(profiles2);
    });
  });

  describe('getProfileById', () => {
    it('should return correct profile for known ID', () => {
      const profile = getProfileById('veo-cinematic');
      expect(profile).toBeDefined();
      expect(profile?.id).toBe('veo-cinematic');
      expect(profile?.label).toBe('Veo Cinematic');
      expect(profile?.targetModel).toBe('veo');
    });

    it('should return correct profile for each known veo ID', () => {
      const veoIds = ['veo-cinematic', 'veo-social', 'veo-abstract', 'veo-fast-draft'];
      veoIds.forEach((id) => {
        const profile = getProfileById(id);
        expect(profile).toBeDefined();
        expect(profile?.id).toBe(id);
        expect(profile?.targetModel).toBe('veo');
      });
    });

    it('should return correct profile for each known sora ID', () => {
      const soraIds = ['sora-cinematic', 'sora-social', 'sora-extended'];
      soraIds.forEach((id) => {
        const profile = getProfileById(id);
        expect(profile).toBeDefined();
        expect(profile?.id).toBe(id);
        expect(profile?.targetModel).toBe('sora');
      });
    });

    it('should return undefined for unknown ID', () => {
      const profile = getProfileById('unknown-profile');
      expect(profile).toBeUndefined();
    });

    it('should return undefined for empty string ID', () => {
      const profile = getProfileById('');
      expect(profile).toBeUndefined();
    });

    it('should return undefined for null-like IDs', () => {
      expect(getProfileById('')).toBeUndefined();
      expect(getProfileById('    ')).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      const profile = getProfileById('VEO-CINEMATIC');
      expect(profile).toBeUndefined();
    });
  });

  describe('applyProfile', () => {
    it('should merge profile defaults into existing state', () => {
      const currentState: PromptState = {
        idea: 'Original idea',
        environment: 'Original env',
        artStyle: 'original-style',
        targetModel: 'sora',
        aspectRatio: '1:1',
        characterGender: 'Male',
      } as PromptState;

      const result = applyProfile(currentState, 'veo-cinematic');

      expect(result.targetModel).toBe('veo'); // From profile
      expect(result.aspectRatio).toBe('16:9'); // From profile
      expect(result.idea).toBe('Original idea'); // Preserved
      expect(result.environment).toBe('Original env'); // Preserved
      expect(result.characterGender).toBe('Male'); // Preserved
    });

    it('should override existing fields with profile defaults', () => {
      const currentState: PromptState = {
        targetModel: 'sora',
        artStyle: 'abstract',
        aspectRatio: '9:16',
        cameraMovement: 'static',
      } as PromptState;

      const result = applyProfile(currentState, 'veo-cinematic');

      expect(result.targetModel).toBe('veo');
      expect(result.artStyle).toBe('cinematic');
      expect(result.aspectRatio).toBe('16:9');
      expect(result.cameraMovement).toBe('tracking');
    });

    it('should apply veo-social profile correctly', () => {
      const currentState = { targetModel: 'veo' } as PromptState;
      const result = applyProfile(currentState, 'veo-social');

      expect(result.targetModel).toBe('veo');
      expect(result.aspectRatio).toBe('9:16');
      expect(result.artStyle).toBe('');
    });

    it('should apply veo-abstract profile correctly', () => {
      const currentState = { targetModel: 'veo' } as PromptState;
      const result = applyProfile(currentState, 'veo-abstract');

      expect(result.targetModel).toBe('veo');
      expect(result.aspectRatio).toBe('1:1');
      expect(result.artStyle).toBe('abstract');
      expect(result.cameraMovement).toBe('dolly');
    });

    it('should apply veo-fast-draft profile correctly', () => {
      const currentState = { targetModel: 'veo' } as PromptState;
      const result = applyProfile(currentState, 'veo-fast-draft');

      expect(result.targetModel).toBe('veo');
      expect(result.veoModel).toBe('fast');
    });

    it('should apply sora-cinematic profile correctly', () => {
      const currentState = { targetModel: 'veo' } as PromptState;
      const result = applyProfile(currentState, 'sora-cinematic');

      expect(result.targetModel).toBe('sora');
      expect(result.aspectRatio).toBe('16:9');
      expect(result.artStyle).toBe('cinematic');
      expect(result.cameraMovement).toBe('crane');
    });

    it('should apply sora-social profile correctly', () => {
      const currentState = { targetModel: 'veo' } as PromptState;
      const result = applyProfile(currentState, 'sora-social');

      expect(result.targetModel).toBe('sora');
      expect(result.aspectRatio).toBe('9:16');
    });

    it('should apply sora-extended profile correctly', () => {
      const currentState = { targetModel: 'veo' } as PromptState;
      const result = applyProfile(currentState, 'sora-extended');

      expect(result.targetModel).toBe('sora');
      expect(result.aspectRatio).toBe('16:9');
      expect(result.artStyle).toBe('');
    });

    it('should return unchanged state for unknown profile ID', () => {
      const currentState: PromptState = {
        targetModel: 'veo',
        artStyle: 'cinematic',
      } as PromptState;

      const result = applyProfile(currentState, 'unknown-profile-id');

      expect(result).toEqual(currentState);
      expect(result.targetModel).toBe('veo');
      expect(result.artStyle).toBe('cinematic');
    });

    it('should handle empty current state', () => {
      const emptyState = {} as PromptState;
      const result = applyProfile(emptyState, 'veo-cinematic');

      expect(result.targetModel).toBe('veo');
      expect(result.aspectRatio).toBe('16:9');
      expect(result.artStyle).toBe('cinematic');
    });

    it('should not mutate original state', () => {
      const currentState: PromptState = {
        targetModel: 'sora',
        artStyle: 'abstract',
      } as PromptState;

      const originalTargetModel = currentState.targetModel;
      const originalArtStyle = currentState.artStyle;

      applyProfile(currentState, 'veo-cinematic');

      expect(currentState.targetModel).toBe(originalTargetModel);
      expect(currentState.artStyle).toBe(originalArtStyle);
    });

    it('should preserve non-overridden properties', () => {
      const currentState: PromptState = {
        idea: 'My unique idea',
        environment: 'Dark forest',
        characterGender: 'Female',
        language: 'en',
        targetModel: 'veo',
      } as PromptState;

      const result = applyProfile(currentState, 'veo-cinematic');

      expect(result.idea).toBe('My unique idea');
      expect(result.environment).toBe('Dark forest');
      expect(result.characterGender).toBe('Female');
      expect(result.language).toBe('en');
    });
  });

  describe('profile consistency', () => {
    it('all veo profiles should have veo as targetModel', () => {
      getProfilesByModel('veo').forEach((profile) => {
        expect(profile.defaults.targetModel).toBe('veo');
      });
    });

    it('all sora profiles should have sora as targetModel', () => {
      getProfilesByModel('sora').forEach((profile) => {
        expect(profile.defaults.targetModel).toBe('sora');
      });
    });

    it('sora profiles should have maxDurationSeconds of 20 or more', () => {
      getProfilesByModel('sora').forEach((profile) => {
        expect(profile.maxDurationSeconds).toBeGreaterThanOrEqual(20);
      });
    });

    it('veo profiles should have maxDurationSeconds of 8 or less', () => {
      getProfilesByModel('veo').forEach((profile) => {
        expect(profile.maxDurationSeconds).toBeLessThanOrEqual(8);
      });
    });

    it('all profiles should have meaningful descriptions', () => {
      MODEL_PROFILES.forEach((profile) => {
        expect(profile.description.length).toBeGreaterThan(0);
        expect(profile.description.length).toBeLessThan(500);
      });
    });

    it('all profiles should have valid aspect ratios', () => {
      const validRatios = ['1:1', '4:5', '9:16', '16:9', '2.39:1', '21:9'];
      MODEL_PROFILES.forEach((profile) => {
        profile.recommendedAspectRatios.forEach((ratio) => {
          expect(validRatios).toContain(ratio);
        });
      });
    });
  });
});
