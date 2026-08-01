import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const queuedJobs = {
  schemaVersion: 1,
  jobs: [
    {
      id: 'restart-video-job',
      status: 'Queued',
      videoUrl: null,
      prompt: 'Restart-safe neon rain video',
      settings: {},
      request: {
        mode: 'text-to-video',
        modelId: 'veo-3.1-fast',
        prompt: 'Restart-safe neon rain video',
        aspectRatio: '16:9',
        resolution: '1080p',
        durationSeconds: 8,
        referenceAssetIds: [],
      },
      costApproval: {
        approvalId: 'restart-video-approval',
        modelId: 'veo-3.1-fast',
        maximumChargeUsd: 0.96,
        currency: 'USD',
        confidence: 'exact',
        sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
        verifiedDate: '2026-08-01',
        approvedAt: 1,
      },
      timestamp: 1,
    },
    {
      id: 'restart-music-job',
      jobKind: 'music',
      status: 'Queued',
      prompt: 'Restart-safe analog synth music',
      request: {
        modelId: 'lyria-3-clip-preview',
        prompt: 'Restart-safe analog synth music',
        responseFormat: 'mp3',
        images: [],
      },
      costApproval: {
        approvalId: 'restart-music-approval',
        modelId: 'lyria-3-clip-preview',
        maximumChargeUsd: 0.04,
        currency: 'USD',
        confidence: 'exact',
        sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
        verifiedDate: '2026-08-01',
        approvedAt: 2,
      },
      timestamp: 2,
    },
  ],
};

test('packaged Electron boots with a narrow bridge and restores durable jobs after restart', async () => {
  const executablePath = process.env.PACKAGED_ELECTRON_PATH;
  test.skip(!executablePath, 'PACKAGED_ELECTRON_PATH is set only by packaged release jobs.');

  const userDataDir = await mkdtemp(path.join(tmpdir(), 'loofi-creator-studio-e2e-'));
  await writeFile(
    path.join(userDataDir, 'paid-jobs-v1.json'),
    JSON.stringify(queuedJobs, null, 2),
    { encoding: 'utf8', mode: 0o600 },
  );
  const electronEnv = { ...process.env };
  delete electronEnv.ELECTRON_RUN_AS_NODE;
  const launch = () =>
    electron.launch({
      executablePath,
      args: [`--user-data-dir=${userDataDir}`],
      env: electronEnv,
    });

  let app = await launch();
  try {
    let window = await app.firstWindow();
    await window.evaluate(() => localStorage.setItem('v8-onboarding-complete', 'true'));
    await window.reload({ waitUntil: 'domcontentloaded' });
    await expect(window.locator('main')).toBeVisible({ timeout: 20_000 });
    const runtimeEvidence = await window.evaluate(async () => ({
      platform: window.electron?.platform,
      canExecuteProvider: typeof window.electron?.executeProvider === 'function',
      leaksCredentialRead: Object.hasOwn(window.electron ?? {}, 'getSecureItem'),
      leaksArbitraryDownload: Object.hasOwn(window.electron ?? {}, 'downloadBlockRange'),
      diagnostics: JSON.stringify(await window.electron?.getDesktopDiagnostics?.()),
    }));
    expect(runtimeEvidence.platform).toBeTruthy();
    expect(runtimeEvidence.canExecuteProvider).toBe(true);
    expect(runtimeEvidence.leaksCredentialRead).toBe(false);
    expect(runtimeEvidence.leaksArbitraryDownload).toBe(false);
    expect(runtimeEvidence.diagnostics).not.toMatch(
      /AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z]{20,}|api[_-]?key\s*[:=]/i,
    );

    const providerRequests: string[] = [];
    window.on('request', (request) => {
      if (request.url().includes('generativelanguage.googleapis.com')) {
        providerRequests.push(request.url());
      }
    });
    await window.evaluate(() => {
      window.location.hash = '/activity';
    });
    await expect(window.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
    await expect(window.getByText('Restart-safe neon rain video')).toBeVisible();
    await expect(window.getByText('Restart-safe analog synth music')).toBeVisible();
    await expect(window.getByText('Durable active').locator('..')).toContainText('2');
    expect(providerRequests).toEqual([]);

    await app.close();
    app = await launch();
    window = await app.firstWindow();
    await expect(window.locator('main')).toBeVisible({ timeout: 20_000 });
    await window.evaluate(() => {
      window.location.hash = '/activity';
    });
    await expect(window.getByText('Restart-safe neon rain video')).toBeVisible();
    await expect(window.getByText('Restart-safe analog synth music')).toBeVisible();
    await expect(window.getByText('Queued', { exact: true })).toHaveCount(2);
  } finally {
    await app.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
});
