import { expect, test, type Page } from '@playwright/test';
import { blockExternalRequests, dismissModals } from './helpers';

async function openNavigation(page: Page) {
  const open = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await open.isVisible()) await open.click();
  return page.getByRole('navigation', { name: 'Main navigation', exact: true });
}

async function navigateTo(page: Page, label: string) {
  await openNavigation(page);
  await page.locator('.creator-sidebar').getByRole('button', { name: label, exact: true }).click();
  await expect(page.getByRole('heading', { name: label, exact: true, level: 1 })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await blockExternalRequests(page);
});

for (const theme of ['light', 'dark'] as const) {
  for (const width of [320, 375, 414, 768, 865, 1024, 1280, 1536]) {
    test(`${theme} studio stays usable at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/');
      await dismissModals(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const idea = page.getByLabel(/^Core idea/);
      await expect(idea).toBeVisible();
      const bounds = await idea.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(width < 640 ? 0 : width < 1200 ? 64 : 256);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      const build = page.getByRole('button', { name: 'Build copy-ready pack', exact: true });
      if (width === 1280) {
        const button = await build.boundingBox();
        expect(button!.y + button!.height).toBeLessThanOrEqual(800);
      }
      await idea.fill('A red sailboat crosses a quiet lake at sunrise');
      await build.click();
      await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(/red sailboat/);
      await expect(page.getByRole('button', { name: 'Copy prompt', exact: true })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      const content = page.getByRole('main');
      expect(
        await content.evaluate((element) => element.scrollWidth - element.clientWidth),
      ).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`studio-${theme}-${width}.png`) });
    });
  }
}

test('all seven destinations preserve the draft and settings return context', async ({ page }) => {
  await page.setViewportSize({ width: 865, height: 800 });
  await page.goto('/');
  await dismissModals(page);
  await page.getByLabel(/^Core idea/).fill('A preserved studio idea');
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  for (const label of ['Projects', 'Assets', 'Timeline', 'Activity', 'Production']) {
    await navigateTo(page, label);
    await expect(
      page.locator('.creator-sidebar').getByRole('button', { name: label, exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  }
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await navigateTo(page, 'Settings');
  await page
    .getByRole('combobox', { name: 'Settings category', exact: true })
    .selectOption('support');
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
  await navigateTo(page, 'Prompt Studio');
  await expect(page.getByLabel(/^Core idea/)).toHaveValue('A preserved studio idea');
  await page.getByRole('button', { name: 'Result', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(
    /preserved studio idea/,
  );
  await expect(page.getByRole('main')).toHaveCount(1);
});

test('mobile menu dismisses for the current page and restores accessible focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await dismissModals(page);
  const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
  await trigger.click();
  await page
    .getByRole('dialog', { name: 'Main navigation', exact: true })
    .getByRole('button', { name: 'Prompt Studio', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.getByRole('main').evaluate((main) => {
    main.scrollTop = main.scrollHeight;
  });
  await navigateTo(page, 'Projects');
  expect(await page.getByRole('main').evaluate((main) => main.scrollTop)).toBe(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeFocused();
  const route = page.url();
  await page.getByRole('link', { name: 'Skip to main content', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  expect(page.url()).toBe(route);
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('sidebar resizing and quick navigation use the same destinations', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await dismissModals(page);
  const content = page.getByRole('main');
  expect((await content.boundingBox())!.x).toBe(256);
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect.poll(async () => (await content.boundingBox())!.x).toBe(64);
  await page.getByRole('button', { name: /Switch workspace\. Current:/ }).click();
  await expect(page.getByRole('button', { name: 'Manage Workspaces', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  for (const name of [
    'Assets',
    'Activity',
    'Timeline',
    'Projects',
    'Production',
    'Settings',
    'Prompt Studio',
  ]) {
    await page.getByRole('button', { name: 'Quick navigation', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
  }
});

test('local creation and contextual assets remain reachable at 200% UI zoom', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await dismissModals(page);
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await page.getByLabel(/^Core idea/).fill('A close-up of a leaf');
  await page.getByLabel('Prompt recipe', { exact: true }).selectOption('image-to-video');
  const browse = page.getByRole('button', { name: 'Browse project assets', exact: true });
  await browse.click();
  await expect(page.getByRole('region', { name: 'Asset library', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(browse).toBeFocused();
  await page.getByLabel('Prompt recipe', { exact: true }).selectOption('text-to-video');
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(/leaf/);
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await expect(page.getByLabel(/^Core idea/)).toHaveValue('A close-up of a leaf');
});

for (const width of [320, 865]) {
  test(`loaded timeline tools remain reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await dismissModals(page);
    await page.evaluate(async () => {
      const modulePath = '/src/core/store/useAppStore.ts';
      const { useAppStore } = await import(/* @vite-ignore */ modulePath);
      const shot = useAppStore.getState().sbShots[0];
      useAppStore
        .getState()
        .setSbShots([
          { ...shot, action: 'A quiet lake', generatedVideoUrl: '/timeline-test.webm' },
        ]);
    });
    await navigateTo(page, 'Timeline');
    for (const name of ['Color', 'Green Screen', 'Mixer']) {
      const control = page.getByRole('button', { name, exact: true });
      await expect(control).toBeVisible();
      const bounds = await control.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(width < 640 ? 0 : 64);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await control.click();
    }
    expect(
      await page.getByRole('main').evaluate((element) => element.scrollWidth - element.clientWidth),
    ).toBeLessThanOrEqual(1);
  });
}

test('shrinking a split studio preserves the focused editor', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 800 });
  await page.goto('/');
  await dismissModals(page);
  const idea = page.getByLabel(/^Core idea/);
  await idea.fill('A focused draft during resize');
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(/focused draft/);
  await expect(idea).toBeEnabled();
  await idea.focus();
  await page.setViewportSize({ width: 865, height: 800 });
  await expect(idea).toBeVisible();
  await expect(idea).toBeFocused();
  await expect(idea).toHaveValue('A focused draft during resize');
});

for (const route of ['Production', 'Settings']) {
  test(`${route} controls fit a 320px window with a saved production plan`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/');
    await dismissModals(page);
    await navigateTo(page, 'Production');
    await page.getByRole('button', { name: /new local plan/i }).click();
    await expect(page.getByLabel('Production run', { exact: true })).toBeVisible();
    if (route === 'Settings') await navigateTo(page, 'Settings');
    const overflow = await page.getByRole('main').evaluate((main) => {
      const bounds = main.getBoundingClientRect();
      return Array.from(main.querySelectorAll('button, input, select, textarea, a[href]'))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
          );
        })
        .map((element) => element.getAttribute('aria-label') ?? element.textContent?.trim());
    });
    expect(overflow).toEqual([]);
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`Settings uses available content width at 200% zoom in ${theme} theme`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    await dismissModals(page);
    await navigateTo(page, 'Settings');
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    await expect(
      page.getByRole('combobox', { name: 'Settings category', exact: true }),
    ).toBeVisible();
    const overflow = await page.getByRole('main').evaluate((main) => {
      const bounds = main.getBoundingClientRect();
      return Array.from(main.querySelectorAll('button, input, select, textarea, a[href]'))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
          );
        })
        .map((element) => element.getAttribute('aria-label') ?? element.textContent?.trim());
    });
    expect(overflow).toEqual([]);
  });
}
