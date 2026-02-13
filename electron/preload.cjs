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
  resetSafeMode: () => ipcRenderer.invoke('reset-safe-mode'),

  // Download progress listener
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, progress) => {
      callback(progress);
    });
  },

  // Error logging transports
  // logError is intentionally non-blocking in Sprint 1.
  logError: (entryOrBatch) => {
    ipcRenderer.send('log-error-fire-and-forget', entryOrBatch);
    return Promise.resolve();
  },
  logErrorFireAndForget: (entryOrBatch) =>
    ipcRenderer.send('log-error-fire-and-forget', entryOrBatch),
  logErrorSync: (entryOrBatch) => ipcRenderer.sendSync('log-error-sync', entryOrBatch),
});
