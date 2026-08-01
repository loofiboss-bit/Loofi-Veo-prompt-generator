function registerProjectIpc({
  ipcMain,
  dialog,
  getMainWindow,
  getProjectBackupStore,
  configureRoot,
}) {
  const requireStore = () => {
    const store = getProjectBackupStore();
    if (!store) throw new Error('Project backup store is not ready.');
    return store;
  };

  ipcMain.handle('project-backup-save', async (_, input) =>
    requireStore().save(input?.projectId, input?.snapshot),
  );

  ipcMain.handle('project-backup-list', async (_, projectId) => {
    const store = getProjectBackupStore();
    return store ? store.list(projectId) : [];
  });

  ipcMain.handle('project-backup-restore', async (_, input) =>
    requireStore().restore(input?.projectId, input?.id),
  );

  ipcMain.handle('select-project-folder', async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: 'Choose Loofi project folder',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return configureRoot(result.filePaths[0]);
  });
}

module.exports = { registerProjectIpc };
