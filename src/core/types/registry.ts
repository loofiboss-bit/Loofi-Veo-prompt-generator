/**
 * Remote Plugin Registry Type Definitions
 * v1.9.0 - Platform Foundations
 *
 * Types for the remote plugin registry protocol.
 * The registry is a static JSON index hosted on CDN/GitHub Pages.
 * Actual plugin installation from remote is deferred to v2.0.0.
 */

import type { PluginPermission } from './plugin';

// ─── Registry Entry ──────────────────────────────────────────────────

/**
 * A single plugin entry in the remote registry index.
 */
export interface RegistryEntry {
  /** Unique plugin identifier (e.g., "com.author.plugin-name") */
  id: string;
  /** Human-readable plugin name */
  name: string;
  /** Latest published version (semver) */
  version: string;
  /** Short description of what the plugin does */
  description: string;
  /** Plugin author name or organization */
  author: string;
  /** SPDX license identifier */
  license?: string;
  /** Plugin homepage URL */
  homepage?: string;
  /** Source repository URL */
  repository?: string;
  /** Download URL for the plugin bundle */
  downloadUrl: string;
  /** SHA-256 checksum of the plugin bundle */
  checksum: string;
  /** Base64-encoded Ed25519 signature of the manifest */
  signature?: string;
  /** Required engine (app) version range (semver) */
  engineVersion: string;
  /** Permissions the plugin requires */
  permissions: PluginPermission[];
  /** Bundle file size in bytes */
  size: number;
  /** Total download count */
  downloads: number;
  /** Average user rating (0–5) */
  rating: number;
  /** Number of user ratings */
  ratingCount: number;
  /** Unix timestamp of first publication */
  publishedAt: number;
  /** Unix timestamp of last update */
  updatedAt: number;
  /** Searchable tags */
  tags: string[];
  /** Plugin category for browsing */
  category: RegistryCategory;
  /** Available version history (latest first) */
  versions?: RegistryVersionEntry[];
}

/**
 * A historical version entry in the registry.
 */
export interface RegistryVersionEntry {
  version: string;
  downloadUrl: string;
  checksum: string;
  signature?: string;
  publishedAt: number;
  changelog?: string;
}

// ─── Registry Index ──────────────────────────────────────────────────

/**
 * The top-level registry index structure.
 * Fetched from the configured registry URL.
 */
export interface RegistryIndex {
  /** Schema version of the registry index */
  version: string;
  /** Unix timestamp of last index update */
  updatedAt: number;
  /** All plugin entries in the registry */
  entries: RegistryEntry[];
}

// ─── Categories ──────────────────────────────────────────────────────

/**
 * Plugin categories for browsing/filtering.
 */
export type RegistryCategory =
  | 'studio'
  | 'export'
  | 'prompt-enhancement'
  | 'template'
  | 'analysis'
  | 'integration'
  | 'ui-theme'
  | 'utility'
  | 'other';

// ─── Search & Filtering ─────────────────────────────────────────────

/**
 * Sort fields for registry search results.
 */
export type RegistrySortField = 'name' | 'downloads' | 'rating' | 'updatedAt' | 'publishedAt';

/**
 * Search parameters for querying the registry.
 */
export interface RegistrySearchParams {
  /** Free-text search query (matches name, description, tags) */
  query?: string;
  /** Filter by category */
  category?: RegistryCategory;
  /** Filter by author */
  author?: string;
  /** Filter by tag */
  tag?: string;
  /** Sort results by field */
  sortBy?: RegistrySortField;
  /** Sort order */
  order?: 'asc' | 'desc';
  /** Page number (1-based) */
  page?: number;
  /** Results per page */
  limit?: number;
}

/**
 * Paginated search results from the registry.
 */
export interface RegistrySearchResult {
  /** Matched entries for the current page */
  entries: RegistryEntry[];
  /** Total number of matching entries */
  total: number;
  /** Current page number */
  page: number;
  /** Whether more pages are available */
  hasMore: boolean;
}

// ─── Configuration ───────────────────────────────────────────────────

/**
 * Registry client configuration.
 */
export interface RegistryConfig {
  /** Base URL of the registry index */
  baseUrl: string;
  /** Cache time-to-live in milliseconds */
  cacheTtlMs: number;
  /** Fetch timeout in milliseconds */
  timeout: number;
}

/**
 * Default registry configuration values.
 */
export const DEFAULT_REGISTRY_CONFIG: RegistryConfig = {
  baseUrl: 'https://plugins.veo-studio.dev',
  cacheTtlMs: 30 * 60 * 1000, // 30 minutes
  timeout: 10_000, // 10 seconds
};

// ─── Cache ───────────────────────────────────────────────────────────

/**
 * Cached registry data stored in idb-keyval.
 */
export interface RegistryCacheEntry {
  /** The cached registry index */
  index: RegistryIndex;
  /** Unix timestamp when the data was cached */
  cachedAt: number;
  /** The ETag header from the last fetch (for conditional requests) */
  etag?: string;
}
