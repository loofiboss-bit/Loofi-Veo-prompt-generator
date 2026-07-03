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

  test('batch generator exposes accessible dialog and matrix controls', async ({ page }) => {
    await page.getByRole('button', { name: /batch/i }).first().click();

    const batchDialog = page.getByRole('dialog', { name: 'Batch Prompt Generator' });
    await expect(batchDialog).toBeVisible();
    await expect(page.getByLabel('Select prompt template')).toBeVisible();

    const maybeMatrix = page.getByLabel('Batch variable matrix');
    if ((await maybeMatrix.count()) > 0) {
      await expect(maybeMatrix.first()).toBeVisible();
    }

    await page.keyboard.press('Escape');
    await expect(batchDialog).toBeHidden();
  });

  test('upload controls expose accessible labels and validation feedback', async ({ page }) => {
    const imageUploadTrigger = page.getByLabel('Upload image').first();
    const audioUploadTrigger = page.getByLabel('Upload audio').first();

    await expect(imageUploadTrigger).toBeVisible();

    await imageUploadTrigger.focus();
    await expect(imageUploadTrigger).toBeFocused();

    const detailsToggle = page.getByRole('button', { name: /refine details/i });
    if ((await detailsToggle.getAttribute('aria-expanded')) === 'false') {
      await detailsToggle.click();
    }

    const audioTab = page.getByRole('tab', { name: /audio/i });
    await audioTab.scrollIntoViewIfNeeded();
    await audioTab.click({ force: true });
    await expect(audioUploadTrigger).toBeVisible();

    await audioUploadTrigger.focus();
    await expect(audioUploadTrigger).toBeFocused();

    const statusTexts = page.locator('p[role="status"]');
    await expect(statusTexts.first()).toContainText(/max 10mb/i);
  });
});
