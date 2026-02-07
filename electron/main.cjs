const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false // Allows file:// loading and cross-origin requests
        },
        icon: path.join(__dirname, '../public/icon.png')
    });

    // Always load the built dist/index.html in production builds
    const indexPath = path.join(__dirname, '../dist/index.html');

    console.log('Loading index from:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));

    win.loadFile(indexPath).catch(e => {
        console.error('Failed to load index.html:', e);
    });

    // Open DevTools to debug
    win.webContents.openDevTools();

    // Log any page errors
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('Page failed to load:', errorCode, errorDescription, validatedURL);
    });

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log('Console:', message);
    });

    // Open external links in default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
}

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
