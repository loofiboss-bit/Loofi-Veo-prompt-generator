/**
 * i18n Configuration Unit Tests
 * v2.4.0 — Tests for i18n setup, namespaces, and language switching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('i18n Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export TRANSLATION_NAMESPACES with 13 entries', async () => {
    const { TRANSLATION_NAMESPACES } = await import('@core/config/i18n');
    expect(TRANSLATION_NAMESPACES).toHaveLength(13);
    expect(TRANSLATION_NAMESPACES).toContain('common');
    expect(TRANSLATION_NAMESPACES).toContain('prompt');
    expect(TRANSLATION_NAMESPACES).toContain('settings');
  });

  it('should export SUPPORTED_LANGUAGES with 5 languages', async () => {
    const { SUPPORTED_LANGUAGES } = await import('@core/config/i18n');
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'es', 'fr', 'ja', 'ar']);
  });

  it('should export LANGUAGE_LABELS for each supported language', async () => {
    const { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } = await import('@core/config/i18n');
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_LABELS).toHaveProperty(lang);
      expect(typeof LANGUAGE_LABELS[lang]).toBe('string');
    }
  });

  it('should export i18n instance', async () => {
    const { i18n } = await import('@core/config/i18n');
    expect(i18n).toBeDefined();
    expect(typeof i18n.t).toBe('function');
  });

  it('should have English as fallback language', async () => {
    const { i18n } = await import('@core/config/i18n');
    // English should be loaded
    expect(i18n.hasResourceBundle('en', 'common')).toBe(true);
  });

  it('should have all EN namespaces loaded', async () => {
    const { TRANSLATION_NAMESPACES, i18n } = await import('@core/config/i18n');
    for (const ns of TRANSLATION_NAMESPACES) {
      expect(i18n.hasResourceBundle('en', ns)).toBe(true);
    }
  });

  it('should resolve common namespace keys', async () => {
    const { i18n } = await import('@core/config/i18n');
    const result = i18n.t('generateButton', { ns: 'common' });
    expect(result).toBe('Generate Prompt');
  });

  it('should resolve nested keys', async () => {
    const { i18n } = await import('@core/config/i18n');
    const result = i18n.t('sidebar.history', { ns: 'common' });
    expect(result).toBe('History');
  });

  it('should export changeAppLanguage function', async () => {
    const { changeAppLanguage } = await import('@core/config/i18n');
    expect(typeof changeAppLanguage).toBe('function');
  });
});
