import { describe, expect, it } from 'vitest';
import { MODEL_PROFILES, applyProfile, getProfileById, getProfilesByModel } from './modelProfiles';
import type { PromptState } from '@core/types';

describe('modelProfiles', () => {
  it('defines the v5 Flow/Veo profile set', () => {
    expect(MODEL_PROFILES).toHaveLength(5);
    expect(MODEL_PROFILES.map((profile) => profile.id)).toEqual([
      'flow-veo-cinematic',
      'flow-veo-social',
      'flow-veo-abstract',
      'flow-veo-fast-draft',
      'veo-api-production',
    ]);
  });

  it('has complete profile metadata', () => {
    MODEL_PROFILES.forEach((profile) => {
      expect(profile.id).toBeTruthy();
      expect(profile.label).toBeTruthy();
      expect(profile.description).toBeTruthy();
      expect(['flow-veo', 'veo-api']).toContain(profile.targetModel);
      expect(profile.defaults.targetModel).toBe(profile.targetModel);
      expect(profile.recommendedAspectRatios.length).toBeGreaterThan(0);
      expect(profile.maxDurationSeconds).toBeGreaterThan(0);
      expect(profile.tags.length).toBeGreaterThan(0);
    });
  });

  it('returns profiles by target workflow', () => {
    expect(getProfilesByModel('flow-veo')).toHaveLength(4);
    expect(getProfilesByModel('veo-api')).toHaveLength(1);
  });

  it('returns profile by ID', () => {
    const profile = getProfileById('flow-veo-cinematic');

    expect(profile?.label).toBe('Flow/Veo Cinematic');
    expect(profile?.targetModel).toBe('flow-veo');
  });

  it('applies profile defaults while preserving unrelated state', () => {
    const currentState = {
      idea: 'Original idea',
      environment: 'Original env',
      targetModel: 'flow-veo',
      aspectRatio: '1:1',
      characterGender: 'Female',
    } as PromptState;

    const result = applyProfile(currentState, 'veo-api-production');

    expect(result.targetModel).toBe('veo-api');
    expect(result.flowVeoOutputMode).toBe('veo-api-prompt');
    expect(result.aspectRatio).toBe('16:9');
    expect(result.idea).toBe('Original idea');
    expect(result.environment).toBe('Original env');
    expect(result.characterGender).toBe('Female');
  });

  it('returns unchanged state for unknown profile ID', () => {
    const currentState = {
      targetModel: 'flow-veo',
      artStyle: 'cinematic',
    } as PromptState;

    expect(applyProfile(currentState, 'unknown-profile-id')).toEqual(currentState);
  });

  it('does not mutate the original state', () => {
    const currentState = {
      targetModel: 'flow-veo',
      artStyle: 'abstract',
    } as PromptState;

    applyProfile(currentState, 'flow-veo-cinematic');

    expect(currentState.targetModel).toBe('flow-veo');
    expect(currentState.artStyle).toBe('abstract');
  });
});
