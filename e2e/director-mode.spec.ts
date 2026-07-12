import { expect, test, type Page } from '@playwright/test';
import { dismissModals } from './helpers';

interface MockTakeOptions {
  runId: string;
  takeId: string;
  shortenPrompt?: boolean;
}

const injectCompletedTake = async (page: Page, options: MockTakeOptions) => {
  await page.evaluate(async ({ runId, takeId, shortenPrompt }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('veo-production-runs');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('production-runs-v1', 'readwrite');
      const store = transaction.objectStore('production-runs-v1');
      const request = store.get(`production-run:${runId}`);
      request.onsuccess = () => {
        const run = request.result;
        const shot = run.shots[0];
        if (shortenPrompt) {
          shot.prompt = 'Short prompt';
          shot.camera = '';
          shot.generationRequest.prompt = 'Short prompt';
        }
        const approval = [...run.approvals]
          .reverse()
          .find((item) => item.status === 'active' && item.shotIds.includes(shot.id));
        approval.consumedSubmissions += 1;
        shot.status = 'media-at-risk';
        shot.takes.push({
          id: takeId,
          prompt: shot.generationRequest.prompt,
          request: shot.generationRequest,
          status: 'media-at-risk',
          providerMediaUri: 'data:video/mp4;base64,AAAA',
          providerArtifact: {
            operationName: `operations/${takeId}`,
            mediaUri: 'data:video/mp4;base64,AAAA',
            createdAt: Date.now(),
            expiresAt: Date.now() + 86_400_000,
          },
          createdAt: Date.now(),
          completedAt: Date.now(),
        });
        run.status = 'reviewing';
        run.updatedAt = Date.now();
        store.put(run, `production-run:${runId}`);
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }, options);
};

test.describe('Director Mode', () => {
  test('creates, approves, and restores a local production run without cloud calls', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    const cloudRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('generativelanguage.googleapis.com')) {
        cloudRequests.push(request.url());
      }
    });

    await page.goto('/');
    await dismissModals(page);
    const idea = page.locator('textarea[name="idea"]:visible, textarea:visible').first();
    await idea.fill('A courier races through a rain-soaked neon market at night.');

    await page.goto('/#/director');
    await expect(page.getByRole('heading', { name: 'Create', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /new local plan/i }).click();

    await expect(
      page.getByText('Local plan created. No cloud services were called.'),
    ).toBeVisible();
    expect(cloudRequests).toEqual([]);

    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.getByText('Maximum $0.96')).toBeVisible();
    await page.getByRole('button', { name: 'Select pending' }).click();
    await page.getByRole('button', { name: /approve 1 shot/i }).click();
    await expect(page.getByText('approved', { exact: true })).toBeVisible();
    expect(cloudRequests).toEqual([]);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Create', exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel('Production run')).toContainText('Director Run');
    await expect(page.getByText('approved', { exact: true })).toBeVisible();
    expect(cloudRequests).toEqual([]);
  });

  test('completes the mocked review, revision, retake, acceptance, and export loop', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const cloudRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('generativelanguage.googleapis.com')) {
        cloudRequests.push(request.url());
      }
    });

    await page.goto('/');
    await dismissModals(page);
    await page
      .locator('textarea[name="idea"]:visible, textarea:visible')
      .first()
      .fill('Short idea');
    await page.goto('/#/director');
    await page.getByRole('button', { name: /new local plan/i }).click();
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.getByRole('button', { name: 'Select pending' }).click();
    await page.getByRole('button', { name: /approve 1 shot/i }).click();
    const runId = await page.getByLabel('Production run').inputValue();

    await injectCompletedTake(page, { runId, takeId: 'mock-take-1', shortenPrompt: true });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await page.getByRole('button', { name: 'Review take' }).click();
    await expect(page.getByText(/Review score:/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prepare revision' })).toBeVisible();
    await page.getByRole('button', { name: 'Prepare revision' }).click();
    await expect(page.getByText('awaiting-approval', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.getByRole('button', { name: 'Select pending' }).click();
    await page.getByRole('button', { name: /approve 1 shot/i }).click();
    await injectCompletedTake(page, { runId, takeId: 'mock-take-2' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await page.getByRole('button', { name: 'Review take' }).click();
    await page.getByRole('button', { name: 'Accept media risk' }).click();
    await page.getByRole('button', { name: 'Accept take' }).click();
    await expect(page.getByText('complete', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await page.getByRole('button', { name: 'Copy Creative Pack v2' }).click();
    await expect(page.getByLabel('Creative Pack v2 preview')).toContainText('## Director Run');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('complete', { exact: true }).first()).toBeVisible();
    expect(cloudRequests).toEqual([]);
  });
});
