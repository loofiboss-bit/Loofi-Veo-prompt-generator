import { mkdir, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd();
const outDir = path.join(root, 'assets', 'screenshots');
const host = '127.0.0.1';
const port = Number(process.env.SCREENSHOT_PORT ?? 8080);
const baseUrl = process.env.SCREENSHOT_BASE_URL ?? `http://${host}:${port}`;

const shots = [
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
];

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
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  await waitForServer(baseUrl);
  return child;
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
        await button.click({ timeout: 3_000 });
        await page.waitForTimeout(150);
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
    window.localStorage.setItem('onboarding-completed', 'true');
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
  if (server) {
    server.kill('SIGTERM');
  }
}
