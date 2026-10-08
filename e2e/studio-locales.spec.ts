import { expect, test } from '@playwright/test';
import en from '../src/core/locales/en/studio.json' with { type: 'json' };
import es from '../src/core/locales/es/studio.json' with { type: 'json' };
import fr from '../src/core/locales/fr/studio.json' with { type: 'json' };
import ja from '../src/core/locales/ja/studio.json' with { type: 'json' };
import ar from '../src/core/locales/ar/studio.json' with { type: 'json' };
import commonEn from '../src/core/locales/en/common.json' with { type: 'json' };
import commonEs from '../src/core/locales/es/common.json' with { type: 'json' };
import commonFr from '../src/core/locales/fr/common.json' with { type: 'json' };
import commonJa from '../src/core/locales/ja/common.json' with { type: 'json' };
import commonAr from '../src/core/locales/ar/common.json' with { type: 'json' };
import { blockExternalRequests, dismissModals } from './helpers';

for (const [language, label, strings, common] of [
  ['en', 'English', en, commonEn],
  ['es', 'Español', es, commonEs],
  ['fr', 'Français', fr, commonFr],
  ['ja', '日本語', ja, commonJa],
  ['ar', 'العربية', ar, commonAr],
] as const) {
  test(`Studio iteration controls work in ${language}`, async ({ page }, testInfo) => {
    await blockExternalRequests(page);
    await page.goto('/');
    await dismissModals(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    await page.getByRole('button', { name: common.sidebar.promptStudio, exact: true }).click();
    await page.locator('[data-studio-field="idea"]').fill('A boat crosses a quiet lake');
    await page.getByRole('button', { name: strings.build, exact: true }).click();
    await expect(page.locator('[data-studio-variant] textarea').first()).toHaveValue(/quiet lake/);
    await expect(page.getByRole('button', { name: strings.build, exact: true })).toBeEnabled();

    await page.locator('.studio-library > summary').click();
    await page.getByRole('button', { name: strings.libraryTabs.revisions, exact: true }).click();
    await page.getByRole('button', { name: strings.revision.save, exact: true }).click();
    await expect(page.getByText(strings.revision.saved, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: strings.libraryTabs.templates, exact: true }).click();
    await expect(page.getByLabel(strings.templateLibrary.name, { exact: true })).toBeVisible();

    const trigger = page.getByRole('button', { name: strings.arenaOpen, exact: true });
    await trigger.click();
    await expect(page.getByRole('dialog', { name: strings.arenaTitle, exact: true })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('region')).toHaveCount(8);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    if (language === 'ar') {
      await page.screenshot({ path: testInfo.outputPath('studio-ar.png'), fullPage: true });
    }
  });
}
