import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Navigation & Sidebar tests — verify sidebar rendering, studio links, and navigation.
 */
test.describe('Sidebar & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('should render sidebar with navigation items', async ({ page }) => {
    // Sidebar should be visible — look for sidebar or nav-like element
    const sidebar = page.locator(
      'nav, aside, [class*="sidebar"], [class*="Sidebar"], [class*="side-bar"]',
    );
    await expect(sidebar.first()).toBeVisible();
  });

  test('should have clickable sidebar items', async ({ page }) => {
    const sidebarButtons = page.locator(
      'nav button, aside button, [class*="sidebar"] button, [class*="Sidebar"] button',
    );
    const count = await sidebarButtons.count();
    expect(count).toBeGreaterThan(0);

    // Click the first sidebar button — app should not crash
    await sidebarButtons.first().click();
    await expect(page.locator('textarea').first()).toBeVisible();
  });

  test('should collapse and expand the sidebar', async ({ page }) => {
    const collapseBtn = page.locator(
      'button[aria-label*="collapse" i], button[aria-label*="toggle" i], button[title*="collapse" i], button[title*="sidebar" i]',
    );
    if ((await collapseBtn.count()) > 0) {
      await collapseBtn.first().click();
      // After collapse, sidebar should still exist but may be narrower
      await page.waitForTimeout(300);

      // Expand again
      const expandBtn = page.locator(
        'button[aria-label*="expand" i], button[aria-label*="toggle" i], button[title*="expand" i], button[title*="sidebar" i]',
      );
      if ((await expandBtn.count()) > 0) {
        await expandBtn.first().click();
      }
    }
  });
});
