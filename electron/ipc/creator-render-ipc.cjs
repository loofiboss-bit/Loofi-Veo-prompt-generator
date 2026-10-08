'use strict';
function registerCreatorRenderIpc({ ipcMain, getEngine, dialog, getMainWindow }) {
  const authorize = (event) => {
    const window = getMainWindow();
    if (
      !window ||
      event.sender !== window.webContents ||
      (event.senderFrame && event.senderFrame !== window.webContents.mainFrame)
    )
      throw new Error('Untrusted render request.');
    const engine = getEngine();
    if (!engine) throw new Error('Render engine is not ready.');
    return engine;
  };
  ipcMain.handle('timeline-render-capabilities', (event) => authorize(event).capabilities());
  ipcMain.handle('timeline-render-start', (event, plan) => authorize(event).start(plan));
  ipcMain.handle('timeline-render-get', (event, id) => authorize(event).get(id));
  ipcMain.handle('timeline-render-cancel', async (event, id) => {
    await authorize(event).cancel(id);
    return true;
  });
  ipcMain.handle('timeline-render-save', async (event, input) => {
    const engine = authorize(event);
    if (!input || typeof input.id !== 'string' || typeof input.package !== 'boolean')
      throw new Error('Invalid export save request.');
    const job = engine.get(input.id);
    if (job.status !== 'complete') throw new Error('Export is not complete.');
    const extension = input.package ? 'zip' : 'mp4';
    const result = await dialog.showSaveDialog(getMainWindow(), {
      title: 'Save creator delivery',
      defaultPath: `creator-video.${extension}`,
      filters: [
        { name: input.package ? 'Publication package' : 'MP4 video', extensions: [extension] },
      ],
    });
    if (result.canceled || !result.filePath) return { saved: false };
    try {
      return await engine.save(input.id, result.filePath, input.package);
    } catch {
      throw new Error(
        'Delivery could not be saved. Check destination permissions and free space; the previous file is preserved.',
      );
    }
  });
}
module.exports = { registerCreatorRenderIpc };
