const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Platform information
  platform: process.platform,
  arch: process.arch,

  // Update operations
  downloadUpdate: (input) => ipcRenderer.invoke('download-update', input),
  installUpdate: () => ipcRenderer.invoke('install-update'),
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
  hasSecureItem: (key) => ipcRenderer.invoke('keychain-has', key),
  setSecureItem: (key, value) => ipcRenderer.invoke('keychain-set', key, value),
  deleteSecureItem: (key) => ipcRenderer.invoke('keychain-delete', key),

  // Provider calls execute in Electron main so desktop credentials never enter renderer state.
  testProviderConnection: (input) => ipcRenderer.invoke('provider-test-connection', input),
  executeProvider: (input) => ipcRenderer.invoke('provider-execute', input),
  generateGeminiContent: (input) => ipcRenderer.invoke('gemini-generate-content', input),
  submitPaidJob: (task) => ipcRenderer.invoke('paid-job-submit', task),
  listPaidJobs: () => ipcRenderer.invoke('paid-job-list'),
  cancelPaidJob: (id) => ipcRenderer.invoke('paid-job-cancel', id),
  onPaidJobUpdate: (callback) => {
    const listener = (_event, job) => callback(job);
    ipcRenderer.on('paid-job-update', listener);
    return () => ipcRenderer.removeListener('paid-job-update', listener);
  },
  cacheDesktopMedia: (input) => ipcRenderer.invoke('desktop-media-cache', input),
  getDesktopMediaUsage: () => ipcRenderer.invoke('desktop-media-usage'),
  getDesktopMediaHealth: () => ipcRenderer.invoke('desktop-media-health'),
  relinkDesktopMedia: (input) => ipcRenderer.invoke('desktop-media-relink', input),
  setDesktopMediaAccepted: (input) => ipcRenderer.invoke('desktop-media-set-accepted', input),
  previewDesktopMediaCleanup: (input) => ipcRenderer.invoke('desktop-media-cleanup-preview', input),
  selectProjectFolder: () => ipcRenderer.invoke('select-project-folder'),
  getDesktopDiagnostics: () => ipcRenderer.invoke('desktop-diagnostics'),
  exportSupportBundle: () => ipcRenderer.invoke('export-support-bundle'),
});
