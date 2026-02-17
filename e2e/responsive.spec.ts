import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Responsive layout and shell stability tests.
 */
test.describe('Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('should render correctly at 1920x1080 (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    const generateBtn = page.getByRole('button', { name: /generate/i });
    await expect(generateBtn).toBeVisible();

    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('button', { name: 'Help', exact: true })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  });

  test('should render correctly at 1366x768 (laptop)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
  });

  test('should render correctly at 768x1024 (tablet)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
  });

  test('should not have horizontal overflow at narrow widths', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    // Allow a small tolerance for scroll gutters.
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

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
  });

  test('utility dock actions stay inside sidebar bounds', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(300);

    const sidebar = page.locator('aside').first();
    const settingsButton = sidebar.getByRole('button', { name: 'Settings', exact: true });
    const helpButton = sidebar.getByRole('button', { name: 'Help', exact: true });

    await expect(settingsButton).toBeVisible();
    await expect(helpButton).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    const settingsBox = await settingsButton.boundingBox();
    const helpBox = await helpButton.boundingBox();

    expect(sidebarBox).not.toBeNull();
    expect(settingsBox).not.toBeNull();
    expect(helpBox).not.toBeNull();

    const sidebarRight = (sidebarBox?.x ?? 0) + (sidebarBox?.width ?? 0);
    expect((settingsBox?.x ?? 0) + (settingsBox?.width ?? 0)).toBeLessThanOrEqual(sidebarRight);
    expect((helpBox?.x ?? 0) + (helpBox?.width ?? 0)).toBeLessThanOrEqual(sidebarRight);
  });
});
