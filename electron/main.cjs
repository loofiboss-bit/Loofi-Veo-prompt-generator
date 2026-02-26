/* eslint-disable no-unused-vars */
const { app, BrowserWindow, Menu, shell, ipcMain, screen, crashReporter } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { execFile } = require('child_process');
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
let safeModeStatus = {
  enabled: false,
  reason: 'none',
  crashCount: 0,
};

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
  const isDev = !app.isPackaged;

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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Always load the built dist/index.html in production builds
  const indexPath = path.join(__dirname, '../dist/index.html');

  if (isDev) {
    console.log('Loading index from:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
  }

  if (isDev) {
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
ipcMain.handle('download-update', async (event, url) => {
  return new Promise((resolve, reject) => {
    const downloadsPath = app.getPath('downloads');
    const fileName = path.basename(url);
    const filePath = path.join(downloadsPath, fileName);

    console.log('Downloading update from:', url);
    console.log('Saving to:', filePath);

    const file = fs.createWriteStream(filePath);

    https
      .get(url, (response) => {
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const progress = (downloadedSize / totalSize) * 100;

          // Send progress to renderer
          if (mainWindow) {
            mainWindow.webContents.send('download-progress', progress);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('Download completed:', filePath);
          resolve(filePath);
        });
      })
      .on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete partial file
        console.error('Download failed:', err);
        reject(err);
      });
  });
});

ipcMain.handle('install-update', async (event, filePath) => {
  console.log('Installing update from:', filePath);

  // Open the installer
  shell
    .openPath(filePath)
    .then(() => {
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

app.whenReady().then(() => {
  // Configure native crash reporter (opt-in endpoint, local collection always active)
  crashReporter.start({
    productName: 'Veo Prompt Generator',
    companyName: 'Loofi',
    submitURL: '', // Empty = local collection only, no server submission
    uploadToServer: false,
    ignoreSystemCrashHandler: false,
  });

  initializeSafeMode();
  createWindow();

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
