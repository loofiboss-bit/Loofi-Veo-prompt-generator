import { expect, test } from '@playwright/test';
import { dismissModals } from './helpers';

test.describe('Studio draft persistence', () => {
  test('preserves draft through real navigation and reload', async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    const text = 'A courier beneath a green aurora';
    await page.getByLabel(/^Core idea/).fill(text);
    await page.getByLabel(/^Target(?: |$)/).selectOption('sora');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Prompt Studio', exact: true }).click();
    await expect(page.getByLabel(/^Core idea/)).toHaveValue(text);
    await expect(page.getByLabel(/^Target(?: |$)/)).toHaveValue('sora');
    await page.reload();
    await expect(page.getByLabel(/^Core idea/)).toHaveValue(text);
    await expect(page.getByLabel(/^Target(?: |$)/)).toHaveValue('sora');
  });
});

test('keeps drafts and generated packs isolated between projects', async ({ page }) => {
  await page.goto('/');
  await dismissModals(page);
  await page.getByRole('button', { name: /^Projects(?: \d+)?$/ }).click();
  await page.getByLabel('Project name', { exact: true }).fill('First draft project');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(
    page.locator('aside').getByText('First draft project', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Prompt Studio', exact: true }).click();
  await page.getByLabel(/^Core idea/).fill('A blue boat on the lake');
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(/blue boat/i);
  await page.getByRole('button', { name: /^Projects(?: \d+)?$/ }).click();
  await page.getByLabel('Project name', { exact: true }).fill('Second draft project');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(
    page.locator('aside').getByText('Second draft project', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Prompt Studio', exact: true }).click();
  await expect(page.getByLabel(/^Core idea/)).toHaveValue('');
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveCount(0);
  await page.getByLabel(/^Core idea/).fill('A red balloon above a hill');
  await page.getByRole('button', { name: /^Projects(?: \d+)?$/ }).click();
  await page.getByRole('button', { name: /First draft project/ }).click();
  await expect(
    page.locator('aside').getByText('First draft project', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Prompt Studio', exact: true }).click();
  await expect(page.getByLabel(/^Core idea/)).toHaveValue('A blue boat on the lake');
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(/blue boat/i);
  await page.reload();
  await expect(page.getByLabel(/^Core idea/)).toHaveValue('A blue boat on the lake');
});
