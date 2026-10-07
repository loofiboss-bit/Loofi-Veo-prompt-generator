import { test, expect } from '@playwright/test';
import { dismissModals, blockExternalRequests } from './helpers';

test.describe('Local Prompt Studio form', () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalRequests(page);
    await page.goto('/');
    await dismissModals(page);
  });

  test('preserves multiline input', async ({ page }) => {
    const text = 'A sweeping drone shot\nOver a misty forest\nAt golden hour';
    await page.getByLabel(/^Core idea/).fill(text);
    await expect(page.getByLabel(/^Core idea/)).toHaveValue(text);
  });

  test('retains target, aspect ratio and length in local output', async ({ page }) => {
    await page.getByLabel(/^Core idea/).fill('A lighthouse in a storm');
    await page.getByLabel(/^Target(?: |$)/).selectOption('kling');
    await page.getByLabel('Aspect ratio', { exact: true }).selectOption('9:16');
    await page.getByLabel('Length', { exact: true }).selectOption('8');
    await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
    await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(/lighthouse/i);
    await expect(page.getByLabel(/^Target(?: |$)/)).toHaveValue('kling');
    await expect(page.getByLabel('Aspect ratio', { exact: true })).toHaveValue('9:16');
    await expect(page.getByRole('button', { name: 'Generate in app', exact: true })).toHaveCount(0);
  });

  test('shows a real copy desk after local compilation without credentials', async ({ page }) => {
    await expect(page.getByText('Your copy desk is empty', { exact: true })).toBeVisible();
    await page.getByLabel(/^Core idea/).fill('A quiet snowy village');
    await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
    await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(/snowy village/i);
    await expect(
      page.getByRole('button', { name: 'Copy prompt', exact: true }).first(),
    ).toBeVisible();
  });
});
