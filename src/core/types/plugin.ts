/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Plugin System Type Definitions
 * v1.4.0 Week 4 - Plugin Architecture Foundation
 * v1.7.0 - Plugin API v1 (StudioPlugin contract, lifecycle, crash isolation)
 * v1.9.0 - Plugin signing & trust levels
 */

/**
 * Plugin lifecycle states
 */
export type PluginState = 'unloaded' | 'loaded' | 'active' | 'inactive' | 'error';

// ─── Studio Plugin Contract ──────────────────────────────────────────

/**
 * Formal interface that all studio plugins must implement.
 * Provides typed lifecycle hooks and metadata for the plugin system.
 */
export interface StudioPlugin {
  /** Called when the plugin is activated — register UI, load resources */
  activate: (context: PluginContext) => Promise<void>;
  /** Called when the plugin is deactivated — cleanup resources */
  deactivate?: () => Promise<void>;
  /** Called on uninstall — remove persisted data */
  dispose?: () => Promise<void>;
}

/**
 * Health status reported by a plugin (crash isolation).
 */
export type PluginHealthStatus = 'healthy' | 'degraded' | 'crashed';

/**
 * Runtime health metadata tracked per plugin.
 */
export interface PluginHealth {
  status: PluginHealthStatus;
  lastError?: Error;
  crashCount: number;
  lastCrashAt?: number;
}

/**
 * Semver range for engine compatibility.
 * Supports exact (`1.6.0`), caret (`^1.6.0`), tilde (`~1.6.0`), and gte (`>=1.6.0`).
 */
export type SemverRange = string;

/**
 * Plugin permission types
 */
export type PluginPermission =
  | 'storage'
  | 'storage:read'
  | 'storage:write'
  | 'projects:read'
  | 'projects:write'
  | 'history:read'
  | 'history:write'
  | 'templates:read'
  | 'templates:write'
  | 'export'
  | 'ui:sidebar'
  | 'ui:toolbar'
  | 'ui:modal'
  | 'ui:studio'
  | 'events:subscribe'
  | 'events:publish';

/**
 * Plugin extension point types
 */
export type ExtensionPointType =
  | 'sidebar-item'
  | 'toolbar-button'
  | 'modal'
  | 'export-format'
  | 'prompt-enhancer'
  | 'template-provider';

/**
 * Plugin setting types
 */
export type PluginSettingType = 'string' | 'number' | 'boolean' | 'select' | 'multiselect';

/**
 * Plugin setting definition
 */
export interface PluginSetting {
  type: PluginSettingType;
  label: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * Plugin extension point definition
 */
export interface ExtensionPoint {
  type: ExtensionPointType;
  component?: string;
  icon?: string;
  label?: string;
  position?: number;
  config?: Record<string, any>;
}

// ─── Plugin Signing (v1.9.0) ─────────────────────────────────────────

/**
 * Supported signing algorithms.
 */
export type SigningAlgorithm = 'Ed25519';

/**
 * Cryptographic signature attached to a plugin manifest.
 */
export interface PluginSignature {
  /** Signing algorithm used */
  algorithm: SigningAlgorithm;
  /** Base64-encoded public key of the signer */
  publicKey: string;
  /** Base64-encoded signature bytes */
  signature: string;
  /** Unix timestamp when the manifest was signed */
  signedAt: number;
  /** Manifest fields included in the signed payload (sorted) */
  signedFields: string[];
}

/**
 * Result of verifying a plugin signature.
 */
export interface PluginVerificationResult {
  /** Whether the signature is valid */
  valid: boolean;
  /** Human-readable reason (on failure or for informational purposes) */
  reason?: string;
  /** Unix timestamp of verification */
  verifiedAt: number;
}

/**
 * Trust level assigned to a plugin based on signature verification.
 *
 * - `trusted`   — Signed by a known trusted key, signature valid
 * - `untrusted` — Signed but signer is not in the trusted keys list
 * - `unsigned`  — No signature present
 * - `invalid`   — Signature present but verification failed
 */
export type PluginTrustLevel = 'trusted' | 'untrusted' | 'unsigned' | 'invalid';

/**
 * Plugin manifest schema
 */
export interface PluginManifest {
  // Basic metadata
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license?: string;
  homepage?: string;
  repository?: string;

  // Entry point
  main: string;

  // Dependencies
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;

  // Compatibility
  engineVersion?: string; // Minimum app version required

  // Permissions
  permissions: PluginPermission[];

  // Extension points
  extensionPoints?: ExtensionPoint[];

  // Settings
  settings?: Record<string, PluginSetting>;

  // Lifecycle hooks
  hooks?: {
    onInstall?: string;
    onUninstall?: string;
    onActivate?: string;
    onDeactivate?: string;
    onUpdate?: string;
    // Optimization hooks (v3.3.0)
    onPromptAnalysis?: string;
    onScoreCalculation?: string;
    onNarrativeCheck?: string;
  };

  // Signing (v1.9.0)
  /** Cryptographic signature for integrity verification */
  signature?: PluginSignature;
}

/**
 * Plugin context provided to plugins
 */
export interface PluginContext {
  // Plugin metadata
  manifest: PluginManifest;

  // API access
  api: PluginAPI;

  // Storage
  storage: PluginStorage;

  // Events
  events: PluginEvents;

  // Logger
  logger: PluginLogger;
}

/**
 * Plugin API interface
 */
export interface PluginAPI {
  // UI extensions
  ui: {
    registerSidebarItem: (config: SidebarItemConfig) => void;
    registerToolbarButton: (config: ToolbarButtonConfig) => void;
    registerModal: (config: ModalConfig) => void;
    registerStudio: (config: StudioConfig) => void;
    showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };

  // Data access
  data: {
    getProjects: () => Promise<any[]>;
    getProject: (id: string) => Promise<any>;
    saveProject: (project: any) => Promise<void>;
    getHistory: () => Promise<any[]>;
    getTemplates: () => Promise<any[]>;
  };

  // Export
  export: {
    registerFormat: (format: ExportFormat) => void;
    exportPrompt: (prompt: any, format: string) => Promise<void>;
  };

  // Settings
  settings: {
    get: <T = any>(key: string) => T | undefined;
    set: (key: string, value: any) => Promise<void>;
    getAll: () => Record<string, any>;
  };

  // Optimization hooks (v3.3.0)
  optimization: {
    /** Register a custom prompt analysis hook */
    onPromptAnalysis: (
      handler: (promptText: string) => Promise<OptimizationSuggestionInput[]>,
    ) => void;
    /** Register a custom quality scoring hook */
    onScoreCalculation: (
      handler: (promptText: string, baseScore: number) => Promise<number>,
    ) => void;
    /** Register a custom narrative analysis hook */
    onNarrativeCheck: (
      handler: (
        scenes: Array<{ id: string; promptText: string }>,
      ) => Promise<OptimizationNarrativeInput[]>,
    ) => void;
  };
}

/** Input type for plugin-provided prompt suggestions */
export interface OptimizationSuggestionInput {
  category: string;
  suggested: string;
  reasoning: string;
  confidence: number;
}

/** Input type for plugin-provided narrative issues */
export interface OptimizationNarrativeInput {
  type: string;
  sceneIds: string[];
  severity: 'info' | 'warning';
  suggestion: string;
}

/**
 * Plugin storage interface
 */
export interface PluginStorage {
  get: <T = any>(key: string) => Promise<T | undefined>;
  set: (key: string, value: any) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  keys: () => Promise<string[]>;
}

/**
 * Plugin events interface
 */
export interface PluginEvents {
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * Sidebar item configuration
 */
export interface SidebarItemConfig {
  id: string;
  label: string;
  icon?: string;
  component: React.ComponentType<any>;
  position?: number;
}

/**
 * Toolbar button configuration
 */
export interface ToolbarButtonConfig {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  position?: number;
}

/**
 * Modal configuration
 */
export interface ModalConfig {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  width?: string;
  height?: string;
}

/**
 * Studio configuration
 */
export interface StudioConfig {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

/**
 * Export format configuration
 */
export interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  export: (prompt: any) => Promise<Blob | string>;
}

/**
 * Plugin instance
 */
export interface Plugin {
  manifest: PluginManifest;
  state: PluginState;
  context?: PluginContext;
  /** Typed plugin instance — should implement StudioPlugin for studio plugins */
  instance?: StudioPlugin;
  error?: Error;
  /** Runtime health tracking for crash isolation */
  health: PluginHealth;
  /** Trust level based on signature verification (v1.9.0) */
  trustLevel?: PluginTrustLevel;
}

/**
 * Plugin loader result
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: Plugin;
  error?: Error;
}

/**
 * Plugin registry
 */
export interface PluginRegistry {
  plugins: Map<string, Plugin>;
  load: (manifest: PluginManifest) => Promise<PluginLoadResult>;
  unload: (pluginId: string) => Promise<void>;
  activate: (pluginId: string) => Promise<void>;
  deactivate: (pluginId: string) => Promise<void>;
  get: (pluginId: string) => Plugin | undefined;
  getAll: () => Plugin[];
  getActive: () => Plugin[];
}
