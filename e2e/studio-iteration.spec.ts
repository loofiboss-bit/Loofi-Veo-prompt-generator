import { expect, test, type Page } from '@playwright/test';
import { blockExternalRequests, dismissModals } from './helpers';

async function build(page: Page, idea: string) {
  await page.getByLabel(/^Core idea/).fill(idea);
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(new RegExp(idea));
  await expect(
    page.getByRole('button', { name: 'Build copy-ready pack', exact: true }),
  ).toBeEnabled();
}

test.beforeEach(async ({ page }) => {
  await blockExternalRequests(page);
  await page.goto('/');
  await dismissModals(page);
});

for (const target of [
  'flow-veo',
  'veo-api',
  'kling',
  'runway-gen3',
  'sora',
  'luma-ray',
  'wan-video',
  'minimax-hailuo',
]) {
  test(`${target} persists through compilation and reopening`, async ({ page }) => {
    await page.getByLabel(/^Target(?: |$)/).selectOption(target);
    await build(page, 'A boat crosses a quiet lake');
    await page.reload();
    await expect(page.getByLabel(/^Target(?: |$)/)).toHaveValue(target);
    await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(/quiet lake/);
  });
}

test('restores manual variant edits after changing the brief and rebuilding', async ({ page }) => {
  await build(page, 'A lighthouse in rain');
  await page.getByRole('button', { name: 'Cinematic', exact: true }).click();
  await page.getByLabel('Cinematic prompt', { exact: true }).fill('My exact cinematic edit');
  await page.getByLabel(/^Core idea/).fill('A newer brief');
  await expect(page.getByLabel('Cinematic prompt', { exact: true })).toHaveValue(
    'My exact cinematic edit',
  );
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  await page.getByText('Versions and comparison', { exact: true }).click();
  const versions = page.getByRole('combobox', { name: 'Compare a saved version', exact: true });
  const id = await versions
    .locator('option')
    .filter({ hasText: /Before rebuild/ })
    .first()
    .getAttribute('value');
  expect(id).toBeTruthy();
  await versions.selectOption(id!);
  await page.getByRole('button', { name: 'Restore as new version', exact: true }).click();
  await expect(page.getByLabel('Cinematic prompt', { exact: true })).toHaveValue(
    'My exact cinematic edit',
  );
  await expect(page.getByLabel(/^Core idea/)).toHaveValue('A newer brief');
  await page.reload();
  await expect(page.getByLabel('Cinematic prompt', { exact: true })).toHaveValue(
    'My exact cinematic edit',
  );
});

test('reuses a complete video template in a new project', async ({ page }) => {
  await page.getByLabel(/^Target(?: |$)/).selectOption('wan-video');
  await page.getByLabel(/^Core idea/).fill('Reusable sunset scene');
  await page.getByLabel('Aspect ratio', { exact: true }).selectOption('9:16');
  await page.getByText('Studio template library', { exact: true }).first().click();
  await page.getByLabel('Template name', { exact: true }).fill('Sunset preset');
  await page.getByRole('button', { name: 'Save current inputs as template', exact: true }).click();
  await expect(page.getByText('Template saved.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Projects(?: \d+)?$/ }).click();
  await page.getByLabel('Project name', { exact: true }).fill('Template recipient');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(
    page.locator('aside').getByText('Template recipient', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Prompt Studio', exact: true }).click();
  await expect(page.getByLabel(/^Core idea/)).toHaveValue('');
  await page.getByText('Studio template library', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Sunset preset — Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Apply template', exact: true }).click();
  await expect(page.getByLabel(/^Core idea/)).toHaveValue('Reusable sunset scene');
  await expect(page.getByLabel(/^Target(?: |$)/)).toHaveValue('wan-video');
  await expect(page.getByLabel('Aspect ratio', { exact: true })).toHaveValue('9:16');
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveCount(0);
  await build(page, 'Reusable sunset scene');
});

test('Arena closes with Escape and restores keyboard focus in a small viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 480, height: 760 });
  await page.getByLabel(/^Core idea/).fill('A camera follows a runner');
  const trigger = page.getByRole('button', { name: 'Compare in Arena', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('region')).toHaveCount(8);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('reuses music input and locked original lyrics across projects', async ({ page }) => {
  await page.getByRole('button', { name: 'Music & Lyrics', exact: true }).click();
  await page.getByLabel('Song idea / story', { exact: true }).fill('Coming home');
  await page.getByText('Music details and original lyrics', { exact: true }).click();
  await page
    .getByLabel('Your lyrics (optional)', { exact: true })
    .fill('[Verse]\nMy verse\n\n[Chorus]\nMy exact hook');
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Build copy-ready pack', exact: true }),
  ).toBeEnabled();
  await page.getByText('Revise lyrics with AI', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Lock this section', exact: true }).check();
  await page.getByText('Studio template library', { exact: true }).first().click();
  await page.getByLabel('Template name', { exact: true }).fill('Home song');
  await page.getByRole('button', { name: 'Save current inputs as template', exact: true }).click();
  await expect(page.getByText('Template saved.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Projects(?: \d+)?$/ }).click();
  await page.getByLabel('Project name', { exact: true }).fill('Music recipient');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.locator('aside').getByText('Music recipient', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Prompt Studio', exact: true }).click();
  await page.getByRole('button', { name: 'Music & Lyrics', exact: true }).click();
  await page.getByText('Studio template library', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Home song — Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Apply template', exact: true }).click();
  await expect(page.getByLabel('Song idea / story', { exact: true })).toHaveValue('Coming home');
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  await expect(page.getByLabel('Primary lyrics', { exact: true })).toHaveValue(/My exact hook/);
  await page.getByText('Revise lyrics with AI', { exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Lock this section', exact: true }),
  ).toBeChecked();
});
