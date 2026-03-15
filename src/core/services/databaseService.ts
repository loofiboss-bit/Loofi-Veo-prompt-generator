/**
 * Database Service
 * Unified abstraction layer for IndexedDB with migrations and versioning
 * v1.3.0 - Workflow Integration
 */

import { createStore, get, set, del, keys, clear, type UseStore } from 'idb-keyval';
import { logger } from './loggerService';

export interface DatabaseConfig {
  name: string;
  version: number;
  stores: StoreConfig[];
}

export interface StoreConfig {
  name: string;
  keyPath?: string;
  autoIncrement?: boolean;
  indexes?: IndexConfig[];
}

export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
}

export interface Migration {
  version: number;
  up: (db: IDBDatabase) => Promise<void>;
  down?: (db: IDBDatabase) => Promise<void>;
}

export interface BackupData {
  version: string;
  timestamp: number;
  stores: Record<string, unknown[]>;
}

class DatabaseService {
  private readonly DB_NAME = 'VeoStudioDB';
  private readonly VERSION_KEY = 'db_version';
  private readonly CURRENT_VERSION = 1;
  private readonly OPERATION_TIMEOUT_MS = 5000;
  private readonly OPEN_TIMEOUT_MS = 8000;

  private db: IDBDatabase | null = null;
  private customStores: Map<string, UseStore> = new Map();
  private migrations: Migration[] = [];

  constructor() {
    this.registerMigrations();
  }

  private async withTimeout<T>(
    operation: string,
    callback: () => Promise<T>,
    timeoutMs: number = this.OPERATION_TIMEOUT_MS,
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      return await Promise.race([
        callback(),
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Database ${operation} timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Initialize database with migrations
   */
  async initialize(): Promise<void> {
    try {
      const currentVersion = await this.getCurrentVersion();

      if (currentVersion < this.CURRENT_VERSION) {
        logger.info('Running database migrations', 'DatabaseService', {
          from: currentVersion,
          to: this.CURRENT_VERSION,
        });

        await this.runMigrations(currentVersion, this.CURRENT_VERSION);
        await this.setCurrentVersion(this.CURRENT_VERSION);
      }

      logger.info('Database initialized', 'DatabaseService', { version: this.CURRENT_VERSION });
    } catch (error) {
      logger.error('Failed to initialize database', error);
      throw error;
    }
  }

  /**
   * Get current database version
   */
  private async getCurrentVersion(): Promise<number> {
    try {
      const version = await this.withTimeout('read current version', () =>
        get<number>(this.VERSION_KEY),
      );
      return version || 0;
    } catch (_error) {
      return 0;
    }
  }

  /**
   * Set current database version
   */
  private async setCurrentVersion(version: number): Promise<void> {
    await this.withTimeout('write current version', () => set(this.VERSION_KEY, version));
  }

  /**
   * Register database migrations
   */
  private registerMigrations(): void {
    // Migration 1: Initial schema
    this.migrations.push({
      version: 1,
      up: async (db: IDBDatabase) => {
        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('status', 'status', { unique: false });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });
          projectStore.createIndex('modifiedAt', 'modifiedAt', { unique: false });
        }

        // History store
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('projectId', 'projectId', { unique: false });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          historyStore.createIndex('favorite', 'favorite', { unique: false });
        }

        // Templates store
        if (!db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
          templateStore.createIndex('projectId', 'projectId', { unique: false });
          templateStore.createIndex('category', 'category', { unique: false });
        }

        // Presets store
        if (!db.objectStoreNames.contains('presets')) {
          const presetStore = db.createObjectStore('presets', { keyPath: 'id' });
          presetStore.createIndex('category', 'category', { unique: false });
        }

        logger.info('Migration 1 completed: Initial schema created', 'DatabaseService');
      },
    });

    // Future migrations will be added here
  }

  /**
   * Run migrations from one version to another
   */
  private async runMigrations(fromVersion: number, toVersion: number): Promise<void> {
    const migrationsToRun = this.migrations.filter(
      (m) => m.version > fromVersion && m.version <= toVersion,
    );

    if (migrationsToRun.length === 0) {
      return;
    }

    // Get the highest version to migrate to
    const targetVersion = Math.max(...migrationsToRun.map((m) => m.version));

    try {
      await this.openDatabaseWithMigrations(targetVersion, migrationsToRun);
      logger.info('All migrations completed', 'DatabaseService', {
        from: fromVersion,
        to: targetVersion,
      });
    } catch (error) {
      logger.error('Migration failed', 'DatabaseService', error);
      throw error;
    }
  }

  /**
   * Open IndexedDB connection with migrations
   */
  private openDatabaseWithMigrations(
    version: number,
    migrations: Migration[],
  ): Promise<IDBDatabase> {
    return this.withTimeout(
      'open with migrations',
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open(this.DB_NAME, version);
          let settled = false;

          const settle = (callback: () => void) => {
            if (settled) {
              return;
            }

            settled = true;
            callback();
          };

          request.onerror = () => {
            settle(() => reject(new Error('Failed to open database')));
          };

          request.onblocked = () => {
            settle(() => reject(new Error('Database open blocked by another process')));
          };

          request.onsuccess = () => {
            settle(() => {
              this.db = request.result;
              resolve(request.result);
            });
          };

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            this.db = db;

            // IndexedDB migrations must perform schema work synchronously inside the
            // versionchange transaction.
            for (const migration of migrations) {
              try {
                void migration.up(db);
                logger.info('Migration completed', 'DatabaseService', {
                  version: migration.version,
                });
              } catch (error) {
                logger.error('Migration failed', 'DatabaseService', {
                  version: migration.version,
                  error,
                });
                throw error;
              }
            }
          };
        }),
      this.OPEN_TIMEOUT_MS,
    );
  }

  /**
   * Open IndexedDB connection (for non-migration use)
   */
  private openDatabase(version: number): Promise<IDBDatabase> {
    return this.withTimeout(
      'open connection',
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open(this.DB_NAME, version);
          let settled = false;

          const settle = (callback: () => void) => {
            if (settled) {
              return;
            }

            settled = true;
            callback();
          };

          request.onerror = () => {
            settle(() => reject(new Error('Failed to open database')));
          };

          request.onblocked = () => {
            settle(() => reject(new Error('Database open blocked by another process')));
          };

          request.onsuccess = () => {
            settle(() => {
              this.db = request.result;
              resolve(request.result);
            });
          };

          request.onupgradeneeded = (event) => {
            this.db = (event.target as IDBOpenDBRequest).result;
          };
        }),
      this.OPEN_TIMEOUT_MS,
    );
  }

  /**
   * Create a custom store
   */
  createCustomStore(name: string): UseStore {
    if (!this.customStores.has(name)) {
      const store = createStore(this.DB_NAME, name);
      this.customStores.set(name, store);
    }
    return this.customStores.get(name)!;
  }

  /**
   * Get data from a store
   */
  async getData<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    try {
      const store = this.getStore(storeName);
      return await get<T>(key, store);
    } catch (error) {
      logger.error('Failed to get data', 'DatabaseService', { storeName, key, error });
      return undefined;
    }
  }

  /**
   * Set data in a store
   */
  async setData<T>(storeName: string, key: IDBValidKey, value: T): Promise<void> {
    try {
      const store = this.getStore(storeName);
      await set(key, value, store);
    } catch (error) {
      logger.error('Failed to set data', 'DatabaseService', { storeName, key, error });
      throw error;
    }
  }

  /**
   * Delete data from a store
   */
  async deleteData(storeName: string, key: IDBValidKey): Promise<void> {
    try {
      const store = this.getStore(storeName);
      await del(key, store);
    } catch (error) {
      logger.error('Failed to delete data', 'DatabaseService', { storeName, key, error });
      throw error;
    }
  }

  /**
   * Get all keys from a store
   */
  async getKeys(storeName: string): Promise<IDBValidKey[]> {
    try {
      const store = this.getStore(storeName);
      return await keys(store);
    } catch (error) {
      logger.error('Failed to get keys', 'DatabaseService', { storeName, error });
      return [];
    }
  }

  /**
   * Clear all data from a store
   */
  async clearStore(storeName: string): Promise<void> {
    try {
      const store = this.getStore(storeName);
      await clear(store);
      logger.info('Store cleared', 'DatabaseService', { storeName });
    } catch (error) {
      logger.error('Failed to clear store', 'DatabaseService', { storeName, error });
      throw error;
    }
  }

  /**
   * Get or create a store
   */
  private getStore(name: string): UseStore {
    if (!this.customStores.has(name)) {
      this.createCustomStore(name);
    }
    return this.customStores.get(name)!;
  }

  /**
   * Backup entire database
   */
  async backup(): Promise<BackupData> {
    try {
      const storeNames = ['projects', 'history', 'templates', 'presets'];
      const stores: Record<string, unknown[]> = {};

      for (const storeName of storeNames) {
        const storeKeys = await this.getKeys(storeName);
        const storeData: unknown[] = [];

        for (const key of storeKeys) {
          const data = await this.getData(storeName, key);
          if (data) {
            storeData.push(data);
          }
        }

        stores[storeName] = storeData;
      }

      const backup: BackupData = {
        version: `${this.CURRENT_VERSION}`,
        timestamp: Date.now(),
        stores,
      };

      logger.info('Database backup created', 'DatabaseService', {
        stores: Object.keys(stores).length,
        totalRecords: Object.values(stores).reduce((sum, arr) => sum + arr.length, 0),
      });

      return backup;
    } catch (error) {
      logger.error('Failed to create backup', 'DatabaseService', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restore(backup: BackupData): Promise<void> {
    try {
      // Validate backup
      if (!backup.version || !backup.stores) {
        throw new Error('Invalid backup data');
      }

      // Clear existing data
      for (const storeName of Object.keys(backup.stores)) {
        await this.clearStore(storeName);
      }

      // Restore data
      for (const [storeName, records] of Object.entries(backup.stores)) {
        for (const record of records) {
          const rec = record as Record<string, unknown>;
          if (rec.id) {
            await this.setData(storeName, rec.id as string, rec);
          }
        }
      }

      logger.info('Database restored from backup', 'DatabaseService', {
        version: backup.version,
        timestamp: backup.timestamp,
      });
    } catch (error) {
      logger.error('Failed to restore backup', 'DatabaseService', error);
      throw error;
    }
  }

  /**
   * Get database size estimate
   */
  async getSize(): Promise<number> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }
      return 0;
    } catch (error) {
      logger.error('Failed to get database size', 'DatabaseService', error);
      return 0;
    }
  }

  /**
   * Optimize database (cleanup and compact)
   */
  async optimize(): Promise<void> {
    try {
      logger.info('Starting database optimization', 'DatabaseService');

      let removedCount = 0;

      // 1. Remove old history entries beyond limit (keep newest 500)
      const MAX_HISTORY_ENTRIES = 500;
      const historyKeys = await this.getKeys('history');
      if (historyKeys.length > MAX_HISTORY_ENTRIES) {
        // Load all entries to sort by timestamp
        const entries: Array<{ id: string; timestamp?: number }> = [];
        for (const key of historyKeys) {
          const entry = await this.getData<{ id: string; timestamp?: number }>('history', key);
          if (entry) {
            entries.push(entry);
          }
        }

        // Sort by timestamp descending (newest first)
        entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // Remove entries beyond the limit
        const toRemove = entries.slice(MAX_HISTORY_ENTRIES);
        for (const entry of toRemove) {
          await this.deleteData('history', entry.id);
          removedCount++;
        }

        logger.info('Trimmed old history entries', 'DatabaseService', {
          removed: toRemove.length,
          remaining: MAX_HISTORY_ENTRIES,
        });
      }

      // 2. Clean up orphaned records (templates/presets with empty data)
      for (const storeName of ['templates', 'presets']) {
        const storeKeys = await this.getKeys(storeName);
        for (const key of storeKeys) {
          const record = await this.getData<{ id?: string }>(storeName, key);
          if (!record || !record.id) {
            await this.deleteData(storeName, key);
            removedCount++;
          }
        }
      }

      logger.info('Database optimization completed', 'DatabaseService', {
        removedRecords: removedCount,
      });
    } catch (error) {
      logger.error('Failed to optimize database', 'DatabaseService', error);
      throw error;
    }
  }

  /**
   * Export database to JSON
   */
  async exportToJSON(): Promise<string> {
    try {
      const backup = await this.backup();
      return JSON.stringify(backup, null, 2);
    } catch (error) {
      logger.error('Failed to export database', 'DatabaseService', error);
      throw error;
    }
  }

  /**
   * Import database from JSON
   */
  async importFromJSON(json: string): Promise<void> {
    try {
      const backup: BackupData = JSON.parse(json);
      await this.restore(backup);
    } catch (error) {
      logger.error('Failed to import database', 'DatabaseService', error);
      throw error;
    }
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    stats: {
      version: number;
      size: number;
      stores: number;
    };
  }> {
    const issues: string[] = [];

    try {
      const version = await this.getCurrentVersion();
      const size = await this.getSize();
      const storeCount = this.customStores.size;

      // Check version
      if (version !== this.CURRENT_VERSION) {
        issues.push(`Database version mismatch: ${version} vs ${this.CURRENT_VERSION}`);
      }

      // Check size (warn if > 50MB)
      if (size > 50 * 1024 * 1024) {
        issues.push(`Database size is large: ${(size / 1024 / 1024).toFixed(2)}MB`);
      }

      return {
        healthy: issues.length === 0,
        issues,
        stats: {
          version,
          size,
          stores: storeCount,
        },
      };
    } catch (error) {
      logger.error('Failed to check database health', 'DatabaseService', error);
      return {
        healthy: false,
        issues: ['Failed to check database health'],
        stats: { version: 0, size: 0, stores: 0 },
      };
    }
  }
}

export const databaseService = new DatabaseService();
