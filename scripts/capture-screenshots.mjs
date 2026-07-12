import { mkdir, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd();
const outDir = path.join(root, 'assets', 'screenshots');
const host = '127.0.0.1';
const port = Number(process.env.SCREENSHOT_PORT ?? 8080);
const baseUrl = process.env.SCREENSHOT_BASE_URL ?? `http://${host}:${port}`;

const allShots = [
  { fileName: '01-home.png', route: '/' },
  {
    fileName: '02-flow-veo-studio.png',
    route: '/composer',
  },
  {
    fileName: '03-suno-studio.png',
    route: '/',
    action: async (page) => {
      await page.getByRole('button', { name: 'Song Studio' }).click();
      await page
        .getByText(/Suno Architect/i)
        .first()
        .waitFor({
          state: 'visible',
          timeout: 10_000,
        });
    },
  },
  { fileName: '04-scene-pack-export.png', route: '/optimize' },
  { fileName: '05-settings-windows-linux.png', route: '/settings' },
  { fileName: '06-timeline.png', route: '/timeline' },
  {
    fileName: '07-create-workflow.png',
    route: '/director',
    action: async (page) => {
      await page.getByRole('button', { name: /new local plan/i }).click();
      await page.getByRole('button', { name: 'Brief', exact: true }).click();
      await page.getByText(/director brief/i).waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    fileName: '08-model-cost-approval.png',
    route: '/director',
    action: async (page) => {
      await page.getByRole('button', { name: /new local plan/i }).click();
      await page.getByRole('button', { name: 'Generate', exact: true }).click();
      await page.getByLabel('Model decision').first().waitFor({ state: 'visible' });
    },
  },
  {
    fileName: '09-take-comparison.png',
    route: '/director',
    action: async (page) => {
      await page.getByRole('button', { name: /new local plan/i }).click();
      const runId = await page.getByLabel('Production run').inputValue();
      await page.evaluate(
        async ({ runId }) => {
          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('veo-production-runs');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          await new Promise((resolve, reject) => {
            const tx = db.transaction('production-runs-v1', 'readwrite');
            const store = tx.objectStore('production-runs-v1');
            const get = store.get(`production-run:${runId}`);
            get.onsuccess = () => {
              const run = get.result;
              const shot = run.shots[0];
              shot.status = 'reviewing';
              shot.takes = [72, 91].map((score, index) => ({
                id: `screenshot-take-${index + 1}`,
                prompt: shot.prompt,
                request: shot.generationRequest,
                status: 'complete',
                provider: 'gemini-api',
                apiSurface: 'google-ai-v1beta',
                modelLifecycleSnapshot: 'preview',
                priceDimension: { unit: 'video-second', resolution: '720p', usdPerUnit: 0.1 },
                providerMediaUri: 'data:video/mp4;base64,AAAA',
                review: {
                  id: `review-${index}`,
                  shotId: shot.id,
                  takeId: `screenshot-take-${index + 1}`,
                  overallScore: score,
                  dimensions: [],
                  findings: [],
                  source: 'local',
                  createdAt: Date.now(),
                },
                createdAt: Date.now(),
              }));
              run.status = 'reviewing';
              store.put(run, `production-run:${runId}`);
            };
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          });
          db.close();
        },
        { runId },
      );
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1_000);
      await page.getByLabel('Production run').selectOption(runId);
      await page.getByText('reviewing', { exact: true }).first().waitFor({ state: 'visible' });
      await page.getByRole('button', { name: 'Review', exact: true }).click();
      const comparison = page.getByLabel('A/B take comparison');
      try {
        await comparison.waitFor({ state: 'visible', timeout: 10_000 });
      } catch {
        const state = await page.evaluate(
          async ({ runId }) => {
            const db = await new Promise((resolve, reject) => {
              const request = indexedDB.open('veo-production-runs');
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
            return await new Promise((resolve, reject) => {
              const tx = db.transaction('production-runs-v1', 'readonly');
              const get = tx.objectStore('production-runs-v1').get(`production-run:${runId}`);
              get.onsuccess = () =>
                resolve({
                  status: get.result?.status,
                  takes: get.result?.shots?.[0]?.takes?.length,
                });
              get.onerror = () => reject(get.error);
            });
          },
          { runId },
        );
        throw new Error(`Take comparison fixture did not render: ${JSON.stringify(state)}`);
      }
    },
  },
  {
    fileName: '10-diagnostics.png',
    route: '/',
    action: async (page) => {
      await page.getByRole('button', { name: /diagnostics/i }).click();
      await page
        .getByRole('heading', { name: /project diagnostics/i })
        .waitFor({ state: 'visible' });
    },
  },
  {
    fileName: '11-media-library.png',
    route: '/',
    action: async (page) => {
      const trigger = page.getByRole('button', { name: 'Asset Library', exact: true });
      if (await trigger.isVisible().catch(() => false)) await trigger.click();
      await page.getByRole('heading', { name: 'Asset Library' }).waitFor({ state: 'visible' });
    },
  },
];
const requestedScreenshot = process.env.SCREENSHOT_ONLY;
const shots = requestedScreenshot
  ? allShots.filter((shot) => shot.fileName === requestedScreenshot)
  : [...allShots].sort((left, right) =>
      left.fileName === '09-take-comparison.png'
        ? -1
        : right.fileName === '09-take-comparison.png'
          ? 1
          : 0,
    );

const waitForServer = (url, timeoutMs = 45_000) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const poll = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for screenshot server at ${url}`));
          return;
        }
        setTimeout(poll, 500);
      });

      request.setTimeout(1_500, () => {
        request.destroy();
      });
    };

    poll();
  });

const isServerRunning = (url) =>
  new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(true);
    });
    request.on('error', () => resolve(false));
    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });
  });

const startServer = async () => {
  if (await isServerRunning(baseUrl)) {
    return null;
  }

  const child = spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(port)], {
    cwd: root,
    detached: process.platform !== 'win32',
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  await waitForServer(baseUrl);
  return child;
};

const stopServer = async (child) => {
  if (!child || child.exitCode !== null) return;

  const signalGroup = (signal) => {
    try {
      if (process.platform === 'win32') {
        child.kill(signal);
      } else {
        process.kill(-child.pid, signal);
      }
    } catch {
      child.kill(signal);
    }
  };
  const waitForExit = () =>
    Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 5_000))]);

  signalGroup('SIGTERM');
  await waitForExit();
  if (child.exitCode === null) {
    signalGroup('SIGKILL');
    await waitForExit();
  }
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.unref();
};

const dismissStartupUi = async (page) => {
  const buttonPatterns = [
    /start from scratch/i,
    /skip for now/i,
    /skip tour/i,
    /skip/i,
    /close/i,
    /got it/i,
  ];

  for (let pass = 0; pass < 2; pass += 1) {
    for (const pattern of buttonPatterns) {
      const button = page.getByRole('button', { name: pattern }).first();
      if (await button.isVisible().catch(() => false)) {
        const clicked = await button
          .click({ timeout: 3_000 })
          .then(() => true)
          .catch(() => false);
        if (clicked) {
          await page.waitForTimeout(150);
        }
      }
    }
    await page.keyboard.press('Escape').catch(() => {});
  }
};

const seedPrompt = async (page) => {
  const idea = page
    .locator(
      'textarea[name="idea"]:visible, textarea[placeholder*="Describe your video idea"]:visible',
    )
    .first();

  if (await idea.isVisible().catch(() => false)) {
    await idea.fill(
      'A rain-soaked neon street chase with locked character continuity, slow dolly motion, reflective pavement, and a low synth pulse.',
    );
  }
};

const navigate = async (page, route) => {
  await page.goto(`${baseUrl}/#${route}`, { waitUntil: 'networkidle' });
  await dismissStartupUi(page);
  await seedPrompt(page);
  await page.waitForTimeout(700);
};

await mkdir(outDir, { recursive: true });

const server = await startServer();
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

try {
  await page.addInitScript(() => {
    window.localStorage.setItem('hasSeenWelcome', 'true');
    window.localStorage.setItem('v8-onboarding-complete', 'true');
    window.localStorage.setItem('onboarding-completed', 'true');
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
    window.localStorage.setItem('veo-crash-count', '0');
    window.localStorage.removeItem('veo-last-crash');
  });

  for (const { fileName, route, action } of shots) {
    await navigate(page, route);
    if (action) {
      await action(page);
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(outDir, fileName), fullPage: true });
  }

  await writeFile(
    path.join(outDir, 'README.md'),
    `# Screenshots

Regenerate these public screenshots with:

\`\`\`bash
npm run screenshots
\`\`\`

These images are captured from the actual Vite app with deterministic local UI state. They do not include API keys, private files, local usernames, or absolute local paths.
`,
  );
} finally {
  await browser.close();
  await stopServer(server);
}
