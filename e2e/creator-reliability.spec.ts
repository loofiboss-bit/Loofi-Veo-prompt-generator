import { expect, test } from '@playwright/test';
import { creatorVideo } from './fixtures/creatorVideo';
import { blockExternalRequests, dismissModals } from './helpers';

test('welcome dismissal stays on Start and keeps radio choices compact', async ({ page }) => {
  const external = await blockExternalRequests(page);
  await page.goto('/#/start');
  const welcome = page.getByRole('dialog', { name: 'Start with one idea' });
  await expect(welcome).toBeVisible();
  const radio = welcome.getByRole('radio', { name: 'Use my own clips' });
  const bounds = await radio.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeLessThanOrEqual(32);
  await radio.check();
  await page.keyboard.press('Escape');
  await expect(welcome).toHaveCount(0);
  await expect(page).toHaveURL(/#\/start/);
  await page.getByRole('button', { name: 'Show welcome guide' }).click();
  await page
    .getByRole('dialog', { name: 'Start with one idea' })
    .getByRole('button', {
      name: 'Close modal',
    })
    .click();
  await expect(page).toHaveURL(/#\/start/);
  expect(external).toEqual([]);
});

test('local caption suggestions focus the affected text without changing it', async ({ page }) => {
  const external = await blockExternalRequests(page);
  await page.goto('/#/start');
  await dismissModals(page, { waitForPrompt: false });
  await page.goto('/#/start');
  await page.getByLabel('Choose local media', { exact: true }).setInputFiles({
    name: 'local.webm',
    mimeType: 'video/webm',
    buffer: creatorVideo,
  });
  await expect(page.locator('.local-editor-workspace')).toBeVisible();
  await page.getByRole('button', { name: 'Add caption', exact: true }).click();
  const text = page.getByLabel('Text', { exact: true }).first();
  const original = 'A deliberately long local caption for review without any automatic edits.';
  await text.fill(original);
  await expect(page.getByText('A line exceeds 42 characters')).toBeVisible();
  await page.getByRole('button', { name: 'Review caption 1', exact: true }).click();
  await expect(text).toBeFocused();
  await expect(text).toHaveValue(original);
  await page.getByRole('button', { name: 'Open delivery review', exact: true }).click();
  await expect(page.locator('#timeline-delivery-panel > summary')).toBeFocused();
  expect(external).toEqual([]);
});

test('renaming an active project survives duplication and reload', async ({ page }) => {
  await blockExternalRequests(page);
  await page.goto('/#/start');
  await dismissModals(page, { waitForPrompt: false });
  await page.goto('/#/start');
  await page.getByLabel('Choose local media', { exact: true }).setInputFiles({
    name: 'local.webm',
    mimeType: 'video/webm',
    buffer: creatorVideo,
  });
  await expect(page.locator('.local-editor-workspace')).toBeVisible();
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  const project = page.getByRole('button', { name: /My short video.*Current project/ });
  const row = project.locator('..');
  await row.getByRole('button', { name: 'Rename', exact: true }).click();
  await page.getByLabel('New project name').fill('Renamed local project');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  const renamed = page.getByRole('button', { name: /Renamed local project.*Current project/ });
  await expect(renamed).toBeVisible();
  await renamed.locator('..').getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect(page.getByRole('button', { name: /Renamed local project \(Copy\)/ })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: /Renamed local project.*Current project/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Renamed local project \(Copy\)/ })).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test(`Start remains usable across workspace widths and 200% zoom in ${theme}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await blockExternalRequests(page);
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/#/start');
    await dismissModals(page, { waitForPrompt: false });
    await page.goto('/#/start');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    for (const width of [320, 375, 414, 768, 865, 1024, 1280, 1536]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(page.getByRole('heading', { name: 'Your next creative moment' })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`start-${theme}-${width}.png`) });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    const main = page.getByRole('main');
    expect(await main.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(
      1,
    );
    await page.screenshot({ path: testInfo.outputPath(`start-${theme}-200-percent.png`) });
  });
}
