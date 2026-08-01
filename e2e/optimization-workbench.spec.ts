import { expect, test } from '@playwright/test';
import { dismissModals } from './helpers';

test.describe('Legacy route compatibility', () => {
  test('redirects Optimize into Create without losing the local brief', async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    const idea = page.getByLabel('Production idea');
    await idea.fill('A video');

    await page.goto('/#/optimize');
    await expect(page).toHaveURL(/#\/create$/);
    await expect(page.getByRole('heading', { name: 'Create', exact: true })).toBeVisible();
    await expect(page.getByLabel('Production idea')).toHaveValue('A video');
  });
});
