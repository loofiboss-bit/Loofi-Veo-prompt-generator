import { expect, test } from '@playwright/test';
import { dismissModals } from './helpers';

const BUDGETS = {
  coldStartMs: 12_000,
  projectWorkspaceLoadMs: 3_000,
  routeChangeMs: 2_000,
  longSessionMs: 15_000,
  heapGrowthMb: 96,
} as const;

const heapMb = async (page: import('@playwright/test').Page): Promise<number | null> =>
  page.evaluate(() => {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return memory ? memory.usedJSHeapSize / 1024 / 1024 : null;
  });

test.describe('v8 performance budgets', () => {
  test('cold start and project workspace stay within baseline budgets', async ({ page }) => {
    const started = Date.now();
    await page.goto('/');
    await dismissModals(page);
    expect(Date.now() - started).toBeLessThan(BUDGETS.coldStartMs);

    const projectStarted = Date.now();
    await page.goto('/#/director');
    await expect(page.getByRole('heading', { name: /create/i }).first()).toBeVisible();
    expect(Date.now() - projectStarted).toBeLessThan(BUDGETS.projectWorkspaceLoadMs);
  });

  test('route changes and a repeated-navigation session remain responsive', async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    const beforeHeap = await heapMb(page);
    const routes = ['/director', '/optimize', '/timeline', '/settings', '/'];
    const sessionStarted = Date.now();

    for (let pass = 0; pass < 5; pass += 1) {
      for (const route of routes) {
        const routeStarted = Date.now();
        await page.goto(`/#${route}`);
        await expect(page.locator('body')).toBeVisible();
        expect(Date.now() - routeStarted).toBeLessThan(BUDGETS.routeChangeMs);
      }
    }

    expect(Date.now() - sessionStarted).toBeLessThan(BUDGETS.longSessionMs);
    const afterHeap = await heapMb(page);
    if (beforeHeap !== null && afterHeap !== null) {
      expect(afterHeap - beforeHeap).toBeLessThan(BUDGETS.heapGrowthMb);
    }
  });
});
