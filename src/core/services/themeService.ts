/**
 * Theme Service
 * v2.4.0 — Manages theme mode (dark/light) and accent color presets.
 *
 * Persists preferences to idb-keyval and applies CSS custom properties
 * via data-theme and data-accent attributes on the document element.
 */

import { get, set } from 'idb-keyval';
import { logger } from '@core/services/loggerService';

/** Available accent color presets. */
export const ACCENT_PRESETS = {
  default: { label: 'Default (Cyan)', hue: 190, saturation: 80 },
  midnight: { label: 'Midnight', hue: 220, saturation: 75 },
  ocean: { label: 'Ocean', hue: 170, saturation: 70 },
  forest: { label: 'Forest', hue: 145, saturation: 65 },
  sunset: { label: 'Sunset', hue: 25, saturation: 85 },
  amethyst: { label: 'Amethyst', hue: 270, saturation: 70 },
} as const;

export type AccentPresetKey = keyof typeof ACCENT_PRESETS;
export type ThemeMode = 'dark' | 'light';

interface ThemePreferences {
  mode: ThemeMode;
  accent: AccentPresetKey;
}

type ThemeListener = (preferences: Readonly<ThemePreferences>) => void;

const STORAGE_KEY = 'veo-studio-theme';
const LS_MODE_KEY = 'veo-theme-mode';

const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: 'dark',
  accent: 'default',
};

/**
 * Singleton service for managing theme and accent color preferences.
 * Applies CSS custom properties to document.documentElement for global theming.
 */
class ThemeService {
  private static instance: ThemeService;
  private preferences: ThemePreferences = { ...DEFAULT_PREFERENCES };
  private initialized = false;
  private listeners = new Set<ThemeListener>();

  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * Initialize theme service — loads persisted preferences and applies them.
   * Should be called once at app startup.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await get<ThemePreferences>(STORAGE_KEY);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...stored };
      } else if (typeof window !== 'undefined' && window.matchMedia) {
        // Auto-detect OS preference when no saved preference exists
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        this.preferences.mode = prefersLight ? 'light' : 'dark';
      }
    } catch (error) {
      logger.warn('Failed to load theme preferences, using defaults', { error });
    }

    // Sync to localStorage for the theme guard script in index.html
    try {
      localStorage.setItem(LS_MODE_KEY, this.preferences.mode);
    } catch {
      // localStorage may be unavailable
    }

    this.applyTheme();
    this.initialized = true;
  }

  /** Get current theme mode. */
  getMode(): ThemeMode {
    return this.preferences.mode;
  }

  /** Get current accent preset key. */
  getAccent(): AccentPresetKey {
    return this.preferences.accent;
  }

  /** Get full current preferences. */
  getPreferences(): Readonly<ThemePreferences> {
    return { ...this.preferences };
  }

  /**
   * Subscribe to theme preference changes.
   */
  subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Set theme mode (dark/light) and persist. */
  async setMode(mode: ThemeMode): Promise<void> {
    this.preferences.mode = mode;
    this.applyTheme();
    try {
      localStorage.setItem(LS_MODE_KEY, mode);
    } catch {
      // localStorage may be unavailable in sandboxed contexts
    }
    await this.persist();
  }

  /** Toggle between dark and light mode. */
  async toggleMode(): Promise<void> {
    await this.setMode(this.preferences.mode === 'dark' ? 'light' : 'dark');
  }

  /** Set accent color preset and persist. */
  async setAccent(accent: AccentPresetKey): Promise<void> {
    if (!(accent in ACCENT_PRESETS)) {
      logger.warn(`Unknown accent preset: ${accent}`);
      return;
    }
    this.preferences.accent = accent;
    this.applyTheme();
    await this.persist();
  }

  /**
   * Apply current theme preferences to the DOM.
   * Sets data-theme and data-accent attributes + CSS custom properties.
   */
  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const { mode, accent } = this.preferences;
    const preset = ACCENT_PRESETS[accent];

    // Theme mode
    root.setAttribute('data-theme', mode);

    // Accent color
    root.setAttribute('data-accent', accent);
    root.style.setProperty('--accent-hue', String(preset.hue));
    root.style.setProperty('--accent-saturation', `${preset.saturation}%`);

    // Generate accent color scale from HSL
    const hue = preset.hue;
    const sat = preset.saturation;
    root.style.setProperty('--color-accent-50', `hsl(${hue}, ${sat}%, 95%)`);
    root.style.setProperty('--color-accent-100', `hsl(${hue}, ${sat}%, 90%)`);
    root.style.setProperty('--color-accent-200', `hsl(${hue}, ${sat}%, 80%)`);
    root.style.setProperty('--color-accent-300', `hsl(${hue}, ${sat}%, 70%)`);
    root.style.setProperty('--color-accent-400', `hsl(${hue}, ${sat}%, 60%)`);
    root.style.setProperty('--color-accent-500', `hsl(${hue}, ${sat}%, 50%)`);
    root.style.setProperty('--color-accent-600', `hsl(${hue}, ${sat}%, 40%)`);
    root.style.setProperty('--color-accent-700', `hsl(${hue}, ${sat}%, 30%)`);
    root.style.setProperty('--color-accent-800', `hsl(${hue}, ${sat}%, 20%)`);
    root.style.setProperty('--color-accent-900', `hsl(${hue}, ${sat}%, 10%)`);

    this.emit();
  }

  /** Persist preferences to IndexedDB. */
  private async persist(): Promise<void> {
    try {
      await set(STORAGE_KEY, this.preferences);
    } catch (error) {
      logger.warn('Failed to persist theme preferences', { error });
    }
  }

  private emit(): void {
    const snapshot = this.getPreferences();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export const themeService = ThemeService.getInstance();
