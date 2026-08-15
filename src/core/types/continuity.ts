/**
 * v10 Continuity Studio contracts.
 *
 * The contracts intentionally keep the Production Bible local and provider-neutral. Provider
 * payloads only receive the compiled snapshot produced for one shot.
 */

export type ContinuityProfileKind = 'character' | 'location' | 'prop' | 'look';

export type ContinuityReferenceRole = 'identity' | 'style' | 'location' | 'prop' | 'frame';

export type ContinuityReferenceSource = 'imported' | 'manual' | 'accepted-take' | 'extracted-frame';

export interface ContinuityReference {
  assetId: string;
  role: ContinuityReferenceRole;
  rank: number;
  canonical: boolean;
  source: ContinuityReferenceSource;
  assetHash?: string;
  createdAt: number;
}

export interface ContinuityProfileProvenance {
  source:
    | ContinuityReferenceSource
    | 'legacy-character-bank'
    | 'legacy-location-bank'
    | 'legacy-visual-dna';
  sourceId?: string;
  importedAt: number;
  notes?: string[];
}

export interface ContinuityTurnaroundSheet {
  frontAssetId?: string;
  threeQuarterAssetId?: string;
  profileAssetId?: string;
  backAssetId?: string;
  actionPoseAssetId?: string;
}

export interface VisualDriftAssessment {
  shotId: number;
  profileId: string;
  confidenceScore: number; // 0 to 100
  driftStatus: 'in-character' | 'minor-drift' | 'severe-drift';
  detectedDeviations: string[];
  pHashSimilarity: number; // 0.0 to 1.0
  colorSimilarity: number; // 0.0 to 1.0
  analyzedAt: number;
}

export interface ContinuityProfile {
  id: string;
  name: string;
  kind: ContinuityProfileKind;
  version: number;
  description: string;
  lockedAttributes: Record<string, string>;
  forbiddenDeviations: string[];
  references: ContinuityReference[];
  turnaroundSheet?: ContinuityTurnaroundSheet;
  colorPalette?: string[];
  provenance: ContinuityProfileProvenance;
  updatedAt: number;
}

export interface ProductionBible {
  schemaVersion: 1;
  profiles: ContinuityProfile[];
  projectLookProfileId?: string;
  lockedDefaults: Record<string, string>;
  migratedFrom?: string[];
  updatedAt: number;
}

export interface ShotContinuityBinding {
  profileIds: string[];
  inheritedLookProfileId?: string;
  explicitReferenceAssetIds: string[];
  locks: Record<string, string>;
  allowSoftWarnings?: boolean;
}

export interface ContinuitySnapshot {
  schemaVersion: 1;
  shotId: number;
  profileVersions: Record<string, number>;
  profileIds: string[];
  referenceAssetIds: string[];
  referenceAssetHashes: Record<string, string>;
  firstFrameAssetId?: string;
  lastFrameAssetId?: string;
  extensionSourceTakeId?: string;
  lockFingerprint: string;
  promptFragment: string;
  snapshotHash: string;
  createdAt: number;
}

export type ContinuityIssueSeverity = 'blocking' | 'warning' | 'info';

export type ContinuityIssueCode =
  | 'profile-missing'
  | 'reference-missing'
  | 'reference-unreadable'
  | 'reference-capacity'
  | 'lock-conflict'
  | 'soft-drift'
  | 'snapshot-changed';

export interface ContinuityIssue {
  id: string;
  code: ContinuityIssueCode;
  severity: ContinuityIssueSeverity;
  message: string;
  profileId?: string;
  assetId?: string;
  field?: string;
}

export interface ContinuityReport {
  schemaVersion: 1;
  shotId: number;
  status: 'ready' | 'warning' | 'blocked';
  issues: ContinuityIssue[];
  candidateReferenceAssetIds: string[];
  selectedReferenceAssetIds: string[];
  snapshotHash: string;
  generatedAt: number;
  overrideReason?: string;
}

export interface ContinuityOverrideRecord {
  id: string;
  shotId: number;
  snapshotHash: string;
  issueCodes: ContinuityIssueCode[];
  reason: string;
  createdAt: number;
}
