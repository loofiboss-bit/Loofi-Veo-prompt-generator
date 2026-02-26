import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Smoke tests — verify the app loads and core UI elements render.
 */
test.describe('App Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('should load the homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Veo|Loofi|Prompt/i);
  });

  test('should render the main layout', async ({ page }) => {
    // Header or top-level branding should be visible
    const header = page.locator('header, [class*="header"], [class*="Header"]');
    await expect(header.first()).toBeVisible();
  });

  test('should render the idea textarea', async ({ page }) => {
    const textarea = page.locator(
      'textarea[placeholder*="idea"]:visible, textarea[placeholder*="describe"]:visible, textarea[placeholder*="prompt"]:visible, textarea:visible',
    );
    await expect(textarea.first()).toBeVisible();
  });

  test('should render the Generate Prompt button', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await expect(generateBtn).toBeVisible();
  });
});
