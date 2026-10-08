import type { PromptArtifactV1, VideoPromptVariant } from './promptArtifact';

/** A local external result preserves its source without inventing a provider operation. */
export interface ExternalStudioResultV1 {
  schemaVersion: 1;
  id: string;
  projectId: string;
  artifactId: string;
  variantIndex: 0 | 1 | 2;
  target: PromptArtifactV1['target'];
  assetId: string;
  assetName: string;
  mimeType: string;
  durationSeconds: number;
  importedAt: string;
  updatedAt: number;
  sourceSnapshot: PromptArtifactV1;
  variantSnapshot: VideoPromptVariant;
  manualReview?: { confirmedAt: string; notes: string; assetId: string; mediaHash?: string };
  storyboardShotId?: number;
}
