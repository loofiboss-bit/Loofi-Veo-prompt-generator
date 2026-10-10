import { expect, test } from '@playwright/test';
import { creatorVideo } from './fixtures/creatorVideo';
import { blockExternalRequests, dismissModals } from './helpers';

async function startLocalEditor(page: import('@playwright/test').Page) {
  await page.goto('/#/start');
  await dismissModals(page, { waitForPrompt: false });
  await expect(
    page.getByRole('button', { name: 'Create from your own clips', exact: true }),
  ).toBeEnabled();
  await page.getByLabel('Choose local media', { exact: true }).setInputFiles({
    name: 'original.webm',
    mimeType: 'video/webm',
    buffer: creatorVideo,
  });
  await expect(page.locator('.local-editor-workspace')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add caption', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Add caption', exact: true }).click();
  await page.getByLabel('Text', { exact: true }).first().fill('Local original');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
}

test('own media editing, caption replacement, undo and durable restart work offline', async ({
  page,
}) => {
  const external = await blockExternalRequests(page);
  await startLocalEditor(page);
  await page.getByLabel('Format', { exact: true }).selectOption('1:1');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await page.getByLabel('SRT import mode', { exact: true }).selectOption('replace');
  await page.locator('input[accept=".srt"]').setInputFiles({
    name: 'captions.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from('1\n00:00:00,000 --> 00:00:01,000\nReplaced once\n'),
  });
  await expect(page.getByLabel('Text', { exact: true })).toHaveCount(1);
  await expect(page.getByLabel('Text', { exact: true })).toHaveValue('Replaced once');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Text', { exact: true })).toHaveValue('Local original');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await page.reload();
  await expect(page.locator('.local-editor-workspace')).toBeVisible();
  await expect(page.getByLabel('Text', { exact: true })).toHaveValue('Local original');
  await expect(page.getByLabel('Format', { exact: true })).toHaveValue('1:1');
  await expect(page.locator('.local-editor-source video')).toHaveAttribute('src', /^blob:/);
  expect(external).toEqual([]);
});

test('a stale window preserves its caption edit and offers explicit recovery', async ({
  page,
  context,
}) => {
  await startLocalEditor(page);
  const second = await context.newPage();
  await second.goto('/#/timeline');
  await expect(second.getByLabel('Text', { exact: true })).toHaveValue('Local original');
  await page.getByLabel('Text', { exact: true }).fill('First window saved');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await second.getByLabel('Text', { exact: true }).fill('Second window preserved');
  await expect(second.getByText('Conflicting changes', { exact: true })).toBeVisible();
  await expect(second.getByLabel('Text', { exact: true })).toHaveValue('Second window preserved');
  await expect(second.getByRole('button', { name: 'Load latest', exact: true })).toBeEnabled();
  await second.getByRole('button', { name: 'Save as copy', exact: true }).click();
  await expect(second.getByLabel('Text', { exact: true })).toHaveValue('Second window preserved');
  await expect(second.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await expect(page.getByLabel('Text', { exact: true })).toHaveValue('First window saved');
});

test('windows editing different projects never copy content or invalidate a clean project', async ({
  page,
  context,
}) => {
  await startLocalEditor(page);
  const second = await context.newPage();
  await startLocalEditor(second);
  await second.getByLabel('Text', { exact: true }).fill('Independent second project');
  await expect(second.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await expect(page.getByLabel('Text', { exact: true })).toHaveValue('Local original');
  await page.getByLabel('Text', { exact: true }).fill('Independent first project');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await expect(second.getByLabel('Text', { exact: true })).toHaveValue(
    'Independent second project',
  );
});

test('twenty imported clips remain durable through repeated reopening', async ({ page }) => {
  test.setTimeout(60_000);
  await startLocalEditor(page);
  await page.getByLabel('Choose local media', { exact: true }).setInputFiles(
    Array.from({ length: 19 }, (_, index) => ({
      name: `clip-${index}.webm`,
      mimeType: 'video/webm',
      buffer: creatorVideo,
    })),
  );
  const library = page.getByRole('complementary', { name: 'Media library', exact: true });
  await expect(library.locator('li')).toHaveCount(20);
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  for (let index = 0; index < 3; index += 1) {
    await page.reload();
    await expect(page.locator('.local-editor-workspace')).toBeVisible();
    await expect(library.locator('li')).toHaveCount(20);
    await expect(page.getByLabel('Text', { exact: true })).toHaveValue('Local original');
    await expect(page.locator('.local-editor-source video')).toHaveAttribute('src', /^blob:/);
  }
});

test('keyboard selection, splitting and undo work without deleting clips while typing', async ({
  page,
}) => {
  await startLocalEditor(page);
  const visualClips = page.getByRole('button', { name: /^original\.webm clip,/ });
  await visualClips.focus();
  await visualClips.press('Enter');
  const playhead = page.getByRole('slider', { name: 'Playhead', exact: true });
  await playhead.focus();
  await playhead.press('Home');
  await playhead.press('ArrowRight');
  const split = page.getByRole('button', { name: 'Split at playhead', exact: true });
  await expect(split).toBeEnabled();
  await split.focus();
  await split.press('Enter');
  await expect(visualClips).toHaveCount(2);
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await undo.focus();
  await undo.press('Enter');
  await expect(visualClips).toHaveCount(1);
  const text = page.getByLabel('Text', { exact: true });
  await text.focus();
  await text.press('End');
  await text.press('Backspace');
  await expect(visualClips).toHaveCount(1);
  await expect(text).toHaveValue('Local origina');
});

for (const language of ['sv', 'ar']) {
  test(`local editor remains usable at 800px in ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await startLocalEditor(page);
    await page.evaluate((value) => localStorage.setItem('veo-studio-language', value), language);
    await page.reload();
    await expect(page.locator('.local-editor-workspace')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('.local-editor-delivery textarea').first()).toHaveValue(
      'Local original',
    );
    await page.goto('/#/settings');
    await page
      .getByRole('button', { name: language === 'sv' ? 'Mörkt' : 'الوضع الداكن', exact: true })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.goto('/#/timeline');
    await expect(page.locator('.local-editor-workspace')).toBeVisible();
    await page.screenshot({ path: `/tmp/creator-v16-${language}-dark.png`, fullPage: true });
    await page.goto('/#/settings');
    await page
      .getByRole('button', { name: language === 'sv' ? 'Ljust' : 'الوضع الفاتح', exact: true })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.goto('/#/timeline');
    await expect(page.locator('.local-editor-workspace')).toBeVisible();
    await page.screenshot({ path: `/tmp/creator-v16-${language}-light.png`, fullPage: true });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 5,
      ),
    ).toBe(true);
  });
}
