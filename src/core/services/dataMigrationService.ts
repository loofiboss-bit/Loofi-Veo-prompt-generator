/**
 * Data Migration Service
 * Handles schema migrations when workspace/registry features are introduced.
 * v1.9.0 - Platform Foundations (Sprint 2)
 *
 * Migrations:
 * 1. Adopt orphan projects into the default workspace
 * 2. Assign trust levels to any already-loaded plugins
 * 3. Track migration version to avoid re-running
 */

import { get, set } from 'idb-keyval';
import { logger } from './loggerService';
import { workspaceService } from './workspaceService';
import { projectService } from './projectService';
import { pluginService } from './pluginService';
import { determinePluginTrustLevel } from '@core/utils/pluginCrypto';

// ─── Constants ──────────────────────────────────────────────────────

const MIGRATION_VERSION_KEY = 'data_migration_version';

/** Current migration version — bump when adding new migrations. */
const CURRENT_MIGRATION_VERSION = 1;

// ─── Migration Entry ────────────────────────────────────────────────

interface Migration {
  /** Migration version number (sequential) */
  version: number;
  /** Human-readable description */
  description: string;
  /** Migration function */
  migrate: () => Promise<void>;
}

// ─── Service ────────────────────────────────────────────────────────

class DataMigrationService {
  private static instance: DataMigrationService;

  static getInstance(): DataMigrationService {
    if (!DataMigrationService.instance) {
      DataMigrationService.instance = new DataMigrationService();
    }
    return DataMigrationService.instance;
  }

  /**
   * All registered migrations — order matters.
   */
  private readonly migrations: Migration[] = [
    {
      version: 1,
      description: 'Adopt orphan projects into default workspace + backfill plugin trust levels',
      migrate: async () => {
        await this.migrateOrphanProjects();
        await this.backfillPluginTrustLevels();
      },
    },
  ];

  // ─── Public API ───────────────────────────────────────────────────

  /**
   * Run all pending migrations.
   * Idempotent — only runs migrations newer than the stored version.
   */
  async runPendingMigrations(): Promise<MigrationResult> {
    const result: MigrationResult = {
      ran: [],
      skipped: [],
      failed: [],
      fromVersion: 0,
      toVersion: CURRENT_MIGRATION_VERSION,
    };

    try {
      const currentVersion = await this.getStoredVersion();
      result.fromVersion = currentVersion;

      const pending = this.migrations.filter((m) => m.version > currentVersion);

      if (pending.length === 0) {
        logger.info('No pending data migrations');
        return result;
      }

      logger.info('Running data migrations', undefined, {
        from: currentVersion,
        to: CURRENT_MIGRATION_VERSION,
        count: pending.length,
      });

      for (const migration of pending) {
        try {
          logger.info(`Migration v${migration.version}: ${migration.description}`);
          await migration.migrate();
          await this.setStoredVersion(migration.version);
          result.ran.push(migration.version);
          logger.info(`Migration v${migration.version} completed`);
        } catch (error) {
          logger.error(`Migration v${migration.version} failed`, undefined, error);
          result.failed.push({ version: migration.version, error: error as Error });
          // Stop on failure — don't run subsequent migrations
          break;
        }
      }

      // Mark skipped migrations (those after a failure)
      const lastRanOrFailed = Math.max(
        ...result.ran,
        ...result.failed.map((f) => f.version),
        currentVersion,
      );
      result.skipped = pending.filter((m) => m.version > lastRanOrFailed).map((m) => m.version);

      return result;
    } catch (error) {
      logger.error('Data migration runner failed', undefined, error);
      return result;
    }
  }

  /**
   * Get the currently stored migration version.
   */
  async getStoredVersion(): Promise<number> {
    try {
      const version = await get<number>(MIGRATION_VERSION_KEY);
      return version ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Check whether migrations are needed.
   */
  async needsMigration(): Promise<boolean> {
    const stored = await this.getStoredVersion();
    return stored < CURRENT_MIGRATION_VERSION;
  }

  /**
   * Get the current migration version constant.
   */
  getCurrentVersion(): number {
    return CURRENT_MIGRATION_VERSION;
  }

  // ─── Migration Implementations ────────────────────────────────────

  /**
   * Migration: Adopt orphan projects into the default workspace.
   * Projects that exist but are not associated with any workspace
   * get added to the default workspace.
   */
  private async migrateOrphanProjects(): Promise<void> {
    try {
      const allProjects = await projectService.getAllProjects(true);
      const allProjectIds = allProjects.map((p) => p.id);

      if (allProjectIds.length === 0) return;

      // Get all workspaces and build a set of already-associated project IDs
      const workspaces = await workspaceService.getAllWorkspaces();
      const associatedIds = new Set<string>();
      for (const ws of workspaces) {
        for (const pid of ws.projectIds) {
          associatedIds.add(pid);
        }
      }

      // Find orphans
      const orphanIds = allProjectIds.filter((id) => !associatedIds.has(id));

      if (orphanIds.length === 0) {
        logger.info('No orphan projects to migrate');
        return;
      }

      await workspaceService.migrateOrphanProjects(orphanIds);
      logger.info('Orphan projects migrated', undefined, { count: orphanIds.length });
    } catch (error) {
      logger.error('Failed to migrate orphan projects', undefined, error);
    }
  }

  /**
   * Migration: Backfill trust levels for already-loaded plugins.
   * Plugins loaded before the signing system was integrated
   * will have their trust levels evaluated and set.
   */
  private async backfillPluginTrustLevels(): Promise<void> {
    try {
      const plugins = pluginService.getAll();

      if (plugins.length === 0) return;

      let updated = 0;
      for (const plugin of plugins) {
        if (plugin.trustLevel === undefined) {
          const trustLevel = await determinePluginTrustLevel(plugin.manifest);
          plugin.trustLevel = trustLevel;
          updated++;
        }
      }

      if (updated > 0) {
        logger.info('Plugin trust levels backfilled', undefined, { count: updated });
      }
    } catch (error) {
      logger.error('Failed to backfill plugin trust levels', undefined, error);
    }
  }

  // ─── Internal ─────────────────────────────────────────────────────

  private async setStoredVersion(version: number): Promise<void> {
    await set(MIGRATION_VERSION_KEY, version);
  }
}

// ─── Result Type ────────────────────────────────────────────────────

export interface MigrationResult {
  /** Migration versions that ran successfully */
  ran: number[];
  /** Migration versions skipped (due to earlier failure) */
  skipped: number[];
  /** Migration versions that failed */
  failed: Array<{ version: number; error: Error }>;
  /** Starting migration version */
  fromVersion: number;
  /** Target migration version */
  toVersion: number;
}

export const dataMigrationService = DataMigrationService.getInstance();
