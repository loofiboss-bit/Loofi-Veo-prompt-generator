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
  const withReadyEngine =
    (fn) =>
    (event, ...args) => {
      const engine = authorize(event);
      return Promise.resolve(engine.ready ? engine.ready() : engine).then(() =>
        fn(engine, ...args),
      );
    };
  ipcMain.handle(
    'timeline-render-capabilities',
    withReadyEngine((engine) => engine.capabilities()),
  );
  ipcMain.handle(
    'timeline-render-start',
    withReadyEngine((engine, plan) => engine.start(plan)),
  );
  ipcMain.handle(
    'timeline-render-get',
    withReadyEngine((engine, id) => engine.get(id)),
  );
  ipcMain.handle(
    'timeline-render-list',
    withReadyEngine((engine, projectId) => engine.list(projectId)),
  );
  ipcMain.handle(
    'timeline-render-retry',
    withReadyEngine((engine, id) => engine.retry(id)),
  );
  ipcMain.handle(
    'timeline-render-preview',
    withReadyEngine((engine, id) => engine.preview(id)),
  );
  ipcMain.handle(
    'timeline-render-inspect-media',
    withReadyEngine((engine, mediaId) => engine.inspectMedia(mediaId)),
  );
  ipcMain.handle(
    'timeline-render-proxy',
    withReadyEngine((engine, mediaId) => engine.proxy(mediaId)),
  );
  ipcMain.handle(
    'timeline-render-detect-silence',
    withReadyEngine((engine, input) => engine.detectSilence(input)),
  );
  ipcMain.handle(
    'timeline-render-cancel',
    withReadyEngine(async (engine, id) => {
      await engine.cancel(id);
      return true;
    }),
  );
  ipcMain.handle(
    'timeline-render-save',
    withReadyEngine(async (engine, input) => {
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
    }),
  );
}
module.exports = { registerCreatorRenderIpc };
