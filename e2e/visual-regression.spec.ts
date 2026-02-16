import { expect, test } from '@playwright/test';
import { dismissModals } from './helpers';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto('/');
    await dismissModals(page);

    // Reduce screenshot flake from transitions/caret blink and runtime toasts.
    await page.addStyleTag({
      content: `
        *,
        *::before,
        *::after {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
        }

        [class*="toast"],
        [role="alert"] {
          display: none !important;
        }
      `,
    });
  });

  test('prompt builder shell snapshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('prompt-builder-shell.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('prompt output panel empty snapshot', async ({ page }) => {
    const outputSection = page.locator('[data-tutorial-id="output-section"]');
    await expect(outputSection).toBeVisible();
    await expect(outputSection).toHaveScreenshot('prompt-output-empty.png', {
      animations: 'disabled',
    });
  });

  test('visual composer snapshot', async ({ page }) => {
    await page.getByRole('button', { name: 'Visual Composer' }).click();
    await expect(page.getByRole('heading', { name: 'Visual Composer' })).toBeVisible();
    await expect(page).toHaveScreenshot('visual-composer-shell.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('storyboard shell snapshot', async ({ page }) => {
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Reset All' }).click();
    await page.locator('button[title="Open Story Board"]').click();
    await expect(page.getByRole('button', { name: 'Close Storyboard' })).toBeVisible();
    await expect(page).toHaveScreenshot('storyboard-shell.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });
});
