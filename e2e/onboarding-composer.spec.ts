import { expect, test } from '@playwright/test';
import { blockExternalRequests } from './helpers';

test.describe('Local first-run onboarding', () => {
  test('offers the own-clips start path without provider setup', async ({ page }) => {
    await blockExternalRequests(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Start creating', exact: true })).toBeVisible();
    await page.getByRole('radio', { name: 'Use my own clips' }).check();
    await page.getByRole('button', { name: 'Start creating', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your next creative moment' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use my own clips', exact: true })).toBeEnabled();
    await expect(page.getByLabel('Choose local media', { exact: true })).toBeAttached();
    await expect(
      page.getByRole('button', { name: 'Open video prompts', exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole('button', { name: 'Open music and lyrics', exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel('API key', { exact: true })).toHaveCount(0);
  });
});
