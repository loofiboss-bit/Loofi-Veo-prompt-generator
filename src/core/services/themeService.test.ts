/**
 * ThemeService Unit Tests
 * v2.4.0 — Tests for theme mode and accent color management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'mock-store'),
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
}));

// Mock loggerService
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { get, set } from 'idb-keyval';

describe('ThemeService', () => {
  // We need a fresh module for each test since it's a singleton
  let themeService: Awaited<typeof import('@core/services/themeService')>['themeService'];
  let ACCENT_PRESETS: Awaited<typeof import('@core/services/themeService')>['ACCENT_PRESETS'];

  beforeEach(async () => {
    vi.resetAllMocks();
    // Restore default mock implementations after resetAllMocks clears them
    vi.mocked(get).mockResolvedValue(undefined);
    vi.mocked(set).mockResolvedValue(undefined);
    // Reset singleton by re-importing module
    vi.resetModules();
    const mod = await import('@core/services/themeService');
    themeService = mod.themeService;
    ACCENT_PRESETS = mod.ACCENT_PRESETS;
  });

  afterEach(() => {
    // Clean up DOM attributes
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-accent');
  });

  describe('ACCENT_PRESETS', () => {
    it('should define 6 accent presets', () => {
      expect(Object.keys(ACCENT_PRESETS)).toHaveLength(6);
    });

    it('should have default preset with cyan hue', () => {
      expect(ACCENT_PRESETS.default.hue).toBe(190);
      expect(ACCENT_PRESETS.default.label).toBe('Default (Cyan)');
    });

    it('each preset should have label, hue, and saturation', () => {
      for (const [, preset] of Object.entries(ACCENT_PRESETS)) {
        expect(preset).toHaveProperty('label');
        expect(preset).toHaveProperty('hue');
        expect(preset).toHaveProperty('saturation');
        expect(typeof preset.hue).toBe('number');
        expect(typeof preset.saturation).toBe('number');
      }
    });
  });

  describe('initialize', () => {
    it('should load preferences from storage', async () => {
      await themeService.initialize();
      expect(get).toHaveBeenCalledWith('veo-studio-theme');
    });

    it('should use defaults when no stored preferences exist', async () => {
      vi.mocked(get).mockResolvedValue(undefined);
      await themeService.initialize();
      expect(themeService.getMode()).toBe('dark');
      expect(themeService.getAccent()).toBe('default');
    });

    it('should restore stored preferences', async () => {
      vi.mocked(get).mockResolvedValue({ mode: 'light', accent: 'ocean' });
      await themeService.initialize();
      expect(themeService.getMode()).toBe('light');
      expect(themeService.getAccent()).toBe('ocean');
    });

    it('should apply theme to DOM on init', async () => {
      await themeService.initialize();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.getAttribute('data-accent')).toBe('default');
    });

    it('should auto-detect light mode from prefers-color-scheme when no stored prefs', async () => {
      vi.mocked(get).mockResolvedValue(undefined);
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      await themeService.initialize();
      expect(themeService.getMode()).toBe('light');
      window.matchMedia = originalMatchMedia;
    });

    it('should not initialize twice', async () => {
      await themeService.initialize();
      await themeService.initialize();
      expect(get).toHaveBeenCalledTimes(1);
    });
  });

  describe('setMode', () => {
    beforeEach(async () => {
      await themeService.initialize();
    });

    it('should set dark mode', async () => {
      await themeService.setMode('dark');
      expect(themeService.getMode()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should set light mode via data-theme attribute', async () => {
      await themeService.setMode('light');
      expect(themeService.getMode()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should persist preference after setting mode', async () => {
      await themeService.setMode('light');
      expect(set).toHaveBeenCalledWith('veo-studio-theme', {
        mode: 'light',
        accent: 'default',
      });
    });
  });

  describe('toggleMode', () => {
    beforeEach(async () => {
      await themeService.initialize();
    });

    it('should toggle from dark to light', async () => {
      expect(themeService.getMode()).toBe('dark');
      await themeService.toggleMode();
      expect(themeService.getMode()).toBe('light');
    });

    it('should toggle from light to dark', async () => {
      await themeService.setMode('light');
      await themeService.toggleMode();
      expect(themeService.getMode()).toBe('dark');
    });
  });

  describe('setAccent', () => {
    beforeEach(async () => {
      await themeService.initialize();
    });

    it('should set accent preset', async () => {
      await themeService.setAccent('sunset');
      expect(themeService.getAccent()).toBe('sunset');
      expect(document.documentElement.getAttribute('data-accent')).toBe('sunset');
    });

    it('should apply CSS custom properties for accent', async () => {
      await themeService.setAccent('forest');
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--accent-hue')).toBe('145');
      expect(root.style.getPropertyValue('--accent-saturation')).toBe('65%');
    });

    it('should persist accent preference', async () => {
      await themeService.setAccent('amethyst');
      expect(set).toHaveBeenCalledWith('veo-studio-theme', {
        mode: 'dark',
        accent: 'amethyst',
      });
    });

    it('should warn on unknown accent preset', async () => {
      const { logger } = await import('@core/services/loggerService');
      await themeService.setAccent('nonexistent' as never);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown accent preset'));
    });
  });

  describe('getPreferences', () => {
    it('should return a copy of preferences', async () => {
      await themeService.initialize();
      const prefs = themeService.getPreferences();
      expect(prefs).toEqual({ mode: 'dark', accent: 'default' });
    });
  });

  describe('subscribe', () => {
    beforeEach(async () => {
      await themeService.initialize();
    });

    it('notifies listeners when preferences change', async () => {
      const listener = vi.fn();
      const unsubscribe = themeService.subscribe(listener);

      await themeService.setMode('light');
      await themeService.setAccent('forest');

      expect(listener).toHaveBeenCalledWith({ mode: 'light', accent: 'default' });
      expect(listener).toHaveBeenCalledWith({ mode: 'light', accent: 'forest' });

      unsubscribe();
    });

    it('stops notifying after unsubscribe', async () => {
      const listener = vi.fn();
      const unsubscribe = themeService.subscribe(listener);

      unsubscribe();
      await themeService.setMode('light');

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
