#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
/** Isolated packaged Electron / native comparison. Never uses the real user profile. */
import { spawn, execFileSync, execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const help = `Usage: node native/scripts/benchmark.mjs --native /absolute/release/binary --video /absolute/benchmark.webm --output /absolute/run.json
  --electron PATH       packaged executable (default /opt/Loofi Creator Studio/veo-prompt-generator)
  --startup-pairs N     default 20
  --resource-pairs N    default 5 per scenario
  --settle SECONDS      default 10
  --duration SECONDS    default 30
  --interval SECONDS    default 1
  --workloads LIST      comma-separated workload subset; default all four
  --source-package PATH source package.json providing @playwright/test
Profiles use temporary isolated XDG directories. Full default run takes about 30 minutes.
Reduced counts/durations are harness sanity checks, not full benchmark evidence.`;
if (argv.includes('--help')) {
  console.log(help);
  process.exit(0);
}
const options = {
  electron: '/opt/Loofi Creator Studio/veo-prompt-generator',
  'startup-pairs': '20',
  'resource-pairs': '5',
  workloads: 'projects,studio,video-playing,video-paused',
  settle: '10',
  duration: '30',
  interval: '1',
  'source-package': process.env.ELECTRON_SOURCE_PACKAGE || resolve(here, '../../package.json'),
};
for (let i = 0; i < argv.length; i += 2) {
  const name = argv[i]?.replace(/^--/, '');
  if (!['native', 'video', 'output', ...Object.keys(options)].includes(name) || !argv[i + 1])
    throw new Error(help);
  options[name] = argv[i + 1];
}
for (const key of ['native', 'video', 'output'])
  if (!options[key]) throw new Error(`Missing --${key}\n${help}`);
for (const key of ['startup-pairs', 'resource-pairs'])
  if (!/^\d+$/.test(options[key])) throw new Error(`${key} must be a non-negative integer`);
for (const key of ['settle', 'duration', 'interval'])
  if (
    !Number.isFinite(Number(options[key])) ||
    Number(options[key]) < (key === 'settle' ? 0 : 0.001)
  )
    throw new Error(`Invalid ${key}`);
const workloads = options.workloads.split(',');
if (
  !workloads.length ||
  workloads.some((w) => !['projects', 'studio', 'video-playing', 'video-paused'].includes(w))
)
  throw new Error('Invalid workloads');
const { _electron } = createRequire(resolve(options['source-package']))('@playwright/test');
const exec = promisify(execFile);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const clock = () => Number(process.hrtime.bigint()) / 1e6;
const command = (executable, args) => {
  try {
    return execFileSync(executable, args, { encoding: 'utf8', timeout: 10000 }).trim();
  } catch (e) {
    return `unavailable: ${e.message}`;
  }
};
const hash = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
const temporary = await mkdtemp(join(tmpdir(), 'native-m0-benchmark-'));
const records = [];
let activeApplication;
const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  workloads,
  methodology: {
    startup:
      'Warm system cache, isolated prepared profile, process launch to usable rendered Prompt Studio. Native readiness emitted after frame; Electron CDP checks editable idea field and two animation frames. Electron timing includes Playwright launch/attachment and userData verification overhead. Observation methods are asymmetric; no cold-cache claim.',
    resources:
      'Root plus all current descendants, /proc/smaps_rollup PSS/RSS. CPU user+system delta, one core = 100%. Short-lived processes exiting between samples may be missed. Sampler and harness excluded. Per-run CPU is a time-weighted mean; memory is a per-run median, with summary statistics across runs.',
    emptyProjectsFixture:
      'Both displayed inventory models have zero rows. Packaged v15 automatically bootstraps a default project, so its existing exported Zustand store is set to an empty session fixture in the verified temporary profile before sampling. No Electron source or persisted format is changed; default metadata remains in the temporary profile.',
    comparisonLimit:
      'M0 has fewer features. Only these workloads are compared; video import/setup is excluded from stable sampling.',
  },
  configuration: { ...options, size: { width: 1280, height: 800 }, isolatedProfiles: true },
  environment: {
    os: command('cat', ['/etc/os-release']),
    kernel: command('uname', ['-a']),
    rust: command('rustc', ['--version']),
    qt: command('/usr/bin/qmake6', ['-query', 'QT_VERSION']),
    package: command('rpm', ['-qf', options.electron]),
    gpu: command('lspci', ['-nn']),
    displays: command('kscreen-doctor', ['-o']),
    sessionType: process.env.XDG_SESSION_TYPE,
    waylandDisplay: process.env.WAYLAND_DISPLAY,
    qtPlatform: process.env.QT_QPA_PLATFORM || 'default',
    sourceRevision: command('git', ['-C', resolve(here, '../..'), 'rev-parse', 'HEAD']),
    nativeSha256: await hash(options.native),
    electronSha256: await hash(options.electron),
    videoSha256: await hash(options.video),
  },
  records,
};
const save = async () => {
  await mkdir(dirname(resolve(options.output)), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`);
};
async function profile(name) {
  const base = join(temporary, name);
  const env = {
    ...process.env,
    XDG_CONFIG_HOME: join(base, 'config'),
    XDG_DATA_HOME: join(base, 'data'),
    XDG_CACHE_HOME: join(base, 'cache'),
    XDG_STATE_HOME: join(base, 'state'),
    LANG: 'en_US.UTF-8',
  };
  for (const dir of [
    base,
    ...['XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME'].map((k) => env[k]),
  ])
    await mkdir(dir, { recursive: true });
  return { base, env, userData: join(base, 'electron-profile') };
}
async function electronLaunch(p) {
  const app = await _electron.launch({
    executablePath: options.electron,
    args: [`--user-data-dir=${p.userData}`, '--ozone-platform=wayland', '--lang=en-US'],
    env: p.env,
    timeout: 45000,
  });
  try {
    const actual = await app.evaluate(({ app }) => ({
      userData: app.getPath('userData'),
      version: app.getVersion(),
    }));
    if (resolve(actual.userData) !== resolve(p.userData))
      throw new Error(`Profile isolation rejected: ${actual.userData}`);
    report.environment.electronVersion = actual.version;
    if (actual.version !== '15.0.0')
      throw new Error(`Expected packaged Electron v15.0.0, found ${actual.version}`);
    let applicationLog = '';
    let processExit = null;
    app.process().stderr?.on('data', (data) => {
      applicationLog += data.toString();
    });
    app.process().on('exit', (code, signal) => {
      processExit = { code, signal };
    });
    const page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(1280, 800),
    );
    activeApplication = {
      app,
      page,
      pid: app.process().pid,
      close: () => app.close(),
      log: () => applicationLog,
      exit: () => processExit,
    };
    return activeApplication;
  } catch (error) {
    await app.close();
    throw error;
  }
}
async function studioReady(page) {
  await page.locator('[data-studio-field="idea"]').waitFor({ state: 'visible', timeout: 45000 });
  if (!(await page.locator('[data-studio-field="idea"]').isEditable()))
    throw new Error('Prompt Studio field is not usable');
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}
async function prepareElectron() {
  const p = await profile('electron-template');
  const running = await electronLaunch(p);
  try {
    report.environment.electronGpu = await running.app.evaluate(async ({ app }) => ({
      features: app.getGPUFeatureStatus(),
      basic: await app.getGPUInfo('basic'),
    }));
    await running.page.evaluate(() => {
      localStorage.setItem('hasSeenWelcome', 'true');
      localStorage.setItem('v8-onboarding-complete', 'true');
      localStorage.setItem('creator-default-start-view', '/studio');
      localStorage.setItem('i18nextLng', 'en');
      localStorage.setItem(
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
      location.hash = '/studio';
    });
    await running.page.reload();
    await studioReady(running.page);
  } finally {
    await running.close();
  }
  return p;
}
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    report.cancelled = signal;
    report.finishedAt = new Date().toISOString();
    try {
      await activeApplication?.close();
    } catch (error) {
      report.cancellationError = String(error);
    }
    await save();
    await rm(temporary, { recursive: true, force: true });
    process.exit(130);
  });
let template;
async function launch(kind, scenario, name) {
  const p = await profile(name);
  if (kind === 'electron') {
    await cp(template.userData, p.userData, { recursive: true });
    const started = clock();
    const running = await electronLaunch(p);
    try {
      await studioReady(running.page);
      const startupMs = clock() - started;
      if (scenario === 'projects') {
        await running.page.evaluate(async () => {
          // Temporary benchmark fixture only: v15 bootstraps a default project.
          const module = await import(
            new URL('./assets/useProjectStore-Tnl_4Vtk.js', location.href).href
          );
          const store = Object.values(module).find(
            (value) =>
              typeof value?.getState === 'function' && Array.isArray(value.getState().projects),
          );
          if (!store || typeof store.setState !== 'function')
            throw new Error('Packaged v15 project fixture API not found');
          store.setState({ projects: [], currentProjectId: null, isLoading: false, error: null });
          if (store.getState().projects.length !== 0)
            throw new Error('Projects fixture is not empty');
          location.hash = '/projects';
        });
        await running.page
          .getByRole('heading', { name: 'Projects', exact: true })
          .waitFor({ timeout: 15000 });
        await running.page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        if (
          await running.page.locator('section[aria-label="Projects"] button[aria-current]').count()
        )
          throw new Error('Projects view is not empty');
      }
      if (scenario.startsWith('video-')) {
        await running.page
          .locator('[data-studio-field="idea"]')
          .fill('A synthetic benchmark video');
        await running.page
          .getByRole('button', { name: 'Build copy-ready pack', exact: true })
          .click();
        await running.page
          .getByLabel('Import result for this variant', { exact: true })
          .setInputFiles(options.video);
        const video = running.page
          .getByRole('region', { name: 'External video results', exact: true })
          .locator('video')
          .first();
        await video.waitFor({ timeout: 15000 });
        await video.evaluate(async (v, playing) => {
          if (v.readyState < 2)
            await new Promise((res, rej) => {
              v.addEventListener('loadeddata', res, { once: true });
              v.addEventListener('error', () => rej(Error('Video decode failed')), { once: true });
            });
          v.loop = true;
          if (playing) await v.play();
          else {
            v.currentTime = 1;
            v.pause();
          }
        }, scenario === 'video-playing');
        const before = await video.evaluate((v) => v.currentTime);
        await delay(500);
        const status = await video.evaluate((v) => ({
          time: v.currentTime,
          paused: v.paused,
          width: v.videoWidth,
          height: v.videoHeight,
        }));
        if (
          status.width !== 1280 ||
          status.height !== 720 ||
          (scenario === 'video-playing' && (status.paused || status.time <= before))
        )
          throw new Error(`Video workload failed: ${JSON.stringify(status)}`);
      }
      return { ...running, startupMs };
    } catch (error) {
      await running.close();
      throw error;
    }
  }
  const started = clock();
  const child = spawn(
    options.native,
    ['--benchmark', '--benchmark-scenario', scenario, '--video', options.video],
    { env: p.env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let log = '';
  const ready = new Promise((res, rej) => {
    const timeout = setTimeout(() => {
      cleanup();
      rej(Error(`Native readiness timed out: ${log.slice(-4000)}`));
    }, 45000);
    const cleanup = () => clearTimeout(timeout);
    child.on('error', (e) => {
      cleanup();
      rej(e);
    });
    child.on('exit', (code, signal) => {
      cleanup();
      rej(Error(`Native exited ${code}/${signal}: ${log.slice(-4000)}`));
    });
    child.stdout.on('data', (data) => {
      log += data;
      if (log.includes(`NATIVE_READY\t${scenario}`)) {
        cleanup();
        res();
      }
    });
    child.stderr.on('data', (data) => {
      log += data;
    });
  });
  const close = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    process.kill(-child.pid, 'SIGTERM');
    await Promise.race([new Promise((r) => child.once('exit', r)), delay(5000)]);
    if (child.exitCode === null && child.signalCode === null) {
      process.kill(-child.pid, 'SIGKILL');
      await new Promise((r) => child.once('exit', r));
    }
  };
  activeApplication = { close };
  try {
    await ready;
    return { pid: child.pid, startupMs: clock() - started, close, log: () => log };
  } catch (error) {
    await close();
    throw error;
  }
}
async function run(kind, scenario, pair, phase) {
  let running;
  const record = { kind, scenario, pair, phase, timestamp: new Date().toISOString() };
  records.push(record);
  try {
    running = await launch(kind, scenario, `${phase}-${scenario}-${pair}-${kind}`);
    record.startupMs = running.startupMs;
    if (phase === 'resources') {
      await delay(Number(options.settle) * 1000);
      const result = await exec(
        '/usr/bin/python3',
        [
          join(here, 'sample_processes.py'),
          '--pid',
          String(running.pid),
          '--duration',
          options.duration,
          '--interval',
          options.interval,
        ],
        { maxBuffer: 16 * 1024 * 1024 },
      );
      record.resources = JSON.parse(result.stdout);
      if (running.log?.().includes('NATIVE_WORKLOAD_INVALID'))
        throw new Error('Native video state changed during sampling');
      if (kind === 'electron' && scenario.startsWith('video-')) {
        const state = await running.page
          .getByRole('region', { name: 'External video results', exact: true })
          .locator('video')
          .first()
          .evaluate((v) => ({ paused: v.paused, ended: v.ended, ready: v.readyState }));
        if (state.ended || state.ready < 2 || state.paused !== (scenario === 'video-paused'))
          throw new Error('Electron video state changed during sampling');
      }
    }
    record.status = 'passed';
  } catch (error) {
    record.status = 'failed';
    record.error = String(error.stack || error);
  } finally {
    if (running) {
      try {
        await running.close();
      } catch (e) {
        record.closeError = String(e);
        record.status = 'failed';
      }
      if (running.log) record.applicationLog = running.log();
      if (running.exit) record.processExit = running.exit();
    }
    await save();
  }
  console.log(`${phase} ${pair + 1} ${kind} ${scenario}: ${record.status}`);
}
const stats = (values) => {
  const sorted = values.sort((a, b) => a - b);
  const n = sorted.length;
  return n
    ? {
        count: n,
        median: n % 2 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
        minimum: sorted[0],
        maximum: sorted[n - 1],
        p95: sorted[Math.min(n - 1, Math.ceil(n * 0.95) - 1)],
      }
    : null;
};
try {
  template = await prepareElectron();
  for (let pair = 0; pair < Number(options['startup-pairs']); pair++)
    for (const kind of pair % 2 ? ['electron', 'native'] : ['native', 'electron'])
      await run(kind, 'studio', pair, 'startup');
  for (const scenario of report.workloads)
    for (let pair = 0; pair < Number(options['resource-pairs']); pair++)
      for (const kind of pair % 2 ? ['electron', 'native'] : ['native', 'electron'])
        await run(kind, scenario, pair, 'resources');
  report.summary = {};
  for (const kind of ['native', 'electron']) {
    report.summary[kind] = {
      startupMs: stats(
        records
          .filter((r) => r.kind === kind && r.phase === 'startup' && r.status === 'passed')
          .map((r) => r.startupMs),
      ),
      resources: {},
    };
    for (const scenario of report.workloads) {
      const runs = records.filter(
        (r) => r.kind === kind && r.scenario === scenario && r.resources && r.status === 'passed',
      );
      report.summary[kind].resources[scenario] = Object.fromEntries(
        ['pss_kib', 'rss_kib', 'cpu_percent_one_core'].map((metric) => [
          metric,
          stats(
            runs.map((r) => {
              if (metric !== 'cpu_percent_one_core')
                return stats(r.resources.samples.map((s) => s[metric])).median;
              let previous = 0;
              let weighted = 0;
              for (const sample of r.resources.samples) {
                weighted += sample[metric] * (sample.elapsed_seconds - previous);
                previous = sample.elapsed_seconds;
              }
              return weighted / previous;
            }),
          ),
        ]),
      );
    }
  }
  report.failedRuns = records.filter((r) => r.status !== 'passed').length;
} catch (error) {
  report.fatalError = String(error.stack || error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await save();
  await rm(temporary, { recursive: true, force: true });
}
if (report.failedRuns) process.exitCode = 1;
console.log(`Report: ${resolve(options.output)}`);
