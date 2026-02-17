import { expect, test } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Composer onboarding walkthrough.
 * Verifies the guided tour can be started and completed.
 */
test.describe('Composer Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await dismissModals(page);
  });

  test('should run the full composer tutorial flow', async ({ page }) => {
    await page.getByRole('button', { name: 'Visual Composer' }).click();
    await expect(page.getByRole('heading', { name: 'Visual Composer' })).toBeVisible();

    const tourButton = page.locator('button[title="Start Composer Tour"]').first();
    await tourButton.scrollIntoViewIfNeeded();
    await tourButton.click();

    const tutorialTooltip = page.locator('.tutorial-tooltip');
    const stepCount = tutorialTooltip.locator('.tutorial-step-count');

    for (let step = 1; step <= 6; step += 1) {
      await expect(stepCount).toHaveText(`Step ${step} of 6`);

      if (step < 6) {
        const nextButton = tutorialTooltip.getByRole('button', { name: 'Next' });
        await nextButton.evaluate((button) => (button as HTMLButtonElement).click());
      } else {
        const finishButton = tutorialTooltip.getByRole('button', { name: 'Finish' });
        await finishButton.evaluate((button) => (button as HTMLButtonElement).click());
      }
    }

    await expect(tutorialTooltip).toBeHidden();
  });
});
