import { expect, test } from '@playwright/test';
import { dismissModals } from './helpers';

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
    await page.addStyleTag({
      content: `
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
      `,
    });
  });

  test('prompt builder shell snapshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('prompt-builder-shell.png', {
      animations: 'disabled',
      fullPage: true,
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
    const workspaceManager = page.getByRole('dialog', { name: 'Workspace Manager' });
    await expect(workspaceManager).toBeVisible();
    await expect(workspaceManager).toHaveScreenshot('workspace-manager-shell.png', {
      animations: 'disabled',
    });
  });
});
