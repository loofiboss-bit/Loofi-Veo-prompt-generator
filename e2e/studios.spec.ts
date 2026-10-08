import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

test.describe('Studio modes', () => {
  test('switches video and music without losing independent ideas', async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    await page.getByLabel(/^Core idea/).fill('An old cinema at midnight');
    await page.getByRole('button', { name: 'Music & Lyrics', exact: true }).click();
    await page.getByLabel('Song idea / story', { exact: true }).fill('A song about the sea');
    await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
    await page.getByText('Copy options', { exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Copy lyrics', exact: true }).first(),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Video prompts', exact: true }).click();
    await expect(page.getByLabel(/^Core idea/)).toHaveValue('An old cinema at midnight');
    await page.getByRole('button', { name: 'Music & Lyrics', exact: true }).click();
    await expect(page.getByLabel('Song idea / story', { exact: true })).toHaveValue(
      'A song about the sea',
    );
  });
});
