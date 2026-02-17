import { expect, test } from '@playwright/test';
import { dismissModals } from './helpers';

test.describe('Modal Stack', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('history dialog closes consistently with Escape and backdrop', async ({ page }) => {
    const sidebar = page.locator('aside').first();
    await sidebar.getByRole('button', { name: 'History', exact: true }).click();
    const historyDialog = page.getByRole('dialog').filter({ hasText: 'History' });
    await expect(historyDialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(historyDialog).toBeHidden();

    await sidebar.getByRole('button', { name: 'History', exact: true }).click();
    await expect(historyDialog).toBeVisible();

    await page
      .locator('[aria-label="Close dialog"]')
      .first()
      .click({ position: { x: 5, y: 5 } });
    await expect(historyDialog).toBeHidden();
  });

  test('help and diagnostics dialogs keep predictable z-order', async ({ page }) => {
    const sidebar = page.locator('aside').first();
    await sidebar.getByRole('button', { name: 'Help', exact: true }).click();
    const helpDialog = page.getByRole('dialog').filter({ hasText: 'Help Center' });
    await expect(helpDialog).toBeVisible();

    const helpZIndex = await helpDialog.evaluate((element) => {
      return Number.parseInt(getComputedStyle(element).zIndex || '0', 10) || 0;
    });

    await page.keyboard.press('Escape');
    await expect(helpDialog).toBeHidden();

    await sidebar.getByRole('button', { name: 'Diagnostics', exact: true }).click();
    const diagnosticsDialog = page.getByRole('dialog').filter({ hasText: 'Project Diagnostics' });
    await expect(diagnosticsDialog).toBeVisible();

    const diagnosticsZIndex = await diagnosticsDialog.evaluate((element) => {
      return Number.parseInt(getComputedStyle(element).zIndex || '0', 10) || 0;
    });

    expect(diagnosticsZIndex).toBeGreaterThanOrEqual(helpZIndex);
  });
});
