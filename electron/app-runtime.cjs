/* eslint-disable no-unused-vars */
const {
  app,
  BrowserWindow,
  Menu,
  shell,
  ipcMain,
  screen,
  crashReporter,
  dialog,
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const keytar = require('keytar');
const JSZip = require('jszip');
const { GoogleAuth } = require('google-auth-library');
const vertexAuth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const { PaidJobEngine, PaidJobStore } = require('./paid-job-engine.cjs');
const { registerProviderIpc } = require('./ipc/provider-ipc.cjs');
const { registerPaidJobsIpc } = require('./ipc/paid-jobs-ipc.cjs');
const { registerUpdateIpc } = require('./ipc/update-ipc.cjs');
const { KEYTAR_SERVICE, registerCredentialsIpc } = require('./ipc/credentials-ipc.cjs');
const { registerMediaIpc } = require('./ipc/media-ipc.cjs');
const { registerProjectIpc } = require('./ipc/project-ipc.cjs');
const { registerDiagnosticsIpc } = require('./ipc/diagnostics-ipc.cjs');
const { createApplicationWindow, createSafeModeController } = require('./window-lifecycle.cjs');
const { DesktopMediaStore, generateVideoDerivatives } = require('./media-store.cjs');
const { ProjectBackupStore } = require('./project-backup-store.cjs');
const { buildSupportSnapshot } = require('./support-bundle.cjs');
const {
  checksumFromManifest,
  sha256File,
  validateReleaseAssetUrl,
} = require('./update-security.cjs');
/* eslint-enable no-unused-vars */

const {
  SAFE_MODE_THRESHOLD: _SAFE_MODE_THRESHOLD,
  LOG_ROTATE_MAX_BYTES: _LOG_ROTATE_MAX_BYTES,
  LOG_ROTATE_KEEP_LINES: _LOG_ROTATE_KEEP_LINES,
  WRITE_BATCH_SIZE: _WRITE_BATCH_SIZE,
  DEDUPE_WINDOW_MS: _DEDUPE_WINDOW_MS,
  RATE_LIMIT_WINDOW_MS: _RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_ENTRIES: _RATE_LIMIT_MAX_ENTRIES,
  normalizeErrorEntry: normalizeErrorEntryUtil,
  passesRateLimit: passesRateLimitUtil,
  shouldDeduplicate: shouldDeduplicateUtil,
  getResolveInstallCandidates: getResolveInstallCandidatesUtil,
} = require('./utils.cjs');

let mainWindow;
let paidJobEngine;
let desktopMediaStore;
let projectBackupStore;
const isSmokeTest = process.argv.includes('--smoke-test');
const PROJECT_ROOT_FILE = 'project-root.json';

function getConfiguredProjectRoot() {
  const fallback = path.join(app.getPath('userData'), 'projects');
  try {
    const parsed = JSON.parse(
      fs.readFileSync(path.join(app.getPath('userData'), PROJECT_ROOT_FILE), 'utf8'),
    );
    return typeof parsed.root === 'string' && path.isAbsolute(parsed.root) ? parsed.root : fallback;
  } catch {
    return fallback;
  }
}

async function configureProjectRoot(root) {
  if (typeof root !== 'string' || !path.isAbsolute(root))
    throw new Error('Invalid project folder.');
  await fs.promises.mkdir(root, { recursive: true });
  const configPath = path.join(app.getPath('userData'), PROJECT_ROOT_FILE);
  const temporaryPath = `${configPath}.tmp`;
  await fs.promises.writeFile(temporaryPath, JSON.stringify({ root }, null, 2), { mode: 0o600 });
  await fs.promises.rename(temporaryPath, configPath);
  desktopMediaStore = new DesktopMediaStore(root, fetch, generateVideoDerivatives);
  projectBackupStore = new ProjectBackupStore(path.join(root, 'backups'), 5);
  return root;
}

if (isSmokeTest && process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

const safeMode = createSafeModeController({
  app,
  fs,
  path,
  argv: process.argv,
  threshold: _SAFE_MODE_THRESHOLD,
});

function createWindow() {
  mainWindow = createApplicationWindow({
    app,
    BrowserWindow,
    screen,
    shell,
    fs,
    path,
    rootDir: __dirname,
    isSmokeTest,
    markCleanExit: () => safeMode.markCleanExit(),
  });
}

function execFileSafe(command, args, timeout = 3000) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        resolve({ ok: false, stdout: String(stdout || ''), stderr: String(stderr || error) });
        return;
      }
      resolve({ ok: true, stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

function getResolveInstallCandidates() {
  return getResolveInstallCandidatesUtil(process.platform);
}

function detectResolveAvailability() {
  const candidates = getResolveInstallCandidates();
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
  return {
    available: Boolean(executablePath),
    executablePath,
  };
}

async function detectResolveRunning() {
  if (process.platform === 'win32') {
    const result = await execFileSafe('tasklist', ['/FI', 'IMAGENAME eq Resolve.exe']);
    return result.ok && result.stdout.toLowerCase().includes('resolve.exe');
  }

  if (process.platform === 'darwin') {
    const result = await execFileSafe('pgrep', ['-f', 'DaVinci Resolve']);
    return result.ok && result.stdout.trim().length > 0;
  }

  const result = await execFileSafe('pgrep', ['-f', 'resolve']);
  return result.ok && result.stdout.trim().length > 0;
}

async function getNleStatus(requestedApp = 'resolve') {
  const appName = requestedApp === 'premiere' ? 'premiere' : 'resolve';

  if (appName !== 'resolve') {
    return {
      app: appName,
      available: false,
      running: false,
    };
  }

  const availability = detectResolveAvailability();
  const running = availability.available ? await detectResolveRunning() : false;

  return {
    app: 'resolve',
    available: availability.available,
    running,
    executablePath: availability.executablePath,
  };
}

registerUpdateIpc({
  ipcMain,
  app,
  shell,
  fs,
  path,
  fetchImpl: fetch,
  validateReleaseAssetUrl,
  checksumFromManifest,
  sha256File,
  getMainWindow: () => mainWindow,
});

ipcMain.handle('get-platform-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
  };
});

ipcMain.handle('get-safe-mode-status', () => safeMode.getStatus());
ipcMain.handle('reset-safe-mode', () => safeMode.reset());

// Error logging IPC handler (v1.5.0 Sprint 1)
// Writes are queued and asynchronous to avoid blocking the main process.
const LOG_ROTATE_MAX_BYTES = _LOG_ROTATE_MAX_BYTES;
const LOG_ROTATE_KEEP_LINES = _LOG_ROTATE_KEEP_LINES;
const WRITE_BATCH_SIZE = _WRITE_BATCH_SIZE;
const DEDUPE_WINDOW_MS = _DEDUPE_WINDOW_MS;
const RATE_LIMIT_WINDOW_MS = _RATE_LIMIT_WINDOW_MS;
const RATE_LIMIT_MAX_ENTRIES = _RATE_LIMIT_MAX_ENTRIES;

const queuedErrorEntries = [];
let isDrainingErrorQueue = false;
const recentFingerprints = new Map();
const enqueueTimes = [];

function normalizeErrorEntry(input) {
  return normalizeErrorEntryUtil(input);
}

function passesRateLimit(now) {
  return passesRateLimitUtil(now, enqueueTimes, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_ENTRIES);
}

function shouldDeduplicate(entry, now) {
  return shouldDeduplicateUtil(entry, now, recentFingerprints, DEDUPE_WINDOW_MS);
}

function enqueueErrorEntries(entryOrBatch) {
  const entries = Array.isArray(entryOrBatch) ? entryOrBatch : [entryOrBatch];
  const now = Date.now();

  if (!passesRateLimit(now)) {
    return;
  }

  for (const rawEntry of entries) {
    const normalized = normalizeErrorEntry(rawEntry);
    if (shouldDeduplicate(normalized, now)) {
      continue;
    }
    queuedErrorEntries.push(normalized);
  }

  void drainErrorQueue();
}

async function appendErrorEntriesAsync(entries) {
  if (entries.length === 0) return;

  const logPath = path.join(app.getPath('userData'), 'error.log');
  const lines = entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
  await fs.promises.appendFile(logPath, lines, 'utf8');

  const stats = await fs.promises.stat(logPath);
  if (stats.size <= LOG_ROTATE_MAX_BYTES) return;

  const content = await fs.promises.readFile(logPath, 'utf8');
  const existing = content.split('\n').filter((line) => line.trim() !== '');
  const kept = existing.slice(-LOG_ROTATE_KEEP_LINES);
  await fs.promises.writeFile(logPath, `${kept.join('\n')}\n`, 'utf8');
}

async function drainErrorQueue() {
  if (isDrainingErrorQueue) return;
  isDrainingErrorQueue = true;

  try {
    while (queuedErrorEntries.length > 0) {
      const batch = queuedErrorEntries.splice(0, WRITE_BATCH_SIZE);
      await appendErrorEntriesAsync(batch);
    }
  } catch (err) {
    console.error('Failed to write error log entry:', err);
  } finally {
    isDrainingErrorQueue = false;
  }
}

ipcMain.handle('log-error', async (_, entryOrBatch) => {
  enqueueErrorEntries(entryOrBatch);
  return true;
});

ipcMain.on('log-error-fire-and-forget', (_, entryOrBatch) => {
  enqueueErrorEntries(entryOrBatch);
});

ipcMain.on('log-error-sync', (event, entryOrBatch) => {
  enqueueErrorEntries(entryOrBatch);
  event.returnValue = true;
});

process.on('uncaughtException', (error) => {
  enqueueErrorEntries({
    level: 'error',
    code: 'MAIN_UNCAUGHT_EXCEPTION',
    message: error?.message || 'Main process uncaught exception',
    stack: error?.stack,
    context: { source: 'electron:main' },
    timestamp: Date.now(),
  });
});

process.on('unhandledRejection', (reason) => {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : 'Main process unhandled rejection';
  const stack = reason instanceof Error ? reason.stack : undefined;

  enqueueErrorEntries({
    level: 'error',
    code: 'MAIN_UNHANDLED_REJECTION',
    message,
    stack,
    context: { source: 'electron:main' },
    timestamp: Date.now(),
  });
});

// Telemetry IPC — accepts a batch of events and writes to telemetry.ndjson
ipcMain.handle('send-telemetry', async (_, events) => {
  if (!Array.isArray(events) || events.length === 0) return false;
  try {
    const telemetryPath = path.join(app.getPath('userData'), 'telemetry.ndjson');
    const lines = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await fs.promises.appendFile(telemetryPath, lines, 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write telemetry:', err);
    return false;
  }
});

// Get native crash reports collected by Electron crashReporter
ipcMain.handle('get-crash-reports', () => {
  try {
    return crashReporter.getUploadedReports();
  } catch {
    return [];
  }
});

ipcMain.handle('get-nle-status', async (_, appName) => {
  return getNleStatus(appName);
});

ipcMain.handle('direct-export-to-nle', async (_, request) => {
  const targetApp = request?.app === 'premiere' ? 'premiere' : 'resolve';
  const payload = request?.payload;

  if (!payload || typeof payload !== 'object') {
    return {
      success: false,
      message: 'Invalid direct export payload.',
      fallbackSuggested: true,
    };
  }

  const status = await getNleStatus(targetApp);

  if (!status.available) {
    return {
      success: false,
      message: 'DaVinci Resolve is not installed on this machine.',
      fallbackSuggested: true,
    };
  }

  if (!status.running) {
    return {
      success: false,
      message: 'DaVinci Resolve is not running. Open it and retry direct export.',
      fallbackSuggested: true,
    };
  }

  try {
    const bridgeDir = path.join(app.getPath('userData'), 'nle-bridge');
    await fs.promises.mkdir(bridgeDir, { recursive: true });

    const manifestPath = path.join(bridgeDir, `resolve-export-${Date.now()}.json`);
    await fs.promises.writeFile(
      manifestPath,
      JSON.stringify(
        {
          target: 'resolve',
          source: 'veo-prompt-generator',
          createdAt: new Date().toISOString(),
          payload,
        },
        null,
        2,
      ),
      'utf8',
    );

    return {
      success: true,
      message: 'Direct export manifest sent to DaVinci Resolve bridge.',
      manifestPath,
    };
  } catch (error) {
    console.error('Direct export bridge failed:', error);
    return {
      success: false,
      message: 'Failed to create direct export manifest.',
      fallbackSuggested: true,
    };
  }
});

registerCredentialsIpc({ ipcMain, keytar });

registerProviderIpc({
  ipcMain,
  keytar,
  keytarService: KEYTAR_SERVICE,
  dialog,
  getMainWindow: () => mainWindow,
  vertexAuth,
});

registerPaidJobsIpc({
  ipcMain,
  getEngine: () => paidJobEngine,
  dialog,
  getMainWindow: () => mainWindow,
});

registerMediaIpc({
  ipcMain,
  getMediaStore: () => desktopMediaStore,
  getApiKey: () => keytar.getPassword(KEYTAR_SERVICE, 'gemini-api-key'),
});

registerProjectIpc({
  ipcMain,
  dialog,
  getMainWindow: () => mainWindow,
  getProjectBackupStore: () => projectBackupStore,
  configureRoot: configureProjectRoot,
});

registerDiagnosticsIpc({
  ipcMain,
  app,
  dialog,
  fs,
  path,
  os,
  keytar,
  keytarService: KEYTAR_SERVICE,
  JSZip,
  buildSupportSnapshot,
  getSafeModeStatus: () => safeMode.getStatus(),
  getMediaStore: () => desktopMediaStore,
  getPaidJobEngine: () => paidJobEngine,
  getMainWindow: () => mainWindow,
});

app.whenReady().then(() => {
  // Configure native crash reporter (opt-in endpoint, local collection always active)
  crashReporter.start({
    productName: 'Loofi Creator Studio',
    companyName: 'Loofi',
    submitURL: '', // Empty = local collection only, no server submission
    uploadToServer: false,
    ignoreSystemCrashHandler: false,
  });

  safeMode.initialize();
  const projectRoot = getConfiguredProjectRoot();
  desktopMediaStore = new DesktopMediaStore(projectRoot, fetch, generateVideoDerivatives);
  paidJobEngine = new PaidJobEngine({
    store: new PaidJobStore(path.join(app.getPath('userData'), 'paid-jobs-v1.json')),
    getApiKey: () => keytar.getPassword(KEYTAR_SERVICE, 'gemini-api-key'),
    storeMedia: (input) => desktopMediaStore.importBytes(input),
    onUpdate: (job) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('paid-job-update', job);
      }
    },
  });
  projectBackupStore = new ProjectBackupStore(path.join(projectRoot, 'backups'), 5);
  createWindow();
  void paidJobEngine.resumeAll();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  safeMode.markCleanExit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
