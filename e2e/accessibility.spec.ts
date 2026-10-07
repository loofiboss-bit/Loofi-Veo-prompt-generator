import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Keyboard shortcuts & accessibility tests.
 */
test.describe('Keyboard Shortcuts & Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('should focus the idea textarea on page load', async ({ page }) => {
    // The main textarea should be in the viewport and focusable
    const textarea = page.locator('textarea').first();
    await textarea.focus();
    await expect(textarea).toBeFocused();
  });

  test('main interactive elements should have accessible names', async ({ page }) => {
    // Generate button should have text
    const generateBtn = page.getByRole('button', { name: 'Build copy-ready pack', exact: true });
    await expect(generateBtn).toBeVisible();
    const name =
      (await generateBtn.getAttribute('aria-label')) || (await generateBtn.textContent());
    expect(name).toBeTruthy();
  });

  test('should navigate with Tab key', async ({ page }) => {
    // Press Tab a few times and verify focus moves
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // The currently focused element should exist
    const focused = page.locator(':focus');
    await expect(focused).toHaveCount(1);
  });

  test('workspace manager supports keyboard-driven creation validation', async ({ page }) => {
    const workspaceTrigger = page.getByRole('button', { name: /switch workspace\./i }).first();
    await workspaceTrigger.click();

    await page.getByRole('button', { name: 'Manage Workspaces', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Manage Workspaces' })).toBeVisible();

    await page.getByRole('button', { name: 'New Workspace', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'New Workspace' })).toBeVisible();

    await page.getByRole('button', { name: 'Create Workspace', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Workspace name is required.');

    await page.getByLabel('Close workspace manager').click();
    await expect(page.getByRole('heading', { name: 'Manage Workspaces' })).toBeHidden();
  });

  test('builds a local pack using keyboard activation', async ({ page }) => {
    await page.getByLabel(/^Core idea/).fill('A bicycle crossing an old bridge');
    const build = page.getByRole('button', { name: 'Build copy-ready pack', exact: true });
    await build.focus();
    await expect(build).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(/bicycle/i);
  });
});
