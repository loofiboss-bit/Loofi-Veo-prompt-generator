/**
 * Database Service
 * Unified abstraction layer for IndexedDB with migrations and versioning
 * v1.3.0 - Workflow Integration
 */

import { createStore, get, set, del, keys, clear, Store } from 'idb-keyval';
import { loggerService } from './loggerService';

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
    stores: Record<string, any[]>;
}

class DatabaseService {
    private readonly DB_NAME = 'VeoStudioDB';
    private readonly VERSION_KEY = 'db_version';
    private readonly CURRENT_VERSION = 1;

    private db: IDBDatabase | null = null;
    private customStores: Map<string, Store> = new Map();
    private migrations: Migration[] = [];

    constructor() {
        this.registerMigrations();
    }

    /**
     * Initialize database with migrations
     */
    async initialize(): Promise<void> {
        try {
            const currentVersion = await this.getCurrentVersion();

            if (currentVersion < this.CURRENT_VERSION) {
                loggerService.info('Running database migrations', {
                    from: currentVersion,
                    to: this.CURRENT_VERSION,
                });

                await this.runMigrations(currentVersion, this.CURRENT_VERSION);
                await this.setCurrentVersion(this.CURRENT_VERSION);
            }

            loggerService.info('Database initialized', { version: this.CURRENT_VERSION });
        } catch (error) {
            loggerService.error('Failed to initialize database', error);
            throw error;
        }
    }

    /**
     * Get current database version
     */
    private async getCurrentVersion(): Promise<number> {
        try {
            const version = await get<number>(this.VERSION_KEY);
            return version || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Set current database version
     */
    private async setCurrentVersion(version: number): Promise<void> {
        await set(this.VERSION_KEY, version);
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

                loggerService.info('Migration 1 completed: Initial schema created');
            },
        });

        // Future migrations will be added here
    }

    /**
     * Run migrations from one version to another
     */
    private async runMigrations(fromVersion: number, toVersion: number): Promise<void> {
        const migrationsToRun = this.migrations.filter(
            (m) => m.version > fromVersion && m.version <= toVersion
        );

        for (const migration of migrationsToRun) {
            try {
                await this.openDatabase(migration.version);

                if (this.db) {
                    await migration.up(this.db);
                    loggerService.info('Migration completed', { version: migration.version });
                }
            } catch (error) {
                loggerService.error('Migration failed', { version: migration.version, error });
                throw error;
            }
        }
    }

    /**
     * Open IndexedDB connection
     */
    private openDatabase(version: number): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, version);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
            };
        });
    }

    /**
     * Create a custom store
     */
    createCustomStore(name: string): Store {
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
            loggerService.error('Failed to get data', { storeName, key, error });
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
            loggerService.error('Failed to set data', { storeName, key, error });
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
            loggerService.error('Failed to delete data', { storeName, key, error });
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
            loggerService.error('Failed to get keys', { storeName, error });
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
            loggerService.info('Store cleared', { storeName });
        } catch (error) {
            loggerService.error('Failed to clear store', { storeName, error });
            throw error;
        }
    }

    /**
     * Get or create a store
     */
    private getStore(name: string): Store {
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
            const stores: Record<string, any[]> = {};

            for (const storeName of storeNames) {
                const storeKeys = await this.getKeys(storeName);
                const storeData: any[] = [];

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

            loggerService.info('Database backup created', {
                stores: Object.keys(stores).length,
                totalRecords: Object.values(stores).reduce((sum, arr) => sum + arr.length, 0),
            });

            return backup;
        } catch (error) {
            loggerService.error('Failed to create backup', error);
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
                    if (record.id) {
                        await this.setData(storeName, record.id, record);
                    }
                }
            }

            loggerService.info('Database restored from backup', {
                version: backup.version,
                timestamp: backup.timestamp,
            });
        } catch (error) {
            loggerService.error('Failed to restore backup', error);
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
            loggerService.error('Failed to get database size', error);
            return 0;
        }
    }

    /**
     * Optimize database (cleanup and compact)
     */
    async optimize(): Promise<void> {
        try {
            loggerService.info('Starting database optimization');

            // TODO: Implement cleanup logic
            // - Remove old history entries beyond limit
            // - Clean up orphaned records
            // - Compact data

            loggerService.info('Database optimization completed');
        } catch (error) {
            loggerService.error('Failed to optimize database', error);
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
            loggerService.error('Failed to export database', error);
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
            loggerService.error('Failed to import database', error);
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
            loggerService.error('Failed to check database health', error);
            return {
                healthy: false,
                issues: ['Failed to check database health'],
                stats: { version: 0, size: 0, stores: 0 },
            };
        }
    }
}

export const databaseService = new DatabaseService();
