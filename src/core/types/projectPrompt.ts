/**
 * Core Prompt, Shot, and Asset Model Types
 */

import type { VideoTarget, FlowVeoOutputMode } from './flowVeo';
import type { SunoExportMode } from './suno';
import type { SpatialCameraRig } from './spatialCamera';
import type {
  ClipTransition,
  ColorGradeParams,
  CameraEffect,
  MotionConfig,
  TextOverlay,
} from './timeline';

export type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';

export interface GlobalStyle {
  description: string;
  referenceImage?: string;
  strength: number; // 0-100
  isLocked: boolean;
}

export interface PromptState {
  idea: string;
  environment: string;
  environmentSensoryDetails: string;
  environmentDynamicEvents: string;
  architecturalStyle: string;
  characterActions: string;
  characterNuances: string;
  characterObjectInteraction: string;
  characterGender: string;
  characterEthnicity: string;
  characterClothing: string;
  characterArchetype: string;
  characterAge: string;
  characterMood: string;
  characterPose: string;
  characterSkinTone: string;
  characterSpecificClothing: string;
  characterAccessories: string;
  characterCameoTag: string;

  // Identity Lock
  characterVisualDNA: string;
  characterFixedSeed: number | null;
  characterNegativePrompt: string;

  // Global Project Style
  globalStyle: GlobalStyle;

  timeOfDay: string;
  weather: string;
  voiceOver: string;
  voiceStyle: string;
  ambientSound: string;
  soundEffectsIntensity: string;
  negativePrompt: string;
  optimizeFor8Seconds: boolean;
  artStyle: string;
  customArtStyle: string;
  lightingStyle: string;
  cameraMovement: string;
  cameraDistance: string;
  lensType: string;
  compositionalGuide: string;
  visualEffect: string;
  colorPalette: string;
  aspectRatio: string;
  resolution: string;
  animationPreset: string;
  motionIntensity: string;
  creativityLevel: string;
  includeOverlayText: boolean;
  overlayTextContent: string;
  useGoogleSearch: boolean;
  useGoogleMaps: boolean;
  generateAsSeries: boolean;
  thinkingMode: boolean;
  thinkingBudget: number;
  youtubeUrl: string;
  imageStudioPrompt: string;
  uploadedImage: { data: string; mimeType: string } | null;
  uploadedAudio: { data: string; mimeType: string; name: string } | null;
  audioMix: { voice: number; ambient: number; sfx: number };
  useImageAsCameo: boolean;
  language: Language;
  model: string;
  targetModel: VideoTarget;
  flowVeoOutputMode?: FlowVeoOutputMode;
  sunoExportMode?: SunoExportMode;
  veoModel: 'fast' | 'quality';
  spatialMotions: Record<string, string>;
  spatialCamera?: SpatialCameraRig;
}

export interface SFXEvent {
  id?: string;
  name?: string;
  category?: string;
  description: string;
  timestamp: number;
}

export interface ChromaKeyConfig {
  enabled: boolean;
  color: string;
  similarity: number;
  smoothness: number;
  spill: number;
}

export interface Shot {
  id: number;
  type: 'video' | 'title';
  action: string;
  camera: string;
  characterId: string;
  locationId?: string;
  generatedVideoUrl?: string;
  proxyVideoUrl?: string;
  conceptImageUrl?: string;
  takes: string[];
  selectedTakeIndex: number;
  visualLink: boolean;
  duration: number;
  transition: ClipTransition;
  titleConfig?: {
    text: string;
    background: string;
    color: string;
    fontSize: number;
  };
  sfx?: SFXEvent[];
  foleyCues?: string[];
  dialogue?: string;
  dialogueText?: string;
  lighting?: string;
  environment?: string;
  imageUrl?: string;
  videoUrl?: string;
  characterArchetype?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioVolume?: number;
  is4K?: boolean;
  chromaKey?: ChromaKeyConfig;
  backgroundLayerUrl?: string;
  colorGrade?: ColorGradeParams;
  cameraEffect?: CameraEffect;

  motionConfig?: MotionConfig;
  spatialCamera?: SpatialCameraRig;
  overlays?: TextOverlay[];
  poseUrl?: string;
  sourceType?: 'generated' | 'stock';
  stockSourceId?: string;
  isGreenScreen?: boolean;

  // Magic Mask
  maskSequence?: string[];
}

export interface Asset {
  id: string;
  type: 'image' | 'audio' | 'video';
  name: string;
  url: string;
  data: string;
  mimeType: string;
  isProxyReady?: boolean;
  proxyUrl?: string;
  tags?: string[];
  groupId?: string;
  version?: number;
  parentId?: string;
  storageKey?: string;
  durationSeconds?: number;
  providerUri?: string;
  providerExpiresAt?: number;

  // Takes System
  takeGroupId?: string;
  takeNumber?: number;
}

export interface StockAsset {
  id: string;
  type: 'video' | 'audio';
  title: string;
  author: string;
  duration?: number;
  url: string;
  thumbnailUrl?: string;
}
