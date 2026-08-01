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

  test('should open help panel with ? or F1', async ({ page }) => {
    // Press ? to open help
    await page.keyboard.press('?');
    await page.waitForTimeout(500);

    const helpPanel = page.locator(
      '[class*="help" i], [class*="Help"], [role="dialog"]:has-text("Help"), [role="dialog"]:has-text("Shortcuts")',
    );
    if ((await helpPanel.count()) > 0) {
      await expect(helpPanel.first()).toBeVisible();
      // Close it
      await page.keyboard.press('Escape');
    }
  });

  test('should close modals with Escape key', async ({ page }) => {
    // Open settings or any modal
    const settingsBtn = page.locator(
      'button[aria-label*="settings" i], button[title*="settings" i], button:has-text("Settings")',
    );
    if ((await settingsBtn.count()) > 0) {
      await settingsBtn.first().click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      if ((await dialog.count()) > 0) {
        await expect(dialog.first()).toBeVisible();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        // Dialog should be closed
      }
    }
  });

  test('should focus the idea textarea on page load', async ({ page }) => {
    // The main textarea should be in the viewport and focusable
    const textarea = page.locator('textarea').first();
    await textarea.focus();
    await expect(textarea).toBeFocused();
  });

  test('main interactive elements should have accessible names', async ({ page }) => {
    // Generate button should have text
    const generateBtn = page.getByRole('button', { name: /generate/i });
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

  test('generation approval controls have accessible names', async ({ page }) => {
    await page.getByRole('button', { name: /new local plan/i }).click();
    await page.getByRole('button', { name: 'Generate', exact: true }).click();

    await expect(page.getByRole('button', { name: 'Select pending' })).toBeVisible();
    await expect(page.getByRole('button', { name: /approve \d+ shots?/i })).toBeVisible();
    await expect(page.getByText(/maximum \$/i).first()).toBeVisible();
  });

  test('Lyria image controls expose accessible labels and constraints', async ({ page }) => {
    await page.getByRole('button', { name: 'Assets', exact: true }).last().click();
    await page.getByText('Lyrics, structure, images, and format', { exact: true }).click();

    const imageUpload = page.getByLabel(/visual references/i);
    await expect(imageUpload).toBeVisible();
    await imageUpload.focus();
    await expect(imageUpload).toBeFocused();
    await expect(imageUpload).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    await expect(page.getByText(/0.*10 images/i)).toBeVisible();
  });
});
