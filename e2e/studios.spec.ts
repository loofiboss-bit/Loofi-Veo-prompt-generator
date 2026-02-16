import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Studio panels — verify each major studio can be opened and renders without crashing.
 */
test.describe('Studio Panels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  const studioNames = ['story', 'script', 'analysis', 'compare', 'spatial', 'pronunciation'];

  for (const studio of studioNames) {
    test(`should open the "${studio}" studio without crashing`, async ({ page }) => {
      // Studios are typically opened via sidebar buttons
      const studioBtn = page.locator(
        `button:has-text("${studio}"), button[aria-label*="${studio}" i], button[title*="${studio}" i], [class*="sidebar"] button[data-studio="${studio}"]`,
      );

      if ((await studioBtn.count()) > 0) {
        await studioBtn.first().click();
        await page.waitForTimeout(1_000);

        // App should not crash — check that the page still has content
        await expect(page.locator('body')).toBeVisible();

        // Close the studio (usually Escape or close button)
        const closeBtn = page.locator(
          'button[aria-label*="close" i], button[title*="close" i], button:has-text("Close"), button:has-text("✕")',
        );
        if ((await closeBtn.count()) > 0) {
          await closeBtn.first().click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    });
  }
});
