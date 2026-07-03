/**
 * i18n Configuration
 * v2.4.0 — Internationalization setup using react-i18next
 *
 * Uses JSON namespace files loaded from /locales/{lang}/{ns}.json.
 * Fallback language: English (en).
 * Language detection: browser language → localStorage → default.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import EN namespaces directly (bundled, not lazy-loaded)
import commonEn from '../locales/en/common.json';
import promptEn from '../locales/en/prompt.json';
import historyEn from '../locales/en/history.json';
import templatesEn from '../locales/en/templates.json';
import studiosEn from '../locales/en/studios.json';
import wizardEn from '../locales/en/wizard.json';
import tutorialEn from '../locales/en/tutorial.json';
import tooltipsEn from '../locales/en/tooltips.json';
import errorsEn from '../locales/en/errors.json';
import projectEn from '../locales/en/project.json';
import searchEn from '../locales/en/search.json';
import settingsEn from '../locales/en/settings.json';
import toastsEn from '../locales/en/toasts.json';
import optimizationEn from '../locales/en/optimization.json';

/** All translation namespaces used in the app. */
export const TRANSLATION_NAMESPACES = [
  'common',
  'prompt',
  'history',
  'templates',
  'studios',
  'wizard',
  'tutorial',
  'tooltips',
  'errors',
  'project',
  'search',
  'settings',
  'toasts',
  'optimization',
] as const;

export type TranslationNamespace = (typeof TRANSLATION_NAMESPACES)[number];

/** Supported languages. */
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'ja', 'ar'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
  ar: 'العربية',
};

// EN resources are bundled directly for instant availability
const enResources = {
  common: commonEn,
  prompt: promptEn,
  history: historyEn,
  templates: templatesEn,
  studios: studiosEn,
  wizard: wizardEn,
  tutorial: tutorialEn,
  tooltips: tooltipsEn,
  errors: errorsEn,
  project: projectEn,
  search: searchEn,
  settings: settingsEn,
  toasts: toastsEn,
  optimization: optimizationEn,
};

const nonEnglishResourceLoaders: Record<
  Exclude<SupportedLanguage, 'en'>,
  () => Promise<Record<string, Record<string, unknown>>>
> = {
  es: async () => ({
    common: (await import('../locales/es/common.json')).default,
    prompt: (await import('../locales/es/prompt.json')).default,
    history: (await import('../locales/es/history.json')).default,
    templates: (await import('../locales/es/templates.json')).default,
    studios: (await import('../locales/es/studios.json')).default,
    wizard: (await import('../locales/es/wizard.json')).default,
    tutorial: (await import('../locales/es/tutorial.json')).default,
    tooltips: (await import('../locales/es/tooltips.json')).default,
    errors: (await import('../locales/es/errors.json')).default,
    project: (await import('../locales/es/project.json')).default,
    search: (await import('../locales/es/search.json')).default,
    settings: (await import('../locales/es/settings.json')).default,
    toasts: (await import('../locales/es/toasts.json')).default,
    optimization: {},
  }),
  fr: async () => ({
    common: (await import('../locales/fr/common.json')).default,
    prompt: (await import('../locales/fr/prompt.json')).default,
    history: (await import('../locales/fr/history.json')).default,
    templates: (await import('../locales/fr/templates.json')).default,
    studios: (await import('../locales/fr/studios.json')).default,
    wizard: (await import('../locales/fr/wizard.json')).default,
    tutorial: (await import('../locales/fr/tutorial.json')).default,
    tooltips: (await import('../locales/fr/tooltips.json')).default,
    errors: (await import('../locales/fr/errors.json')).default,
    project: (await import('../locales/fr/project.json')).default,
    search: (await import('../locales/fr/search.json')).default,
    settings: (await import('../locales/fr/settings.json')).default,
    toasts: (await import('../locales/fr/toasts.json')).default,
    optimization: {},
  }),
  ja: async () => ({
    common: (await import('../locales/ja/common.json')).default,
    prompt: (await import('../locales/ja/prompt.json')).default,
    history: (await import('../locales/ja/history.json')).default,
    templates: (await import('../locales/ja/templates.json')).default,
    studios: (await import('../locales/ja/studios.json')).default,
    wizard: (await import('../locales/ja/wizard.json')).default,
    tutorial: (await import('../locales/ja/tutorial.json')).default,
    tooltips: (await import('../locales/ja/tooltips.json')).default,
    errors: (await import('../locales/ja/errors.json')).default,
    project: (await import('../locales/ja/project.json')).default,
    search: (await import('../locales/ja/search.json')).default,
    settings: (await import('../locales/ja/settings.json')).default,
    toasts: (await import('../locales/ja/toasts.json')).default,
    optimization: {},
  }),
  ar: async () => ({
    common: (await import('../locales/ar/common.json')).default,
    prompt: (await import('../locales/ar/prompt.json')).default,
    history: (await import('../locales/ar/history.json')).default,
    templates: (await import('../locales/ar/templates.json')).default,
    studios: (await import('../locales/ar/studios.json')).default,
    wizard: (await import('../locales/ar/wizard.json')).default,
    tutorial: (await import('../locales/ar/tutorial.json')).default,
    tooltips: (await import('../locales/ar/tooltips.json')).default,
    errors: (await import('../locales/ar/errors.json')).default,
    project: (await import('../locales/ar/project.json')).default,
    search: (await import('../locales/ar/search.json')).default,
    settings: (await import('../locales/ar/settings.json')).default,
    toasts: (await import('../locales/ar/toasts.json')).default,
    optimization: (await import('../locales/ar/optimization.json')).default,
  }),
};

/**
 * Lazy-load a non-EN language bundle.
 * Returns all namespaces for the given language.
 */
export async function loadLanguageBundle(
  lang: SupportedLanguage,
): Promise<Record<string, Record<string, unknown>>> {
  if (lang === 'en') return enResources;
  return nonEnglishResourceLoaders[lang]();
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: enResources,
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [...TRANSLATION_NAMESPACES],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'veo-studio-language',
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false, // Avoid Suspense for translations (instant EN)
    },
  });

/** Languages that use right-to-left text direction. */
export const RTL_LANGUAGES: ReadonlySet<string> = new Set(['ar', 'he', 'fa', 'ur']);

/**
 * Change language at runtime.
 * Lazy-loads the language bundle if not already loaded.
 * Sets document direction (ltr/rtl) based on the language.
 */
export async function changeAppLanguage(lang: SupportedLanguage): Promise<void> {
  if (!i18n.hasResourceBundle(lang, 'common')) {
    const bundle = await loadLanguageBundle(lang);
    for (const [ns, resources] of Object.entries(bundle)) {
      i18n.addResourceBundle(lang, ns, resources, true, true);
    }
  }
  const dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
  await i18n.changeLanguage(lang);
}

export { i18n };
