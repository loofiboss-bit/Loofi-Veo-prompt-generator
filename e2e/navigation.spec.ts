import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

test.describe('Creator navigation', () => {
  test('navigates between core workspaces', async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    for (const name of ['Projects', 'Settings', 'Prompt Studio']) {
      await page
        .getByRole('button', {
          name: name === 'Projects' ? /^Projects(?: \d+)?$/ : name,
          exact: true,
        })
        .click();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByLabel(/^Core idea/)).toBeVisible();
  });
});
