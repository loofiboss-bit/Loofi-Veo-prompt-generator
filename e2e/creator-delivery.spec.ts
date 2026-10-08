import { expect, test } from '@playwright/test';
import { blockExternalRequests, dismissModals } from './helpers';

for (const theme of ['light', 'dark'] as const) {
  for (const width of [1280, 800]) {
    test(`offline Start and captions are keyboard accessible in ${theme} at ${width}px`, async ({
      page,
    }, testInfo) => {
      const external = await blockExternalRequests(page);
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/#/start', { waitUntil: 'domcontentloaded' });
      await dismissModals(page, { waitForPrompt: false });
      await expect(page.getByRole('heading', { name: 'Your next creative moment' })).toBeVisible();
      const start = page.locator('.creator-start');
      const contrast = await start.evaluate((element) => {
        const luminance = (value: string) => {
          const values = value
            .match(/\d+(?:\.\d+)?/g)!
            .slice(0, 3)
            .map((item) => Number(item) / 255)
            .map((item) => (item <= 0.04045 ? item / 12.92 : ((item + 0.055) / 1.055) ** 2.4));
          return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
        };
        let ancestor: Element | null = element;
        while (ancestor && getComputedStyle(ancestor).backgroundColor === 'rgba(0, 0, 0, 0)')
          ancestor = ancestor.parentElement;
        const background = luminance(getComputedStyle(ancestor || document.body).backgroundColor);
        return [...element.querySelectorAll('h1, .creator-eyebrow, header p')].map((node) => {
          const foreground = luminance(getComputedStyle(node).color);
          return (
            (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05)
          );
        });
      });
      expect(Math.min(...contrast)).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({ path: testInfo.outputPath(`creator-start-${theme}-${width}.png`) });
      const example = page.getByRole('button', { name: 'Open example', exact: true }).first();
      await example.focus();
      await expect(example).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: 'Export video', exact: true })).toBeVisible({
        timeout: 30000,
      });
      await expect(page.getByRole('button', { name: 'Export video', exact: true })).toBeDisabled();
      const text = page.getByLabel('Text', { exact: true }).first();
      await text.fill('Hej världen — reviewed locally');
      await page.getByLabel('Output', { exact: true }).selectOption('burn-in');
      await expect(text).toHaveValue('Hej världen — reviewed locally');
      await expect(page.getByLabel('Style', { exact: true })).toBeVisible();
      const size = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: document.documentElement.clientWidth,
      }));
      expect(size.scroll).toBeLessThanOrEqual(size.width + 5);
      expect(external).toEqual([]);
    });
  }
}
