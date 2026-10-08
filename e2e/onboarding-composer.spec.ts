import { expect, test } from '@playwright/test';
import { blockExternalRequests } from './helpers';

test.describe('Local first-run onboarding', () => {
  test('starts creating locally in one step with no provider setup', async ({ page }) => {
    await blockExternalRequests(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Start creating', exact: true })).toBeVisible();
    await page.getByRole('radio', { name: 'Use my own idea or media' }).check();
    await page.getByRole('button', { name: 'Start creating', exact: true }).click();
    await expect(page.getByLabel(/^Core idea/)).toBeVisible();
    await page.getByLabel(/^Core idea/).fill('A local sunrise scene');
    await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
    await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(/sunrise/i);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
