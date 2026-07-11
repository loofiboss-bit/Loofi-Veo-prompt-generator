/**
 * Model Export Profiles
 * Pre-configured prompt generation settings optimized for Flow/Veo workflows.
 * Users can select a profile to auto-populate model-specific parameters.
 *
 * @module modelProfiles
 * @since v1.8.0
 */

import type { PromptState, VideoTarget } from '@core/types';

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
  /** Target video workflow */
  targetModel: Exclude<VideoTarget, 'local'>;
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
  // ── Flow/Veo Profiles ───────────────────────────────────────────────────
  {
    id: 'flow-veo-cinematic',
    label: 'Flow/Veo Cinematic',
    description: 'Film-quality scene packs optimized for narrative storytelling.',
    targetModel: 'flow-veo',
    icon: 'film',
    defaults: {
      targetModel: 'flow-veo',
      flowVeoOutputMode: 'flow-scene-pack',
      model: 'gemini-3.5-flash',
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
    id: 'flow-veo-social',
    label: 'Flow/Veo Social',
    description: 'Vertical and square formats optimized for Instagram, TikTok, and Shorts.',
    targetModel: 'flow-veo',
    icon: 'share',
    defaults: {
      targetModel: 'flow-veo',
      flowVeoOutputMode: 'flow-shot-card',
      model: 'gemini-3.5-flash',
      aspectRatio: '9:16',
      artStyle: '',
    },
    recommendedAspectRatios: ['9:16', '1:1', '4:5'],
    maxDurationSeconds: 8,
    tags: ['social', 'vertical', 'short-form'],
    fallbackChainId: 'video-generation-quality',
  },
  {
    id: 'flow-veo-abstract',
    label: 'Flow/Veo Abstract',
    description: 'Experimental visual art with surreal compositions and creative camera work.',
    targetModel: 'flow-veo',
    icon: 'sparkles',
    defaults: {
      targetModel: 'flow-veo',
      flowVeoOutputMode: 'single-prompt',
      model: 'gemini-3.5-flash',
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
    id: 'flow-veo-fast-draft',
    label: 'Flow/Veo Fast Draft',
    description: 'Quick iterations for concept exploration. Lower quality, faster generation.',
    targetModel: 'flow-veo',
    icon: 'lightning',
    defaults: {
      targetModel: 'flow-veo',
      flowVeoOutputMode: 'flow-shot-card',
      model: 'gemini-3.5-flash',
      veoModel: 'fast',
      aspectRatio: '16:9',
    },
    recommendedAspectRatios: ['16:9', '9:16'],
    maxDurationSeconds: 5,
    tags: ['fast', 'draft', 'iteration'],
    fallbackChainId: 'video-generation-fast',
  },
  {
    id: 'veo-api-production',
    label: 'Veo API Production',
    description: 'Concise prompts with duration, aspect ratio, audio, and reference notes.',
    targetModel: 'veo-api',
    icon: 'api',
    defaults: {
      targetModel: 'veo-api',
      flowVeoOutputMode: 'veo-api-prompt',
      aspectRatio: '16:9',
      resolution: '1080p',
      artStyle: 'cinematic',
    },
    recommendedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDurationSeconds: 8,
    tags: ['api', 'production', 'prompt'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all profiles for a specific target model */
export function getProfilesByModel(targetModel: Exclude<VideoTarget, 'local'>): ModelProfile[] {
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
