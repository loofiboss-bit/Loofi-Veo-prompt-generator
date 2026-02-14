/**
 * Workspace Type Definitions
 * v1.9.0 - Platform Foundations
 *
 * A workspace is a named container that groups projects with
 * its own settings. Supports the multi-workspace paradigm.
 */

import type { ProjectSettings } from '@core/services/projectService';

// ─── Workspace Core ──────────────────────────────────────────────────

/**
 * Workspace entity — groups projects with scoped settings.
 */
export interface Workspace {
  /** Unique workspace identifier */
  id: string;
  /** User-visible workspace name */
  name: string;
  /** Optional description */
  description: string;
  /** Unix timestamp of creation */
  createdAt: number;
  /** Unix timestamp of last modification */
  modifiedAt: number;
  /** IDs of projects belonging to this workspace */
  projectIds: string[];
  /** Workspace-level settings overrides (sparse — only overridden values stored) */
  settings: WorkspaceSettings;
  /** Display and activity metadata */
  metadata: WorkspaceMetadata;
}

/**
 * Workspace display and activity metadata.
 */
export interface WorkspaceMetadata {
  /** Number of projects in this workspace */
  projectCount: number;
  /** Unix timestamp of last activity in any project */
  lastActivity: number;
  /** Color label for visual identification */
  color?: string;
  /** Icon identifier for visual identification */
  icon?: string;
}

// ─── Workspace Settings ──────────────────────────────────────────────

/**
 * Fields from global AppSettings that can be overridden per workspace.
 * Sparse object — only the overridden fields are stored.
 */
export interface WorkspaceSettingsOverrides {
  autoSave?: boolean;
  autoSaveInterval?: number;
  defaultExportFormat?: 'mp4' | 'webm' | 'mov';
  defaultExportQuality?: 'low' | 'medium' | 'high' | 'ultra';
  compactMode?: boolean;
  enableExperimentalFeatures?: boolean;
}

/**
 * Workspace-scoped settings — project defaults + overridable app settings.
 */
export interface WorkspaceSettings extends WorkspaceSettingsOverrides {
  /** Default project settings for new projects in this workspace */
  defaultProjectSettings?: Partial<ProjectSettings>;
}

// ─── Settings Resolution ─────────────────────────────────────────────

/**
 * Fields that are globally-scoped only and cannot be overridden per workspace.
 */
export type GlobalOnlySettingKeys =
  | 'apiKey'
  | 'apiEndpoint'
  | 'enableAnalytics'
  | 'enableCrashReporting';

/**
 * Fields from AppSettings that can be overridden per workspace.
 */
export type OverridableSettingKeys = keyof WorkspaceSettingsOverrides;

/**
 * Source of a resolved setting value.
 */
export type SettingSource = 'workspace' | 'global' | 'default';

/**
 * Result of resolving a single setting, with provenance.
 */
export interface ResolvedSetting<T> {
  value: T;
  source: SettingSource;
}

// ─── Data Transfer ───────────────────────────────────────────────────

/**
 * Data required to create a new workspace.
 */
export interface CreateWorkspaceData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  settings?: WorkspaceSettings;
}

/**
 * Partial workspace updates (excludes immutable fields).
 */
export type UpdateWorkspaceData = Partial<Omit<Workspace, 'id' | 'createdAt'>>;
