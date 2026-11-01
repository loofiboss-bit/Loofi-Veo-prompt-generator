import type { VideoResolution } from '@core/models/catalog';

export type VideoIterationResolution = '360p' | '720p' | '1080p' | '4k';
export type VideoIterationAspectRatio = '16:9' | '9:16';

export interface VideoIterationSettings {
  durationSeconds: number; // 3..10s
  resolution: VideoIterationResolution;
  aspectRatio: VideoIterationAspectRatio;
  modelId: string;
}

export interface VideoIterationTurn {
  id: string;
  version: number; // 1 = original base video, 2, 3...
  parentId: string | null;
  interactionId?: string; // Gemini Interactions API ID for stateful turn-by-turn editing
  instruction: string; // Natural language edit instruction (e.g. "Change lighting to golden hour")
  effectivePrompt: string; // The effective prompt sent for generation
  assetId: string; // Asset ID referencing local media
  assetUrl?: string; // Local object/blob or file URL
  thumbnailUrl?: string;
  settings: VideoIterationSettings;
  costEstimateUsd: number;
  createdAt: number;
}

export interface VideoIterationSession {
  id: string;
  projectId: string;
  artifactId: string;
  variantIndex: 0 | 1 | 2;
  rootAssetId: string;
  activeTurnId: string;
  turns: VideoIterationTurn[];
  updatedAt: number;
}

export interface CreativeSuggestion {
  id: string;
  category: 'camera' | 'lighting' | 'continuity' | 'deviation' | 'iteration-prompt';
  title: string;
  description: string;
  suggestedInstruction?: string;
  confidence?: 'high' | 'medium';
}

export interface VideoIterationRequest {
  session?: VideoIterationSession;
  projectId: string;
  artifactId: string;
  variantIndex: 0 | 1 | 2;
  parentTurnId?: string;
  instruction: string;
  settings?: Partial<VideoIterationSettings>;
  signal?: AbortSignal;
}
