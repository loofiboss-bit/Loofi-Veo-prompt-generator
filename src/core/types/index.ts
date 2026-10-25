export * from './timeline';
export * from './projectPrompt';
export * from './circuitBreaker';
export * from './collaboration';
export * from './continuity';
export * from './composer';
export * from './directExport';
export * from './desktopProduction';
export * from './diagnostics';
export * from './flowVeo';
export * from './marketplace';
export * from './music';
export * from './workspace';
export * from './registry';
export * from './optimization';
export * from './promptArtifact';
export * from './promptStudioDraft';
export * from './studioRevision';
export * from './studioTemplate';
export * from './externalStudioResult';
export * from './creatorDelivery';
export * from './costApproval';
export * from './providerArtifact';
import type { CreatorDeliveryV1 } from './creatorDelivery';
import type { ExternalStudioResultV1 } from './externalStudioResult';
import type { StudioRevisionV1 } from './studioRevision';
import type { PromptStudioDraftV1 } from './promptStudioDraft';
import type { Asset } from './projectPrompt';
export * from './production';
export * from './suno';
export * from './spatialCamera';
export * from './screenplay';
export * from './animatic';
export * from './otio';
export * from './modelTranspiler';
export * from './comfyUi';
export * from './coDirector';
export * from './audioPipeline';
export * from './writersRoom';

import type {
  BlockConnection,
  CanvasViewport,
  ComposerEvaluationResult,
  ComposerSnapshot,
  ConnectionStyle,
  PromptBlock,
  TimelineLink,
} from './composer';
import type { ProductionBible } from './continuity';
import type { VeoExecutionInputs, VeoGenerationRequest } from './production';
import type { PromptState, Shot } from './projectPrompt';
import type { TimelineState } from './timeline';

// Language is exported from ./projectPrompt

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
  | 'pause'
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

// GlobalStyle and PromptState are exported from ./projectPrompt

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
  [key: string]: unknown;
  /** Explicit schema version; v18 is current. */
  schemaVersion?: number;
  /** Monotonic document mutation counter for non-blocking persistence. */
  mutationVersion?: number;
  /** Optimistic concurrency token; legacy documents begin at zero. */
  documentRevision?: number;
  creatorDelivery?: CreatorDeliveryV1;
  studioDraft?: PromptStudioDraftV1;
  studioRevisions?: StudioRevisionV1[];
  studioResults?: ExternalStudioResultV1[];
  id: string;
  name: string;
  lastModified: number;
  promptState: PromptState;
  characterBank: CharacterProfile[];
  locationBank: LocationProfile[];
  visualDNA: VisualDNA[];
  /** Canonical v10 continuity source; legacy v5-v9 wire data is normalized on read. */
  productionBible: ProductionBible;
  storyboard: StoryboardState;
  /** Stable references to media used by this project's timeline and workspace. */
  assets?: Asset[];
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

// SFXEvent and Shot are exported from ./projectPrompt

export interface GenerationTask {
  localMediaKey?: string;
  localMediaUrl?: string;
  localMediaPath?: string;
  mimeType?: string;
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
  costApproval?: import('./production').PaidCostApproval;
  providerOperationName?: string;
  providerMediaUri?: string;
  providerExpiresAt?: number;
  productionRunId?: string;
  productionShotId?: number;
  productionTakeId?: string;
  continuitySnapshotHash?: string;
  continuityAssetHashes?: Record<string, string>;
  continuityProfileVersions?: Record<string, number>;
  error?: string;
  timestamp: number;
}

export type PaidJobTask = GenerationTask | import('./music').MusicGenerationTask;

// Asset and StockAsset are exported from ./projectPrompt

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

// Caption is exported from ./timeline

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

// TimelineTrack, TimelineClip, Keyframe, TransformProps, VolumeKeyframe, TimelineState are exported from ./timeline

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
  /** Resolution-specific image pricing. */
  imageCostPerGenerationByResolution?: Partial<
    Record<import('@core/models/catalog').ImageResolution, number>
  >;
  /** Currency (always 'USD' for now) */
  currency: 'USD';
  sourceUrl: string;
  verifiedDate: string;
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
  /** v9 audit metadata; optional only when reading pre-v9 persisted queue records. */
  confidence?: 'exact' | 'upper-bound';
  sourceUrl?: string;
  verifiedDate?: string;
  explanation?: string;
  assumptions?: readonly string[];
}

/** Recorded cost for a completed API call */
export interface CostRecord {
  /** Stable source identity for durable deduplication. */
  sourceJobId?: string;
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
  persistenceError?: string;
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
