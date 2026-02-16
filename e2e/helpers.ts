import { Page } from '@playwright/test';

/**
 * Shared helper — dismiss startup modals (wizard + welcome).
 */
async function dismissModals(page: Page) {
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
}

export { dismissModals };
