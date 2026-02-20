/**
 * Search Service
 * Global fuzzy search across projects, history, templates, and presets
 * v1.3.0 - Workflow Integration
 */

import { historyService } from './historyService';
import { projectService } from './projectService';
import { logger } from './loggerService';

export interface SearchResult {
  type: 'history' | 'project' | 'template' | 'preset';
  id: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  score: number;
  timestamp?: number;
}

export interface SearchOptions {
  types?: Array<'history' | 'project' | 'template' | 'preset'>;
  limit?: number;
  threshold?: number; // Minimum similarity score (0-1)
  projectId?: string;
}

class SearchService {
  /**
   * Perform global search across all content types
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      const {
        types = ['history', 'project', 'template', 'preset'],
        limit = 20,
        threshold = 0.3,
        projectId,
      } = options;

      const results: SearchResult[] = [];

      // Search history
      if (types.includes('history')) {
        const historyResults = await this.searchHistory(query, projectId);
        results.push(...historyResults);
      }

      // Search projects
      if (types.includes('project')) {
        const projectResults = await this.searchProjects(query);
        results.push(...projectResults);
      }

      // Filter by threshold and sort by score
      const filtered = results
        .filter((r) => r.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      logger.info('Search completed', undefined, {
        query,
        resultsCount: filtered.length,
        types,
      });

      return filtered;
    } catch (error) {
      logger.error('Search failed', error);
      return [];
    }
  }

  /**
   * Search history entries
   */
  private async searchHistory(query: string, projectId?: string): Promise<SearchResult[]> {
    try {
      const entries = await historyService.getEntries(projectId ? { projectId } : undefined);

      return entries
        .map((entry) => {
          const score = this.calculateScore(query, [
            entry.prompt,
            ...entry.tags,
            entry.params.idea || '',
            entry.params.artStyle || '',
          ]);

          return {
            type: 'history' as const,
            id: entry.id,
            title: entry.params.idea || 'Untitled Prompt',
            description: this.truncate(entry.prompt, 100),
            metadata: {
              tags: entry.tags,
              favorite: entry.favorite,
              style: entry.params.artStyle,
            },
            score,
            timestamp: entry.timestamp,
          };
        })
        .filter((r) => r.score > 0);
    } catch (error) {
      logger.error('Failed to search history', error);
      return [];
    }
  }

  /**
   * Search projects
   */
  private async searchProjects(query: string): Promise<SearchResult[]> {
    try {
      const projects = await projectService.searchProjects(query);

      return projects.map((project) => {
        const score = this.calculateScore(query, [
          project.name,
          project.description || '',
          ...(project.tags || []),
        ]);

        return {
          type: 'project' as const,
          id: project.id,
          title: project.name,
          description: project.description || 'No description',
          metadata: {
            tags: project.tags,
            status: project.status,
          },
          score,
          timestamp: project.modifiedAt,
        };
      });
    } catch (error) {
      logger.error('Failed to search projects', error);
      return [];
    }
  }

  /**
   * Calculate fuzzy match score using simple string similarity
   * Returns a score between 0 and 1
   */
  private calculateScore(query: string, targets: string[]): number {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return 0;

    let maxScore = 0;

    for (const target of targets) {
      if (!target) continue;

      const normalizedTarget = target.toLowerCase();

      // Exact match
      if (normalizedTarget === normalizedQuery) {
        return 1.0;
      }

      // Contains query
      if (normalizedTarget.includes(normalizedQuery)) {
        const score = normalizedQuery.length / normalizedTarget.length;
        maxScore = Math.max(maxScore, score * 0.9);
        continue;
      }

      // Word match
      const queryWords = normalizedQuery.split(/\s+/);
      const targetWords = normalizedTarget.split(/\s+/);
      const matchedWords = queryWords.filter((qw) =>
        targetWords.some((tw) => tw.includes(qw) || qw.includes(tw)),
      );

      if (matchedWords.length > 0) {
        const score = matchedWords.length / queryWords.length;
        maxScore = Math.max(maxScore, score * 0.7);
      }

      // Character-level similarity (Levenshtein-inspired)
      const charScore = this.characterSimilarity(normalizedQuery, normalizedTarget);
      maxScore = Math.max(maxScore, charScore * 0.5);
    }

    return maxScore;
  }

  /**
   * Calculate character-level similarity
   */
  private characterSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }

    return matches / longer.length;
  }

  /**
   * Get search suggestions based on recent queries
   */
  async getSuggestions(partial: string, limit: number = 5): Promise<string[]> {
    try {
      // Get recent history entries
      const entries = await historyService.getEntries();
      const recentEntries = entries.slice(0, 50);

      const suggestions = new Set<string>();

      // Extract suggestions from prompts and tags
      for (const entry of recentEntries) {
        // Add matching tags
        entry.tags.forEach((tag) => {
          if (tag.toLowerCase().startsWith(partial.toLowerCase())) {
            suggestions.add(tag);
          }
        });

        // Add matching words from idea
        if (entry.params.idea) {
          const words = entry.params.idea.split(/\s+/);
          words.forEach((word) => {
            if (word.toLowerCase().startsWith(partial.toLowerCase()) && word.length > 3) {
              suggestions.add(word);
            }
          });
        }
      }

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      logger.error('Failed to get suggestions', error);
      return [];
    }
  }

  /**
   * Truncate text to specified length
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

export const searchService = new SearchService();
