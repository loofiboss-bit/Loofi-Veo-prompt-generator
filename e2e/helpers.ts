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
  const hasSeenWelcome = await page.evaluate(
    () => localStorage.getItem('hasSeenWelcome') === 'true',
  );
  if (!hasSeenWelcome) {
    const start = page.getByRole('button', { name: 'Start creating', exact: true });
    await start.waitFor({ state: 'visible', timeout: 15_000 });
    await start.click();
    await start.waitFor({ state: 'hidden' });
  }
  await clickFirstVisible(page, page.getByRole('button', { name: /skip tour/i }));
  if (waitForPrompt) {
    await page.getByLabel(/^Core idea/).waitFor({ state: 'visible', timeout: 15_000 });
  }
}

export { dismissModals };

/** Block every external request while exercising local creation paths. */
async function blockExternalRequests(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    requests.push(route.request().url());
    return route.abort();
  });
  return requests;
}

export { blockExternalRequests };
