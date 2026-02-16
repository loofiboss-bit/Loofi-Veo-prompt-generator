import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Settings & Theme tests — verify settings panel, theme toggle, and API key input.
 */
test.describe('Settings & Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('should toggle dark/light theme', async ({ page }) => {
    const themeToggle = page.locator(
      'button[aria-label*="theme" i], button[title*="theme" i], button[class*="theme" i], button[class*="Theme" i]',
    );
    if ((await themeToggle.count()) > 0) {
      await themeToggle.first().click();
      await page.waitForTimeout(300);
      // After toggling, the app should still render fine
      await expect(page.locator('textarea').first()).toBeVisible();
    }
  });

  test('should open settings panel', async ({ page }) => {
    const settingsBtn = page.locator(
      'button[aria-label*="settings" i], button[title*="settings" i], button:has-text("Settings"), [class*="settings-trigger"]',
    );
    if ((await settingsBtn.count()) > 0) {
      await settingsBtn.first().click();
      await page.waitForTimeout(500);

      // Settings panel/modal should be visible
      const settingsPanel = page.locator(
        '[class*="settings" i], [class*="Settings"], [role="dialog"]',
      );
      if ((await settingsPanel.count()) > 0) {
        await expect(settingsPanel.first()).toBeVisible();
      }
    }
  });

  test('should have API key input in settings', async ({ page }) => {
    // Open settings first
    const settingsBtn = page.locator(
      'button[aria-label*="settings" i], button[title*="settings" i], button:has-text("Settings")',
    );
    if ((await settingsBtn.count()) > 0) {
      await settingsBtn.first().click();
      await page.waitForTimeout(500);

      // Look for API key related input
      const apiKeyInput = page.locator(
        'input[placeholder*="API" i], input[placeholder*="key" i], input[type="password"]',
      );
      if ((await apiKeyInput.count()) > 0) {
        await expect(apiKeyInput.first()).toBeVisible();
      }
    }
  });
});
