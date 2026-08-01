import { expect, test } from '@playwright/test';
import { dismissModals } from './helpers';

test.describe('Create workflow orientation', () => {
  test('moves through the canonical workflow and focuses each step heading', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await dismissModals(page);

    await expect(page.locator('#brief-step-title')).toBeVisible();

    const steps = ['Scenes', 'Assets', 'Generate', 'Review', 'Export'];
    for (const step of steps) {
      await page.getByRole('button', { name: step, exact: true }).last().click();
      const heading = page.locator(`#${step.toLowerCase()}-step-title`);
      await expect(heading).toBeVisible();
      await expect(heading).toBeFocused();
    }
  });
});
