/**
 * Desktop Production Types
 * v2.0.0 - Platform Transformation
 *
 * Types for crash reporting, opt-in telemetry, and
 * differential update infrastructure.
 */

// ─── Crash Reporting ────────────────────────────────────────────────

/** Severity level of a crash report */
export type CrashSeverity = 'fatal' | 'error' | 'warning';

/** Source context of a crash */
export type CrashSource = 'renderer' | 'main' | 'worker' | 'plugin' | 'unknown';

/** Current state of a crash report in the pipeline */
export type CrashReportState = 'pending' | 'stored' | 'submitted' | 'failed';

/** A single crash report entry */
export interface CrashReport {
  /** Unique identifier for this crash */
  readonly id: string;
  /** ISO 8601 timestamp of the crash */
  readonly timestamp: string;
  /** App version at time of crash */
  readonly appVersion: string;
  /** Platform info (win32, darwin, linux) */
  readonly platform: string;
  /** CPU architecture */
  readonly arch: string;
  /** Electron version if available */
  readonly electronVersion: string;
  /** Crash severity */
  readonly severity: CrashSeverity;
  /** Where the crash originated */
  readonly source: CrashSource;
  /** Error message */
  readonly message: string;
  /** Stack trace if available */
  readonly stack: string;
  /** Component tree path for React errors */
  readonly componentStack?: string;
  /** Additional context (active section, plugin ID, etc.) */
  readonly context: Record<string, string>;
  /** Session ID for grouping crashes within one app launch */
  readonly sessionId: string;
  /** Pipeline state */
  state: CrashReportState;
  /** Number of submission attempts */
  submissionAttempts: number;
  /** Last submission error if any */
  lastSubmissionError?: string;
}

/** Configuration for the crash reporter */
export interface CrashReporterConfig {
  /** Whether crash reporting is enabled (user opt-in) */
  enabled: boolean;
  /** Remote endpoint for submitting crash reports (empty = local only) */
  endpoint: string;
  /** Maximum number of stored crash reports */
  maxStoredReports: number;
  /** Maximum retry attempts for submission */
  maxRetries: number;
  /** Whether to include component stack traces */
  includeComponentStack: boolean;
  /** Whether to include plugin context */
  includePluginContext: boolean;
  /** Rate limit — max reports per minute */
  rateLimitPerMinute: number;
}

/** Summary of crash reporter state */
export interface CrashReporterState {
  /** Whether the reporter is initialized */
  initialized: boolean;
  /** Current configuration */
  config: CrashReporterConfig;
  /** Number of pending/stored reports */
  pendingCount: number;
  /** Number of submitted reports */
  submittedCount: number;
  /** Total crash count this session */
  sessionCrashCount: number;
  /** Most recent crash (if any) */
  lastCrash: CrashReport | null;
  /** Whether submission is in progress */
  isSubmitting: boolean;
}

// ─── Telemetry ──────────────────────────────────────────────────────

/** Known telemetry event categories */
export type TelemetryCategory =
  | 'session'
  | 'feature'
  | 'performance'
  | 'plugin'
  | 'export'
  | 'update'
  | 'error';

/** A single telemetry event */
export interface TelemetryEvent {
  /** Unique event ID */
  readonly id: string;
  /** Event name (e.g., 'session:start', 'feature:composer:open') */
  readonly name: string;
  /** Event category */
  readonly category: TelemetryCategory;
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** App version */
  readonly appVersion: string;
  /** Platform */
  readonly platform: string;
  /** Privacy-safe properties (no PII) */
  readonly properties: Record<string, string | number | boolean>;
  /** Session ID for grouping */
  readonly sessionId: string;
  /** Whether this event has been synced */
  synced: boolean;
}

/** Configuration for the telemetry service */
export interface TelemetryConfig {
  /** Whether telemetry is enabled (user opt-in) */
  enabled: boolean;
  /** Remote endpoint for syncing events (empty = local only) */
  endpoint: string;
  /** Batch size for sync operations */
  batchSize: number;
  /** Sync interval in milliseconds */
  syncIntervalMs: number;
  /** Maximum stored events before pruning */
  maxStoredEvents: number;
  /** Event categories to track (empty = all) */
  enabledCategories: TelemetryCategory[];
  /** Whether to track performance metrics */
  trackPerformance: boolean;
  /** Whether to track feature usage */
  trackFeatureUsage: boolean;
}

/** Summary of telemetry state */
export interface TelemetryState {
  /** Whether the service is initialized */
  initialized: boolean;
  /** Current configuration */
  config: TelemetryConfig;
  /** Number of pending (un-synced) events */
  pendingCount: number;
  /** Total events tracked this session */
  sessionEventCount: number;
  /** Whether a sync is in progress */
  isSyncing: boolean;
  /** Last sync timestamp */
  lastSyncTimestamp: number | null;
  /** Last sync error */
  lastSyncError: string | null;
}

// ─── Differential Updates ────────────────────────────────────────────

/** Strategy for downloading updates */
export type UpdateStrategy = 'full' | 'differential' | 'auto';

/** State of a differential update download */
export type DiffUpdateState =
  | 'idle'
  | 'checking'
  | 'downloading-blockmap'
  | 'calculating-diff'
  | 'downloading-blocks'
  | 'assembling'
  | 'verifying'
  | 'staging'
  | 'ready'
  | 'installing'
  | 'complete'
  | 'failed'
  | 'rolled-back';

/** Block range for differential download */
export interface BlockRange {
  /** Starting byte offset */
  readonly offset: number;
  /** Size of the block in bytes */
  readonly size: number;
  /** SHA-256 checksum of the block */
  readonly checksum: string;
}

/** Blockmap describing the structure of a release artifact */
export interface Blockmap {
  /** Version this blockmap describes */
  readonly version: string;
  /** Total file size */
  readonly size: number;
  /** Block size used for splitting */
  readonly blockSize: number;
  /** SHA-256 of the full file */
  readonly sha256: string;
  /** Individual block definitions */
  readonly blocks: BlockRange[];
}

/** Differential update progress info */
export interface DiffUpdateProgress {
  /** Current state */
  state: DiffUpdateState;
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable status message */
  message: string;
  /** Total bytes to download */
  totalBytes: number;
  /** Bytes downloaded so far */
  downloadedBytes: number;
  /** Number of blocks that differ */
  changedBlocks: number;
  /** Total number of blocks */
  totalBlocks: number;
  /** Savings percentage vs full download */
  savingsPercent: number;
  /** Error message if failed */
  error?: string;
}

/** Configuration for differential updates */
export interface DiffUpdateConfig {
  /** Update strategy preference */
  strategy: UpdateStrategy;
  /** Whether to stage updates for install on next launch */
  stageForRestart: boolean;
  /** Whether to keep a rollback snapshot */
  keepRollbackSnapshot: boolean;
  /** Maximum rollback snapshots to retain */
  maxRollbackSnapshots: number;
  /** Verify checksum after assembly */
  verifyChecksum: boolean;
  /** Minimum savings percentage to use differential (otherwise full) */
  minSavingsPercent: number;
}

/** Rollback snapshot info */
export interface RollbackSnapshot {
  /** Snapshot ID */
  readonly id: string;
  /** Version this snapshot was taken from */
  readonly fromVersion: string;
  /** Version that was being installed */
  readonly toVersion: string;
  /** ISO 8601 timestamp */
  readonly createdAt: string;
  /** Size in bytes */
  readonly size: number;
  /** Whether the install completed */
  readonly installCompleted: boolean;
}

/** Comprehensive differential update state */
export interface DiffUpdateState_Full {
  /** Current progress */
  progress: DiffUpdateProgress;
  /** Configuration */
  config: DiffUpdateConfig;
  /** Available rollback snapshots */
  rollbackSnapshots: RollbackSnapshot[];
  /** Whether a staged update is waiting */
  stagedUpdateReady: boolean;
  /** Version of staged update */
  stagedVersion: string | null;
}

// ─── Desktop Health ─────────────────────────────────────────────────

/** Aggregate desktop health status */
export interface DesktopHealthStatus {
  /** Safe mode status from main process */
  safeMode: {
    enabled: boolean;
    reason: 'manual' | 'crash-loop' | 'none';
    crashCount: number;
  };
  /** Crash reporter summary */
  crashReporter: CrashReporterState;
  /** Telemetry summary */
  telemetry: TelemetryState;
  /** Update status */
  updateStatus: DiffUpdateProgress;
  /** App uptime in milliseconds */
  uptimeMs: number;
  /** Memory usage (renderer process) */
  memoryUsageMB: number;
}
