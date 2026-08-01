import { expect, test } from '@playwright/test';
import { dismissModals } from './helpers';

test.describe('Creator Studio overlays', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('workspace manager closes consistently with Escape and its close control', async ({
    page,
  }) => {
    const workspaceTrigger = page.getByRole('button', { name: /switch workspace\./i });
    await workspaceTrigger.click();
    await page.getByRole('button', { name: 'Manage Workspaces', exact: true }).click();
    const workspaceDialog = page.getByRole('dialog').filter({ hasText: 'Manage Workspaces' });
    await expect(workspaceDialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(workspaceDialog).toBeHidden();

    await workspaceTrigger.click();
    await page.getByRole('button', { name: 'Manage Workspaces', exact: true }).click();
    await page.getByLabel('Close workspace manager').click();
    await expect(workspaceDialog).toBeHidden();
  });

  test('diagnostics opens from Settings and closes with Escape', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await page.getByRole('button', { name: /open project diagnostics/i }).click();

    const diagnosticsDialog = page.getByRole('dialog').filter({ hasText: 'Project Diagnostics' });
    await expect(diagnosticsDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(diagnosticsDialog).toBeHidden();
  });
});
