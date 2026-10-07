/**
 * Universal Model Transpiler Domain Contracts (v13.0.0)
 *
 * Deterministic translation contracts for compiling high-level cinematic shot
 * directions into model-tailored prompt payloads across AI video engines.
 */

import type { SpatialCameraRig } from './spatialCamera';
import type { VideoPromptMode } from './promptArtifact';

export type UniversalVideoTarget = 'flow-veo' | 'kling' | 'runway-gen3' | 'sora' | 'luma-ray';

export interface UniversalPromptInput {
  idea: string;
  mode: VideoPromptMode;
  target: UniversalVideoTarget;
  aspectRatio: '16:9' | '9:16' | '1:1' | '2.39:1';
  durationSeconds: number;
  subject?: string;
  action?: string;
  environment?: string;
  camera?: string;
  spatialCamera?: SpatialCameraRig;
  lighting?: string;
  style?: string;
  audio?: string;
  dialogue?: string;
  negativePrompt?: string;
  startFrame?: string;
  endFrame?: string;
  previousClip?: string;
  referenceRoles?: string;
}

export interface TranspiledPromptVariant {
  label: 'Primary' | 'Cinematic' | 'Control-focused';
  title: string;
  prompt: string;
  negativePrompt: string;
  settingsChecklist: string[];
  copyPrompt: string;
  copyNegativePrompt: string;
  copySettingsChecklist: string;
  copyAll: string;
}

export interface TranspiledPromptResult {
  target: UniversalVideoTarget;
  targetDisplayName: string;
  variants: [TranspiledPromptVariant, TranspiledPromptVariant, TranspiledPromptVariant];
  recommendations: string[];
}

export interface TargetModelProfile {
  id: UniversalVideoTarget;
  displayName: string;
  vendor: string;
  syntaxFlavor: string;
  maxRecommendedDuration: number;
  supportedAspectRatios: string[];
  cameraDirectiveStyle:
    | 'natural'
    | 'bracket-tags'
    | 'motion-vector'
    | 'photochemical'
    | 'anchor-trajectory';
}
