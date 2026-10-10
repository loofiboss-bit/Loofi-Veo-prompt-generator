import type { Caption, TimelineClip, TimelineTrack } from './index';

export type CreatorAspectRatio = '9:16' | '16:9' | '1:1';
export interface CreatorStyleProfileV1 {
  schemaVersion: 1;
  id: string;
  name: string;
  primaryColor: string;
  textColor: string;
  fontFamily: 'Noto Sans' | 'Noto Serif';
  logoAssetId?: string;
  creativeDescription: string;
  updatedAt: number;
}
export interface CreatorRecipeV1 {
  schemaVersion: 1;
  id: string;
  category: 'social' | 'story' | 'music';
  titleKey: string;
  descriptionKey: string;
  aspectRatio: CreatorAspectRatio;
  sceneCount: number;
  sceneIdeas: string[];
  exampleId?: string;
}
export interface CreatorCropV1 {
  mode: 'fit' | 'fill';
  x: number;
  y: number;
}
export interface CreatorDeliveryV1 {
  schemaVersion: 1;
  editorMode?: 'delivery' | 'advanced';
  revision: number;
  recipeId?: string;
  style?: CreatorStyleProfileV1;
  aspectRatio: CreatorAspectRatio;
  captionsMode: 'sidecar' | 'burn-in';
  captionStyle: 'classic' | 'pop' | 'karaoke';
  safeMargin: number;
  crops: Record<string, CreatorCropV1>;
  audioFades?: Record<string, { inSeconds: number; outSeconds: number }>;
  title: string;
  description: string;
  updatedAt: number;
}
/** Native jobs accept registered media identities, never paths or shell arguments. */
export interface TimelineRenderClipV1 {
  id: string;
  mediaId: string;
  type: 'video' | 'image' | 'audio';
  startTime: number;
  duration: number;
  offset: number;
  volume: number;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  crossfadeSeconds?: number;
  crop: CreatorCropV1;
}
export interface TimelineRenderPlanV1 {
  schemaVersion: 1;
  mediaHashes?: Record<string, string>;
  purpose?: 'preview' | 'delivery';
  projectId: string;
  projectName: string;
  contentHash: string;
  durationSeconds: number;
  fps: 30;
  aspectRatio: CreatorAspectRatio;
  resolution: '720p' | '1080p';
  clips: TimelineRenderClipV1[];
  captions: Caption[];
  captionsMode: 'sidecar' | 'burn-in';
  captionStyle: 'classic' | 'pop' | 'karaoke';
  safeMargin: number;
  style?: CreatorStyleProfileV1;
  title: string;
  description: string;
}
export interface TimelineRenderCapabilities {
  available: boolean;
  reason?: string;
  version?: string;
  maxDurationSeconds?: number;
  aspectRatios?: CreatorAspectRatio[];
  resolutions?: ('720p' | '1080p')[];
  fps?: number;
  supportedOperations?: string[];
}
export interface TimelineRenderJobV1 {
  id: string;
  purpose?: 'preview' | 'delivery';
  projectId: string;
  contentHash: string;
  status: 'queued' | 'rendering' | 'verifying' | 'complete' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
  savedName?: string;
  createdAt?: number;
}
export interface CreatorTimelineSnapshot {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
}
