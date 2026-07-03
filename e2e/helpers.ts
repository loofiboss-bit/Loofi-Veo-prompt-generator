import type { Locator, Page } from '@playwright/test';

async function clickFirstVisible(page: Page, locator: Locator): Promise<boolean> {
  const count = Math.min(await locator.count().catch(() => 0), 8);

  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    const isVisible = await candidate.isVisible().catch(() => false);
    if (!isVisible) continue;

    const clicked = await candidate
      .click({ timeout: 1_200 })
      .then(() => true)
      .catch(async () =>
        candidate
          .evaluate((element) => {
            if (element instanceof HTMLElement) {
              element.click();
              return true;
            }

            return false;
          })
          .catch(() => false),
      );

    if (clicked) {
      await page.waitForTimeout(150);
      return true;
    }
  }

  return false;
}

/**
 * Shared helper — dismiss startup modals (wizard + welcome).
 */
async function dismissModals(page: Page, options: { waitForPrompt?: boolean } = {}) {
  const { waitForPrompt = true } = options;
  const dismissalLocators = [
    page.getByRole('button', { name: /start from scratch/i }),
    page.getByRole('button', { name: /skip for now/i }),
    page.getByRole('button', { name: /skip tour/i }),
    page.getByRole('button', { name: /^skip$/i }),
    page.getByRole('button', { name: /got it/i }),
    page.locator('[role="dialog"]:visible button[aria-label*="close" i]:visible'),
    page.locator('button[aria-label="Close modal"]:visible'),
    page.locator('button[aria-label="Close dialog"]:visible'),
  ];

  for (let pass = 0; pass < 4; pass += 1) {
    for (const locator of dismissalLocators) {
      await clickFirstVisible(page, locator);
    }

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(150);
  }

  if (waitForPrompt) {
    await page
      .locator(
        'textarea[name="idea"]:visible, textarea[placeholder*="Describe your video idea"]:visible, textarea:visible',
      )
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  }
}

export { dismissModals };
