import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Stability-focused scenarios intended to mimic real user stress patterns.
 */
test.describe('App Stability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('handles rapid textarea updates without crash', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    for (let i = 0; i < 30; i += 1) {
      await textarea.fill(`Rapid input iteration ${i} — cinematic urban scene at dusk`);
    }

    await expect(textarea).toHaveValue(/Rapid input iteration 29/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('tolerates heavy multi-line payloads in form field', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    const heavyPayload = Array.from({ length: 120 })
      .map(
        (_, i) => `Line ${i + 1}: A highly detailed cinematic sequence with layered motion cues.`,
      )
      .join('\n');

    await textarea.fill(heavyPayload);
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(1000);
  });

  test('remains responsive after repeated model toggles', async ({ page }) => {
    const flowBtn = page.locator('button:has-text("Flow")').first();
    const apiBtn = page.locator('button:has-text("Veo API")').first();

    if ((await flowBtn.count()) > 0 && (await apiBtn.count()) > 0) {
      for (let i = 0; i < 8; i += 1) {
        await apiBtn.click();
        await flowBtn.click();
      }
    }

    await expect(page.locator('textarea').first()).toBeVisible();
  });

  test('keeps app stable across navigation hops', async ({ page }) => {
    const navButtons = page.locator(
      'nav button, aside button, [class*="sidebar"] button, [class*="Sidebar"] button',
    );

    const count = await navButtons.count();
    if (count > 0) {
      const hops = Math.min(count, 8);
      for (let i = 0; i < hops; i += 1) {
        await navButtons.nth(i).click();
        await page.waitForTimeout(120);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('preserves core UI after generate attempt without API key', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await textarea.fill('Stability test generation attempt without configured API key.');

    const generateBtn = page.getByRole('button', { name: /generate/i }).first();
    if ((await generateBtn.count()) > 0) {
      await generateBtn.click();
      await page.waitForTimeout(1200);
    }

    await expect(textarea).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });
});
