import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import createEn from '../src/core/locales/en/create.json' with { type: 'json' };
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

import { creatorVideo as video } from './fixtures/creatorVideo';

for (const [language, label, strings, common] of [
  ['en', 'English', en, commonEn],
  ['es', 'Español', es, commonEs],
  ['fr', 'Français', fr, commonFr],
  ['ja', '日本語', ja, commonJa],
  ['ar', 'العربية', ar, commonAr],
] as const) {
  test(`external video completes the creator flow in ${language}`, async ({ page }, testInfo) => {
    await blockExternalRequests(page);
    await page.emulateMedia({ colorScheme: language === 'en' ? 'light' : 'dark' });
    await page.goto('/');
    await dismissModals(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await page.getByRole('button', { name: common.sidebar.promptStudio, exact: true }).click();
    await page.locator('[data-studio-field="idea"]').fill('A blue boat crossing a quiet lake');
    await page.getByRole('button', { name: strings.build, exact: true }).click();
    const original = await page.getByLabel('Primary prompt', { exact: true }).inputValue();
    await page.getByLabel(strings.externalResults.import, { exact: true }).setInputFiles({
      name: 'creator-result.webm',
      mimeType: 'video/webm',
      buffer: video,
    });
    const results = page.getByRole('region', { name: strings.externalResults.title, exact: true });
    await expect(
      results.getByRole('button', { name: strings.externalResults.confirm, exact: true }),
    ).toBeEnabled();
    await expect(results.locator('video')).toHaveAttribute('src', /^blob:/);
    await expect(
      results.getByRole('button', { name: strings.externalResults.useTimeline, exact: true }),
    ).toBeDisabled();
    await results.getByText(strings.externalResults.source, { exact: true }).click();
    await expect(results.locator('pre')).toContainText(original);
    await page.locator('[data-studio-field="idea"]').fill('An entirely different source idea');
    await page.getByRole('button', { name: strings.build, exact: true }).click();
    await expect(results.locator('pre')).toContainText(original);
    await results
      .getByLabel(strings.externalResults.notes, { exact: true })
      .fill('Watched: motion and framing approved.');
    const confirm = results.getByRole('button', {
      name: strings.externalResults.confirm,
      exact: true,
    });
    await expect(confirm).toBeEnabled();
    await confirm.focus();
    await expect(confirm).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(
      results.getByRole('button', { name: strings.externalResults.confirmed, exact: true }),
    ).toBeEnabled();
    const place = results.getByRole('button', {
      name: strings.externalResults.useTimeline,
      exact: true,
    });
    await expect(place).toBeEnabled();
    await place.focus();
    await expect(place).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(
      results.getByRole('button', { name: strings.externalResults.useTimeline, exact: true }),
    ).toBeEnabled();
    await page.reload();
    const reopened = page.getByRole('region', { name: strings.externalResults.title, exact: true });
    await expect(reopened.getByLabel(strings.externalResults.notes, { exact: true })).toHaveValue(
      'Watched: motion and framing approved.',
    );
    await expect(reopened.locator('video')).toHaveAttribute('src', /^blob:/);
    await reopened.locator('video').evaluate(async (element: HTMLVideoElement) => {
      element.muted = true;
      await element.play();
    });
    await expect
      .poll(() =>
        reopened.locator('video').evaluate((element: HTMLVideoElement) => element.currentTime),
      )
      .toBeGreaterThan(0);
    await reopened.locator('video').evaluate((element: HTMLVideoElement) => element.pause());
    await reopened.getByText(strings.externalResults.source, { exact: true }).click();
    await expect(reopened.locator('pre')).toContainText(original);
    await page.screenshot({
      path: testInfo.outputPath(`creator-flow-${language}.png`),
      fullPage: true,
    });
    await page.getByRole('button', { name: common.sidebar.timeline, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: common.timeline.title, exact: true, level: 1 }),
    ).toBeVisible();
    if (language === 'en') {
      const downloaded = page.waitForEvent('download');
      await page.getByRole('button', { name: createEn.actions.downloadOtio, exact: true }).click();
      const download = await downloaded;
      const path = await download.path();
      expect(path).not.toBeNull();
      const zip = await JSZip.loadAsync(await readFile(path!));
      expect(zip.file('timeline.otio')).not.toBeNull();
      expect(zip.file('manifest.json')).not.toBeNull();
      const provenance = await zip.file('provenance.json')!.async('string');
      expect(provenance).toContain(original);
      expect(Object.keys(zip.files).filter((name) => name.endsWith('.webm'))).toHaveLength(1);
    }
  });
}

test('rejects an unreadable video without saving a result', async ({ page }) => {
  await blockExternalRequests(page);
  await page.goto('/');
  await dismissModals(page);
  await page.getByLabel(/^Core idea/).fill('A quiet lake');
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  await page.getByLabel(en.externalResults.import, { exact: true }).setInputFiles({
    name: 'broken.webm',
    mimeType: 'video/webm',
    buffer: Buffer.from('invalid video'),
  });
  const results = page.getByRole('region', { name: en.externalResults.title, exact: true });
  await expect(results.getByRole('alert')).toBeVisible();
  await expect(results.locator('video')).toHaveCount(0);
  await expect(results.getByText(en.externalResults.empty, { exact: true })).toBeVisible();
});
