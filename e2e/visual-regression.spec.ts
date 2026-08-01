import { expect, test, type Page } from '@playwright/test';
import { dismissModals } from './helpers';

const visualStabilityCss = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }

  [class*="toast"], [role="alert"] {
    display: none !important;
  }

  nav[aria-label="Create workflow"] span.ms-auto {
    visibility: hidden !important;
  }
`;

async function stabilizeVisualPage(page: Page) {
  await page.addStyleTag({ content: visualStabilityCss });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    window.localStorage.setItem('veo-theme-mode', 'dark');
  });
}

test.describe('Creator Studio visual regression', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium' || process.platform !== 'linux',
      'Canonical visual baselines are captured with Linux desktop Chromium.',
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(async () => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem('hasSeenWelcome', 'true');
      window.localStorage.setItem(
        'loofi-veo-onboarding',
        JSON.stringify({
          completed: true,
          tutorialStep: 0,
          tutorialActive: false,
          tutorialFlow: 'main',
          welcomeShown: true,
          lastUpdated: '2026-08-01T00:00:00.000Z',
        }),
      );

      const databases =
        typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
      await Promise.all(
        databases.map(
          (database) =>
            new Promise<void>((resolve) => {
              if (!database.name) return resolve();
              const request = indexedDB.deleteDatabase(database.name);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            }),
        ),
      );
    });
    await page.reload();
    await dismissModals(page);
    await stabilizeVisualPage(page);
    await expect(page.getByLabel('Production idea')).toBeVisible();
  });

  test('brief step', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Brief', exact: true })).toBeVisible();
    await page.locator('#brief-step-title').focus();
    await expect(page).toHaveScreenshot('creator-studio-brief.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('Lyria assets step', async ({ page }) => {
    await page.getByRole('button', { name: 'Assets', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Lyria 3 music' })).toBeVisible();
    await expect(page).toHaveScreenshot('creator-studio-assets.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('generation approval step', async ({ page }) => {
    await page.getByRole('button', { name: /new local plan/i }).click();
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.getByText('Approval preflight')).toBeVisible();
    await expect(page).toHaveScreenshot('creator-studio-approval.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('projects hub', async ({ page }) => {
    await page.goto('/#/projects');
    await dismissModals(page, { waitForPrompt: false });
    await stabilizeVisualPage(page);
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await expect(page).toHaveScreenshot('projects-hub.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('timeline hub', async ({ page }) => {
    await page.goto('/#/timeline');
    await dismissModals(page, { waitForPrompt: false });
    await stabilizeVisualPage(page);
    await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible();
    await expect(page).toHaveScreenshot('timeline-hub.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('settings hub', async ({ page }) => {
    await page.goto('/#/settings');
    await dismissModals(page, { waitForPrompt: false });
    await stabilizeVisualPage(page);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page).toHaveScreenshot('settings-hub.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });
});
