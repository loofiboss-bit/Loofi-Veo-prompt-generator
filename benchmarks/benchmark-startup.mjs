import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { _electron } from '@playwright/test';
import { median } from './measure.mjs';

async function fingerprint(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function processResources(pid) {
  if (process.platform !== 'linux')
    return { available: false, reason: '/proc sampling requires Linux' };
  const ticksPerSecond = Number(
    execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8', timeout: 5000 }),
  );
  const entries = [];
  for (const name of await fs.readdir('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const stat = await fs.readFile(`/proc/${name}/stat`, 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      const status = await fs.readFile(`/proc/${name}/status`, 'utf8');
      entries.push({
        pid: Number(name),
        parent: Number(fields[1]),
        cpuMicros: ((Number(fields[11]) + Number(fields[12])) / ticksPerSecond) * 1e6,
        rssBytes: Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1] || 0) * 1024,
      });
    } catch {
      // Processes may exit while /proc is being inspected.
    }
  }
  const owned = new Set([pid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of entries)
      if (owned.has(item.parent) && !owned.has(item.pid)) {
        owned.add(item.pid);
        changed = true;
      }
  }
  const descendants = entries.filter((item) => owned.has(item.pid));
  return {
    available: true,
    processCount: descendants.length,
    cpuMicros: descendants.reduce((sum, p) => sum + p.cpuMicros, 0),
    rssBytes: descendants.reduce((sum, p) => sum + p.rssBytes, 0),
  };
}
async function navigateToProjects(page) {
  await page.waitForLoadState('domcontentloaded');
  await page
    .locator('.creator-start > header')
    .getByRole('button', { name: 'Continue a project', exact: true })
    .click({ timeout: 45000 });
}
async function usableProjects(page) {
  await page.getByRole('heading', { name: 'Projects', exact: true }).waitFor({ timeout: 45000 });
  const name = page.getByRole('textbox', { name: 'Project name', exact: true });
  assert.ok(await name.isEditable());
  await name.fill('Benchmark readiness');
  assert.ok(await page.getByRole('button', { name: 'Create project', exact: true }).isEnabled());
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}
async function closeApplication(app) {
  const child = app.process();
  let timer;
  try {
    await Promise.race([
      app.close(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error('Packaged application shutdown timed out'));
        }, 10000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function runStartupBenchmark({
  baselineExecutable,
  candidateExecutable,
  pairs = 5,
} = {}) {
  assert.ok(baselineExecutable && candidateExecutable, 'Both packaged executables are required');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-benchmark-startup-'));
  const records = [];
  const artifacts = {};
  let active;
  let interruptedSignal;
  async function launch(executable, profile) {
    if (interruptedSignal) throw new Error(`Benchmark interrupted by ${interruptedSignal}`);
    const userData = path.join(profile, 'profile');
    const env = { ...process.env, LANG: 'en_US.UTF-8' };
    delete env.ELECTRON_RUN_AS_NODE;
    for (const [key, subdir] of Object.entries({
      XDG_CONFIG_HOME: 'config',
      XDG_DATA_HOME: 'data',
      XDG_CACHE_HOME: 'cache',
      XDG_STATE_HOME: 'state',
    })) {
      env[key] = path.join(profile, subdir);
      await fs.mkdir(env[key], { recursive: true });
    }
    const app = await _electron.launch({
      executablePath: executable,
      args: [`--user-data-dir=${userData}`, '--lang=en-US'],
      env,
      timeout: 45000,
    });
    active = app;
    let applicationLog = '';
    app.process().stderr?.on('data', (chunk) => {
      applicationLog = `${applicationLog}${chunk}`.slice(-16000);
    });
    try {
      const actual = await app.evaluate(({ app }) => ({
        userData: app.getPath('userData'),
        version: app.getVersion(),
      }));
      assert.equal(
        path.resolve(actual.userData),
        path.resolve(userData),
        'Profile must be isolated',
      );
      return { app, page: await app.firstWindow({ timeout: 45000 }), version: actual.version };
    } catch (error) {
      await closeApplication(app);
      active = null;
      throw new Error(`${error.message}\nPackaged application stderr:\n${applicationLog}`, {
        cause: error,
      });
    }
  }
  const interrupted = (signal) => {
    interruptedSignal = signal;
    active?.process().kill('SIGKILL');
  };
  process.once('SIGINT', interrupted);
  process.once('SIGTERM', interrupted);
  try {
    const templates = {};
    for (const [kind, supplied] of Object.entries({
      baseline: baselineExecutable,
      candidate: candidateExecutable,
    })) {
      const executable = path.resolve(supplied);
      const asar = path.join(path.dirname(executable), 'resources', 'app.asar');
      // app.asar is mandatory: the Electron executable alone does not identify application code.
      artifacts[kind] = {
        executable,
        executableSha256: await fingerprint(executable),
        applicationSha256: await fingerprint(asar),
      };
      const template = path.join(directory, `${kind}-template`);
      const running = await launch(executable, template);
      try {
        artifacts[kind].version = running.version;
        await running.page.evaluate(() => {
          localStorage.setItem('hasSeenWelcome', 'true');
          localStorage.setItem('v8-onboarding-complete', 'true');
          localStorage.setItem('creator-default-start-view', '/start');
          localStorage.setItem('i18nextLng', 'en');
          localStorage.setItem(
            'loofi-veo-onboarding',
            JSON.stringify({
              completed: true,
              tutorialStep: 0,
              tutorialActive: false,
              tutorialFlow: 'main',
              welcomeShown: true,
              lastUpdated: 0,
            }),
          );
          location.hash = '/start';
        });
        await running.page.reload();
        await navigateToProjects(running.page);
        await usableProjects(running.page);
      } finally {
        await closeApplication(running.app);
        active = null;
      }
      templates[kind] = template;
    }
    for (let pair = 0; pair < pairs; pair++) {
      for (const kind of pair % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate']) {
        const profile = path.join(directory, `${pair}-${kind}`);
        await fs.cp(templates[kind], profile, { recursive: true });
        const started = performance.now();
        const running = await launch(artifacts[kind].executable, profile);
        try {
          await navigateToProjects(running.page);
          await usableProjects(running.page);
          const durationMs = performance.now() - started;
          const memoryBytes = await running.app.evaluate(() => process.memoryUsage());
          const resources = await processResources(running.app.process().pid);
          records.push({
            pair: pair + 1,
            kind,
            durationMs,
            mainProcessMemoryBytes: memoryBytes,
            processTree: resources,
          });
        } finally {
          await closeApplication(running.app);
          active = null;
        }
      }
    }
    const medians = Object.fromEntries(
      ['baseline', 'candidate'].map((kind) => {
        const selected = records.filter((r) => r.kind === kind);
        return [
          kind,
          {
            durationMs: median(selected.map((r) => r.durationMs)),
            processTreeRssBytes: median(
              selected.filter((r) => r.processTree.available).map((r) => r.processTree.rssBytes),
            ),
            processTreeCpuMicros: median(
              selected.filter((r) => r.processTree.available).map((r) => r.processTree.cpuMicros),
            ),
            mainProcessMemoryBytes: Object.fromEntries(
              ['rss', 'heapUsed', 'external', 'arrayBuffers'].map((key) => [
                key,
                median(selected.map((r) => r.mainProcessMemoryBytes[key])),
              ]),
            ),
          },
        ];
      }),
    );
    return {
      scenario: 'Packaged Electron process launch to usable Projects',
      artifacts,
      pairs,
      records,
      medians,
      methodology:
        'Five pairs by default, alternating order, warm system cache, identically prepared isolated profiles. Duration includes Playwright attachment, profile assertion, initial Start route loading and clicking its Continue a project button to navigate to Projects and filling the project name to verify enabled creation controls (no project is created). Both variants start on the supported /start preference; Projects is not a persisted default-start setting. Resources sampled immediately after readiness: main Node memory plus live descendant aggregate RSS and lifetime CPU (Linux). Shared pages may be counted in multiple RSS values; exited processes are not counted. This is not peak startup memory or a cold-cache measurement.',
    };
  } finally {
    process.removeListener('SIGINT', interrupted);
    process.removeListener('SIGTERM', interrupted);
    try {
      if (active) await closeApplication(active);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  }
}
