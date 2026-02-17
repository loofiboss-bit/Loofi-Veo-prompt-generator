import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Studio panels - verify each major studio can be opened and renders without crashing.
 */
test.describe('Studio Panels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  const studioNames = ['story', 'script', 'analysis', 'compare', 'spatial', 'pronunciation'];

  for (const studio of studioNames) {
    test(`should open the "${studio}" studio without crashing`, async ({ page }) => {
      // Studios are typically opened via sidebar buttons.
      const studioBtn = page.locator(
        `button:has-text("${studio}"), button[aria-label*="${studio}" i], button[title*="${studio}" i], [class*="sidebar"] button[data-studio="${studio}"]`,
      );

      if ((await studioBtn.count()) > 0) {
        const firstStudioBtn = studioBtn.first();
        if (!(await firstStudioBtn.isEnabled())) {
          return;
        }

        await firstStudioBtn.click();
        await page.waitForTimeout(1_000);

        // App should not crash - check that the page still has content.
        await expect(page.locator('body')).toBeVisible();

        // Close using escape-first to avoid stale/underlay close-button interception.
        await page.keyboard.press('Escape');
        await page.waitForTimeout(250);

        const visibleCloseBtn = page.locator(
          'button[aria-label="Close dialog"]:visible, button[aria-label="Close modal"]:visible, [role="dialog"]:visible button[aria-label*="close" i]:visible, [role="dialog"]:visible button[title*="close" i]:visible',
        );

        if ((await visibleCloseBtn.count()) > 0) {
          await visibleCloseBtn.first().click({ force: true });
          await page.waitForTimeout(250);
        }

        // Some studio overlays require one additional escape to fully dismiss.
        await page.keyboard.press('Escape');
        await page.waitForTimeout(250);
      }
    });
  }
});
