import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

test.describe('Optimization Workbench', () => {
  test('creates offline suggestions, applies one, exports Creative Pack, and preserves state', async ({
    page,
  }) => {
    await page.goto('/');
    await dismissModals(page);

    const idea = page.locator('textarea[name="idea"]:visible, textarea:visible').first();
    await idea.fill('A video');
    await expect(idea).toHaveValue('A video');

    await page.goto('/#/optimize');
    await expect(page.getByRole('heading', { name: /optimization workbench/i })).toBeVisible();

    await page.getByRole('button', { name: /analyze now/i }).click();
    await expect(page.getByRole('button', { name: /^apply$/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await page
      .getByRole('button', { name: /^apply$/i })
      .first()
      .click();

    const creativePackPreview = page.getByLabel('Creative Pack export preview');
    await expect(creativePackPreview).toContainText('Flow/Veo Scene Pack');
    await expect(creativePackPreview).toContainText('Suno Production Brief');

    await page.evaluate(() => {
      window.location.hash = '/';
    });
    await dismissModals(page);
    await expect(
      page.locator('textarea[name="idea"]:visible, textarea:visible').first(),
    ).toHaveValue(/A video/);
  });
});
