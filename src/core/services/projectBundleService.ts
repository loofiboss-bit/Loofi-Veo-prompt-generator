/**
 * Project Bundle Service
 * Creates comprehensive project export bundles including all related data:
 * project metadata, prompt history, templates, and settings.
 * Integrates with JobQueueService for background processing.
 * Follows ADR-002: Singleton pattern.
 *
 * @module projectBundleService
 * @since v1.8.0
 */

import { projectService, type Project } from '@core/services/projectService';
import { getUserTemplates, type UserTemplate } from '@core/services/templateManager';
import { historyService } from '@core/services/historyService';
import { quickExport } from '@core/services/exportService';
import { logger } from '@core/services/loggerService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** What to include in the project bundle */
export interface BundleOptions {
  /** Include prompt history entries */
  includeHistory: boolean;
  /** Include user-created templates */
  includeTemplates: boolean;
  /** Include project settings and metadata */
  includeSettings: boolean;
  /** Maximum history entries to include (-1 for all) */
  maxHistoryEntries: number;
}

/** The full project bundle structure */
export interface ProjectBundle {
  /** Bundle format version for forward compatibility */
  bundleVersion: '1.0.0';
  /** When the bundle was created */
  exportedAt: string;
  /** App version that created the bundle */
  appVersion: string;
  /** The project data */
  project: Project;
  /** Prompt history entries (if included) */
  history?: BundleHistoryEntry[];
  /** User templates (if included) */
  templates?: UserTemplate[];
  /** Summary statistics */
  stats: BundleStats;
}

/** Statistics about the bundle contents */
export interface BundleStats {
  historyCount: number;
  templateCount: number;
  shotCount: number;
  projectAge: string;
}

/** Minimal history entry shape (from historyService) */
interface BundleHistoryEntry {
  id: string;
  timestamp: number;
  [key: string]: unknown;
}

/** Result of a bundle export */
export interface BundleExportResult {
  projectName: string;
  bundleSize: number;
  stats: BundleStats;
}

// ---------------------------------------------------------------------------
// Default Options
// ---------------------------------------------------------------------------

const DEFAULT_BUNDLE_OPTIONS: BundleOptions = {
  includeHistory: true,
  includeTemplates: true,
  includeSettings: true,
  maxHistoryEntries: 500,
};

// ---------------------------------------------------------------------------
// Service Class
// ---------------------------------------------------------------------------

class ProjectBundleService {
  private static instance: ProjectBundleService;

  private constructor() {
    // Intentionally empty
  }

  static getInstance(): ProjectBundleService {
    if (!ProjectBundleService.instance) {
      ProjectBundleService.instance = new ProjectBundleService();
    }
    return ProjectBundleService.instance;
  }

  /**
   * Create a full project bundle with all selected data.
   */
  async createBundle(
    projectId: string,
    options: Partial<BundleOptions> = {},
  ): Promise<ProjectBundle> {
    const opts = { ...DEFAULT_BUNDLE_OPTIONS, ...options };

    const project = await projectService.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    logger.info(`Creating project bundle for "${project.name}"`);

    // Gather history
    let history: BundleHistoryEntry[] = [];
    if (opts.includeHistory) {
      try {
        const allHistory = await historyService.getEntries();
        history = (
          opts.maxHistoryEntries === -1 ? allHistory : allHistory.slice(0, opts.maxHistoryEntries)
        ).map((e) => ({ ...e })) as BundleHistoryEntry[];
      } catch (err) {
        logger.warn(`Failed to gather history for bundle: ${err}`);
      }
    }

    // Gather templates
    let templates: UserTemplate[] = [];
    if (opts.includeTemplates) {
      try {
        templates = await getUserTemplates();
      } catch (err) {
        logger.warn(`Failed to gather templates for bundle: ${err}`);
      }
    }

    // Calculate stats
    const ageMs = Date.now() - project.createdAt;
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const projectAge =
      ageDays > 365
        ? `${Math.floor(ageDays / 365)}y ${ageDays % 365}d`
        : ageDays > 30
          ? `${Math.floor(ageDays / 30)}mo ${ageDays % 30}d`
          : `${ageDays}d`;

    const stats: BundleStats = {
      historyCount: history.length,
      templateCount: templates.length,
      shotCount: 0, // Would need storyboard data from content project
      projectAge,
    };

    const bundle: ProjectBundle = {
      bundleVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      appVersion: '1.8.0',
      project,
      stats,
    };

    if (opts.includeHistory && history.length > 0) {
      bundle.history = history;
    }
    if (opts.includeTemplates && templates.length > 0) {
      bundle.templates = templates;
    }

    logger.info(`Bundle created: ${history.length} history, ${templates.length} templates`);

    return bundle;
  }

  /**
   * Export a project bundle as a JSON file download.
   */
  async exportBundle(
    projectId: string,
    options: Partial<BundleOptions> = {},
  ): Promise<BundleExportResult> {
    const bundle = await this.createBundle(projectId, options);
    const json = JSON.stringify(bundle, null, 2);
    const filename = `${bundle.project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}_bundle.json`;

    await quickExport(json, 'json', filename);

    return {
      projectName: bundle.project.name,
      bundleSize: new Blob([json]).size,
      stats: bundle.stats,
    };
  }

  /**
   * Import a project bundle and restore all data.
   */
  async importBundle(bundleJson: string): Promise<{ projectId: string; stats: BundleStats }> {
    let bundle: ProjectBundle;
    try {
      bundle = JSON.parse(bundleJson) as ProjectBundle;
    } catch {
      throw new Error('Invalid bundle format: not valid JSON');
    }

    if (!bundle.bundleVersion || !bundle.project) {
      throw new Error('Invalid bundle format: missing required fields');
    }

    logger.info(`Importing project bundle: "${bundle.project.name}"`);

    // Import project
    const importedProject = await projectService.importProject(
      JSON.stringify({ version: '1.8.0', project: bundle.project }),
    );
    if (!importedProject) {
      throw new Error('Failed to import project from bundle');
    }

    // Import templates if present
    if (bundle.templates?.length) {
      const { importTemplates } = await import('@core/services/templateManager');
      try {
        await importTemplates(JSON.stringify(bundle.templates));
        logger.info(`Imported ${bundle.templates.length} templates from bundle`);
      } catch (err) {
        logger.warn(`Failed to import templates from bundle: ${err}`);
      }
    }

    // Note: History import would need historyService.importEntries() — not yet implemented
    if (bundle.history?.length) {
      logger.info(
        `Bundle contains ${bundle.history.length} history entries (import not yet supported)`,
      );
    }

    return {
      projectId: importedProject.id,
      stats: bundle.stats,
    };
  }

  /**
   * Get a summary of what a bundle file contains without importing it.
   */
  previewBundle(bundleJson: string): {
    projectName: string;
    exportedAt: string;
    appVersion: string;
    stats: BundleStats;
  } | null {
    try {
      const bundle = JSON.parse(bundleJson) as ProjectBundle;
      return {
        projectName: bundle.project?.name ?? 'Unknown',
        exportedAt: bundle.exportedAt,
        appVersion: bundle.appVersion,
        stats: bundle.stats,
      };
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const projectBundleService = ProjectBundleService.getInstance();
