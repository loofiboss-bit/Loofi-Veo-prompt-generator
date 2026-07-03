import { expect, test, type Page } from '@playwright/test';
import { dismissModals } from './helpers';

const visualStabilityCss = `
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }

  [class*="toast"],
  [role="alert"] {
    display: none !important;
  }
`;

async function setVisualTheme(page: Page, theme: 'dark' | 'light') {
  await page.evaluate((nextTheme) => {
    document.documentElement.setAttribute('data-theme', nextTheme);
    window.localStorage.setItem('veo-theme-mode', nextTheme);
  }, theme);
}

async function stabilizeVisualPage(page: Page, theme: 'dark' | 'light' = 'dark') {
  await page.addStyleTag({ content: visualStabilityCss });
  await setVisualTheme(page, theme);
}

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/');

    // Reset persistent browser storage to keep snapshots deterministic.
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
          lastUpdated: new Date().toISOString(),
        }),
      );

      if (typeof indexedDB === 'undefined') return;

      const databases =
        typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
      await Promise.all(
        databases.map(
          (db) =>
            new Promise<void>((resolve) => {
              if (!db.name) {
                resolve();
                return;
              }
              const request = indexedDB.deleteDatabase(db.name);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            }),
        ),
      );
    });

    await page.reload();
    await dismissModals(page);

    // Reduce screenshot flake from transitions/caret blink and runtime toasts.
    await stabilizeVisualPage(page);
  });

  test('prompt builder shell snapshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('prompt-builder-shell.png', {
      animations: 'disabled',
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('prompt builder shell light-mode snapshot', async ({ page }) => {
    await setVisualTheme(page, 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await expect(page).toHaveScreenshot('prompt-builder-shell-light.png', {
      animations: 'disabled',
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('prompt output panel empty snapshot', async ({ page }) => {
    const outputSection = page.locator('[data-tutorial-id="output-section"]');
    await expect(outputSection).toBeVisible();
    await expect(outputSection).toHaveScreenshot('prompt-output-empty.png', {
      animations: 'disabled',
    });
  });

  test('visual composer snapshot', async ({ page }) => {
    await page.getByRole('button', { name: 'Visual Composer' }).click();
    await expect(page.getByRole('heading', { name: 'Visual Composer' })).toBeVisible();
    await expect(page).toHaveScreenshot('visual-composer-shell.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('storyboard shell snapshot', async ({ page }) => {
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Reset All' }).click();
    await dismissModals(page);
    await page.locator('button[title="Open Story Board"]').click();
    await expect(page.getByRole('button', { name: 'Close Storyboard' })).toBeVisible();
    await expect(page).toHaveScreenshot('storyboard-shell.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('project manager empty state snapshot', async ({ page }) => {
    await page.getByRole('button', { name: 'Projects' }).click();
    const projectManager = page.getByRole('dialog').filter({ hasText: 'Project Manager' });
    await expect(projectManager).toBeVisible();
    await expect(projectManager).toHaveScreenshot('project-manager-empty.png', {
      animations: 'disabled',
    });
  });

  test('workspace manager shell snapshot', async ({ page }) => {
    await page.locator('button[aria-label^="Switch workspace"]').click();
    await page.getByRole('button', { name: 'Manage Workspaces' }).click();
    const workspaceManager = page.getByRole('dialog').filter({ hasText: 'Manage Workspaces' });
    await expect(workspaceManager).toBeVisible();
    await expect(workspaceManager).toHaveScreenshot('workspace-manager-shell.png', {
      animations: 'disabled',
    });
  });

  test('sidebar utility dock snapshot', async ({ page }) => {
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveScreenshot('sidebar-shell.png', {
      animations: 'disabled',
    });
  });

  test('onboarding overlay snapshot', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem(
        'loofi-veo-onboarding',
        JSON.stringify({
          completed: false,
          tutorialStep: 1,
          tutorialActive: true,
          tutorialFlow: 'main',
          welcomeShown: true,
          lastUpdated: new Date().toISOString(),
        }),
      );
    });

    await page.reload();
    const overlay = page.locator('.tutorial-overlay');
    await expect(overlay).toBeVisible();

    await expect(overlay).toHaveScreenshot('onboarding-overlay-step-1.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });

  test('optimize workbench route snapshot', async ({ page }) => {
    await page.goto('/#/optimize');
    await dismissModals(page, { waitForPrompt: false });
    await stabilizeVisualPage(page);
    await expect(page.getByRole('heading', { name: 'Optimization Workbench' })).toBeVisible();
    await expect(page).toHaveScreenshot('optimize-workbench-shell.png', {
      animations: 'disabled',
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('timeline empty route snapshot', async ({ page }) => {
    await page.goto('/#/timeline');
    await dismissModals(page, { waitForPrompt: false });
    await stabilizeVisualPage(page);
    await expect(page.getByText('Timeline is ready when you have generated clips')).toBeVisible();
    await expect(page).toHaveScreenshot('timeline-empty-shell.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('settings route snapshot', async ({ page }) => {
    await page.goto('/#/settings');
    await dismissModals(page, { waitForPrompt: false });
    await stabilizeVisualPage(page);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page).toHaveScreenshot('settings-shell.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('settings route light-mode snapshot', async ({ page }) => {
    await page.goto('/#/settings');
    await dismissModals(page, { waitForPrompt: false });
    await stabilizeVisualPage(page, 'light');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page).toHaveScreenshot('settings-shell-light.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });
});
