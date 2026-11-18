const {
  validateProjectId,
  validateProjectBackupSaveInput,
  validateProjectBackupRestoreInput,
  validateProjectDbCommitInput,
} = require('./ipc-validator.cjs');

function registerProjectIpc({
  ipcMain,
  dialog,
  getMainWindow,
  getProjectBackupStore,
  getProjectDatabase,
  getSnapshotBackupDir,
  configureRoot,
}) {
  const requireStore = () => {
    const store = getProjectBackupStore();
    if (!store) throw new Error('Project backup store is not ready.');
    return store;
  };
  const requireDb = () => {
    const db = typeof getProjectDatabase === 'function' ? getProjectDatabase() : null;
    if (!db) throw new Error('Project SQLite database is not ready.');
    return db;
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

  ipcMain.handle('project-db-open', async (_, projectId) => {
    const db = typeof getProjectDatabase === 'function' ? getProjectDatabase() : null;
    if (!db) return null;
    const validId = validateProjectId(projectId);
    return db.openProject(validId);
  });

  ipcMain.handle('project-db-list', async () => {
    const db = typeof getProjectDatabase === 'function' ? getProjectDatabase() : null;
    if (!db) return [];
    return db.listProjects();
  });

  ipcMain.handle('project-db-commit-delta', async (_, input) => {
    const db = requireDb();
    const valid = validateProjectDbCommitInput(input);
    return db.commitDelta(valid);
  });

  ipcMain.handle('project-db-snapshot-backup', async (_, projectId) => {
    const db = requireDb();
    const validId = projectId ? validateProjectId(projectId) : 'workspace';
    const backupDir = typeof getSnapshotBackupDir === 'function' ? getSnapshotBackupDir() : null;
    if (!backupDir) throw new Error('Project snapshot backup directory is not configured.');
    return db.snapshotBackup({ backupDir, projectId: validId });
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
