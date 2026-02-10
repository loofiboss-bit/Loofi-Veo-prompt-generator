const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    // Platform information
    platform: process.platform,
    arch: process.arch,

    // Update operations
    downloadUpdate: (url) => ipcRenderer.invoke('download-update', url),
    installUpdate: (filePath) => ipcRenderer.invoke('install-update', filePath),
    getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),
    getSafeModeStatus: () => ipcRenderer.invoke('get-safe-mode-status'),

    // Download progress listener
    onDownloadProgress: (callback) => {
        ipcRenderer.on('download-progress', (event, progress) => {
            callback(progress);
        });
    }
});
