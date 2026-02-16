import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Responsive layout & visual stability tests.
 */
test.describe('Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('should render correctly at 1920×1080 (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    const generateBtn = page.getByRole('button', { name: /generate/i });
    await expect(generateBtn).toBeVisible();
  });

  test('should render correctly at 1366×768 (laptop)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
  });

  test('should render correctly at 768×1024 (tablet)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // At tablet size, at least the main content should still be visible
    await expect(page.locator('body')).toBeVisible();
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
  });

  test('should not have horizontal overflow at narrow widths', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    // Allow a small tolerance (5px) for scroll gutters
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('should survive rapid viewport resizing without crashing', async ({ page }) => {
    const sizes = [
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(200);
    }

    // After all resizes, the app should still be functional
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
  });
});
