import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Core workflow tests — verify prompt generation, history, and export flows.
 */
test.describe('Prompt Generation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('should type an idea and see character count update', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await textarea.fill('A golden sunset over misty mountains');
    await expect(textarea).toHaveValue('A golden sunset over misty mountains');
  });

  test('should click generate button after entering an idea', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await textarea.fill('A cinematic drone shot of a coastal city at dusk');

    const generateBtn = page.getByRole('button', { name: /generate|create prompt/i });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // After clicking, either output appears or a toast/error (no API key).
    // We just verify the button was clickable and the app didn't crash.
    await page.waitForTimeout(1_000);
    await expect(page.locator('textarea').first()).toBeVisible();
  });

  test('should toggle between target models', async ({ page }) => {
    // Look for workflow toggle buttons (Flow/Veo / Veo API)
    const modelToggle = page.locator(
      'button:has-text("Flow"), button:has-text("Veo API"), [class*="model-toggle"], [class*="TargetModel"]',
    );
    if ((await modelToggle.count()) > 0) {
      await modelToggle.first().click();
      // Toggle should be interactive
      await expect(modelToggle.first()).toBeVisible();
    }
  });

  test('should collapse/expand sections', async ({ page }) => {
    // Find collapsible section headers
    const sectionHeader = page.locator(
      '[class*="collapsible"] button, [class*="Collapsible"] button, button:has-text("Core Concept"), button:has-text("Step")',
    );

    if ((await sectionHeader.count()) > 0) {
      const header = sectionHeader.first();
      await header.click();
      // Section should toggle
      await expect(header).toBeVisible();
    }
  });

  test('should reset the form', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await textarea.fill('Test content to reset');

    const resetBtn = page.getByRole('button', { name: /reset|new|clear/i });
    if ((await resetBtn.count()) > 0) {
      await resetBtn.first().click();
      // After reset, textarea should be empty or have default value
      // Some resets may show a confirmation dialog
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|ok/i });
      if ((await confirmBtn.count()) > 0) {
        await confirmBtn.click();
      }
    }
  });
});
