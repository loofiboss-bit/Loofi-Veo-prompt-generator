/**
 * Plugin Install Service
 * v2.0.0 - Platform Transformation
 *
 * Handles the full plugin installation lifecycle:
 * 1. Download plugin bundle from registry
 * 2. Verify checksum (SHA-256)
 * 3. Verify signature (Ed25519 via pluginCrypto)
 * 4. Extract and validate manifest
 * 5. Store bundle in IndexedDB
 * 6. Load into sandbox and activate
 *
 * Also handles updates, uninstallation, and update checking.
 */

import { get, set, del } from 'idb-keyval';
import { logger } from './loggerService';
import { registryService } from './registryService';
import { pluginService } from './pluginService';
import { pluginSandboxService } from './pluginSandboxService';
import { verifyManifestSignature, determinePluginTrustLevel } from '@core/utils/pluginCrypto';
import { satisfiesSemver } from '@core/utils/semver';
import type { RegistryEntry } from '@core/types/registry';
import type { PluginManifest, PluginTrustLevel } from '@core/types/plugin';
import type {
  InstallProgress,
  InstallResult,
  InstalledPluginBundle,
  PluginUpdateInfo,
  InstallState,
} from '@core/types/marketplace';

// ─── Constants ──────────────────────────────────────────────────────

const IDB_PREFIX_BUNDLE = 'marketplace:bundle:';
const IDB_KEY_INSTALL_LIST = 'marketplace:installed';

/** App version from build-time define */
const APP_VERSION: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) || '2.0.0';

// ─── Service ────────────────────────────────────────────────────────

class PluginInstallService {
  private static instance: PluginInstallService;
  private _activeOperations = new Map<string, InstallProgress>();
  private _listeners: Array<(pluginId: string, progress: InstallProgress) => void> = [];

  static getInstance(): PluginInstallService {
    if (!PluginInstallService.instance) {
      PluginInstallService.instance = new PluginInstallService();
    }
    return PluginInstallService.instance;
  }

  // ─── Installation ──────────────────────────────────────────────

  /**
   * Install a plugin from the registry.
   * Full pipeline: download → verify → store → sandbox → activate.
   */
  async installFromRegistry(entry: RegistryEntry): Promise<InstallResult> {
    const startedAt = Date.now();
    const pluginId = entry.id;

    // Check if already installed
    const existing = await this.getInstalledBundle(pluginId);
    if (existing) {
      return {
        success: false,
        error: `Plugin ${pluginId} is already installed (v${existing.version})`,
        durationMs: Date.now() - startedAt,
      };
    }

    // Check engine compatibility
    if (entry.engineVersion && !satisfiesSemver(APP_VERSION, entry.engineVersion)) {
      return {
        success: false,
        error: `Plugin requires app version ${entry.engineVersion}, current: ${APP_VERSION}`,
        durationMs: Date.now() - startedAt,
      };
    }

    try {
      // Step 1: Download
      this._updateProgress(pluginId, 'downloading', 10, 'Downloading plugin bundle...');
      const sourceCode = await this._downloadBundle(entry.downloadUrl);

      // Step 2: Verify checksum
      this._updateProgress(pluginId, 'verifying', 30, 'Verifying integrity...');
      const checksumValid = await this._verifyChecksum(sourceCode, entry.checksum);
      if (!checksumValid) {
        throw new Error('Checksum verification failed — bundle may be corrupted');
      }

      // Step 3: Extract manifest from bundle header
      this._updateProgress(pluginId, 'extracting', 50, 'Extracting manifest...');
      const manifest = this._extractManifest(sourceCode, entry);

      // Step 4: Verify signature
      this._updateProgress(pluginId, 'verifying', 60, 'Verifying signature...');
      let trustLevel: PluginTrustLevel = 'unsigned';
      if (manifest.signature) {
        try {
          const result = await verifyManifestSignature(manifest);
          if (!result.valid) {
            throw new Error(`Signature invalid: ${result.reason || 'unknown'}`);
          }
          trustLevel = await determinePluginTrustLevel(manifest);
        } catch (err) {
          logger.warn(`Signature verification failed for ${pluginId}:`, err);
          trustLevel = 'invalid';
        }
      } else {
        trustLevel = 'unsigned';
      }

      // Step 5: Store bundle
      this._updateProgress(pluginId, 'installing', 70, 'Storing plugin...');
      const bundle: InstalledPluginBundle = {
        pluginId,
        version: entry.version,
        manifest,
        sourceCode,
        checksum: entry.checksum,
        trustLevel,
        installedAt: Date.now(),
        updatedAt: Date.now(),
        size: new Blob([sourceCode]).size,
        autoUpdate: false,
      };
      await this._storeBundle(bundle);

      // Step 6: Create sandbox and activate
      this._updateProgress(pluginId, 'activating', 85, 'Starting plugin...');
      const sandboxMode = pluginSandboxService.determineSandboxMode(trustLevel, false);
      await pluginSandboxService.createSandbox(
        pluginId,
        sourceCode,
        manifest.permissions,
        sandboxMode,
      );

      // Register with pluginService
      await pluginService.load(manifest);

      this._updateProgress(pluginId, 'complete', 100, 'Installation complete');

      const result: InstallResult = {
        success: true,
        manifest,
        trustLevel,
        durationMs: Date.now() - startedAt,
      };

      logger.info(`Plugin installed: ${pluginId} v${entry.version} (trust: ${trustLevel})`);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this._updateProgress(pluginId, 'failed', 0, errorMsg, errorMsg);

      logger.error(`Plugin installation failed: ${pluginId}`, err);
      return {
        success: false,
        error: errorMsg,
        durationMs: Date.now() - startedAt,
      };
    }
  }

  // ─── Uninstallation ────────────────────────────────────────────

  /**
   * Uninstall a plugin — destroy sandbox, remove bundle, unload from plugin service.
   */
  async uninstall(pluginId: string): Promise<void> {
    logger.info(`Uninstalling plugin: ${pluginId}`);

    // Destroy sandbox
    await pluginSandboxService.destroySandbox(pluginId);

    // Unload from plugin service (calls dispose)
    try {
      await pluginService.unload(pluginId);
    } catch {
      // May not be loaded in pluginService
    }

    // Remove stored bundle
    await del(`${IDB_PREFIX_BUNDLE}${pluginId}`);

    // Remove from installed list
    const installed = await this._getInstalledList();
    const updated = installed.filter((id) => id !== pluginId);
    await set(IDB_KEY_INSTALL_LIST, updated);

    this._activeOperations.delete(pluginId);
    this._notifyListeners(pluginId, {
      pluginId,
      state: 'idle',
      progress: 0,
      message: 'Uninstalled',
      startedAt: Date.now(),
    });

    logger.info(`Plugin uninstalled: ${pluginId}`);
  }

  // ─── Updates ───────────────────────────────────────────────────

  /**
   * Check for available updates for all installed plugins.
   */
  async checkForUpdates(): Promise<PluginUpdateInfo[]> {
    const updates: PluginUpdateInfo[] = [];
    const installed = await this.getInstalledBundles();

    for (const bundle of installed) {
      const entry = await registryService.getEntry(bundle.pluginId);
      if (!entry) continue;

      // Compare versions
      if (this._isNewerVersion(entry.version, bundle.version)) {
        const newPermissions = entry.permissions.filter(
          (p) => !bundle.manifest.permissions.includes(p),
        );

        updates.push({
          pluginId: bundle.pluginId,
          currentVersion: bundle.version,
          latestVersion: entry.version,
          changelog: entry.versions?.[0]?.changelog,
          downloadUrl: entry.downloadUrl,
          size: entry.size,
          hasNewPermissions: newPermissions.length > 0,
          newPermissions,
        });
      }
    }

    return updates;
  }

  /**
   * Update a plugin to the latest version from the registry.
   */
  async updatePlugin(pluginId: string): Promise<InstallResult> {
    const startedAt = Date.now();
    const entry = await registryService.getEntry(pluginId);
    if (!entry) {
      return {
        success: false,
        error: `Plugin ${pluginId} not found in registry`,
        durationMs: Date.now() - startedAt,
      };
    }

    // Uninstall current version (preserving settings)
    await pluginSandboxService.destroySandbox(pluginId);
    try {
      await pluginService.unload(pluginId);
    } catch {
      // May not be loaded
    }
    await del(`${IDB_PREFIX_BUNDLE}${pluginId}`);

    // Install new version (re-uses installFromRegistry)
    const result = await this.installFromRegistry(entry);
    if (result.success) {
      logger.info(`Plugin updated: ${pluginId} → v${entry.version}`);
    }
    return result;
  }

  // ─── Query ─────────────────────────────────────────────────────

  /**
   * Get a single installed bundle by plugin ID.
   */
  async getInstalledBundle(pluginId: string): Promise<InstalledPluginBundle | null> {
    const bundle = await get<InstalledPluginBundle>(`${IDB_PREFIX_BUNDLE}${pluginId}`);
    return bundle ?? null;
  }

  /**
   * Get all installed plugin bundles.
   */
  async getInstalledBundles(): Promise<InstalledPluginBundle[]> {
    const ids = await this._getInstalledList();
    const bundles: InstalledPluginBundle[] = [];

    for (const id of ids) {
      const bundle = await get<InstalledPluginBundle>(`${IDB_PREFIX_BUNDLE}${id}`);
      if (bundle) bundles.push(bundle);
    }

    return bundles;
  }

  /**
   * Check whether a plugin is installed.
   */
  async isInstalled(pluginId: string): Promise<boolean> {
    const ids = await this._getInstalledList();
    return ids.includes(pluginId);
  }

  /**
   * Get active install/update operation progress.
   */
  getActiveOperation(pluginId: string): InstallProgress | undefined {
    return this._activeOperations.get(pluginId);
  }

  /**
   * Get all active operations.
   */
  getAllActiveOperations(): Map<string, InstallProgress> {
    return new Map(this._activeOperations);
  }

  // ─── Event Subscription ────────────────────────────────────────

  /**
   * Subscribe to progress updates.
   */
  onProgress(listener: (pluginId: string, progress: InstallProgress) => void): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  // ─── Private ───────────────────────────────────────────────────

  /**
   * Download a plugin bundle from a URL.
   */
  private async _downloadBundle(url: string): Promise<string> {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Verify a SHA-256 checksum.
   */
  private async _verifyChecksum(content: string, expectedChecksum: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return hashHex === expectedChecksum.toLowerCase();
    } catch (err) {
      logger.error('Checksum verification error:', err);
      return false;
    }
  }

  /**
   * Extract a PluginManifest from the bundle's source code and registry entry.
   * In a real implementation, the bundle would be a zip/tar containing manifest.json.
   * For now, we construct the manifest from the registry entry metadata.
   */
  private _extractManifest(sourceCode: string, entry: RegistryEntry): PluginManifest {
    // Try to extract manifest from a comment block at the top of the bundle
    const manifestMatch = sourceCode.match(/\/\*\*\s*@manifest\s+([\s\S]*?)\*\//);
    if (manifestMatch) {
      try {
        return JSON.parse(manifestMatch[1]) as PluginManifest;
      } catch {
        // Fall through to constructing from entry
      }
    }

    // Construct manifest from registry entry metadata
    const manifest: PluginManifest = {
      id: entry.id,
      name: entry.name,
      version: entry.version,
      description: entry.description,
      author: entry.author,
      license: entry.license,
      homepage: entry.homepage,
      repository: entry.repository,
      main: 'index.js',
      engineVersion: entry.engineVersion,
      permissions: [...entry.permissions],
    };

    // Add signature if present
    if (entry.signature) {
      manifest.signature = {
        algorithm: 'Ed25519',
        publicKey: '', // Would be extracted from bundle
        signature: entry.signature,
        signedAt: entry.updatedAt,
        signedFields: [
          'author',
          'dependencies',
          'description',
          'engineVersion',
          'id',
          'main',
          'name',
          'peerDependencies',
          'permissions',
          'version',
        ],
      };
    }

    return manifest;
  }

  /**
   * Store a plugin bundle in IndexedDB.
   */
  private async _storeBundle(bundle: InstalledPluginBundle): Promise<void> {
    await set(`${IDB_PREFIX_BUNDLE}${bundle.pluginId}`, bundle);

    // Add to installed list
    const installed = await this._getInstalledList();
    if (!installed.includes(bundle.pluginId)) {
      installed.push(bundle.pluginId);
      await set(IDB_KEY_INSTALL_LIST, installed);
    }
  }

  /**
   * Get the list of installed plugin IDs.
   */
  private async _getInstalledList(): Promise<string[]> {
    const list = await get<string[]>(IDB_KEY_INSTALL_LIST);
    return list ?? [];
  }

  /**
   * Naive semver comparison: is `a` newer than `b`?
   */
  private _isNewerVersion(a: string, b: string): boolean {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const va = pa[i] ?? 0;
      const vb = pb[i] ?? 0;
      if (va > vb) return true;
      if (va < vb) return false;
    }
    return false;
  }

  /**
   * Update and broadcast progress.
   */
  private _updateProgress(
    pluginId: string,
    state: InstallState,
    progress: number,
    message: string,
    error?: string,
  ): void {
    const entry: InstallProgress = {
      pluginId,
      state,
      progress,
      message,
      error,
      startedAt: this._activeOperations.get(pluginId)?.startedAt ?? Date.now(),
      completedAt: state === 'complete' || state === 'failed' ? Date.now() : undefined,
    };
    this._activeOperations.set(pluginId, entry);
    this._notifyListeners(pluginId, entry);
  }

  /**
   * Notify all progress listeners.
   */
  private _notifyListeners(pluginId: string, progress: InstallProgress): void {
    this._listeners.forEach((l) => l(pluginId, progress));
  }
}

export const pluginInstallService = PluginInstallService.getInstance();
