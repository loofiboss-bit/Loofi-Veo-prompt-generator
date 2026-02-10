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

// Error logging IPC handler
// Appends serialised ErrorLogEntry objects to <userData>/error.log, one JSON object per line.
// Accepts either a single entry or an array of entries (batched from renderer).
// If the file exceeds 1 MB it is rotated: only the last 500 lines are kept.
function appendErrorEntries(entryOrBatch) {
    const logPath = path.join(app.getPath('userData'), 'error.log');
    const entries = Array.isArray(entryOrBatch) ? entryOrBatch : [entryOrBatch];
    const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
    try {
        fs.appendFileSync(logPath, lines);

        // Rotate if file exceeds 1 MB
        const stats = fs.statSync(logPath);
        if (stats.size > 1 * 1024 * 1024) {
            const content = fs.readFileSync(logPath, 'utf8');
            const existing = content.split('\n').filter(l => l.trim() !== '');
            const kept = existing.slice(-500);
            fs.writeFileSync(logPath, kept.join('\n') + '\n', 'utf8');
        }
    } catch (err) {
        console.error('Failed to write error log:', err);
    }
}

ipcMain.handle('log-error', async (_, entryOrBatch) => {
    try {
        appendErrorEntries(entryOrBatch);
    } catch (err) {
        // Silently swallow — log errors must never crash the main process.
        console.error('Failed to write error log entry:', err);
    }
});

ipcMain.on('log-error-fire-and-forget', (_, entryOrBatch) => {
    try {
        appendErrorEntries(entryOrBatch);
    } catch (err) {
        console.error('Failed to write error log entry:', err);
    }
});

ipcMain.on('log-error-sync', (event, entryOrBatch) => {
    try {
        appendErrorEntries(entryOrBatch);
        event.returnValue = true;
    } catch (err) {
        console.error('Failed to write error log entry:', err);
        event.returnValue = false;
    }
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
