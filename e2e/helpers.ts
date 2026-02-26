import { Page } from '@playwright/test';

/**
 * Shared helper — dismiss startup modals (wizard + welcome).
 */
async function dismissModals(page: Page) {
  const buttonPatterns = [
    /start from scratch/i,
    /skip for now/i,
    /skip tour/i,
    /skip/i,
    /close/i,
    /got it/i,
  ];

  for (let pass = 0; pass < 2; pass += 1) {
    for (const pattern of buttonPatterns) {
      const button = page.getByRole('button', { name: pattern }).first();
      const isVisible = await button.isVisible().catch(() => false);
      if (isVisible) {
        await button.click({ timeout: 3_000 });
        await page.waitForTimeout(150);
      }
    }

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(150);
  }

  await page
    .locator(
      'textarea[name="idea"]:visible, textarea[placeholder*="Describe your video idea"]:visible, textarea:visible',
    )
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
}

export { dismissModals };
