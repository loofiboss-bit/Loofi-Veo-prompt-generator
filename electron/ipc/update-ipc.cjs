function registerUpdateIpc({
  ipcMain,
  app,
  shell,
  fs,
  path,
  fetchImpl,
  validateReleaseAssetUrl,
  checksumFromManifest,
  sha256File,
  getMainWindow,
}) {
  let lastVerifiedUpdatePath = null;

  ipcMain.handle('download-update', async (_event, input) => {
    const asset = validateReleaseAssetUrl(input?.url);
    const checksumAsset = validateReleaseAssetUrl(input?.checksumUrl);
    if (checksumAsset.fileName !== 'SHA256SUMS.txt') {
      throw new Error('Update checksum manifest must be SHA256SUMS.txt.');
    }
    const checksumResponse = await fetchImpl(checksumAsset.url, { redirect: 'follow' });
    if (!checksumResponse.ok) {
      throw new Error(`Checksum download failed: HTTP ${checksumResponse.status}`);
    }
    const expectedChecksum = checksumFromManifest(await checksumResponse.text(), asset.fileName);
    const downloadsPath = app.getPath('downloads');
    const filePath = path.join(downloadsPath, asset.fileName);
    const temporaryPath = `${filePath}.partial`;
    console.log('Downloading verified update from:', asset.url.href);
    const response = await fetchImpl(asset.url, { redirect: 'follow' });
    if (!response.ok || !response.body) {
      throw new Error(`Update download failed: HTTP ${response.status}`);
    }
    const totalSize = Number(response.headers.get('content-length')) || 0;
    let downloadedSize = 0;
    const handle = await fs.promises.open(temporaryPath, 'w', 0o600);
    try {
      for await (const chunk of response.body) {
        const buffer = Buffer.from(chunk);
        await handle.write(buffer);
        downloadedSize += buffer.length;
        const mainWindow = getMainWindow();
        if (mainWindow && totalSize > 0) {
          mainWindow.webContents.send('download-progress', (downloadedSize / totalSize) * 100);
        }
      }
      await handle.sync();
    } catch (error) {
      await handle.close();
      await fs.promises.rm(temporaryPath, { force: true });
      throw error;
    }
    await handle.close();
    const actualChecksum = await sha256File(temporaryPath);
    if (actualChecksum !== expectedChecksum) {
      await fs.promises.rm(temporaryPath, { force: true });
      throw new Error('Update SHA-256 verification failed.');
    }
    await fs.promises.rename(temporaryPath, filePath);
    lastVerifiedUpdatePath = filePath;
    return filePath;
  });

  ipcMain.handle('install-update', async () => {
    const filePath = lastVerifiedUpdatePath;
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('No verified update is ready to install.');
    }
    console.log('Installing update from:', filePath);
    const errorMessage = await shell.openPath(filePath);
    if (errorMessage) throw new Error(errorMessage);
    app.quit();
  });
}

module.exports = { registerUpdateIpc };
