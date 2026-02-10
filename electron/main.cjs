const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

let mainWindow;

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

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
