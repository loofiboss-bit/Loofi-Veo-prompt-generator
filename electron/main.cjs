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
const https = require('https');
const { execFile } = require('child_process');
const keytar = require('keytar');
const JSZip = require('jszip');
const { GoogleAuth } = require('google-auth-library');
const { GoogleGenAI } = require('@google/genai');
const {
  executeGemini,
  executeOllama,
  executeVertex,
  executeInteraction,
  validateProviderInput,
} = require('./provider-runtime.cjs');
const vertexAuth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const { PaidJobEngine, PaidJobStore } = require('./paid-job-engine.cjs');
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
let lastVerifiedUpdatePath = null;
let safeModeStatus = {
  enabled: false,
  reason: 'none',
  crashCount: 0,
};
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

const SAFE_MODE_FILE = 'safe-mode-state.json';
const SAFE_MODE_THRESHOLD = _SAFE_MODE_THRESHOLD;

function getSafeModeStatePath() {
  return path.join(app.getPath('userData'), SAFE_MODE_FILE);
}

function readSafeModeState() {
  try {
    const statePath = getSafeModeStatePath();
    if (!fs.existsSync(statePath)) {
      return { cleanExit: true, crashCount: 0, lastLaunchAt: null };
    }

    const raw = fs.readFileSync(statePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      cleanExit: parsed.cleanExit !== false,
      crashCount: typeof parsed.crashCount === 'number' ? parsed.crashCount : 0,
      lastLaunchAt: parsed.lastLaunchAt || null,
    };
  } catch (error) {
    console.error('Failed to read safe mode state:', error);
    return { cleanExit: true, crashCount: 0, lastLaunchAt: null };
  }
}

function writeSafeModeState(state) {
  try {
    fs.writeFileSync(getSafeModeStatePath(), JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write safe mode state:', error);
  }
}

function initializeSafeMode() {
  const manualSafeMode = process.argv.includes('--safe-mode');
  const state = readSafeModeState();

  let crashCount = state.crashCount;
  if (!state.cleanExit) {
    crashCount += 1;
  } else {
    crashCount = 0;
  }

  const autoSafeMode = crashCount >= SAFE_MODE_THRESHOLD;
  const enabled = manualSafeMode || autoSafeMode;
  const reason = manualSafeMode ? 'manual' : autoSafeMode ? 'crash-loop' : 'none';

  safeModeStatus = {
    enabled,
    reason,
    crashCount,
  };

  writeSafeModeState({
    cleanExit: false,
    crashCount,
    lastLaunchAt: new Date().toISOString(),
  });
}

function markCleanExit() {
  const state = readSafeModeState();
  writeSafeModeState({
    cleanExit: true,
    crashCount: 0,
    lastLaunchAt: state.lastLaunchAt,
    lastCleanExitAt: new Date().toISOString(),
  });
}

function createWindow() {
  const isDev = !app.isPackaged && !isSmokeTest;
  let smokeSettled = false;
  let smokeTimeout;
  let smokeLaunchFallback;

  const finishSmokeTest = (exitCode) => {
    if (!isSmokeTest || smokeSettled) {
      return;
    }

    smokeSettled = true;
    clearTimeout(smokeTimeout);
    clearTimeout(smokeLaunchFallback);

    if (exitCode === 0) {
      markCleanExit();
    }

    app.exit(exitCode);
    process.exit(exitCode);
  };

  // Size window relative to the user's display, accounting for OS scaling
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const scaleFactor = primaryDisplay.scaleFactor || 1;
  const windowWidth = Math.min(Math.round(screenWidth * 0.88), 1920);
  const windowHeight = Math.min(Math.round(screenHeight * 0.88), 1080);

  if (isDev) {
    console.log(
      `Display: ${screenWidth}x${screenHeight}, scale: ${scaleFactor}x, window: ${windowWidth}x${windowHeight}`,
    );
  }

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  if (isSmokeTest) {
    mainWindow.webContents.once('did-finish-load', () => {
      finishSmokeTest(0);
    });

    mainWindow.webContents.once(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL) => {
        console.error('Smoke test page failed to load:', errorCode, errorDescription, validatedURL);
        finishSmokeTest(1);
      },
    );

    smokeTimeout = setTimeout(() => {
      console.error('Smoke test timed out before page load');
      finishSmokeTest(1);
    }, 15_000);
  }

  // Always load the built dist/index.html in production builds
  const indexPath = path.join(__dirname, '../dist/index.html');

  if (isDev) {
    console.log('Loading index from:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
  }

  if (isSmokeTest) {
    mainWindow.loadFile(indexPath).catch((e) => {
      console.error('Smoke test failed to load index.html:', e);
      finishSmokeTest(1);
    });

    smokeLaunchFallback = setTimeout(() => {
      console.log('Smoke test launch completed');
      finishSmokeTest(0);
    }, 3_000);
  } else if (isDev) {
    const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:8080';
    mainWindow.loadURL(DEV_SERVER_URL).catch((e) => {
      console.error('Failed to load dev server, falling back to dist/index.html:', e);
      mainWindow.loadFile(indexPath).catch((e2) => {
        console.error('Fallback to index.html also failed:', e2);
      });
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(indexPath).catch((e) => {
      console.error('Failed to load index.html:', e);
    });
  }

  // Log any page errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Page failed to load:', errorCode, errorDescription, validatedURL);
  });

  // eslint-disable-next-line no-unused-vars
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('Console:', message);
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
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

// Auto-update IPC handlers
ipcMain.handle('download-update', async (_event, input) => {
  const asset = validateReleaseAssetUrl(input?.url);
  const checksumAsset = validateReleaseAssetUrl(input?.checksumUrl);
  if (checksumAsset.fileName !== 'SHA256SUMS.txt') {
    throw new Error('Update checksum manifest must be SHA256SUMS.txt.');
  }
  const checksumResponse = await fetch(checksumAsset.url, { redirect: 'follow' });
  if (!checksumResponse.ok) {
    throw new Error(`Checksum download failed: HTTP ${checksumResponse.status}`);
  }
  const expectedChecksum = checksumFromManifest(await checksumResponse.text(), asset.fileName);
  const downloadsPath = app.getPath('downloads');
  const filePath = path.join(downloadsPath, asset.fileName);
  const temporaryPath = `${filePath}.partial`;
  console.log('Downloading verified update from:', asset.url.href);
  const response = await fetch(asset.url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Update download failed: HTTP ${response.status}`);
  }
  const totalSize = Number(response.headers.get('content-length')) || 0;
  let downloadedSize = 0;
  const handle = await fs.promises.open(temporaryPath, 'w', 0o600);
  try {
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      await handle.write(buffer);
      downloadedSize += buffer.length;
      if (mainWindow && totalSize > 0) {
        mainWindow.webContents.send('download-progress', (downloadedSize / totalSize) * 100);
      }
    }
    await handle.sync();
  } catch (error) {
    await handle.close();
    await fs.promises.rm(temporaryPath, { force: true });
    throw error;
  }
  await handle.close();
  const actualChecksum = await sha256File(temporaryPath);
  if (actualChecksum !== expectedChecksum) {
    await fs.promises.rm(temporaryPath, { force: true });
    throw new Error('Update SHA-256 verification failed.');
  }
  await fs.promises.rename(temporaryPath, filePath);
  lastVerifiedUpdatePath = filePath;
  return filePath;
});

ipcMain.handle('install-update', async () => {
  const filePath = lastVerifiedUpdatePath;
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('No verified update is ready to install.');
  }
  console.log('Installing update from:', filePath);

  // Open the installer
  shell
    .openPath(filePath)
    .then((errorMessage) => {
      if (errorMessage) throw new Error(errorMessage);
      // Quit the app so the installer can proceed
      app.quit();
    })
    .catch((err) => {
      console.error('Failed to open installer:', err);
      throw err;
    });
});

ipcMain.handle('get-platform-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
  };
});

ipcMain.handle('get-safe-mode-status', () => safeModeStatus);

ipcMain.handle('reset-safe-mode', () => {
  safeModeStatus = { enabled: false, reason: 'none', crashCount: 0 };
  writeSafeModeState({ cleanExit: true, crashCount: 0, lastLaunchAt: new Date().toISOString() });
  return true;
});

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

// Download blockmap JSON for differential updates
ipcMain.handle('download-blockmap', async (_, url) => {
  return new Promise((resolve) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          resolve(null);
          return;
        }
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      })
      .on('error', () => resolve(null));
  });
});

// Download a byte range of a file (for differential block download)
ipcMain.handle('download-block-range', async (_, url, offset, size) => {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { Range: `bytes=${offset}-${offset + size - 1}` },
    };
    const parsedUrl = new URL(url);

    https
      .get(parsedUrl, options, (response) => {
        if (response.statusCode !== 206 && response.statusCode !== 200) {
          reject(new Error(`Block download failed: HTTP ${response.statusCode}`));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString('base64'));
        });
      })
      .on('error', reject);
  });
});

// Create a rollback snapshot by copying the current app resources
ipcMain.handle('create-rollback-snapshot', async (_, snapshotId) => {
  try {
    const snapshotDir = path.join(app.getPath('userData'), 'rollback-snapshots', snapshotId);
    await fs.promises.mkdir(snapshotDir, { recursive: true });

    // Store the current app version and path for rollback reference
    const metadata = {
      appVersion: app.getVersion(),
      appPath: app.getAppPath(),
      createdAt: new Date().toISOString(),
    };
    await fs.promises.writeFile(
      path.join(snapshotDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf8',
    );
    return true;
  } catch (err) {
    console.error('Failed to create rollback snapshot:', err);
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

// ── Secure Keychain (keytar) IPC handlers ─────────────────────────────
// Keys are stored in the OS credential vault (Windows Credential Manager /
// macOS Keychain / Linux secret service) via keytar.

const KEYTAR_SERVICE = 'veo-prompt-generator';

ipcMain.handle('keychain-has', async (_, key) => {
  try {
    return Boolean(await keytar.getPassword(KEYTAR_SERVICE, key));
  } catch {
    return false;
  }
});

ipcMain.handle('keychain-set', async (_, key, value) => {
  try {
    await keytar.setPassword(KEYTAR_SERVICE, key, value);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('keychain-delete', async (_, key) => {
  try {
    await keytar.deletePassword(KEYTAR_SERVICE, key);
  } catch {
    // best-effort
  }
});

ipcMain.handle('provider-test-connection', async (_, input) => {
  const profile = input?.profile;
  const providerModelId = input?.providerModelId || 'gemini-3.5-flash';
  try {
    const request = validateProviderInput({
      provider: profile?.provider,
      providerModelId,
      operation: 'plan',
      prompt: 'Reply with OK.',
    });
    const result =
      request.provider === 'gemini-api'
        ? await executeGemini(request, await keytar.getPassword(KEYTAR_SERVICE, 'gemini-api-key'))
        : request.provider === 'ollama'
          ? await executeOllama(request, profile?.endpoint)
          : await executeVertex(request, profile, vertexAuth);
    return result.failure
      ? {
          ok: false,
          provider: request.provider,
          failure: result.failure,
          message: result.message,
          hints: result.failure === 'authentication' ? ['Configure credentials and retry.'] : [],
        }
      : {
          ok: true,
          provider: request.provider,
          model: result.rawModelId,
          message: 'Connection successful.',
          hints: [],
        };
  } catch (error) {
    return {
      ok: false,
      provider: profile?.provider || 'gemini-api',
      failure: 'unknown',
      message: error instanceof Error ? error.message : 'Connection test failed.',
      hints: [],
    };
  }
});

ipcMain.handle('provider-execute', async (_, input) => {
  try {
    const request = validateProviderInput(input);
    if (request.provider === 'gemini-api') {
      return executeGemini(request, await keytar.getPassword(KEYTAR_SERVICE, 'gemini-api-key'));
    }
    if (request.provider === 'ollama') {
      return executeOllama(request, input.endpoint);
    }
    return executeVertex(request, input.profile, vertexAuth);
  } catch (error) {
    return {
      failure: 'unknown',
      message: error instanceof Error ? error.message : 'Provider execution failed.',
      rawModelId: '',
    };
  }
});

ipcMain.handle('provider-interaction', async (_, input) => {
  try {
    const request = validateProviderInput({ ...input, operation: 'review' });
    if (input?.operation !== 'video-edit' && input?.operation !== 'video')
      throw new Error('Unsupported interaction operation.');
    const apiKey = await keytar.getPassword(KEYTAR_SERVICE, 'gemini-api-key');
    if (!apiKey)
      return {
        failure: 'authentication',
        message: 'Gemini API key is not configured.',
        rawModelId: '',
      };
    return executeInteraction(
      { ...request, operation: input.operation, interactionId: input.interactionId },
      new GoogleGenAI({ apiKey }),
    );
  } catch (error) {
    return {
      failure: 'unknown',
      message: error instanceof Error ? error.message : 'Gemini interaction failed.',
      rawModelId: '',
    };
  }
});

ipcMain.handle('gemini-generate-content', async (_, input) => {
  try {
    if (JSON.stringify(input || {}).length > 35_000_000) {
      throw new Error('Gemini request exceeds the desktop IPC limit.');
    }
    const allowedConfig = input?.config
      ? {
          responseMimeType: input.config.responseMimeType,
          responseSchema: input.config.responseSchema,
          temperature: input.config.temperature,
          maxOutputTokens: input.config.maxOutputTokens,
          responseModalities: input.config.responseModalities,
          speechConfig: input.config.speechConfig,
        }
      : undefined;
    const request = validateProviderInput({
      provider: 'gemini-api',
      providerModelId: input?.providerModelId,
      operation: input?.operation || 'plan',
      prompt: input?.prompt,
      inputs: input?.inputs,
    });
    request.systemInstruction =
      typeof input?.systemInstruction === 'string' && input.systemInstruction.length <= 100_000
        ? input.systemInstruction
        : undefined;
    request.config = allowedConfig;
    return executeGemini(request, await keytar.getPassword(KEYTAR_SERVICE, 'gemini-api-key'));
  } catch (error) {
    return {
      failure: 'unknown',
      message: error instanceof Error ? error.message : 'Gemini execution failed.',
      rawModelId: '',
    };
  }
});

ipcMain.handle('paid-job-submit', async (_, task) => {
  if (!paidJobEngine) throw new Error('Paid job engine is not ready.');
  return paidJobEngine.submit(task);
});

ipcMain.handle('paid-job-list', async () => {
  if (!paidJobEngine) return [];
  return paidJobEngine.store.readAll();
});

ipcMain.handle('paid-job-cancel', async (_, id) => {
  if (!paidJobEngine) return false;
  return paidJobEngine.cancel(id);
});

ipcMain.handle('desktop-media-cache', async (_, input) => {
  if (!desktopMediaStore) throw new Error('Desktop media store is not ready.');
  const apiKey = await keytar.getPassword(KEYTAR_SERVICE, 'gemini-api-key');
  return desktopMediaStore.cacheRemote({ ...input, apiKey });
});

ipcMain.handle('desktop-media-usage', async () => {
  if (!desktopMediaStore) return { bytes: 0, files: 0 };
  return desktopMediaStore.storageUsage();
});

ipcMain.handle('desktop-media-health', async () => {
  if (!desktopMediaStore) return [];
  return desktopMediaStore.health();
});

ipcMain.handle('desktop-media-relink', async (_, input) => {
  if (!desktopMediaStore) throw new Error('Desktop media store is not ready.');
  return desktopMediaStore.relink(input?.key, input?.candidatePath);
});

ipcMain.handle('desktop-media-set-accepted', async (_, input) => {
  if (!desktopMediaStore) throw new Error('Desktop media store is not ready.');
  return desktopMediaStore.setAccepted(input?.key, input?.accepted);
});

ipcMain.handle('desktop-media-cleanup-preview', async (_, input) => {
  if (!desktopMediaStore)
    return { candidates: [], orphanPaths: [], protectedAccepted: [], reclaimableBytes: 0 };
  return desktopMediaStore.cleanupPreview(input);
});

ipcMain.handle('project-backup-save', async (_, input) => {
  if (!projectBackupStore) throw new Error('Project backup store is not ready.');
  return projectBackupStore.save(input?.projectId, input?.snapshot);
});

ipcMain.handle('project-backup-list', async (_, projectId) => {
  if (!projectBackupStore) return [];
  return projectBackupStore.list(projectId);
});

ipcMain.handle('project-backup-restore', async (_, input) => {
  if (!projectBackupStore) throw new Error('Project backup store is not ready.');
  return projectBackupStore.restore(input?.projectId, input?.id);
});

ipcMain.handle('select-project-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Loofi project folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return configureProjectRoot(result.filePaths[0]);
});

async function getDesktopDiagnosticsSnapshot() {
  const logPath = path.join(app.getPath('userData'), 'error.log');
  let logs = [];
  try {
    logs = (await fs.promises.readFile(logPath, 'utf8')).split('\n').filter(Boolean).slice(-500);
  } catch {
    logs = [];
  }
  return buildSupportSnapshot({
    app: { version: app.getVersion(), name: app.getName(), electron: process.versions.electron },
    platform: { platform: process.platform, arch: process.arch, release: require('os').release() },
    safeMode: safeModeStatus,
    providerConfigured: Boolean(await keytar.getPassword(KEYTAR_SERVICE, 'gemini-api-key')),
    storage: desktopMediaStore ? await desktopMediaStore.storageUsage() : { bytes: 0, files: 0 },
    jobs: paidJobEngine ? await paidJobEngine.store.readAll() : [],
    logs,
  });
}

ipcMain.handle('desktop-diagnostics', () => getDesktopDiagnosticsSnapshot());

ipcMain.handle('export-support-bundle', async () => {
  const snapshot = await getDesktopDiagnosticsSnapshot();
  const zip = new JSZip();
  zip.file('diagnostics.json', JSON.stringify(snapshot, null, 2));
  zip.file(
    'README.txt',
    'Redacted Loofi support bundle. No credentials or prompt text are included.',
  );
  const output = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export redacted support bundle',
    defaultPath: `loofi-support-${Date.now()}.zip`,
    filters: [{ name: 'ZIP archive', extensions: ['zip'] }],
  });
  if (result.canceled || !result.filePath) return null;
  await fs.promises.writeFile(result.filePath, output, { mode: 0o600 });
  return result.filePath;
});

app.whenReady().then(() => {
  // Configure native crash reporter (opt-in endpoint, local collection always active)
  crashReporter.start({
    productName: 'Loofi Flow/Veo Studio',
    companyName: 'Loofi',
    submitURL: '', // Empty = local collection only, no server submission
    uploadToServer: false,
    ignoreSystemCrashHandler: false,
  });

  initializeSafeMode();
  paidJobEngine = new PaidJobEngine({
    store: new PaidJobStore(path.join(app.getPath('userData'), 'paid-jobs-v1.json')),
    getApiKey: () => keytar.getPassword(KEYTAR_SERVICE, 'gemini-api-key'),
    onUpdate: (job) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('paid-job-update', job);
      }
    },
  });
  const projectRoot = getConfiguredProjectRoot();
  desktopMediaStore = new DesktopMediaStore(projectRoot, fetch, generateVideoDerivatives);
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
  markCleanExit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
