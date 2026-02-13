const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

let mainWindow;
let safeModeStatus = {
    enabled: false,
    reason: 'none',
    crashCount: 0,
};

const SAFE_MODE_FILE = 'safe-mode-state.json';
const SAFE_MODE_THRESHOLD = 2;

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
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false, // Allows file:// loading and cross-origin requests
            preload: path.join(__dirname, 'preload.cjs')
        },
        icon: path.join(__dirname, '../public/icon.png')
    });

    // Always load the built dist/index.html in production builds
    const indexPath = path.join(__dirname, '../dist/index.html');

    console.log('Loading index from:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));

    mainWindow.loadFile(indexPath).catch(e => {
        console.error('Failed to load index.html:', e);
    });

    // Open DevTools to debug
    mainWindow.webContents.openDevTools();

    // Log any page errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('Page failed to load:', errorCode, errorDescription, validatedURL);
    });

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

// Auto-update IPC handlers
ipcMain.handle('download-update', async (event, url) => {
    return new Promise((resolve, reject) => {
        const downloadsPath = app.getPath('downloads');
        const fileName = path.basename(url);
        const filePath = path.join(downloadsPath, fileName);

        console.log('Downloading update from:', url);
        console.log('Saving to:', filePath);

        const file = fs.createWriteStream(filePath);

        https.get(url, (response) => {
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
        }).on('error', (err) => {
            fs.unlink(filePath, () => { }); // Delete partial file
            console.error('Download failed:', err);
            reject(err);
        });
    });
});

ipcMain.handle('install-update', async (event, filePath) => {
    console.log('Installing update from:', filePath);

    // Open the installer
    shell.openPath(filePath).then(() => {
        // Quit the app so the installer can proceed
        app.quit();
    }).catch(err => {
        console.error('Failed to open installer:', err);
        throw err;
    });
});

ipcMain.handle('get-platform-info', () => {
    return {
        platform: process.platform,
        arch: process.arch,
        version: app.getVersion()
    };
});

ipcMain.handle('get-safe-mode-status', () => safeModeStatus);

// Error logging IPC handler (v1.5.0 Sprint 1)
// Writes are queued and asynchronous to avoid blocking the main process.
const ERROR_SCHEMA_VERSION = '1.0.0';
const LOG_ROTATE_MAX_BYTES = 1 * 1024 * 1024;
const LOG_ROTATE_KEEP_LINES = 500;
const WRITE_BATCH_SIZE = 50;
const DEDUPE_WINDOW_MS = 5000;
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_ENTRIES = 120;

const queuedErrorEntries = [];
let isDrainingErrorQueue = false;
const recentFingerprints = new Map();
const enqueueTimes = [];

function normalizeErrorEntry(input) {
    const raw = typeof input === 'object' && input !== null ? input : {};
    const context = typeof raw.context === 'object' && raw.context !== null ? raw.context : undefined;
    const timestamp = Number.isFinite(raw.timestamp) ? raw.timestamp : Date.now();
    const message = typeof raw.message === 'string' && raw.message.trim() ? raw.message : 'Unknown error';
    const code = typeof raw.code === 'string' && raw.code.trim() ? raw.code : 'UNEXPECTED_ERROR';
    const level = raw.level === 'warning' ? 'warning' : 'error';
    const correlationId = typeof raw.correlationId === 'string' && raw.correlationId.trim()
        ? raw.correlationId
        : `cid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const stack = typeof raw.stack === 'string' ? raw.stack : undefined;

    return {
        schemaVersion: ERROR_SCHEMA_VERSION,
        code,
        message,
        stack,
        context,
        correlationId,
        timestamp,
        level,
    };
}

function passesRateLimit(now) {
    while (enqueueTimes.length > 0 && now - enqueueTimes[0] > RATE_LIMIT_WINDOW_MS) {
        enqueueTimes.shift();
    }
    if (enqueueTimes.length >= RATE_LIMIT_MAX_ENTRIES) {
        return false;
    }
    enqueueTimes.push(now);
    return true;
}

function shouldDeduplicate(entry, now) {
    const fingerprint = `${entry.code}:${entry.message}:${entry.stack || ''}`.slice(0, 240);
    const lastSeen = recentFingerprints.get(fingerprint);
    if (lastSeen !== undefined && now - lastSeen < DEDUPE_WINDOW_MS) {
        return true;
    }
    recentFingerprints.set(fingerprint, now);

    if (recentFingerprints.size > 1000) {
        const cutoff = now - DEDUPE_WINDOW_MS;
        for (const [key, ts] of recentFingerprints.entries()) {
            if (ts < cutoff) recentFingerprints.delete(key);
        }
    }

    return false;
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
    const message = reason instanceof Error
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

app.whenReady().then(() => {
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
