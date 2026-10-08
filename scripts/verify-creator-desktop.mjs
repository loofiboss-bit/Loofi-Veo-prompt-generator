#!/usr/bin/env node
/** Real desktop acceptance with five isolated profiles, no paid/provider calls. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { _electron } from 'playwright';
import JSZip from 'jszip';
import { checkMediaRuntime } from './check-media-runtime.mjs';
const exec = promisify(execFile);
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const packagedExecutable = process.env.PACKAGED_ELECTRON_PATH;
const server = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:8099';
const output = path.resolve(
  root,
  process.env.CREATOR_VERIFICATION_DIR || 'output/playwright/creator-desktop',
);
const runtime = packagedExecutable
  ? path.join(path.dirname(packagedExecutable), 'resources/media-runtime')
  : path.join(root, 'packaging/media-runtime');
const ffprobe = path.join(
  runtime,
  `${process.platform}-${process.arch}`,
  process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe',
);
const ffmpeg = path.join(
  runtime,
  `${process.platform}-${process.arch}`,
  process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
);
const scenarioFilter =
  process.env.CREATOR_SCENARIOS?.split(',') ??
  (packagedExecutable ? ['01-first-offline-export'] : undefined);
let activeApp;
const report = {
  startedAt: new Date().toISOString(),
  kind: 'AI-driven isolated desktop acceptance',
  limitations: [
    'Five AI-driven profiles are not five human usability sessions.',
    packagedExecutable
      ? 'The app runs from a Linux distribution layout with file resources and an isolated profile, without Vite.'
      : 'The app runs from the Vite development server with the real Electron main/preload and verified bundled runtime.',
    'Only the native save dialog is automated to a private test destination; rendering, IPC, package output and ffprobe are real.',
    'Fault scenarios inject controlled timeline/media state defects into the isolated profile.',
  ],
  scenarios: [],
};
await fs.mkdir(output, { recursive: true, mode: 0o700 });
if (scenarioFilter) {
  try {
    const previous = JSON.parse(await fs.readFile(path.join(output, 'report.json'), 'utf8'));
    report.scenarios = previous.scenarios.filter((entry) => !scenarioFilter.includes(entry.name));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
await checkMediaRuntime(runtime, [`${process.platform}-${process.arch}`]);
if (!packagedExecutable)
  assert.equal((await fetch(server)).ok, true, 'Vite server must already be running.');

async function launch(name, reopen = false) {
  const directory = path.join(output, name);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const profile = path.join(directory, 'profile');
  if (!reopen) await fs.rm(profile, { recursive: true, force: true });
  await fs.mkdir(profile, { recursive: true, mode: 0o700 });
  const app = await _electron.launch({
    executablePath: packagedExecutable || require('electron'),
    cwd: root,
    args: [
      ...(packagedExecutable ? [] : [root]),
      `--user-data-dir=${path.join(profile, 'user-data')}`,
      '--no-sandbox',
      '--ozone-platform=x11',
      '--disable-gpu',
    ],
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: server,
      XDG_CONFIG_HOME: path.join(profile, 'config'),
      XDG_CACHE_HOME: path.join(profile, 'cache'),
      XDG_DATA_HOME: path.join(profile, 'data'),
      DBUS_SESSION_BUS_ADDRESS: 'unix:path=/nonexistent/creator-verification-bus',
    },
    recordVideo: { dir: path.join(directory, 'video'), size: { width: 1280, height: 900 } },
    timeout: 60000,
  });
  activeApp = app;
  app
    .process()
    .on('exit', (code, signal) => console.log(`${name}: Electron exit ${code}, signal ${signal}`));
  const context = app.context();
  app
    .process()
    .stdout?.on('data', (chunk) => fs.appendFile(path.join(directory, 'electron.log'), chunk));
  app
    .process()
    .stderr?.on('data', (chunk) => fs.appendFile(path.join(directory, 'electron.log'), chunk));
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (
      /^https?:/.test(url) &&
      (packagedExecutable || !url.startsWith(new URL(server).origin + '/'))
    )
      await route.abort();
    else await route.continue();
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const isolation = await app.evaluate(({ app, BrowserWindow }) => {
    const userData = app.getPath('userData');
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.closeDevTools();
      window.setBounds({ width: 1280, height: 900 });
    }
    return userData;
  });
  assert.ok(isolation.startsWith(profile + path.sep), `Unexpected profile path: ${isolation}`);
  const page =
    app.windows().find((candidate) => !candidate.url().startsWith('devtools:')) ??
    (await app.firstWindow());
  console.log(`${name}: connected to ${page.url()}`);
  page.setDefaultTimeout(30000);
  await page.waitForLoadState('domcontentloaded');
  await app.evaluate(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.setBackgroundThrottling(false);
      window.hide();
    }
  });
  await page.waitForFunction(() => Boolean(window.electron?.getTimelineRenderCapabilities));
  if (!reopen) await page.getByRole('button', { name: /^(Start creating|Börja skapa)$/ }).waitFor();
  const language = page.getByRole('combobox', { name: /^(Language|Språk)$/ });
  if ((await language.count()) && (await language.inputValue()) !== 'en')
    await language.selectOption('en');
  await page.screenshot({ path: path.join(directory, 'welcome.png') });
  const start = page.getByRole('button', { name: /^(Start creating|Börja skapa)$/ });
  if (await start.count()) await start.click();
  await page.goto(packagedExecutable ? page.url().split('#')[0] + '#/start' : `${server}/#/start`, {
    waitUntil: 'domcontentloaded',
  });
  await page.screenshot({ path: path.join(directory, 'launch.png') });
  await page.getByRole('heading', { name: 'Your next creative moment' }).waitFor();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.evaluate(() => {
    window.__creatorVerificationJobs = [];
    window.electron.onTimelineRenderUpdate((job) => window.__creatorVerificationJobs.push(job));
  });
  const capabilities = await page.evaluate(() => window.electron.getTimelineRenderCapabilities());
  assert.equal(capabilities.available, true, capabilities.reason);
  return { app, context, page, directory, errors, capabilities, isolation };
}
async function close(session) {
  await session.context.tracing.stop({
    path: path.join(session.directory, `trace-${Date.now()}.zip`),
  });
  await session.app.close();
}
async function snapshot(session, name) {
  await session.page.screenshot({
    path: path.join(session.directory, `${name}.png`),
    fullPage: true,
  });
}
async function projectState(page) {
  return page.evaluate(async () => {
    const { useProjectStore } = await import('/src/core/store/useProjectStore.ts');
    const { projectDocumentService } = await import('/src/core/services/projectDocumentService.ts');
    const { useAppStore } = await import('/src/core/store/useAppStore.ts');
    const id = useProjectStore.getState().currentProjectId;
    const project = id ? await projectDocumentService.load(id) : null;
    return {
      id,
      project,
      clips: useAppStore.getState().clips,
      assets: useAppStore.getState().assets,
    };
  });
}
async function example(session, index = 0) {
  const buttons = session.page.getByRole('button', { name: 'Open example', exact: true });
  await buttons.nth(index).click();
  await session.page.getByRole('heading', { name: 'Export video', exact: true }).waitFor();
  await snapshot(session, 'timeline-example');
  if (packagedExecutable) return;
  const state = await projectState(session.page);
  assert.ok(state.project && state.assets.length >= 2 && state.clips.length >= 7);
  return state;
}
async function save(session, job, packageOutput = false) {
  const destination = path.join(
    session.directory,
    packageOutput ? 'publication.zip' : 'delivery.mp4',
  );
  await session.app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, destination);
  await session.page
    .getByRole('button', {
      name: packageOutput ? 'Save publication package' : 'Save MP4',
      exact: true,
    })
    .click();
  await session.page.waitForFunction(
    () =>
      document.body.textContent.includes('saved') ||
      document.body.textContent.includes('delivery.mp4') ||
      document.body.textContent.includes('publication.zip'),
  );
  await fs.access(destination);
  if (packageOutput) {
    const zip = await JSZip.loadAsync(await fs.readFile(destination));
    const names = Object.keys(zip.files);
    assert.ok(names.some((name) => name.endsWith('.mp4')));
    assert.ok(names.some((name) => name.endsWith('.srt')));
    assert.ok(names.some((name) => name.endsWith('.png')));
    assert.ok(names.some((name) => name.includes('publication')));
    return { path: destination, entries: names };
  }
  const { stdout } = await exec(
    ffprobe,
    ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', destination],
    { timeout: 30000, maxBuffer: 4 * 1024 * 1024 },
  );
  const probe = JSON.parse(stdout);
  const video = probe.streams.find((stream) => stream.codec_type === 'video');
  const audio = probe.streams.find((stream) => stream.codec_type === 'audio');
  assert.equal(video.codec_name, 'h264');
  assert.equal(audio.codec_name, 'aac');
  assert.equal(video.r_frame_rate, '30/1');
  assert.ok(Number(probe.format.duration) > 0 && Number(probe.format.duration) <= 60.1);
  assert.ok(
    Math.abs(Number(video.duration) - Number(audio.duration)) < 0.1,
    'Audio/video durations diverge.',
  );
  await exec(
    ffmpeg,
    [
      '-v',
      'error',
      '-i',
      destination,
      '-ss',
      '1',
      '-frames:v',
      '1',
      '-y',
      path.join(session.directory, 'rendered-frame.png'),
    ],
    { timeout: 30000 },
  );
  return {
    path: destination,
    width: video.width,
    height: video.height,
    fps: video.r_frame_rate,
    videoCodec: video.codec_name,
    audioCodec: audio.codec_name,
    duration: Number(probe.format.duration),
    contentHash: job.contentHash,
  };
}
async function render(session) {
  await session.page.evaluate(() => {
    window.__creatorVerificationUnsubscribe?.();
    window.__creatorVerificationJobs = [];
    window.__creatorVerificationUnsubscribe = window.electron.onTimelineRenderUpdate((job) =>
      window.__creatorVerificationJobs.push(job),
    );
  });
  await session.page.getByRole('button', { name: 'Export video', exact: true }).click();
  await session.page.waitForFunction(
    () =>
      window.__creatorVerificationJobs.some((job) => ['complete', 'failed'].includes(job.status)),
    undefined,
    { timeout: 180000 },
  );
  const job = await session.page.evaluate(() => window.__creatorVerificationJobs.at(-1));
  assert.equal(job.status, 'complete', job.error);
  await session.page.getByRole('button', { name: 'Save MP4', exact: true }).waitFor();
  await snapshot(session, 'export-complete');
  return { job, file: await save(session, job) };
}
async function scenario(name, execute) {
  if (scenarioFilter && !scenarioFilter.includes(name)) return;
  const started = performance.now();
  let session;
  const result = { name, status: 'failed', seconds: 0 };
  try {
    session = await launch(name);
    result.profilePath = session.isolation;
    result.runtime = session.capabilities;
    await snapshot(session, 'start');
    result.evidence = await execute(session);
    assert.equal(session.errors.length, 0, session.errors.join('\n'));
    result.status = 'passed';
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    if (session) await snapshot(session, 'failure').catch(() => undefined);
  } finally {
    if (session) await close(session).catch(() => undefined);
    else if (activeApp) await activeApp.close().catch(() => undefined);
    activeApp = undefined;
    result.seconds = Math.round((performance.now() - started) / 10) / 100;
    report.scenarios.push(result);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(
      `${result.name}: ${result.status} (${result.seconds}s)${result.error ? ` — ${result.error}` : ''}`,
    );
  }
}
await scenario('01-first-offline-export', async (session) => {
  await example(session, 0);
  const delivery = await render(session);
  assert.deepEqual([delivery.file.width, delivery.file.height], [1080, 1920]);
  return { ...delivery.file, package: await save(session, delivery.job, true) };
});
await scenario('02-vertical-unicode-captions', async (session) => {
  await example(session, 0);
  const captionText = session.page.getByLabel('Text', { exact: true }).first();
  await captionText.fill('Hej världen! العربية 日本語');
  await session.page.getByLabel('Output', { exact: true }).selectOption('burn-in');
  await session.page.getByLabel('Style', { exact: true }).selectOption('karaoke');
  await snapshot(session, 'captions-reviewed');
  const delivery = await render(session);
  assert.deepEqual([delivery.file.width, delivery.file.height], [1080, 1920]);
  const packageResult = await save(session, delivery.job, true);
  const zip = await JSZip.loadAsync(await fs.readFile(packageResult.path));
  const subtitles = await zip
    .file(Object.keys(zip.files).find((name) => name.endsWith('.srt')))
    .async('string');
  assert.ok(subtitles.includes('Hej världen! العربية 日本語'));
  const verification = JSON.parse(
    await fs.readFile(
      path.join(session.isolation, 'creator-render-jobs', delivery.job.id, 'verification.json'),
      'utf8',
    ),
  );
  assert.equal(verification.captionGlyphsVerified, true);
  assert.ok(verification.captionFonts.includes('Noto Sans Arabic'));
  assert.ok(verification.captionFonts.includes('Noto Sans CJK JP'));
  return {
    ...delivery.file,
    unicodeSidecarVerified: true,
    bundledUnicodeFontsSelected: true,
    package: packageResult,
  };
});
await scenario('03-music-visualization', async (session) => {
  const state = await example(session, 2);
  assert.equal(state.project.studioDraft.mode, 'music');
  const delivery = await render(session);
  assert.deepEqual([delivery.file.width, delivery.file.height], [1920, 1080]);
  return delivery.file;
});
await scenario('04-reopen-style-snapshot', async (session) => {
  const original = await example(session, 1);
  await session.page.goto(`${server}/#/start`, { waitUntil: 'domcontentloaded' });
  await session.page.getByLabel('Style name', { exact: true }).fill('Isolated blue');
  await session.page.getByLabel('Primary color', { exact: true }).fill('#245577');
  await session.page.getByRole('button', { name: 'Save style', exact: true }).click();
  await session.page
    .getByRole('button', { name: 'Preview on current project', exact: true })
    .click();
  await session.page.getByRole('button', { name: 'Apply to this project', exact: true }).click();
  await session.page
    .getByRole('button', { name: 'Apply to this project', exact: true })
    .waitFor({ state: 'hidden' });
  await session.page.getByLabel('Primary color', { exact: true }).fill('#aa4400');
  await session.page.getByRole('button', { name: 'Save style', exact: true }).click();
  await snapshot(session, 'style-edited-after-apply');
  const applied = await projectState(session.page);
  assert.equal(applied.project.creatorDelivery.style.primaryColor, '#245577');
  await session.page.reload();
  await session.page.getByRole('heading', { name: 'Recent projects', exact: true }).waitFor();
  const article = session.page.locator('article').filter({
    has: session.page.getByRole('heading', { name: original.project.name, exact: true }),
  });
  await article.getByRole('button', { name: 'Continue a project', exact: true }).click();
  await session.page.getByRole('heading', { name: 'Export video', exact: true }).waitFor();
  const reopened = await projectState(session.page);
  assert.equal(reopened.id, original.id);
  assert.equal(reopened.project.creatorDelivery.style.primaryColor, '#245577');
  return { ...(await render(session)).file, styleSnapshotSurvivedProfileEditAndReload: true };
});
await scenario('05-error-recovery', async (session) => {
  await example(session, 0);
  await session.page.evaluate(async () => {
    const { useAppStore } = await import('/src/core/store/useAppStore.ts');
    window.__verificationOriginalAssets = useAppStore.getState().assets;
    useAppStore.setState({ assets: [] });
  });
  await session.page.getByRole('button', { name: 'Export video', exact: true }).click();
  await session.page
    .getByRole('alert')
    .filter({ hasText: /Local media is missing/ })
    .waitFor();
  await snapshot(session, 'missing-media-visible');
  await session.page.evaluate(async () => {
    const { useAppStore } = await import('/src/core/store/useAppStore.ts');
    const state = useAppStore.getState();
    useAppStore.setState({ assets: window.__verificationOriginalAssets });
    state.updateTimelineClip(state.clips.find((clip) => clip.type === 'video').id, {
      opacity: 0.5,
    });
  });
  await session.page.getByRole('button', { name: 'Export video', exact: true }).click();
  await session.page
    .getByRole('alert')
    .filter({ hasText: /not supported/ })
    .waitFor();
  await snapshot(session, 'unsupported-effect-visible');
  await session.page.evaluate(async () => {
    const { useAppStore } = await import('/src/core/store/useAppStore.ts');
    const state = useAppStore.getState();
    state.updateTimelineClip(state.clips.find((clip) => clip.type === 'video').id, { opacity: 1 });
  });
  await session.page.getByRole('button', { name: 'Export video', exact: true }).click();
  await session.page.getByRole('button', { name: 'Cancel export', exact: true }).click();
  await session.page.waitForFunction(() =>
    window.__creatorVerificationJobs.some((job) => job.status === 'cancelled'),
  );
  await snapshot(session, 'cancelled-visible');
  return {
    ...(await render(session)).file,
    missingMediaRecovered: true,
    unsupportedEffectReported: true,
    cancellationRecovered: true,
  };
});
report.completedAt = new Date().toISOString();
report.passed = report.scenarios.filter((scenario) => scenario.status === 'passed').length;
report.withinFiveMinutes = report.scenarios.filter(
  (scenario) => scenario.status === 'passed' && scenario.seconds <= 300,
).length;
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(`Evidence: ${output}/report.json`);
if (report.scenarios.some((scenario) => scenario.status !== 'passed')) process.exitCode = 1;
