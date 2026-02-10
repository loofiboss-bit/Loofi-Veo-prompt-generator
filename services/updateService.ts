/**
 * Auto-Update Service
 * Handles version checking, update downloads, and installation
 */

import { logger } from './loggerService';

export type ReleaseChannel = 'stable' | 'beta' | 'dev';

export interface UpdateConfig {
    channel: ReleaseChannel;
    autoCheck: boolean;
    autoDownload: boolean;
    autoInstall: boolean;
    checkInterval: number; // milliseconds
    updateUrl: string;
}

export interface ReleaseInfo {
    version: string;
    channel: ReleaseChannel;
    releaseDate: string;
    downloadUrl: string;
    changelog: string;
    size: number;
    checksum: string;
    isPrerelease: boolean;
}

export interface UpdateStatus {
    available: boolean;
    currentVersion: string;
    latestVersion: string;
    releaseInfo?: ReleaseInfo;
    downloading: boolean;
    downloadProgress: number;
    error?: string;
}

class UpdateService {
    private config: UpdateConfig;
    private status: UpdateStatus;
    private checkTimer?: NodeJS.Timeout;
    private listeners: Set<(status: UpdateStatus) => void>;
    private readonly GITHUB_REPO = 'loofi/Loofi-Veo-prompt-generator';
    private readonly CURRENT_VERSION: string;

    constructor() {
        this.CURRENT_VERSION = this.getCurrentVersion();
        this.config = this.loadConfig();
        this.status = {
            available: false,
            currentVersion: this.CURRENT_VERSION,
            latestVersion: this.CURRENT_VERSION,
            downloading: false,
            downloadProgress: 0,
        };
        this.listeners = new Set();

        logger.info('UpdateService', 'Initialized', {
            version: this.CURRENT_VERSION,
            channel: this.config.channel,
        });
    }

    /**
     * Get current application version from package.json
     */
    private getCurrentVersion(): string {
        try {
            // In production, this would be injected at build time
            return import.meta.env.VITE_APP_VERSION || '1.3.0';
        } catch (error) {
            logger.error('UpdateService', 'Failed to get current version', error);
            return '1.3.0';
        }
    }

    /**
     * Load update configuration from localStorage
     */
    private loadConfig(): UpdateConfig {
        try {
            const saved = localStorage.getItem('updateConfig');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            logger.error('UpdateService', 'Failed to load config', error);
        }

        // Default configuration
        return {
            channel: 'stable',
            autoCheck: true,
            autoDownload: false,
            autoInstall: false,
            checkInterval: 3600000, // 1 hour
            updateUrl: `https://api.github.com/repos/${this.GITHUB_REPO}/releases`,
        };
    }

    /**
     * Save update configuration to localStorage
     */
    private saveConfig(): void {
        try {
            localStorage.setItem('updateConfig', JSON.stringify(this.config));
            logger.info('UpdateService', 'Config saved', this.config);
        } catch (error) {
            logger.error('UpdateService', 'Failed to save config', error);
        }
    }

    /**
     * Get current update configuration
     */
    getConfig(): UpdateConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<UpdateConfig>): void {
        this.config = { ...this.config, ...updates };
        this.saveConfig();

        // Restart auto-check if interval changed
        if (updates.autoCheck !== undefined || updates.checkInterval !== undefined) {
            this.stopAutoCheck();
            if (this.config.autoCheck) {
                this.startAutoCheck();
            }
        }

        logger.info('UpdateService', 'Config updated', this.config);
    }

    /**
     * Get current update status
     */
    getStatus(): UpdateStatus {
        return { ...this.status };
    }

    /**
     * Subscribe to update status changes
     */
    subscribe(listener: (status: UpdateStatus) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Notify all listeners of status change
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.getStatus()));
    }

    /**
     * Start automatic update checking
     */
    startAutoCheck(): void {
        if (this.checkTimer) {
            return;
        }

        logger.info('UpdateService', 'Starting auto-check', {
            interval: this.config.checkInterval,
        });

        // Check immediately
        this.checkForUpdates();

        // Then check periodically
        this.checkTimer = setInterval(() => {
            this.checkForUpdates();
        }, this.config.checkInterval);
    }

    /**
     * Stop automatic update checking
     */
    stopAutoCheck(): void {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = undefined;
            logger.info('UpdateService', 'Stopped auto-check');
        }
    }

    /**
     * Check for available updates
     */
    async checkForUpdates(): Promise<UpdateStatus> {
        logger.info('UpdateService', 'Checking for updates', {
            channel: this.config.channel,
        });

        try {
            const releases = await this.fetchReleases();
            const latestRelease = this.findLatestRelease(releases);

            if (latestRelease) {
                const isNewer = this.compareVersions(
                    latestRelease.version,
                    this.CURRENT_VERSION
                );

                this.status = {
                    ...this.status,
                    available: isNewer,
                    latestVersion: latestRelease.version,
                    releaseInfo: isNewer ? latestRelease : undefined,
                    error: undefined,
                };

                if (isNewer) {
                    logger.info('UpdateService', 'Update available', {
                        current: this.CURRENT_VERSION,
                        latest: latestRelease.version,
                    });

                    if (this.config.autoDownload) {
                        await this.downloadUpdate();
                    }
                } else {
                    logger.info('UpdateService', 'No updates available');
                }
            }
        } catch (error) {
            logger.error('UpdateService', 'Failed to check for updates', error);
            this.status = {
                ...this.status,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }

        this.notifyListeners();
        return this.getStatus();
    }

    /**
     * Fetch releases from GitHub API
     */
    private async fetchReleases(): Promise<any[]> {
        const response = await fetch(this.config.updateUrl, {
            headers: {
                Accept: 'application/vnd.github.v3+json',
            },
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Find the latest release for the current channel
     */
    private findLatestRelease(releases: any[]): ReleaseInfo | null {
        const channelReleases = releases.filter(release => {
            if (this.config.channel === 'stable') {
                return !release.prerelease;
            } else if (this.config.channel === 'beta') {
                return release.prerelease && release.tag_name.includes('beta');
            } else if (this.config.channel === 'dev') {
                return true; // Include all releases
            }
            return false;
        });

        if (channelReleases.length === 0) {
            return null;
        }

        const latest = channelReleases[0];
        const asset = this.findAssetForPlatform(latest.assets);

        if (!asset) {
            logger.warn('UpdateService', 'No compatible asset found', {
                platform: this.getPlatform(),
            });
            return null;
        }

        return {
            version: latest.tag_name.replace(/^v/, ''),
            channel: this.detectChannel(latest),
            releaseDate: latest.published_at,
            downloadUrl: asset.browser_download_url,
            changelog: latest.body || '',
            size: asset.size,
            checksum: '', // Would need to be included in release
            isPrerelease: latest.prerelease,
        };
    }

    /**
     * Find the appropriate asset for the current platform
     */
    private findAssetForPlatform(assets: any[]): any | null {
        const platform = this.getPlatform();
        const arch = this.getArch();

        // Platform-specific patterns
        const patterns: Record<string, RegExp[]> = {
            linux: [/\.AppImage$/, /linux.*\.tar\.gz$/],
            win32: [/\.exe$/, /win.*\.zip$/],
            darwin: [/\.dmg$/, /mac.*\.zip$/],
        };

        const platformPatterns = patterns[platform] || [];

        for (const pattern of platformPatterns) {
            const asset = assets.find(a => pattern.test(a.name));
            if (asset) {
                return asset;
            }
        }

        return null;
    }

    /**
     * Detect release channel from release info
     */
    private detectChannel(release: any): ReleaseChannel {
        if (release.tag_name.includes('beta')) {
            return 'beta';
        } else if (release.tag_name.includes('dev') || release.tag_name.includes('alpha')) {
            return 'dev';
        }
        return 'stable';
    }

    /**
     * Get current platform
     */
    private getPlatform(): string {
        if (typeof window !== 'undefined' && (window as any).electron) {
            return (window as any).electron.platform || 'linux';
        }
        return 'linux'; // Default for web
    }

    /**
     * Get current architecture
     */
    private getArch(): string {
        if (typeof window !== 'undefined' && (window as any).electron) {
            return (window as any).electron.arch || 'x64';
        }
        return 'x64';
    }

    /**
     * Compare two semantic versions
     * Returns true if v1 > v2
     */
    private compareVersions(v1: string, v2: string): boolean {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;

            if (part1 > part2) return true;
            if (part1 < part2) return false;
        }

        return false;
    }

    /**
     * Download the update
     */
    async downloadUpdate(): Promise<void> {
        if (!this.status.releaseInfo) {
            throw new Error('No update available to download');
        }

        logger.info('UpdateService', 'Starting download', {
            url: this.status.releaseInfo.downloadUrl,
        });

        this.status = {
            ...this.status,
            downloading: true,
            downloadProgress: 0,
            error: undefined,
        };
        this.notifyListeners();

        try {
            // In Electron, this would use the download manager
            // For web, we just open the download URL
            if (typeof window !== 'undefined' && (window as any).electron) {
                await this.electronDownload(this.status.releaseInfo.downloadUrl);
            } else {
                window.open(this.status.releaseInfo.downloadUrl, '_blank');
            }

            this.status = {
                ...this.status,
                downloading: false,
                downloadProgress: 100,
            };

            logger.info('UpdateService', 'Download completed');
        } catch (error) {
            logger.error('UpdateService', 'Download failed', error);
            this.status = {
                ...this.status,
                downloading: false,
                downloadProgress: 0,
                error: error instanceof Error ? error.message : 'Download failed',
            };
        }

        this.notifyListeners();
    }

    /**
     * Download update using Electron's download manager
     */
    private async electronDownload(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!(window as any).electron?.downloadUpdate) {
                reject(new Error('Electron download not available'));
                return;
            }

            (window as any).electron.downloadUpdate(url, (progress: number) => {
                this.status = {
                    ...this.status,
                    downloadProgress: progress,
                };
                this.notifyListeners();
            }).then(resolve).catch(reject);
        });
    }

    /**
     * Install the downloaded update
     */
    async installUpdate(): Promise<void> {
        logger.info('UpdateService', 'Installing update');

        try {
            if (typeof window !== 'undefined' && (window as any).electron?.installUpdate) {
                await (window as any).electron.installUpdate();
            } else {
                throw new Error('Update installation only available in desktop app');
            }
        } catch (error) {
            logger.error('UpdateService', 'Installation failed', error);
            throw error;
        }
    }

    /**
     * Dismiss the current update notification
     */
    dismissUpdate(): void {
        this.status = {
            ...this.status,
            available: false,
            releaseInfo: undefined,
        };
        this.notifyListeners();
        logger.info('UpdateService', 'Update dismissed');
    }

    /**
     * Initialize the update service
     */
    initialize(): void {
        if (this.config.autoCheck) {
            this.startAutoCheck();
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.stopAutoCheck();
        this.listeners.clear();
        logger.info('UpdateService', 'Service destroyed');
    }
}

// Export singleton instance
export const updateService = new UpdateService();
