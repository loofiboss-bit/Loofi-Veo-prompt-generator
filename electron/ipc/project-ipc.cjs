const {
  validateProjectId,
  validateProjectBackupSaveInput,
  validateProjectBackupRestoreInput,
} = require('./ipc-validator.cjs');

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

  ipcMain.handle('project-backup-save', async (_, input) => {
    const store = requireStore();
    const valid = validateProjectBackupSaveInput(input);
    return store.save(valid.projectId, valid.snapshot);
  });

  ipcMain.handle('project-backup-list', async (_, projectId) => {
    const store = getProjectBackupStore();
    if (!store) return [];
    const validId = validateProjectId(projectId);
    return store.list(validId);
  });

  ipcMain.handle('project-backup-restore', async (_, input) => {
    const store = requireStore();
    const valid = validateProjectBackupRestoreInput(input);
    return store.restore(valid.projectId, valid.id);
  });

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
