/**
 * settingsMigrationService — Detects and migrates legacy preferences on startup
 *
 * v3.0.0: Handles migration from legacy `.light` class toggle to `data-theme`
 * attribute and from `useUIStrings()` bridge to native react-i18next.
 *
 * Migration status is persisted to prevent re-running on subsequent startups.
 */

import { get, set } from 'idb-keyval';
import { logger } from './loggerService';

const MIGRATION_KEY = 'veo-settings-migrations';

interface MigrationRecord {
  version: string;
  migratedAt: string;
}

class SettingsMigrationService {
  private static instance: SettingsMigrationService;

  static getInstance(): SettingsMigrationService {
    if (!SettingsMigrationService.instance)
      SettingsMigrationService.instance = new SettingsMigrationService();
    return SettingsMigrationService.instance;
  }

  async runMigrations(): Promise<void> {
    const completed = await this.getCompletedMigrations();

    if (!completed.find((m) => m.version === '3.0.0')) {
      await this.migrateV300();
      await this.markCompleted('3.0.0');
    }
  }

  private async migrateV300(): Promise<void> {
    logger.info('[SettingsMigration] Running v3.0.0 migration');

    // Migrate legacy body.light class to data-theme attribute
    if (document.body.classList.contains('light')) {
      document.body.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'light');
      logger.info('[SettingsMigration] Migrated body.light → data-theme=light');
    }

    // Migrate legacy dark-theme class
    if (document.body.classList.contains('dark-theme')) {
      document.body.classList.remove('dark-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
      logger.info('[SettingsMigration] Migrated body.dark-theme → data-theme=dark');
    }

    // Migrate legacy language key if stored in old format
    const legacyLang = localStorage.getItem('veo-language');
    if (legacyLang && !localStorage.getItem('veo-studio-language')) {
      localStorage.setItem('veo-studio-language', legacyLang);
      localStorage.removeItem('veo-language');
      logger.info(`[SettingsMigration] Migrated language key: ${legacyLang}`);
    }

    logger.info('[SettingsMigration] v3.0.0 migration complete');
  }

  private async getCompletedMigrations(): Promise<MigrationRecord[]> {
    try {
      return (await get<MigrationRecord[]>(MIGRATION_KEY)) || [];
    } catch {
      return [];
    }
  }

  private async markCompleted(version: string): Promise<void> {
    const completed = await this.getCompletedMigrations();
    completed.push({ version, migratedAt: new Date().toISOString() });
    await set(MIGRATION_KEY, completed);
  }
}

export const settingsMigrationService = SettingsMigrationService.getInstance();
