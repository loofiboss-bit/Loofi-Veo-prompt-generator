import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify the app loads and core UI elements render.
 */
test.describe('App Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Dismiss NewProjectWizard
    try {
      const wizardHeading = page.locator('h1:has-text("What are you building")');
      await wizardHeading.waitFor({ state: 'visible', timeout: 5_000 });
      await page.locator('text=Start from Scratch').click();
      await wizardHeading.waitFor({ state: 'hidden', timeout: 5_000 });
    } catch {
      // Wizard didn't appear
    }

    // Dismiss WelcomeModal
    try {
      const skipBtn = page.locator('button:has-text("Skip for Now")');
      await skipBtn.waitFor({ state: 'visible', timeout: 3_000 });
      await skipBtn.click();
      await skipBtn.waitFor({ state: 'hidden', timeout: 3_000 });
    } catch {
      // Welcome modal didn't appear
    }

    await page.waitForSelector('textarea', { timeout: 10_000 });
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
      'textarea[placeholder*="idea"], textarea[placeholder*="describe"], textarea[placeholder*="prompt"], textarea',
    );
    await expect(textarea.first()).toBeVisible();
  });

  test('should render the Generate Prompt button', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await expect(generateBtn).toBeVisible();
  });
});
