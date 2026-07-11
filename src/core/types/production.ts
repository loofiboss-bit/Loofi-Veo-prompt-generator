import type { Asset, PromptState, Shot } from './index';

export type ProductionRunStatus =
  | 'draft'
  | 'planning'
  | 'awaiting-approval'
  | 'generating'
  | 'reviewing'
  | 'needs-revision'
  | 'paused'
  | 'complete'
  | 'failed'
  | 'cancelled';

export type ProductionShotStatus =
  | 'draft'
  | 'awaiting-approval'
  | 'approved'
  | 'queued'
  | 'submitting'
  | 'generating'
  | 'reviewing'
  | 'needs-revision'
  | 'accepted'
  | 'skipped'
  | 'failed'
  | 'recovery-required'
  | 'media-at-risk';

export type VeoGenerationMode =
  | 'text-to-video'
  | 'image-to-video'
  | 'interpolation'
  | 'reference-images'
  | 'extension';

export type VeoModelId = 'veo-3.1-quality' | 'veo-3.1-fast' | 'veo-3.1-lite';

export type VeoResolution = '720p' | '1080p' | '4k';
export type VeoDuration = 4 | 6 | 8;

export interface VeoProviderArtifact {
  operationName: string;
  mediaUri?: string;
  createdAt: number;
  expiresAt: number;
}

export interface VeoGenerationRequest {
  mode: VeoGenerationMode;
  modelId: VeoModelId;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: '16:9' | '9:16';
  resolution: VeoResolution;
  durationSeconds: VeoDuration;
  seed?: number;
  firstFrameAssetId?: string;
  lastFrameAssetId?: string;
  referenceAssetIds: string[];
  extensionSourceTakeId?: string;
  extensionArtifact?: VeoProviderArtifact;
}

export interface VeoCapabilityIssue {
  code:
    | 'prompt-required'
    | 'first-frame-required'
    | 'last-frame-requires-first-frame'
    | 'reference-count'
    | 'references-require-eight-seconds'
    | 'high-resolution-requires-eight-seconds'
    | 'extension-artifact-required'
    | 'extension-artifact-expired'
    | 'extension-requires-720p'
    | 'model-mode-unsupported'
    | 'model-resolution-unsupported'
    | 'incompatible-inputs';
  field: keyof VeoGenerationRequest;
  message: string;
}

export interface VideoProviderCapabilities {
  providerId: 'veo-3.1';
  models: VeoModelId[];
  modes: VeoGenerationMode[];
  durations: VeoDuration[];
  resolutions: VeoResolution[];
  maximumReferenceImages: number;
  supportsSeed: boolean;
  supportsExtension: boolean;
  pricingEffectiveDate: string;
}

export interface VideoGenerationProvider {
  readonly capabilities: VideoProviderCapabilities;
  validateRequest(request: VeoGenerationRequest, now?: number): VeoCapabilityIssue[];
  estimateCost(request: VeoGenerationRequest): number;
}

export interface ProductionReviewDimension {
  id: 'prompt-adherence' | 'subject-continuity' | 'composition' | 'motion' | 'audio';
  score: number;
  summary: string;
}

export interface ProductionReviewFinding {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: ProductionReviewDimension['id'];
  message: string;
  timestampSeconds?: number;
}

export interface ShotReviewResult {
  id: string;
  shotId: number;
  takeId: string;
  overallScore: number;
  dimensions: ProductionReviewDimension[];
  findings: ProductionReviewFinding[];
  proposedRevisionPrompt?: string;
  source: 'local' | 'gemini' | 'mixed';
  createdAt: number;
}

export interface ProductionTake {
  id: string;
  taskId?: string;
  prompt: string;
  request: VeoGenerationRequest;
  status:
    | 'approved'
    | 'queued'
    | 'submitting'
    | 'generating'
    | 'complete'
    | 'failed'
    | 'recovery-required'
    | 'media-at-risk'
    | 'accepted'
    | 'rejected';
  providerArtifact?: VeoProviderArtifact;
  providerMediaUri?: string;
  localMediaKey?: string;
  localMediaUrl?: string;
  mediaRiskWaived?: boolean;
  review?: ShotReviewResult;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface ProductionShot {
  id: number;
  sourceShotId?: number;
  title: string;
  prompt: string;
  negativePrompt: string;
  camera: string;
  durationSeconds: number;
  status: ProductionShotStatus;
  generationRequest: VeoGenerationRequest;
  takes: ProductionTake[];
  selectedTakeId?: string;
  revisionPrompt?: string;
}

export interface ProductionApproval {
  id: string;
  kind: 'plan-enhancement' | 'generation-batch';
  shotIds: number[];
  maximumCostUsd: number;
  submissionAllowance: number;
  reviewAllowance: number;
  consumedSubmissions: number;
  consumedReviews: number;
  status: 'active' | 'consumed' | 'revoked';
  createdAt: number;
}

export interface ProductionCostSummary {
  estimatedUsd: number;
  approvedUsd: number;
  recordedUsd: number;
  pricingEffectiveDate: string;
}

export interface ProductionRun {
  schemaVersion: 1;
  id: string;
  projectId: string;
  title: string;
  status: ProductionRunStatus;
  brief: string;
  source: 'local' | 'gemini' | 'mixed';
  planRevision: number;
  promptSnapshot: PromptState;
  assetIds: string[];
  shots: ProductionShot[];
  approvals: ProductionApproval[];
  cost: ProductionCostSummary;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
}

export interface BuildProductionPlanInput {
  projectId: string;
  title: string;
  promptState: PromptState;
  shots?: Shot[];
  assets?: Asset[];
}

export interface VeoExecutionImage {
  data: string;
  mimeType: string;
}

export interface VeoExecutionInputs {
  firstFrame?: VeoExecutionImage;
  lastFrame?: VeoExecutionImage;
  referenceImages?: VeoExecutionImage[];
  extensionVideoUri?: string;
}
