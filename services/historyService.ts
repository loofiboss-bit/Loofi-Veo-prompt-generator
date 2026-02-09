/**
 * History Service
 * Manages prompt history with IndexedDB storage
 * v1.3.0 - Workflow Integration
 */

import { get, set, del, keys, clear } from 'idb-keyval';
import { logger } from './loggerService';
import { PromptState } from '../types';

export interface HistoryEntry {
    id: string;
    projectId: string;
    timestamp: number;
    prompt: string;
    params: PromptState;
    metadata: PromptMetadata;
    tags: string[];
    favorite: boolean;
    version: string;
}

export interface PromptMetadata {
    style?: string;
    camera?: string;
    scene?: string;
    character?: string;
    audio?: string;
    duration?: number;
    aspectRatio?: string;
    model?: string;
    templateId?: string;
    presetIds?: string[];
}

export interface HistoryFilter {
    projectId?: string;
    startDate?: number;
    endDate?: number;
    tags?: string[];
    favorite?: boolean;
    searchQuery?: string;
}

export interface HistoryStats {
    totalEntries: number;
    favoriteCount: number;
    projectCount: number;
    oldestEntry?: number;
    newestEntry?: number;
    mostUsedTags: Array<{ tag: string; count: number }>;
}

class HistoryService {
    private readonly HISTORY_PREFIX = 'history_';
    private readonly MAX_ENTRIES = 1000;
    private readonly CURRENT_VERSION = '1.3.0';

    /**
     * Add a new history entry
     */
    async addEntry(
        prompt: string,
        params: PromptState,
        metadata: PromptMetadata,
        projectId: string = 'default',
        tags: string[] = []
    ): Promise<HistoryEntry> {
        try {
            const entry: HistoryEntry = {
                id: this.generateId(),
                projectId,
                timestamp: Date.now(),
                prompt,
                params,
                metadata,
                tags,
                favorite: false,
                version: this.CURRENT_VERSION,
            };

            await set(`${this.HISTORY_PREFIX}${entry.id}`, entry);
            logger.info('History entry added', 'HistoryService', { id: entry.id, projectId });

            // Cleanup old entries if exceeding max
            await this.cleanupOldEntries();

            return entry;
        } catch (error) {
            logger.error('Failed to add history entry', error);
            throw error;
        }
    }

    /**
     * Get a specific history entry by ID
     */
    async getEntry(id: string): Promise<HistoryEntry | null> {
        try {
            const entry = await get<HistoryEntry>(`${this.HISTORY_PREFIX}${id}`);
            return entry || null;
        } catch (error) {
            logger.error('Failed to get history entry', error);
            return null;
        }
    }

    /**
     * Get all history entries with optional filtering
     */
    async getEntries(filter?: HistoryFilter): Promise<HistoryEntry[]> {
        try {
            const allKeys = await keys();
            const historyKeys = allKeys.filter((key) =>
                String(key).startsWith(this.HISTORY_PREFIX)
            );

            const entries: HistoryEntry[] = [];
            for (const key of historyKeys) {
                const entry = await get<HistoryEntry>(key);
                if (entry) {
                    entries.push(entry);
                }
            }

            // Apply filters
            let filtered = entries;

            if (filter) {
                if (filter.projectId) {
                    filtered = filtered.filter((e) => e.projectId === filter.projectId);
                }

                if (filter.startDate) {
                    filtered = filtered.filter((e) => e.timestamp >= filter.startDate!);
                }

                if (filter.endDate) {
                    filtered = filtered.filter((e) => e.timestamp <= filter.endDate!);
                }

                if (filter.tags && filter.tags.length > 0) {
                    filtered = filtered.filter((e) =>
                        filter.tags!.some((tag) => e.tags.includes(tag))
                    );
                }

                if (filter.favorite !== undefined) {
                    filtered = filtered.filter((e) => e.favorite === filter.favorite);
                }

                if (filter.searchQuery) {
                    const query = filter.searchQuery.toLowerCase();
                    filtered = filtered.filter(
                        (e) =>
                            e.prompt.toLowerCase().includes(query) ||
                            e.tags.some((tag) => tag.toLowerCase().includes(query))
                    );
                }
            }

            // Sort by timestamp (newest first)
            filtered.sort((a, b) => b.timestamp - a.timestamp);

            return filtered;
        } catch (error) {
            logger.error('Failed to get history entries', error);
            return [];
        }
    }

    /**
     * Update an existing history entry
     */
    async updateEntry(
        id: string,
        updates: Partial<HistoryEntry>
    ): Promise<HistoryEntry | null> {
        try {
            const existing = await this.getEntry(id);
            if (!existing) {
                logger.warn('History entry not found for update', 'HistoryService', { id });
                return null;
            }

            const updated: HistoryEntry = {
                ...existing,
                ...updates,
                id: existing.id, // Prevent ID change
                timestamp: existing.timestamp, // Prevent timestamp change
            };

            await set(`${this.HISTORY_PREFIX}${id}`, updated);
            logger.info('History entry updated', 'HistoryService', { id });

            return updated;
        } catch (error) {
            logger.error('Failed to update history entry', error);
            return null;
        }
    }

    /**
     * Delete a history entry
     */
    async deleteEntry(id: string): Promise<boolean> {
        try {
            await del(`${this.HISTORY_PREFIX}${id}`);
            logger.info('History entry deleted', 'HistoryService', { id });
            return true;
        } catch (error) {
            logger.error('Failed to delete history entry', error);
            return false;
        }
    }

    /**
     * Delete multiple entries
     */
    async deleteEntries(ids: string[]): Promise<number> {
        let deleted = 0;
        for (const id of ids) {
            const success = await this.deleteEntry(id);
            if (success) deleted++;
        }
        return deleted;
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite(id: string): Promise<boolean> {
        try {
            const entry = await this.getEntry(id);
            if (!entry) return false;

            const updated = await this.updateEntry(id, { favorite: !entry.favorite });
            return updated !== null;
        } catch (error) {
            logger.error('Failed to toggle favorite', error);
            return false;
        }
    }

    /**
     * Add tags to an entry
     */
    async addTags(id: string, newTags: string[]): Promise<boolean> {
        try {
            const entry = await this.getEntry(id);
            if (!entry) return false;

            const uniqueTags = Array.from(new Set([...entry.tags, ...newTags]));
            const updated = await this.updateEntry(id, { tags: uniqueTags });
            return updated !== null;
        } catch (error) {
            logger.error('Failed to add tags', error);
            return false;
        }
    }

    /**
     * Remove tags from an entry
     */
    async removeTags(id: string, tagsToRemove: string[]): Promise<boolean> {
        try {
            const entry = await this.getEntry(id);
            if (!entry) return false;

            const filteredTags = entry.tags.filter((tag) => !tagsToRemove.includes(tag));
            const updated = await this.updateEntry(id, { tags: filteredTags });
            return updated !== null;
        } catch (error) {
            logger.error('Failed to remove tags', error);
            return false;
        }
    }

    /**
     * Get history statistics
     */
    async getStats(projectId?: string): Promise<HistoryStats> {
        try {
            const entries = await this.getEntries(projectId ? { projectId } : undefined);

            const tagCounts = new Map<string, number>();
            const projectIds = new Set<string>();

            entries.forEach((entry) => {
                projectIds.add(entry.projectId);
                entry.tags.forEach((tag) => {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                });
            });

            const mostUsedTags = Array.from(tagCounts.entries())
                .map(([tag, count]) => ({ tag, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            return {
                totalEntries: entries.length,
                favoriteCount: entries.filter((e) => e.favorite).length,
                projectCount: projectIds.size,
                oldestEntry: entries.length > 0 ? Math.min(...entries.map((e) => e.timestamp)) : undefined,
                newestEntry: entries.length > 0 ? Math.max(...entries.map((e) => e.timestamp)) : undefined,
                mostUsedTags,
            };
        } catch (error) {
            logger.error('Failed to get history stats', error);
            return {
                totalEntries: 0,
                favoriteCount: 0,
                projectCount: 0,
                mostUsedTags: [],
            };
        }
    }

    /**
     * Export history entries
     */
    async exportHistory(
        format: 'json' | 'csv' = 'json',
        filter?: HistoryFilter
    ): Promise<string> {
        try {
            const entries = await this.getEntries(filter);

            if (format === 'json') {
                return JSON.stringify(entries, null, 2);
            } else {
                // CSV format
                const headers = [
                    'ID',
                    'Project ID',
                    'Timestamp',
                    'Date',
                    'Prompt',
                    'Tags',
                    'Favorite',
                    'Style',
                    'Camera',
                    'Model',
                ];

                const rows = entries.map((entry) => [
                    entry.id,
                    entry.projectId,
                    entry.timestamp.toString(),
                    new Date(entry.timestamp).toISOString(),
                    `"${entry.prompt.replace(/"/g, '""')}"`,
                    `"${entry.tags.join(', ')}"`,
                    entry.favorite ? 'Yes' : 'No',
                    entry.params.artStyle || '',
                    entry.params.cameraMovement || '',
                    entry.params.model || '',
                ]);

                return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
            }
        } catch (error) {
            logger.error('Failed to export history', error);
            throw error;
        }
    }

    /**
     * Import history entries
     */
    async importHistory(data: string, format: 'json' = 'json'): Promise<number> {
        try {
            if (format === 'json') {
                const entries: HistoryEntry[] = JSON.parse(data);
                let imported = 0;

                for (const entry of entries) {
                    // Validate entry structure
                    if (this.validateEntry(entry)) {
                        await set(`${this.HISTORY_PREFIX}${entry.id}`, entry);
                        imported++;
                    }
                }

                logger.info('History imported', 'HistoryService', { count: imported });
                return imported;
            }

            return 0;
        } catch (error) {
            logger.error('Failed to import history', error);
            throw error;
        }
    }

    /**
     * Clear all history (with optional project filter)
     */
    async clearHistory(projectId?: string): Promise<number> {
        try {
            const entries = await this.getEntries(projectId ? { projectId } : undefined);
            const ids = entries.map((e) => e.id);
            const deleted = await this.deleteEntries(ids);

            logger.info('History cleared', 'HistoryService', { deleted, projectId });
            return deleted;
        } catch (error) {
            logger.error('Failed to clear history', error);
            return 0;
        }
    }

    /**
     * Cleanup old entries if exceeding max limit
     */
    private async cleanupOldEntries(): Promise<void> {
        try {
            const entries = await this.getEntries();

            if (entries.length > this.MAX_ENTRIES) {
                // Sort by timestamp (oldest first)
                entries.sort((a, b) => a.timestamp - b.timestamp);

                // Delete oldest non-favorite entries
                const toDelete = entries
                    .filter((e) => !e.favorite)
                    .slice(0, entries.length - this.MAX_ENTRIES);

                await this.deleteEntries(toDelete.map((e) => e.id));

                logger.info('Old history entries cleaned up', 'HistoryService', {
                    deleted: toDelete.length,
                });
            }
        } catch (error) {
            logger.error('Failed to cleanup old entries', error);
        }
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate history entry structure
     */
    private validateEntry(entry: any): entry is HistoryEntry {
        return (
            typeof entry === 'object' &&
            typeof entry.id === 'string' &&
            typeof entry.projectId === 'string' &&
            typeof entry.timestamp === 'number' &&
            typeof entry.prompt === 'string' &&
            typeof entry.params === 'object' &&
            typeof entry.metadata === 'object' &&
            Array.isArray(entry.tags) &&
            typeof entry.favorite === 'boolean'
        );
    }
}

export const historyService = new HistoryService();
