const {
  validateMediaKey,
  validateMediaCacheInput,
  validateMediaRelinkInput,
} = require('./ipc-validator.cjs');
const { mediaDisplayUrl } = require('./creator-media-protocol.cjs');

function registerMediaIpc({ ipcMain, getMediaStore, getApiKey }) {
  const requireStore = () => {
    const store = getMediaStore();
    if (!store) throw new Error('Desktop media store is not ready.');
    return store;
  };

  ipcMain.handle('desktop-media-cache', async (_, input) => {
    const store = requireStore();
    validateMediaCacheInput(input);
    const apiKey = await getApiKey();
    return store.cacheRemote({ ...input, apiKey });
  });

  ipcMain.handle('desktop-media-import', async (_, input) => {
    if (!input || !(input.bytes instanceof Uint8Array || input.bytes instanceof ArrayBuffer)) {
      throw new Error('Invalid desktop media migration payload.');
    }
    const record = await requireStore().importBytes(input);
    return { ...record, displayUrl: mediaDisplayUrl('media', record.key) };
  });

  ipcMain.handle('desktop-media-read', async (_, key) => {
    const store = requireStore();
    validateMediaKey(key);
    const record = await store.read(key);
    return record ? { ...record, displayUrl: mediaDisplayUrl('media', key) } : null;
  });

  ipcMain.handle('desktop-media-usage', async () => {
    const store = getMediaStore();
    return store ? store.storageUsage() : { bytes: 0, files: 0 };
  });

  ipcMain.handle('desktop-media-health', async () => {
    const store = getMediaStore();
    return store ? store.health() : [];
  });

  ipcMain.handle('desktop-media-relink', async (_, input) => {
    const store = requireStore();
    const valid = validateMediaRelinkInput(input);
    return store.relink(valid.key, valid.candidatePath);
  });

  ipcMain.handle('desktop-media-set-accepted', async (_, input) => {
    const store = requireStore();
    if (!input || typeof input !== 'object')
      throw new Error('Invalid desktop media accepted payload.');
    validateMediaKey(input.key);
    return store.setAccepted(input.key, Boolean(input.accepted));
  });

  ipcMain.handle('desktop-media-cleanup-preview', async (_, input) => {
    const store = getMediaStore();
    return store
      ? store.cleanupPreview(input)
      : { candidates: [], orphanPaths: [], protectedAccepted: [], reclaimableBytes: 0 };
  });
}

module.exports = { registerMediaIpc };
