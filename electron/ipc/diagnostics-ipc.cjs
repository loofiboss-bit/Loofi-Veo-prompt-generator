function registerDiagnosticsIpc({
  ipcMain,
  app,
  dialog,
  fs,
  path,
  os,
  keytar,
  keytarService,
  JSZip,
  buildSupportSnapshot,
  getSafeModeStatus,
  getMediaStore,
  getPaidJobEngine,
  getMainWindow,
}) {
  const getSnapshot = async () => {
    const logPath = path.join(app.getPath('userData'), 'error.log');
    let logs = [];
    try {
      logs = (await fs.promises.readFile(logPath, 'utf8')).split('\n').filter(Boolean).slice(-500);
    } catch {
      logs = [];
    }
    const mediaStore = getMediaStore();
    const paidJobEngine = getPaidJobEngine();
    return buildSupportSnapshot({
      app: { version: app.getVersion(), name: app.getName(), electron: process.versions.electron },
      platform: { platform: process.platform, arch: process.arch, release: os.release() },
      safeMode: getSafeModeStatus(),
      providerConfigured: Boolean(await keytar.getPassword(keytarService, 'gemini-api-key')),
      storage: mediaStore ? await mediaStore.storageUsage() : { bytes: 0, files: 0 },
      jobs: paidJobEngine ? await paidJobEngine.store.readAll() : [],
      logs,
    });
  };

  ipcMain.handle('desktop-diagnostics', () => getSnapshot());

  ipcMain.handle('export-support-bundle', async () => {
    const snapshot = await getSnapshot();
    const zip = new JSZip();
    zip.file('diagnostics.json', JSON.stringify(snapshot, null, 2));
    zip.file(
      'README.txt',
      'Redacted Loofi support bundle. No credentials or prompt text are included.',
    );
    const output = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const result = await dialog.showSaveDialog(getMainWindow(), {
      title: 'Export redacted support bundle',
      defaultPath: `loofi-support-${Date.now()}.zip`,
      filters: [{ name: 'ZIP archive', extensions: ['zip'] }],
    });
    if (result.canceled || !result.filePath) return null;
    await fs.promises.writeFile(result.filePath, output, { mode: 0o600 });
    return result.filePath;
  });
}

module.exports = { registerDiagnosticsIpc };
