import { expect, test, type Page } from '@playwright/test';
import { blockExternalRequests, dismissModals } from './helpers';
import { creatorVideo } from './fixtures/creatorVideo';

async function buildVideo(page: Page, idea: string) {
  await page.getByLabel(/^Core idea/).fill(idea);
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).not.toHaveValue('');
  await expect(
    page.getByRole('button', { name: 'Build copy-ready pack', exact: true }),
  ).toBeEnabled();
}

test.beforeEach(async ({ page }) => {
  await blockExternalRequests(page);
  await page.goto('/');
  await dismissModals(page);
});

test('Studio and Arena share local cinematic guidance without blocking copy', async ({ page }) => {
  await page.getByText('Scene details', { exact: true }).click();
  await page.getByLabel('Camera', { exact: true }).fill('Static tripod with a whip pan');
  await buildVideo(page, 'A courier on a quiet street');
  const guidance =
    'This shot combines a locked camera with rapid camera movement. Choose one direction or describe separate shots.';
  await expect(page.getByText(guidance, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy prompt', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Compare in Arena', exact: true }).click();
  const arena = page.getByRole('dialog');
  await expect(arena.getByText(guidance, { exact: true })).toHaveCount(8);
  await expect(arena.getByRole('button', { name: 'Copy prompt package' }).first()).toBeEnabled();
  await arena.getByRole('button', { name: 'Open control: Camera direction' }).click();
  await expect(arena).not.toBeVisible();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toBeFocused();
});

test('a mocked local AI edits the selected manual variant with field-level acceptance and durable reload', async ({
  page,
}) => {
  await page.unroute('**/*');
  await page.context().unroute('**/*');
  await page.context().route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
  let requested = '';
  await page.context().route('**/chat/completions', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      });
      return;
    }
    requested = route.request().postData() ?? '';
    await route.fulfill({
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                prompt: 'A slow dolly follows the courier. "Welcome home".',
                negativePrompt: 'unwanted rain',
              }),
            },
          },
        ],
      }),
    });
  });
  await page.evaluate(async () => {
    const path = '/src/core/store/useSettingsStore.ts';
    const { useSettingsStore } = await import(path);
    useSettingsStore.setState({
      promptGenerationProvider: 'ollama',
      localLlmEndpoint: 'http://localhost:8080/api/ollama',
      localLlmModel: 'fixture-model',
    });
  });
  await buildVideo(page, 'A courier walks home');
  const primary = await page.getByLabel('Primary prompt', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Cinematic', exact: true }).click();
  await page
    .getByLabel('Cinematic prompt', { exact: true })
    .fill('My deliberate edit. "Welcome home".');
  const negative = await page
    .getByRole('article')
    .getByLabel('Negative prompt', { exact: true })
    .inputValue();
  await page.getByText('Improve selected variant', { exact: true }).click();
  await page.getByLabel('Fields to improve', { exact: true }).selectOption('both');
  await page.getByRole('button', { name: 'Propose selected variant changes', exact: true }).click();
  const proposal = page.getByRole('region', { name: 'Review selected variant changes' });
  await expect(proposal).toBeVisible();
  expect(requested).toContain('My deliberate edit.');
  await expect(page.getByLabel('Cinematic prompt', { exact: true })).toHaveValue(
    'My deliberate edit. "Welcome home".',
  );
  await proposal.getByRole('checkbox', { name: 'Accept Negative prompt', exact: true }).uncheck();
  await proposal.getByRole('button', { name: 'Accept selected fields', exact: true }).click();
  await expect(page.getByLabel('Cinematic prompt', { exact: true })).toHaveValue(
    'A slow dolly follows the courier. "Welcome home".',
  );
  await expect(
    page.getByRole('article').getByLabel('Negative prompt', { exact: true }),
  ).toHaveValue(negative);
  await page.reload();
  await expect(page.getByLabel('Cinematic prompt', { exact: true })).toHaveValue(
    'A slow dolly follows the courier. "Welcome home".',
  );
  await page.getByRole('button', { name: 'Primary', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(primary);
});

test('external videos compare frozen sources, save independent notes and play together locally', async ({
  page,
}) => {
  await buildVideo(page, 'First frozen source: a blue boat');
  const importResult = page.getByLabel('Import result for this variant', { exact: true });
  await importResult.setInputFiles({
    name: 'first.webm',
    mimeType: 'video/webm',
    buffer: creatorVideo,
  });
  const comparison = page.getByRole('region', { name: 'Video comparison', exact: true });
  await expect(comparison.locator('video')).toHaveCount(1);
  await buildVideo(page, 'Second frozen source: a red boat');
  await importResult.setInputFiles({
    name: 'second.webm',
    mimeType: 'video/webm',
    buffer: creatorVideo,
  });
  await expect(comparison.locator('video')).toHaveCount(2);
  await comparison.getByLabel('Comparison notes · A', { exact: true }).fill('Keep A framing');
  await comparison.getByRole('button', { name: 'Save notes', exact: true }).first().click();
  await expect(comparison.getByLabel('Comparison notes · A', { exact: true })).toHaveValue(
    'Keep A framing',
  );
  await expect(comparison.getByLabel('Comparison notes · B', { exact: true })).toHaveValue('');
  await expect(
    comparison.getByRole('button', { name: 'Use on timeline', exact: true }).first(),
  ).toBeDisabled();
  await buildVideo(page, 'A new editable brief unrelated to either frozen source');
  await comparison.getByText('Compare frozen prompts and settings', { exact: true }).click();
  const sourceDiff = comparison.locator('details', {
    hasText: 'Compare frozen prompts and settings',
  });
  await expect(sourceDiff.locator('pre').first()).toContainText('blue boat');
  await expect(sourceDiff.locator('pre').first()).toContainText('red boat');
  await expect(sourceDiff.locator('pre').first()).not.toContainText('new editable brief');
  await comparison.getByLabel('Listen to', { exact: true }).selectOption('B');
  await expect
    .poll(() =>
      comparison
        .locator('video')
        .evaluateAll((items) => items.map((item) => (item as HTMLVideoElement).muted)),
    )
    .toEqual([true, false]);
  await expect(comparison.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await comparison.getByRole('button', { name: 'Play', exact: true }).click();
  await expect
    .poll(() =>
      comparison
        .locator('video')
        .first()
        .evaluate((video: HTMLVideoElement) => video.currentTime),
    )
    .toBeGreaterThan(0);
  await comparison.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.reload();
  await expect(comparison.getByLabel('Comparison notes · A', { exact: true })).toHaveValue(
    'Keep A framing',
  );
  await expect(comparison.getByLabel('Comparison notes · B', { exact: true })).toHaveValue('');
  await page
    .getByRole('button', { name: 'Improve prompt from notes', exact: true })
    .first()
    .click();
  const feedback = page.getByRole('region', { name: 'Improve prompt from notes', exact: true });
  await expect(feedback).toBeVisible();
  await expect(feedback.getByLabel('Reviewer notes', { exact: true })).toHaveValue(
    'Keep A framing',
  );
  await expect(feedback.getByLabel('Fields to improve', { exact: true })).toHaveValue('prompt');
  await feedback.getByText('Frozen source context', { exact: true }).click();
  await expect(
    feedback.getByText('First frozen source: a blue boat', { exact: false }),
  ).toBeVisible();
});
