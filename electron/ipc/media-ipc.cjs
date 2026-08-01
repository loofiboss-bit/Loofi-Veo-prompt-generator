function registerMediaIpc({ ipcMain, getMediaStore, getApiKey }) {
  const requireStore = () => {
    const store = getMediaStore();
    if (!store) throw new Error('Desktop media store is not ready.');
    return store;
  };

  ipcMain.handle('desktop-media-cache', async (_, input) => {
    const apiKey = await getApiKey();
    return requireStore().cacheRemote({ ...input, apiKey });
  });

  ipcMain.handle('desktop-media-import', async (_, input) => {
    if (!input || !(input.bytes instanceof Uint8Array || input.bytes instanceof ArrayBuffer)) {
      throw new Error('Invalid desktop media migration payload.');
    }
    return requireStore().importBytes(input);
  });

  ipcMain.handle('desktop-media-usage', async () => {
    const store = getMediaStore();
    return store ? store.storageUsage() : { bytes: 0, files: 0 };
  });

  ipcMain.handle('desktop-media-health', async () => {
    const store = getMediaStore();
    return store ? store.health() : [];
  });

  ipcMain.handle('desktop-media-relink', async (_, input) =>
    requireStore().relink(input?.key, input?.candidatePath),
  );

  ipcMain.handle('desktop-media-set-accepted', async (_, input) =>
    requireStore().setAccepted(input?.key, input?.accepted),
  );

  ipcMain.handle('desktop-media-cleanup-preview', async (_, input) => {
    const store = getMediaStore();
    return store
      ? store.cleanupPreview(input)
      : { candidates: [], orphanPaths: [], protectedAccepted: [], reclaimableBytes: 0 };
  });
}

module.exports = { registerMediaIpc };
