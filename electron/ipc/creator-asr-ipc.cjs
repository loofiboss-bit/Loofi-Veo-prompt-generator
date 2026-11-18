'use strict';

const fs = require('node:fs');
const { Readable } = require('node:stream');
const { CreatorAsrModelStore, MODEL_FILES, MODEL_ID } = require('../creator-asr-model-store.cjs');

function assertTrustedMainFrame(event, getMainWindow) {
  const window = getMainWindow();
  if (
    !window ||
    window.isDestroyed() ||
    event.sender !== window.webContents ||
    (event.senderFrame && event.senderFrame !== window.webContents.mainFrame)
  )
    throw new Error('Untrusted local ASR request.');
  return event.sender;
}

function registerCreatorAsrIpc({ ipcMain, getStore, getMainWindow }) {
  ipcMain.handle('creator-asr-model-info', (event) => {
    assertTrustedMainFrame(event, getMainWindow);
    const store = getStore();
    if (!store) throw new Error('Local speech model manager is not ready.');
    return Promise.all([store.getManifest(), store.getStatus()]).then(([manifest, status]) => ({
      manifest,
      status,
    }));
  });

  ipcMain.handle('creator-asr-model-install', async (event, request) => {
    const sender = assertTrustedMainFrame(event, getMainWindow);
    const store = getStore();
    if (!store) throw new Error('Local speech model manager is not ready.');
    return store.install(request, (progress) => {
      if (!sender.isDestroyed()) sender.send('creator-asr-model-progress', progress);
    });
  });

  ipcMain.handle('creator-asr-model-cancel', (event, installId) => {
    assertTrustedMainFrame(event, getMainWindow);
    if (typeof installId !== 'string' || !/^[a-f0-9-]{36}$/i.test(installId))
      throw new Error('Invalid local ASR cancellation request.');
    return Boolean(getStore()?.cancel(installId));
  });

  ipcMain.handle('creator-asr-model-remove', async (event) => {
    assertTrustedMainFrame(event, getMainWindow);
    const store = getStore();
    if (!store) throw new Error('Local speech model manager is not ready.');
    return store.remove();
  });
}

function registerCreatorAsrProtocol({ protocol, getStore }) {
  protocol.handle('loofi-asr', async (request) => {
    if (request.method !== 'GET') return new Response('Method not allowed.', { status: 405 });
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return new Response('Invalid local model resource.', { status: 400 });
    }
    if (url.hostname !== 'models' || url.search || url.hash)
      return new Response('Unapproved local model resource.', { status: 404 });
    let relativePath;
    try {
      relativePath = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    } catch {
      return new Response('Invalid local model resource.', { status: 400 });
    }
    const modelPrefix = `${MODEL_ID}/`;
    if (relativePath.startsWith(modelPrefix)) relativePath = relativePath.slice(modelPrefix.length);
    const store = getStore();
    if (!store) return new Response('Local speech model manager is not ready.', { status: 503 });
    const filePath = await store.resolveFile(relativePath);
    if (!filePath) return new Response('Local speech model is not installed.', { status: 404 });
    const file = MODEL_FILES.find((entry) => entry.path === relativePath);
    if (!file) return new Response('Unapproved local model resource.', { status: 404 });
    return new Response(Readable.toWeb(fs.createReadStream(filePath)), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Length': String(file.size),
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store',
      },
    });
  });
}

function createCreatorAsrModelStore(root, options = {}) {
  return new CreatorAsrModelStore({ root, ...options });
}

module.exports = {
  createCreatorAsrModelStore,
  registerCreatorAsrIpc,
  registerCreatorAsrProtocol,
};
