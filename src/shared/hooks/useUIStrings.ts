/**
 * useUIStrings — Bridge hook for gradual i18n migration
 *
 * Returns a UIStrings-compatible object whose values come from i18next
 * namespace lookups, falling back to the original English strings.
 *
 * Usage:
 *   const t = useUIStrings();
 *   // t.generateVideoButton → i18next 'common:generateVideoButton' or EN fallback
 *
 * Components can replace `uiStrings` prop with this hook progressively.
 * Once all consumers are migrated, this bridge can be removed in favour
 * of direct useTranslation() calls.
 */

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import type { UIStrings } from '@core/constants';
import { appUIStrings } from '@core/constants/translations';

/**
 * Bridge hook that provides the legacy UIStrings shape
 * but reads from i18next namespaces under the hood.
 *
 * For v2.4.0 this simply syncs the i18next language with the
 * legacy UIStrings lookup since the EN JSON files were extracted
 * from the same translations.ts source.
 */
export const useUIStrings = (): UIStrings => {
  const { i18n } = useTranslation();

  return useMemo(() => {
    const lang = i18n.language?.split('-')[0] ?? 'en';
    return appUIStrings[lang] || appUIStrings['en'];
  }, [i18n.language]);
};
