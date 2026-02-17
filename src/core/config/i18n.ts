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
import commonEn from '../../../public/locales/en/common.json';
import promptEn from '../../../public/locales/en/prompt.json';
import historyEn from '../../../public/locales/en/history.json';
import templatesEn from '../../../public/locales/en/templates.json';
import studiosEn from '../../../public/locales/en/studios.json';
import wizardEn from '../../../public/locales/en/wizard.json';
import tutorialEn from '../../../public/locales/en/tutorial.json';
import tooltipsEn from '../../../public/locales/en/tooltips.json';
import errorsEn from '../../../public/locales/en/errors.json';
import projectEn from '../../../public/locales/en/project.json';
import searchEn from '../../../public/locales/en/search.json';
import settingsEn from '../../../public/locales/en/settings.json';
import toastsEn from '../../../public/locales/en/toasts.json';

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
] as const;

export type TranslationNamespace = (typeof TRANSLATION_NAMESPACES)[number];

/** Supported languages (AR deferred to v2.5.0 for RTL support). */
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'ja'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
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
};

/**
 * Lazy-load a non-EN language bundle.
 * Returns all namespaces for the given language.
 */
export async function loadLanguageBundle(
  lang: SupportedLanguage,
): Promise<Record<string, Record<string, unknown>>> {
  if (lang === 'en') return enResources;

  const modules = await Promise.all(
    TRANSLATION_NAMESPACES.map(async (ns) => {
      try {
        const mod = await import(`../../../public/locales/${lang}/${ns}.json`);
        return [ns, mod.default ?? mod] as const;
      } catch {
        // Fall back to empty — i18next will use EN fallback
        return [ns, {}] as const;
      }
    }),
  );

  return Object.fromEntries(modules);
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

/**
 * Change language at runtime.
 * Lazy-loads the language bundle if not already loaded.
 */
export async function changeAppLanguage(lang: SupportedLanguage): Promise<void> {
  if (!i18n.hasResourceBundle(lang, 'common')) {
    const bundle = await loadLanguageBundle(lang);
    for (const [ns, resources] of Object.entries(bundle)) {
      i18n.addResourceBundle(lang, ns, resources, true, true);
    }
  }
  await i18n.changeLanguage(lang);
}

export { i18n };
