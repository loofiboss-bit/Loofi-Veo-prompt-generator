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

  // Telemetry (v2.0.0 — Production Desktop)
  sendTelemetry: (events) => ipcRenderer.invoke('send-telemetry', events),

  // Differential updates (v2.0.0 — Production Desktop)
  downloadBlockmap: (url) => ipcRenderer.invoke('download-blockmap', url),
  downloadBlockRange: (url, offset, size) =>
    ipcRenderer.invoke('download-block-range', url, offset, size),

  // Rollback snapshots (v2.0.0 — Production Desktop)
  createRollbackSnapshot: (snapshotId) =>
    ipcRenderer.invoke('create-rollback-snapshot', snapshotId),

  // Crash reports (v2.0.0 — Production Desktop)
  getCrashReports: () => ipcRenderer.invoke('get-crash-reports'),

  // NLE direct bridge (Task 2.3)
  getNleStatus: (app) => ipcRenderer.invoke('get-nle-status', app),
  directExportToNle: (request) => ipcRenderer.invoke('direct-export-to-nle', request),

  // Secure keychain (keytar-backed, OS credential vault)
  getSecureItem: (key) => ipcRenderer.invoke('keychain-get', key),
  setSecureItem: (key, value) => ipcRenderer.invoke('keychain-set', key, value),
  deleteSecureItem: (key) => ipcRenderer.invoke('keychain-delete', key),
});
