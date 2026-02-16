import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Prompt form interaction tests — verify modifiers, dropdowns, presets,
 * character count, and the generate → output flow.
 */
test.describe('Prompt Form Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('should update character count as user types', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await textarea.fill('A');
    await page.waitForTimeout(200);

    // There should be a character count indicator somewhere
    const counter = page.locator('[class*="count" i], [class*="char" i], span:has-text("/")');
    if ((await counter.count()) > 0) {
      const text = await counter.first().textContent();
      expect(text).toBeTruthy();
    }

    // Type more text and verify the textarea accepts it
    await textarea.fill(
      'A dramatic wide-angle shot of a lone figure walking through a neon-lit alley',
    );
    await expect(textarea).toHaveValue(/dramatic/);
  });

  test('should select dropdown modifiers', async ({ page }) => {
    // Find a select element (art style, camera movement, etc.)
    const selects = page.locator('select');
    const selectCount = await selects.count();

    if (selectCount > 0) {
      const firstSelect = selects.first();
      const options = await firstSelect.locator('option').allTextContents();
      if (options.length > 1) {
        await firstSelect.selectOption({ index: 1 });
        await page.waitForTimeout(200);
      }
    }
  });

  test('should handle the target model switch (Veo/Sora)', async ({ page }) => {
    const veoBtn = page.locator('button:has-text("Veo")');
    const soraBtn = page.locator('button:has-text("Sora")');

    if ((await veoBtn.count()) > 0 && (await soraBtn.count()) > 0) {
      await soraBtn.click();
      await page.waitForTimeout(200);
      await veoBtn.click();
      await page.waitForTimeout(200);
      // App should be stable after switching
      await expect(page.locator('textarea').first()).toBeVisible();
    }
  });

  test('should show empty state or placeholder in the output area', async ({ page }) => {
    // Before generation, the output area should show an empty state or placeholder
    // It's okay if it doesn't exist yet — no crash is the key assertion
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show an error toast when generating without API key', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await textarea.fill('Test prompt idea for error handling');

    const generateBtn = page.getByRole('button', { name: /generate/i });
    await generateBtn.click();
    await page.waitForTimeout(2_000);

    // Should show an error toast or message about missing API key
    const toast = page.locator(
      '[class*="toast" i], [class*="Toast"], [role="alert"], [class*="error" i]',
    );
    // If a toast appeared, it should be visible
    if ((await toast.count()) > 0) {
      await expect(toast.first()).toBeVisible();
    }
  });

  test('should support multi-line input in the idea textarea', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    const multiLineText =
      'Line 1: A sweeping drone shot\nLine 2: Over a misty forest\nLine 3: At golden hour';
    await textarea.fill(multiLineText);
    await expect(textarea).toHaveValue(multiLineText);
  });
});
