import { test, expect } from '@playwright/test';
import { dismissModals, blockExternalRequests } from './helpers';

test.describe('Copy-ready creator workflow', () => {
  test('builds, edits and copies a local video prompt without provider traffic', async ({
    page,
    context,
  }) => {
    const requests = await blockExternalRequests(page);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await dismissModals(page);
    await page.getByLabel(/^Core idea/).fill('A cinematic coastal city at dusk');
    await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
    const output = page.getByLabel('Primary prompt', { exact: true });
    await expect(output).toHaveValue(/coastal city/i);
    await output.fill('Edited local prompt for a coastal city');
    await page.getByRole('button', { name: 'Copy prompt', exact: true }).first().click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe('Edited local prompt for a coastal city');
    expect(requests.filter((url) => /googleapis|suno|runway|kling/i.test(url))).toEqual([]);
  });

  for (const target of ['flow-veo', 'kling', 'runway-gen3', 'sora', 'luma-ray']) {
    test(`${target} remains manual with no internal generation action`, async ({ page }) => {
      await blockExternalRequests(page);
      await page.goto('/');
      await dismissModals(page);
      await page.getByLabel(/^Target(?: |$)/).selectOption(target);
      await page.getByLabel(/^Core idea/).fill('A red bicycle on a mountain road');
      await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
      await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(/bicycle/i);
      await expect(page.getByRole('button', { name: 'Generate in app', exact: true })).toHaveCount(
        0,
      );
      await expect(
        page.getByRole('button', { name: 'Copy handoff', exact: true }).first(),
      ).toBeVisible();
    });
  }
  test('Veo API exposes a separate approval-gated production handoff', async ({ page }) => {
    const requests = await blockExternalRequests(page);
    await page.goto('/');
    await dismissModals(page);
    await page.getByLabel(/^Target(?: |$)/).selectOption('veo-api');
    await page.getByLabel(/^Core idea/).fill('A lone cyclist by the ocean');
    await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Generate in app', exact: true })).toBeVisible();
    expect(requests.filter((url) => /googleapis/i.test(url))).toEqual([]);
  });
});
