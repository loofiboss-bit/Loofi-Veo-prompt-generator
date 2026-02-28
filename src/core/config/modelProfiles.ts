/**
 * Model Export Profiles
 * Pre-configured prompt generation settings optimized for each target AI model.
 * Users can select a profile to auto-populate model-specific parameters.
 *
 * @module modelProfiles
 * @since v1.8.0
 */

import type { PromptState } from '@core/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelProfile {
  /** Unique identifier */
  id: string;
  /** Display name */
  label: string;
  /** Short description of the profile's use case */
  description: string;
  /** Target AI model */
  targetModel: 'veo' | 'sora';
  /** Icon name from the design system */
  icon: string;
  /** PromptState overrides applied when this profile is selected */
  defaults: Partial<PromptState>;
  /** Recommended aspect ratios for this profile */
  recommendedAspectRatios: string[];
  /** Maximum supported duration in seconds (-1 for unlimited) */
  maxDurationSeconds: number;
  /** Tags for UI filtering */
  tags: string[];
  /** Fallback chain ID for model fallback (v2.5.0). Maps to ModelFallbackService chains. */
  fallbackChainId?: string;
}

// ---------------------------------------------------------------------------
// Profile Definitions
// ---------------------------------------------------------------------------

export const MODEL_PROFILES: ModelProfile[] = [
  // ── Veo Profiles ────────────────────────────────────────────────────────
  {
    id: 'veo-cinematic',
    label: 'Veo Cinematic',
    description:
      'Film-quality output optimized for narrative storytelling with rich visual detail.',
    targetModel: 'veo',
    icon: 'film',
    defaults: {
      targetModel: 'veo',
      model: 'gemini-3.1-pro-preview',
      aspectRatio: '16:9',
      artStyle: 'cinematic',
      cameraMovement: 'tracking',
    },
    recommendedAspectRatios: ['16:9', '2.39:1'],
    maxDurationSeconds: 8,
    tags: ['cinematic', 'narrative', 'film'],
    fallbackChainId: 'video-generation-quality',
  },
  {
    id: 'veo-social',
    label: 'Veo Social',
    description: 'Vertical and square formats optimized for Instagram, TikTok, and Shorts.',
    targetModel: 'veo',
    icon: 'share',
    defaults: {
      targetModel: 'veo',
      model: 'gemini-3.1-pro-preview',
      aspectRatio: '9:16',
      artStyle: '',
    },
    recommendedAspectRatios: ['9:16', '1:1', '4:5'],
    maxDurationSeconds: 8,
    tags: ['social', 'vertical', 'short-form'],
    fallbackChainId: 'video-generation-quality',
  },
  {
    id: 'veo-abstract',
    label: 'Veo Abstract',
    description: 'Experimental visual art with surreal compositions and creative camera work.',
    targetModel: 'veo',
    icon: 'sparkles',
    defaults: {
      targetModel: 'veo',
      model: 'gemini-3.1-pro-preview',
      aspectRatio: '1:1',
      artStyle: 'abstract',
      cameraMovement: 'dolly',
    },
    recommendedAspectRatios: ['1:1', '16:9'],
    maxDurationSeconds: 8,
    tags: ['abstract', 'art', 'experimental'],
    fallbackChainId: 'video-generation-quality',
  },
  {
    id: 'veo-fast-draft',
    label: 'Veo Fast Draft',
    description: 'Quick iterations for concept exploration. Lower quality, faster generation.',
    targetModel: 'veo',
    icon: 'lightning',
    defaults: {
      targetModel: 'veo',
      model: 'gemini-3.1-pro-preview',
      veoModel: 'fast',
      aspectRatio: '16:9',
    },
    recommendedAspectRatios: ['16:9', '9:16'],
    maxDurationSeconds: 5,
    tags: ['fast', 'draft', 'iteration'],
    fallbackChainId: 'video-generation-fast',
  },

  // ── Sora Profiles ──────────────────────────────────────────────────────
  {
    id: 'sora-cinematic',
    label: 'Sora Cinematic',
    description: 'High-fidelity video generation for cinematic scenes with Sora.',
    targetModel: 'sora',
    icon: 'film',
    defaults: {
      targetModel: 'sora',
      aspectRatio: '16:9',
      artStyle: 'cinematic',
      cameraMovement: 'crane',
    },
    recommendedAspectRatios: ['16:9', '21:9'],
    maxDurationSeconds: 20,
    tags: ['cinematic', 'high-fidelity', 'narrative'],
  },
  {
    id: 'sora-social',
    label: 'Sora Social',
    description: 'Short-form vertical content optimized for social platforms.',
    targetModel: 'sora',
    icon: 'share',
    defaults: {
      targetModel: 'sora',
      aspectRatio: '9:16',
    },
    recommendedAspectRatios: ['9:16', '1:1'],
    maxDurationSeconds: 20,
    tags: ['social', 'vertical', 'short-form'],
  },
  {
    id: 'sora-extended',
    label: 'Sora Extended',
    description: 'Longer-form video for detailed sequences and multi-shot narratives.',
    targetModel: 'sora',
    icon: 'timeline',
    defaults: {
      targetModel: 'sora',
      aspectRatio: '16:9',
      artStyle: '',
    },
    recommendedAspectRatios: ['16:9'],
    maxDurationSeconds: 60,
    tags: ['extended', 'long-form', 'narrative'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all profiles for a specific target model */
export function getProfilesByModel(targetModel: 'veo' | 'sora'): ModelProfile[] {
  return MODEL_PROFILES.filter((p) => p.targetModel === targetModel);
}

/** Get a profile by ID */
export function getProfileById(id: string): ModelProfile | undefined {
  return MODEL_PROFILES.find((p) => p.id === id);
}

/** Apply a model profile's defaults to an existing PromptState */
export function applyProfile(currentState: PromptState, profileId: string): PromptState {
  const profile = getProfileById(profileId);
  if (!profile) return currentState;

  return {
    ...currentState,
    ...profile.defaults,
  };
}
