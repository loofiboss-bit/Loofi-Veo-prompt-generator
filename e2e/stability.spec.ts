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

  test('remains responsive after repeated target changes', async ({ page }) => {
    for (let index = 0; index < 8; index += 1) {
      await page.getByLabel(/^Target(?: |$)/).selectOption('kling');
      await page.getByLabel(/^Target(?: |$)/).selectOption('flow-veo');
    }
    await expect(page.getByLabel(/^Target(?: |$)/)).toHaveValue('flow-veo');
  });

  test('builds repeated packs without credentials', async ({ page }) => {
    for (let index = 0; index < 3; index += 1) {
      await page.getByLabel(/^Core idea/).fill(`A local lake scene number ${index}`);
      await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
      await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(
        new RegExp(`number ${index}`),
      );
    }
  });
});
