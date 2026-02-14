/**
 * Registry Service
 * Client for fetching, caching, and querying the remote plugin registry.
 * v1.9.0 - Platform Foundations
 *
 * The registry is a static JSON index (hosted on CDN/GitHub Pages).
 * Actual plugin installation from remote is deferred to v2.0.0.
 */

import { get, set } from 'idb-keyval';
import { logger } from './loggerService';
import type {
  RegistryIndex,
  RegistryEntry,
  RegistryConfig,
  RegistrySearchParams,
  RegistrySearchResult,
  RegistryCacheEntry,
  RegistryCategory,
} from '@core/types/registry';
import { DEFAULT_REGISTRY_CONFIG } from '@core/types/registry';

const CACHE_KEY = 'registry_cache';

class RegistryService {
  private static instance: RegistryService;
  private config: RegistryConfig;
  private cachedIndex: RegistryIndex | null = null;

  private constructor() {
    this.config = { ...DEFAULT_REGISTRY_CONFIG };
  }

  static getInstance(): RegistryService {
    if (!RegistryService.instance) {
      RegistryService.instance = new RegistryService();
    }
    return RegistryService.instance;
  }

  // ─── Configuration ────────────────────────────────────────────────

  /**
   * Update registry configuration.
   */
  configure(config: Partial<RegistryConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Registry service configured', undefined, { baseUrl: this.config.baseUrl });
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<RegistryConfig> {
    return { ...this.config };
  }

  // ─── Fetch & Cache ────────────────────────────────────────────────

  /**
   * Fetch the registry index from the remote URL.
   * Uses cached data if still fresh. Falls back to cached data on fetch failure.
   */
  async fetchIndex(force = false): Promise<RegistryIndex | null> {
    try {
      // Check cache first (unless forced)
      if (!force) {
        const cached = await this.loadCache();
        if (cached && !this.isStale(cached.cachedAt)) {
          this.cachedIndex = cached.index;
          return cached.index;
        }
      }

      // Fetch from remote
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const response = await fetch(`${this.config.baseUrl}/registry.json`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`Registry fetch failed: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as RegistryIndex;

        // Validate basic structure
        if (!data || !Array.isArray(data.entries)) {
          throw new Error('Invalid registry index structure');
        }

        // Cache the result
        const cacheEntry: RegistryCacheEntry = {
          index: data,
          cachedAt: Date.now(),
          etag: response.headers.get('etag') || undefined,
        };
        await this.saveCache(cacheEntry);
        this.cachedIndex = data;

        logger.info('Registry index fetched', undefined, {
          entries: data.entries.length,
          version: data.version,
        });

        return data;
      } catch (fetchError) {
        clearTimeout(timeout);

        // Fallback to stale cache on network failure
        const staleCache = await this.loadCache();
        if (staleCache) {
          logger.warn('Using stale registry cache due to fetch failure', undefined, fetchError);
          this.cachedIndex = staleCache.index;
          return staleCache.index;
        }

        throw fetchError;
      }
    } catch (error) {
      logger.error('Failed to fetch registry index', undefined, error);
      return null;
    }
  }

  /**
   * Check if the cache is stale based on TTL.
   */
  isStale(cachedAt?: number): boolean {
    if (!cachedAt) return true;
    return Date.now() - cachedAt > this.config.cacheTtlMs;
  }

  // ─── Search & Query ───────────────────────────────────────────────

  /**
   * Search the registry with filters and pagination.
   * Uses the in-memory cached index (call fetchIndex first).
   */
  async search(params: RegistrySearchParams = {}): Promise<RegistrySearchResult> {
    const index = this.cachedIndex || (await this.fetchIndex());
    if (!index) {
      return { entries: [], total: 0, page: 1, hasMore: false };
    }

    let results = [...index.entries];

    // Filter by query (matches name, description, tags)
    if (params.query) {
      const q = params.query.toLowerCase();
      results = results.filter(
        (entry) =>
          entry.name.toLowerCase().includes(q) ||
          entry.description.toLowerCase().includes(q) ||
          entry.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    // Filter by category
    if (params.category) {
      results = results.filter((entry) => entry.category === params.category);
    }

    // Filter by author
    if (params.author) {
      const a = params.author.toLowerCase();
      results = results.filter((entry) => entry.author.toLowerCase().includes(a));
    }

    // Filter by tag
    if (params.tag) {
      const t = params.tag.toLowerCase();
      results = results.filter((entry) => entry.tags.some((tag) => tag.toLowerCase() === t));
    }

    // Sort
    const sortBy = params.sortBy || 'updatedAt';
    const order = params.order || 'desc';
    results.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    // Paginate
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const total = results.length;
    const start = (page - 1) * limit;
    const paged = results.slice(start, start + limit);

    return {
      entries: paged,
      total,
      page,
      hasMore: start + limit < total,
    };
  }

  /**
   * Get a specific registry entry by plugin ID.
   */
  async getEntry(pluginId: string): Promise<RegistryEntry | null> {
    const index = this.cachedIndex || (await this.fetchIndex());
    if (!index) return null;

    return index.entries.find((e) => e.id === pluginId) || null;
  }

  /**
   * Get all unique categories from the registry.
   */
  async getCategories(): Promise<RegistryCategory[]> {
    const index = this.cachedIndex || (await this.fetchIndex());
    if (!index) return [];

    const categories = new Set<RegistryCategory>();
    index.entries.forEach((entry) => categories.add(entry.category));
    return [...categories].sort();
  }

  /**
   * Get all unique tags from the registry.
   */
  async getTags(): Promise<string[]> {
    const index = this.cachedIndex || (await this.fetchIndex());
    if (!index) return [];

    const tags = new Set<string>();
    index.entries.forEach((entry) => entry.tags.forEach((tag) => tags.add(tag)));
    return [...tags].sort();
  }

  /**
   * Get the total number of entries in the registry.
   */
  getEntryCount(): number {
    return this.cachedIndex?.entries.length ?? 0;
  }

  /**
   * Get the last-fetched timestamp (or null if never fetched).
   */
  async getLastFetched(): Promise<number | null> {
    const cache = await this.loadCache();
    return cache?.cachedAt ?? null;
  }

  // ─── Cache Management ─────────────────────────────────────────────

  /**
   * Clear the cached registry data.
   */
  async clearCache(): Promise<void> {
    this.cachedIndex = null;
    await set(CACHE_KEY, undefined);
    logger.info('Registry cache cleared');
  }

  private async loadCache(): Promise<RegistryCacheEntry | null> {
    try {
      const cached = await get<RegistryCacheEntry>(CACHE_KEY);
      return cached || null;
    } catch {
      return null;
    }
  }

  private async saveCache(entry: RegistryCacheEntry): Promise<void> {
    try {
      await set(CACHE_KEY, entry);
    } catch (error) {
      logger.warn('Failed to save registry cache', undefined, error);
    }
  }
}

export const registryService = RegistryService.getInstance();
