export * from './circuitBreaker';
export * from './collaboration';
export * from './composer';
export * from './directExport';
export * from './desktopProduction';
export * from './diagnostics';
export * from './flowVeo';
export * from './marketplace';
export * from './workspace';
export * from './registry';
export * from './optimization';
export * from './production';
export * from './suno';

import type {
  BlockConnection,
  CanvasViewport,
  ComposerEvaluationResult,
  ComposerSnapshot,
  ConnectionStyle,
  PromptBlock,
  TimelineLink,
} from './composer';
import type { FlowVeoOutputMode, VideoTarget } from './flowVeo';
import type { SunoExportMode } from './suno';
import type { VeoExecutionInputs, VeoGenerationRequest } from './production';

export type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';

export type IconName =
  | 'expand'
  | 'square'
  | 'circle'
  | 'eraser'
  | 'pencil'
  | 'map-pin'
  | 'smartphone'
  | 'scissors'
  | 'shuffle'
  | 'arrow-right'
  | 'arrow-left'
  | 'circle-filled'
  | 'accessibility'
  | 'spinner'
  | 'filter'
  | 'library'
  | 'subtitles'
  | 'copy'
  | 'check'
  | 'edit'
  | 'cancel'
  | 'palette'
  | 'magic'
  | 'sparkles'
  | 'globe'
  | 'history'
  | 'trash'
  | 'template'
  | 'audio'
  | 'download'
  | 'save'
  | 'lightbulb'
  | 'moon'
  | 'sun'
  | 'chevron-down'
  | 'video'
  | 'film'
  | 'share'
  | 'upload'
  | 'image'
  | 'music'
  | 'search'
  | 'undo'
  | 'redo'
  | 'chat'
  | 'video-analysis'
  | 'plus'
  | 'sliders'
  | 'help'
  | 'user'
  | 'users'
  | 'smile'
  | 'clock'
  | 'activity'
  | 'alert-triangle'
  | 'play'
  | 'compare'
  | 'grid-3x3'
  | 'dna'
  | 'folder'
  | 'heart'
  | 'cloud-download'
  | 'move'
  | 'zap'
  | 'layers'
  | 'eye-dropper'
  | 'mic'
  | 'keyframe'
  | 'keyframe-filled'
  | 'chevron-right'
  | 'tag'
  | 'file-text'
  | 'list'
  | 'brush'
  | 'arrow-up-right'
  | 'lock'
  | 'unlock'
  | 'settings'
  | 'close'
  | 'eye'
  | 'eye-off'
  | 'info'
  | 'external-link'
  | 'check-circle'
  | 'key'
  | 'code'
  | 'document'
  | 'api'
  | 'menu';

export interface SelectOption {
  value: string;
  label: string;
}

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
}

export interface GroundingChunk {
  web?: { uri?: string; title?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK GroundingChunkMapsPlaceAnswerSources lacks index signature
  maps?: { uri?: string; title?: string; placeAnswerSources?: any };
}

export interface VeoPromptResponse {
  prompt: string;
  groundingChunks?: GroundingChunk[];
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  params: PromptState;
  prompt: string;
  groundingChunks?: GroundingChunk[];
  branchId?: string;
  parentId?: string | null;
}

export interface BranchNode {
  id: string;
  entryId: string;
  parentId: string | null;
  childIds: string[];
  branchId: string;
  depth: number;
  timestamp: number;
}

export interface PromptBranch {
  id: string;
  name: string;
  color: string;
  rootNodeId: string;
  activeNodeId: string;
  createdAt: number;
  parentBranchId: string | null;
  forkNodeId: string | null;
}

export interface BranchTree {
  nodes: Record<string, BranchNode>;
  branches: Record<string, PromptBranch>;
  activeBranchId: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  params: Partial<PromptState>;
}

export interface CustomPreset {
  id: string;
  name: string;
  params: PromptState;
  description?: string;
}

export interface ExamplePrompt {
  title: string;
  idea: string;
  prompt: string;
  params: Partial<PromptState>;
  groundingChunks?: GroundingChunk[];
}

export interface PromptVariation {
  label: string;
  prompt: string;
}

export interface VisualDNA {
  id: string;
  name: string;
  timestamp: number;
  styleParams: Partial<PromptState>;
}

export interface SharedVisualDNA extends VisualDNA {
  author: string;
  likes: number;
}

export interface CharacterProfile {
  id: string;
  name: string;
  attributes: {
    age: string;
    gender: string;
    ethnicity: string;
    bodyType: string;
    skinTone: string;
  };
  appearance: {
    hair: string;
    eyes: string;
    distinguishingFeatures: string;
  };
  wardrobe: string;
  lockedSeed?: number;
  visualPrompt: string;
  fixedSeed: number | null;
  negativePrompt: string;
  thumbnailUrl?: string;
}

export interface LocationProfile {
  id: string;
  name: string;
  description: string;
  visualTags: string[];
  referenceImage?: string;
}

export interface StoryboardState {
  globalContext: GlobalContext;
  shots: Shot[];
  timeline: TimelineState;
}

export interface ProjectComposerState {
  blocks: PromptBlock[];
  connections: BlockConnection[];
  viewport: CanvasViewport;
  snapToGrid: boolean;
  gridSize: number;
  showMinimap: boolean;
  autoLayout: boolean;
  connectionStyle: ConnectionStyle;
  snapshots: ComposerSnapshot[];
  timelineLinks: TimelineLink[];
  autoSyncTimeline: boolean;
  nextZIndex: number;
  lastEvaluation: ComposerEvaluationResult | null;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  lastModified: number;
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  promptState: PromptState;
  characterBank: CharacterProfile[];
  locationBank: LocationProfile[];
  visualDNA: VisualDNA[];
  storyboard: StoryboardState;
  composer?: ProjectComposerState;
}

export interface ModelComparisonResponse {
  flowScenePackPrompt: string;
  veoApiPrompt: string;
}

export interface EditedImageResponse {
  newImageBytes: string;
  newMimeType: string;
}

export interface SFXEvent {
  description: string;
  timestamp: number;
}

export interface TransitionType {
  type: 'cut' | 'dissolve' | 'fade_black' | 'wipe_left';
  duration: number;
}

export type ClipTransition = TransitionType;

// --- MODULAR EFFECTS SYSTEM ---

export type EffectType = 'color' | 'chroma' | 'shake';

export interface BaseEffect {
  id: string;
  type: EffectType;
  isEnabled: boolean;
  name?: string;
}

export interface ColorGradeEffect extends BaseEffect {
  type: 'color';
  brightness: number; // 0 to 2, 1 is default
  contrast: number; // 0 to 2, 1 is default
  saturation: number; // 0 to 2, 1 is default
  sepia: number; // 0 to 1
  hueRotate: number; // -180 to 180 degrees
}

export interface ChromaKeyEffect extends BaseEffect {
  type: 'chroma';
  color: string; // Hex e.g., #00FF00
  similarity: number; // 0 to 1
  smoothness: number; // 0 to 1
  spill: number; // 0 to 1
}

export interface CameraShakeEffect extends BaseEffect {
  type: 'shake';
  intensity: number; // 0 to 1
  speed: number; // 0.1 to 5
  scale: number; // 1.0 to 1.5 (Overscan to prevent black edges)
}

export type VideoEffect = ColorGradeEffect | ChromaKeyEffect | CameraShakeEffect;

// --- END EFFECTS SYSTEM ---

export interface MotionKeyframe {
  x: number;
  y: number;
  zoom: number;
}

export interface MotionConfig {
  start: MotionKeyframe;
  end: MotionKeyframe;
  ease: string; // 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  position: { x: number; y: number };
  style: {
    fontSize: number;
    color: string;
    backgroundColor?: string;
    backgroundOpacity?: number;
    fontFamily?: string;
  };
  animationIn?: 'none' | 'fade' | 'slide_up' | 'zoom' | 'typewriter';
  animationOut?: 'none' | 'fade' | 'slide_down' | 'zoom';
  animationDuration?: number;
}

export interface ColorGrade {
  contrast: number;
  saturation: number;
  brightness: number;
  sepia: number;
  hueRotate: number;
  gamma_r?: number;
  gamma_g?: number;
  gamma_b?: number;
}

export type ColorGradeParams = ColorGrade;

export interface CameraEffect {
  type: 'static' | 'handheld' | 'drift' | 'zoom_in' | 'zoom_out';
  intensity: number;
  scale?: number;
  speed?: number;
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
  dialogueText?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioVolume?: number;
  is4K?: boolean;
  chromaKey?: ChromaKeyConfig;
  backgroundLayerUrl?: string;
  colorGrade?: ColorGradeParams;
  cameraEffect?: CameraEffect;

  motionConfig?: MotionConfig;
  overlays?: TextOverlay[];
  poseUrl?: string;
  sourceType?: 'generated' | 'stock';
  stockSourceId?: string;
  isGreenScreen?: boolean;

  // Magic Mask
  maskSequence?: string[]; // Array of Blob URLs for each frame
}

export interface GenerationTask {
  id: string;
  status:
    | 'Queued'
    | 'Init'
    | 'Processing'
    | 'Polling'
    | 'Fetching'
    | 'Complete'
    | 'Error'
    | 'Pending'
    | 'Submitting'
    | 'RecoveryRequired'
    | 'MediaAtRisk';
  videoUrl: string | null;
  proxyUrl?: string | null;
  prompt: string;
  settings: Record<string, unknown>;
  inputImage?: { data: string; mimeType: string };
  request?: VeoGenerationRequest;
  executionInputs?: VeoExecutionInputs;
  providerOperationName?: string;
  providerMediaUri?: string;
  providerExpiresAt?: number;
  productionRunId?: string;
  productionShotId?: number;
  productionTakeId?: string;
  error?: string;
  timestamp: number;
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

export interface ScriptBreakdownItem {
  id: string;
  scene: string;
  description: string;
  visualPrompt: string;
  duration: number;
  action?: string;
  status: 'pending' | 'generated';
}

export interface SunoSettings {
  topic: string;
  genre: string;
  mood: string;
  voice: string;
  tempo: string;
  structure: 'Auto' | 'Standard' | 'Pop' | 'Rap' | 'Ambient' | 'Custom';
  language: string;
  instruments: string;
  isInstrumental: boolean;
  styleInfluence: number | null;
  targetProfile?: import('./suno').SunoTargetProfile;
  key?: string;
  timeSignature?: string;
  energyCurve?: string;
  vocalRange?: string;
  voiceNotes?: string;
  customModelNotes?: string;
  personaNotes?: string;
  tasteGuidance?: string;
  mixNotes?: string;
  rightsChecklist?: import('./suno').SunoRightsChecklist;
}

export interface SunoPack {
  title: string;
  style: string;
  lyrics: string;
  explanation: string;
}

export interface SunoLyricRequest {
  topic: string;
}

export interface SongMetadata {
  // ...
}

export interface StyleOptions {
  // ...
}

export interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: 'pop' | 'karaoke' | 'classic';
}

export interface AgentAction {
  // ...
}

export interface VideoFilters {
  contrast: number;
  saturation: number;
  brightness: number;
  sepia: number;
  hueRotate: number;
  grain: number;
  vfxType: 'none' | 'grain' | 'vignette' | 'letterbox';
  vfxIntensity: number;
  filmConfig?: {
    enabled: boolean;
    preset: 'custom' | 'super8' | 'vhs' | 'cinema';
    grainIntensity: number;
    halationIntensity: number;
    jitterIntensity: number;
  };
}

export interface GlobalContext {
  style: string;
  character: string;
  setting: string;
}

export interface TimelineTrack {
  id: string;
  label: string;
  type: 'video' | 'audio' | 'text';
  trackType: 'captions' | 'dialogue' | 'sfx' | 'music' | 'ambience';
  zIndex: number;
}

export interface Keyframe {
  id: string;
  time: number;
  value: number;
  property: string;
  easing: string; // 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

export interface TransformProps {
  scale: number;
  position: { x: number; y: number };
  rotation: number;
  opacity: number;
}

export interface VolumeKeyframe {
  time: number;
  value: number;
}

export interface TimelineClip {
  id: string;
  resourceId: string | number;
  trackId: string;
  startTime: number;
  duration: number;
  offset: number;
  type: 'video' | 'audio' | 'text' | 'image';
  label: string;
  isLoading?: boolean;
  transition?: ClipTransition;
  volume?: number;
  volumeKeyframes?: VolumeKeyframe[];
  opacity?: number;
  panning?: { x: number; z: number };
  caption?: Caption;
  transform?: TransformProps;
  keyframes?: Keyframe[];

  // NEW MODULAR EFFECTS
  effects?: VideoEffect[];

  // Takes System
  selectedTakeId?: string;

  // Deprecated / Legacy Fields (Kept for compatibility during migration)
  colorGrade?: ColorGradeParams;
  cameraEffect?: CameraEffect;

  reactivity?: {
    targetProperty: 'scale' | 'opacity' | 'brightness';
    frequencyRange: 'bass' | 'mids' | 'highs';
    sensitivity: number; // 0 to 2.0
  };

  // Magic Mask
  maskSequence?: string[];
}

export interface TimelineState {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  zoomLevel: number;
  currentTime: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface PronunciationTerm {
  term: string;
  pronunciation: string;
  description: string;
}

export interface VisualizerConfig {
  style: 'frequency' | 'lines' | 'waves';
  color: string;
}

export interface ChromaKeyConfig {
  enabled: boolean;
  color: string;
  similarity: number;
  smoothness: number;
  spill: number;
}

export interface CropConfig {
  xPercentage: number;
  keyframes?: { time: number; x: number }[];
}

// ---------------------------------------------------------------------------
// API Health Types (v2.5.0)
// ---------------------------------------------------------------------------

/** Health status for a single API endpoint */
export type EndpointHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/** Health snapshot for a single endpoint */
export interface EndpointHealth {
  /** Endpoint identifier (matches circuit breaker endpointId) */
  endpointId: string;
  /** Current health status */
  status: EndpointHealthStatus;
  /** Average response latency in ms (rolling window) */
  avgLatencyMs: number;
  /** Error rate as a fraction 0–1 (rolling window) */
  errorRate: number;
  /** Total requests in the current window */
  totalRequests: number;
  /** Timestamp of last health check */
  lastCheckedAt: number;
  /** Whether this endpoint is reachable (online) */
  isReachable: boolean;
}

/** Aggregate API health state */
export interface ApiHealthState {
  /** Whether the device is online (navigator.onLine) */
  isOnline: boolean;
  /** Per-endpoint health snapshots */
  endpoints: Record<string, EndpointHealth>;
  /** Timestamp of the last global health check */
  lastGlobalCheckAt: number;
}

// ---------------------------------------------------------------------------
// Cost Tracking Types (v2.5.0)
// ---------------------------------------------------------------------------

/** Pricing structure for a single model */
export interface ModelPricing {
  /** Model identifier (e.g., 'gemini-3.1-pro-preview', 'veo-3.1-generate-preview') */
  modelId: string;
  /** Human-readable model name */
  displayName: string;
  /** Cost per 1M input tokens in USD (for text/prompt models) */
  inputTokenCostPer1M?: number;
  /** Cost per 1M output tokens in USD (for text/prompt models) */
  outputTokenCostPer1M?: number;
  /** Cost per second of generated video in USD (for video models) */
  videoCostPerSecond?: number;
  /** Resolution-specific video pricing when the provider varies cost by output size */
  videoCostPerSecondByResolution?: Partial<Record<'720p' | '1080p' | '4k', number>>;
  /** Flat cost per image generation in USD (for image models) */
  imageCostPerGeneration?: number;
  /** Currency (always 'USD' for now) */
  currency: 'USD';
}

/** Estimated cost for a single API call before execution */
export interface CostEstimate {
  /** Model used for the estimate */
  modelId: string;
  /** Estimated input tokens */
  estimatedInputTokens: number;
  /** Estimated output tokens */
  estimatedOutputTokens: number;
  /** Estimated video duration in seconds (for video generation) */
  estimatedVideoDurationSeconds?: number;
  /** Total estimated cost in USD */
  estimatedCostUsd: number;
}

/** Recorded cost for a completed API call */
export interface CostRecord {
  /** Unique record ID */
  id: string;
  /** Timestamp of the API call */
  timestamp: number;
  /** Model used */
  modelId: string;
  /** Endpoint identifier */
  endpointId: string;
  /** Actual or estimated input tokens */
  inputTokens: number;
  /** Actual or estimated output tokens */
  outputTokens: number;
  /** Video duration in seconds (if applicable) */
  videoDurationSeconds?: number;
  /** Cost in USD */
  costUsd: number;
  /** Whether this is a confirmed or estimated cost */
  isEstimated: boolean;
  /** Description of what was generated */
  description: string;
}

/** Aggregate cost tracking state */
export interface CostTrackingState {
  /** Cost records for the current session */
  sessionRecords: CostRecord[];
  /** Total cost this session in USD */
  sessionTotalUsd: number;
  /** Total cost all-time in USD */
  lifetimeTotalUsd: number;
  /** Optional monthly budget in USD (null = no budget) */
  monthlyBudgetUsd: number | null;
  /** Cost spent this month in USD */
  monthlySpentUsd: number;
}

// ---------------------------------------------------------------------------
// Generation Queue Types (v2.5.0)
// ---------------------------------------------------------------------------

/** Status of a queued generation request */
export type GenerationQueueItemStatus =
  | 'pending'
  | 'waiting-online'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** A generation request in the unified offline-aware queue */
export interface GenerationQueueItem {
  /** Unique item ID */
  id: string;
  /** Type of generation */
  type: 'video' | 'prompt' | 'image' | 'audio';
  /** Display label */
  label: string;
  /** Current status */
  status: GenerationQueueItemStatus;
  /** Priority (higher = executed first) */
  priority: number;
  /** Progress 0–100 */
  progress: number;
  /** The generation payload (prompt text, settings, etc.) */
  payload: unknown;
  /** Cost estimate before execution */
  costEstimate?: CostEstimate;
  /** Actual cost after completion */
  actualCost?: CostRecord;
  /** Error message if failed */
  error?: string;
  /** Number of retry attempts */
  retryCount: number;
  /** Whether this was queued while offline */
  queuedOffline: boolean;
  /** Timestamps */
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}
