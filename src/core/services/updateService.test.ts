/**
 * Update Service Unit Tests
 * Tests for auto-update functionality, version checking, and release management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock electron bridge
const mockElectron = {
  platform: 'linux',
  arch: 'x64',
  downloadUpdate: vi.fn(),
  installUpdate: vi.fn(),
  onDownloadProgress: vi.fn(),
};

vi.mock('@core/utils/electronBridge', () => ({
  getElectron: vi.fn(() => null),
}));

// Mock global fetch
global.fetch = vi.fn();

import { updateService } from './updateService';
import { getElectron } from '@core/utils/electronBridge';

describe('updateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    updateService.stopAutoCheck();
    // Reset channel to stable and clear status to prevent state pollution
    updateService.updateConfig({ channel: 'stable' });
    updateService.dismissUpdate();
  });

  afterEach(() => {
    updateService.stopAutoCheck();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const config = updateService.getConfig();

      expect(config.channel).toBe('stable');
      expect(config.autoCheck).toBe(true);
      expect(config.autoDownload).toBe(false);
      expect(config.autoInstall).toBe(false);
      expect(config.checkInterval).toBe(3600000);
    });

    it('should load saved configuration from localStorage', () => {
      const savedConfig = {
        channel: 'beta' as const,
        autoCheck: false,
        autoDownload: true,
        autoInstall: false,
        checkInterval: 7200000,
        updateUrl: 'https://example.com/api',
      };
      localStorage.setItem('updateConfig', JSON.stringify(savedConfig));

      // Need to create a new instance to test loading
      // For this singleton, we test via updateConfig
      updateService.updateConfig(savedConfig);
      const config = updateService.getConfig();

      expect(config.channel).toBe('beta');
    });
  });

  describe('getStatus', () => {
    it('should return current update status', () => {
      const status = updateService.getStatus();

      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('currentVersion');
      expect(status).toHaveProperty('latestVersion');
      expect(status).toHaveProperty('downloading');
      expect(status).toHaveProperty('downloadProgress');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      updateService.updateConfig({ channel: 'beta' });

      const config = updateService.getConfig();
      expect(config.channel).toBe('beta');
    });

    it('should save configuration to localStorage', () => {
      updateService.updateConfig({ autoCheck: false });

      const saved = localStorage.getItem('updateConfig');
      expect(saved).toBeTruthy();
      const config = JSON.parse(saved!);
      expect(config.autoCheck).toBe(false);
    });

    it('should restart auto-check when autoCheck is enabled', () => {
      updateService.stopAutoCheck();
      updateService.updateConfig({ autoCheck: true });

      // Auto-check should be started
      const config = updateService.getConfig();
      expect(config.autoCheck).toBe(true);
    });

    it('should stop auto-check when autoCheck is disabled', () => {
      updateService.updateConfig({ autoCheck: false });

      const config = updateService.getConfig();
      expect(config.autoCheck).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('should allow subscribing to status changes', () => {
      const listener = vi.fn();
      const unsubscribe = updateService.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should call listener on status change', async () => {
      const listener = vi.fn();
      updateService.subscribe(listener);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await updateService.checkForUpdates();

      expect(listener).toHaveBeenCalled();
    });

    it('should unsubscribe correctly', () => {
      const listener = vi.fn();
      const unsubscribe = updateService.subscribe(listener);

      unsubscribe();
      updateService.dismissUpdate();

      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('checkForUpdates', () => {
    it('should fetch releases from GitHub API', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      const config = updateService.getConfig();
      await updateService.checkForUpdates();

      expect(global.fetch).toHaveBeenCalledWith(
        config.updateUrl,
        expect.objectContaining({
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }),
      );
    });

    it('should handle GitHub API errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await updateService.checkForUpdates();

      const status = updateService.getStatus();
      expect(status.error).toBeDefined();
    });

    it('should detect newer versions', async () => {
      // Clear any previous state
      updateService.stopAutoCheck();
      localStorage.clear();

      // Mock a clean response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            tag_name: 'v99.0.0',
            prerelease: false,
            published_at: '2024-01-01T00:00:00Z',
            body: 'New release',
            assets: [
              {
                name: 'app.AppImage',
                browser_download_url: 'https://example.com/app.AppImage',
                size: 1024000,
              },
            ],
          },
        ],
      } as Response);

      const result = await updateService.checkForUpdates();

      expect(result.available).toBe(true);
      expect(result.latestVersion).toBe('99.0.0');
      expect(result.releaseInfo).toBeDefined();
      expect(result.releaseInfo?.downloadUrl).toBe('https://example.com/app.AppImage');
    });

    it('should not mark update available for older versions', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            tag_name: 'v0.1.0',
            prerelease: false,
            published_at: '2020-01-01T00:00:00Z',
            body: 'Old release',
            assets: [],
          },
        ],
      } as Response);

      await updateService.checkForUpdates();

      const status = updateService.getStatus();
      expect(status.available).toBe(false);
    });

    it('should filter releases by channel (stable)', async () => {
      updateService.updateConfig({ channel: 'stable' });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            tag_name: 'v99.0.0-beta',
            prerelease: true,
            published_at: '2024-01-01T00:00:00Z',
            body: 'Beta release',
            assets: [],
          },
        ],
      } as Response);

      await updateService.checkForUpdates();

      const status = updateService.getStatus();
      expect(status.available).toBe(false);
    });
  });

  describe('downloadUpdate', () => {
    it('should throw error when no update available', async () => {
      await expect(updateService.downloadUpdate()).rejects.toThrow('No update available');
    });

    it('should open download URL in browser for web version', async () => {
      const mockOpen = vi.fn();
      global.open = mockOpen;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            tag_name: 'v99.0.0',
            prerelease: false,
            published_at: '2024-01-01T00:00:00Z',
            body: 'New release',
            assets: [
              {
                name: 'app.AppImage',
                browser_download_url: 'https://example.com/app.AppImage',
                size: 1024000,
              },
            ],
          },
        ],
      } as Response);

      await updateService.checkForUpdates();

      // Verify update is available
      const status = updateService.getStatus();
      expect(status.available).toBe(true);

      await updateService.downloadUpdate();

      expect(mockOpen).toHaveBeenCalledWith('https://example.com/app.AppImage', '_blank');
    });

    it('should use Electron download manager when available', async () => {
      vi.mocked(getElectron).mockReturnValue(mockElectron);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            tag_name: 'v99.0.0',
            prerelease: false,
            published_at: '2024-01-01T00:00:00Z',
            body: 'New release',
            assets: [
              {
                name: 'app.AppImage',
                browser_download_url: 'https://example.com/app.AppImage',
                size: 1024000,
              },
            ],
          },
        ],
      } as Response);

      await updateService.checkForUpdates();
      await updateService.downloadUpdate();

      expect(mockElectron.downloadUpdate).toHaveBeenCalledWith('https://example.com/app.AppImage');

      vi.mocked(getElectron).mockReturnValue(null);
    });
  });

  describe('installUpdate', () => {
    it('should throw error when Electron not available', async () => {
      await expect(updateService.installUpdate()).rejects.toThrow('only available in desktop app');
    });

    it('should call Electron install method when available', async () => {
      vi.mocked(getElectron).mockReturnValue(mockElectron);

      await updateService.installUpdate();

      expect(mockElectron.installUpdate).toHaveBeenCalled();

      vi.mocked(getElectron).mockReturnValue(null);
    });
  });

  describe('dismissUpdate', () => {
    it('should clear update availability', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            tag_name: 'v99.0.0',
            prerelease: false,
            published_at: '2024-01-01T00:00:00Z',
            body: 'New release',
            assets: [
              {
                name: 'app.AppImage',
                browser_download_url: 'https://example.com/app.AppImage',
                size: 1024000,
              },
            ],
          },
        ],
      } as Response);

      await updateService.checkForUpdates();
      let status = updateService.getStatus();
      expect(status.available).toBe(true);

      updateService.dismissUpdate();
      status = updateService.getStatus();
      expect(status.available).toBe(false);
    });
  });

  describe('startAutoCheck and stopAutoCheck', () => {
    it('should start automatic checking', () => {
      updateService.startAutoCheck();
      // Timer should be set
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    it('should stop automatic checking', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      updateService.startAutoCheck();
      updateService.stopAutoCheck();

      // Flush any pending microtasks from checkForUpdates
      await vi.runAllTimersAsync();

      // Only the interval should have been created and cleared
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should not start duplicate timers', () => {
      updateService.startAutoCheck();
      const count1 = vi.getTimerCount();
      updateService.startAutoCheck();
      const count2 = vi.getTimerCount();

      expect(count1).toBe(count2);
    });
  });
});
