/**
 * Extension Marketplace Type Definitions
 * v2.0.0 - Platform Transformation
 *
 * Types for plugin installation, sandbox execution, and marketplace state.
 */

import type { PluginManifest, PluginTrustLevel, PluginPermission } from './plugin';

// ─── Installation ────────────────────────────────────────────────────

/**
 * States for in-progress plugin installation.
 */
export type InstallState =
  | 'idle'
  | 'downloading'
  | 'verifying'
  | 'extracting'
  | 'installing'
  | 'activating'
  | 'complete'
  | 'failed'
  | 'cancelled';

/**
 * Progress information for a plugin install/update operation.
 */
export interface InstallProgress {
  /** Registry plugin ID */
  pluginId: string;
  /** Current install state */
  state: InstallState;
  /** Progress percentage (0-100), -1 if indeterminate */
  progress: number;
  /** Human-readable status message */
  message: string;
  /** Error details if state is 'failed' */
  error?: string;
  /** Timestamp when the operation started */
  startedAt: number;
  /** Timestamp when the operation completed/failed */
  completedAt?: number;
}

/**
 * Result of a completed plugin installation.
 */
export interface InstallResult {
  /** Whether the installation succeeded */
  success: boolean;
  /** The installed plugin's manifest */
  manifest?: PluginManifest;
  /** Trust level determined during verification */
  trustLevel?: PluginTrustLevel;
  /** Error message if installation failed */
  error?: string;
  /** Duration of the install in milliseconds */
  durationMs: number;
}

/**
 * Metadata for an installed plugin bundle stored in IndexedDB.
 */
export interface InstalledPluginBundle {
  /** Plugin ID */
  pluginId: string;
  /** Plugin version */
  version: string;
  /** The plugin manifest extracted from the bundle */
  manifest: PluginManifest;
  /** The plugin source code (JavaScript string) */
  sourceCode: string;
  /** SHA-256 checksum of the source code */
  checksum: string;
  /** Trust level at installation time */
  trustLevel: PluginTrustLevel;
  /** Timestamp when installed */
  installedAt: number;
  /** Timestamp when last updated */
  updatedAt: number;
  /** Bundle size in bytes */
  size: number;
  /** Whether auto-update is enabled for this plugin */
  autoUpdate: boolean;
}

// ─── Sandbox ─────────────────────────────────────────────────────────

/**
 * Sandbox execution modes.
 */
export type SandboxMode =
  /** Full isolation via Web Worker — for untrusted/unsigned plugins */
  | 'worker'
  /** In-process with restricted globals — for trusted plugins */
  | 'restricted'
  /** Direct execution — only for internal/builtin plugins */
  | 'direct';

/**
 * Configuration for a plugin sandbox instance.
 */
export interface SandboxConfig {
  /** Unique sandbox instance ID */
  id: string;
  /** Plugin ID running in this sandbox */
  pluginId: string;
  /** Execution mode */
  mode: SandboxMode;
  /** Granted permissions */
  permissions: PluginPermission[];
  /** Memory limit in bytes (Worker mode only) */
  memoryLimitBytes?: number;
  /** Execution timeout in ms for individual API calls */
  apiTimeoutMs: number;
  /** Maximum number of API calls per minute */
  rateLimitPerMinute: number;
}

/**
 * State of a running plugin sandbox.
 */
export type SandboxState = 'initializing' | 'ready' | 'running' | 'suspended' | 'terminated';

/**
 * Runtime information about a plugin sandbox.
 */
export interface SandboxInfo {
  /** Sandbox configuration */
  config: SandboxConfig;
  /** Current state */
  state: SandboxState;
  /** Number of API calls made */
  apiCallCount: number;
  /** Timestamp of last API call */
  lastActivityAt?: number;
  /** Memory usage estimate in bytes */
  memoryUsage?: number;
  /** Errors encountered */
  errors: SandboxError[];
  /** When the sandbox was created */
  createdAt: number;
}

/**
 * An error captured from a sandbox.
 */
export interface SandboxError {
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Unix timestamp */
  timestamp: number;
  /** Whether this error was fatal (sandbox terminated) */
  fatal: boolean;
}

/**
 * Messages sent to a plugin sandbox worker.
 */
export type SandboxInMessage =
  | { type: 'init'; pluginId: string; sourceCode: string; permissions: PluginPermission[] }
  | { type: 'activate' }
  | { type: 'deactivate' }
  | { type: 'dispose' }
  | { type: 'api-response'; callId: string; result?: unknown; error?: string };

/**
 * Messages received from a plugin sandbox worker.
 */
export type SandboxOutMessage =
  | { type: 'ready' }
  | { type: 'activated' }
  | { type: 'deactivated' }
  | { type: 'disposed' }
  | { type: 'error'; message: string; stack?: string; fatal: boolean }
  | { type: 'api-call'; callId: string; method: string; args: unknown[] }
  | { type: 'log'; level: 'debug' | 'info' | 'warn' | 'error'; args: unknown[] };

// ─── Update ──────────────────────────────────────────────────────────

/**
 * Update availability info for an installed plugin.
 */
export interface PluginUpdateInfo {
  /** Plugin ID */
  pluginId: string;
  /** Currently installed version */
  currentVersion: string;
  /** Latest available version in registry */
  latestVersion: string;
  /** Changelog for the latest version */
  changelog?: string;
  /** Download URL for the update */
  downloadUrl: string;
  /** Size of the update bundle */
  size: number;
  /** Whether the update includes new permissions */
  hasNewPermissions: boolean;
  /** New permissions not in the currently installed version */
  newPermissions: PluginPermission[];
}

// ─── Marketplace State ──────────────────────────────────────────────

/**
 * View mode for the marketplace browser.
 */
export type MarketplaceView = 'browse' | 'installed' | 'updates';

/**
 * State shape for the marketplace Zustand store.
 */
export interface MarketplaceState {
  /** Currently active view */
  view: MarketplaceView;
  /** Map of plugin ID → installed bundle metadata */
  installedBundles: Map<string, InstalledPluginBundle>;
  /** Map of plugin ID → install/update progress */
  activeOperations: Map<string, InstallProgress>;
  /** Available updates discovered during last check */
  availableUpdates: PluginUpdateInfo[];
  /** Whether an update check is in progress */
  isCheckingUpdates: boolean;
  /** Last update check timestamp */
  lastUpdateCheck: number | null;
  /** Confirmation dialog state */
  pendingConfirmation: PendingConfirmation | null;
}

/**
 * A pending permission confirmation for plugin install/update.
 */
export interface PendingConfirmation {
  /** Operation type */
  action: 'install' | 'update' | 'uninstall';
  /** Plugin ID */
  pluginId: string;
  /** Plugin display name */
  pluginName: string;
  /** Permissions being requested */
  permissions: PluginPermission[];
  /** Trust level of the plugin */
  trustLevel: PluginTrustLevel;
  /** Resolve callback for the confirmation promise */
  resolve: (confirmed: boolean) => void;
}
