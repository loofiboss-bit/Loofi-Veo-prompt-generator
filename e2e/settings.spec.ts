import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

test.describe('Settings and themes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('toggles both themes while preserving the local workflow', async ({ page }) => {
    for (const mode of ['light', 'dark']) {
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page
        .getByRole('button', { name: mode === 'light' ? 'Light' : 'Dark', exact: true })
        .click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      await page.getByRole('button', { name: 'Prompt Studio', exact: true }).click();
      await page.getByLabel(/^Core idea/).fill(`A ${mode} theme local scene`);
      await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
      await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(
        new RegExp(`${mode} theme`),
      );
    }
  });

  test('opens settings through the actual navigation', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Theme', exact: true })).toBeVisible();
  });
});
