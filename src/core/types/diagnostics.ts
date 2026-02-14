/**
 * Diagnostics & Project Intelligence Types
 * v1.8.0 — Project Intelligence Layer
 *
 * Defines types for project health scoring, scene consistency validation,
 * timeline integrity checking, and dependency mapping.
 *
 * @module diagnostics
 */

// ─── Severity & Categories ───────────────────────────────────────────────

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export type DiagnosticCategory =
  | 'project-health'
  | 'scene-consistency'
  | 'timeline-integrity'
  | 'prompt-quality'
  | 'dependency';

// ─── Diagnostic Issue ────────────────────────────────────────────────────

export interface DiagnosticIssue {
  /** Unique identifier */
  id: string;
  /** Human-readable summary */
  message: string;
  /** Detailed explanation or suggestion */
  detail?: string;
  /** Severity level */
  severity: DiagnosticSeverity;
  /** Classification category */
  category: DiagnosticCategory;
  /** Where in the project the issue occurs */
  location?: DiagnosticLocation;
  /** Auto-fix action identifier (if fixable) */
  fixAction?: string;
  /** Timestamp of detection */
  detectedAt: number;
}

export interface DiagnosticLocation {
  /** 'shot' | 'clip' | 'track' | 'prompt' | 'project' */
  type: 'shot' | 'clip' | 'track' | 'prompt' | 'project';
  /** ID of the referenced entity */
  entityId: string | number;
  /** Human-readable label */
  label?: string;
}

// ─── Project Health Score ────────────────────────────────────────────────

export type HealthTier = 'Critical' | 'Needs Work' | 'Good' | 'Excellent';

export interface ProjectHealthScore {
  /** Overall score 0–100 */
  overall: number;
  /** Tier classification */
  tier: HealthTier;
  /** Score color for UI */
  color: 'red' | 'orange' | 'yellow' | 'green';
  /** Breakdown by dimension */
  dimensions: HealthDimension[];
  /** Timestamp of computation */
  computedAt: number;
}

export interface HealthDimension {
  /** Dimension name */
  name: string;
  /** Score 0–100 */
  score: number;
  /** Maximum possible score */
  maxScore: number;
  /** What this dimension measures */
  description: string;
}

// ─── Scene Consistency ───────────────────────────────────────────────────

export interface SceneConsistencyResult {
  /** Whether all shots are consistent */
  isConsistent: boolean;
  /** Per-shot consistency details */
  shotResults: ShotConsistencyDetail[];
  /** Cross-scene issues */
  issues: DiagnosticIssue[];
}

export interface ShotConsistencyDetail {
  shotId: number;
  /** Whether this shot has a character assigned */
  hasCharacter: boolean;
  /** Whether this shot has a location assigned */
  hasLocation: boolean;
  /** Whether transition matches neighbors */
  transitionValid: boolean;
  /** Style drift from global context (0 = identical, 1 = completely different) */
  styleDrift: number;
}

// ─── Timeline Integrity ──────────────────────────────────────────────────

export interface TimelineIntegrityResult {
  /** Whether timeline has no issues */
  isValid: boolean;
  /** Detected gaps in tracks */
  gaps: TimelineGap[];
  /** Detected overlaps in tracks */
  overlaps: TimelineOverlap[];
  /** Orphaned clips not tied to any shot */
  orphanClips: string[];
  /** Shots with no corresponding clips */
  unlinkedShots: number[];
  /** All issues */
  issues: DiagnosticIssue[];
}

export interface TimelineGap {
  trackId: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface TimelineOverlap {
  trackId: string;
  clipAId: string;
  clipBId: string;
  overlapStart: number;
  overlapEnd: number;
}

// ─── Dependency Map ──────────────────────────────────────────────────────

export type DependencyNodeType =
  | 'shot'
  | 'clip'
  | 'character'
  | 'location'
  | 'template'
  | 'preset'
  | 'project';

export interface DependencyNode {
  id: string;
  type: DependencyNodeType;
  label: string;
  /** Number of connections */
  weight: number;
}

export interface DependencyEdge {
  from: string;
  to: string;
  relationship: 'uses' | 'references' | 'depends-on' | 'contains';
}

export interface DependencyMap {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  /** Disconnected nodes (no edges) */
  isolatedNodes: string[];
}

// ─── Full Analysis Result ────────────────────────────────────────────────

export interface AnalysisResult {
  projectId: string;
  health: ProjectHealthScore;
  sceneConsistency: SceneConsistencyResult;
  timelineIntegrity: TimelineIntegrityResult;
  dependencyMap: DependencyMap;
  /** All issues aggregated */
  allIssues: DiagnosticIssue[];
  /** Total analysis time in ms */
  analysisTimeMs: number;
  /** When analysis was last run */
  lastAnalyzedAt: number;
}

// ─── Analysis Request (for worker) ──────────────────────────────────────

export interface AnalysisRequest {
  type: 'full' | 'health' | 'scene' | 'timeline' | 'dependency';
  projectId: string;
  /** Snapshot of shots */
  shots: import('@core/types').Shot[];
  /** Snapshot of tracks */
  tracks: import('@core/types').TimelineTrack[];
  /** Snapshot of clips */
  clips: import('@core/types').TimelineClip[];
  /** Prompt state */
  promptState: import('@core/types').PromptState;
  /** Global context */
  globalContext: import('@core/types').GlobalContext;
  /** Character profiles in the project */
  characters: import('@core/types').CharacterProfile[];
  /** Location profiles in the project */
  locations: import('@core/types').LocationProfile[];
}

export interface AnalysisWorkerMessage {
  type: 'analysis-result';
  result: AnalysisResult;
}

export interface AnalysisWorkerError {
  type: 'analysis-error';
  error: string;
}
