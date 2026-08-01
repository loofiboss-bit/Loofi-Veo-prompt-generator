import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createApplicationWindow, createSafeModeController } = require('./window-lifecycle.cjs');

test('safe mode records crash loops without changing the user-data identity', () => {
  let written = '';
  const fs = {
    existsSync: () => true,
    readFileSync: () =>
      JSON.stringify({ cleanExit: false, crashCount: 2, lastLaunchAt: 'earlier' }),
    writeFileSync: (_path, value) => {
      written = value;
    },
  };
  const controller = createSafeModeController({
    app: { getPath: (name) => (name === 'userData' ? '/compatible-user-data' : '') },
    fs,
    path: { join: (...parts) => parts.join('/') },
    argv: [],
    threshold: 3,
  });

  assert.deepEqual(controller.initialize(), {
    enabled: true,
    reason: 'crash-loop',
    crashCount: 3,
  });
  assert.match(written, /"cleanExit": false/);
  assert.equal(controller.reset(), true);
  assert.deepEqual(controller.getStatus(), { enabled: false, reason: 'none', crashCount: 0 });
});

test('application window preserves the sandboxed renderer contract', async () => {
  let options;
  let externalHandler;
  class BrowserWindow {
    constructor(input) {
      options = input;
      this.webContents = {
        on: () => {},
        setWindowOpenHandler: (handler) => {
          externalHandler = handler;
        },
      };
    }
    once() {}
    isDestroyed() {
      return false;
    }
    loadFile() {
      return Promise.resolve();
    }
  }
  let openedUrl = '';
  createApplicationWindow({
    app: { isPackaged: true },
    BrowserWindow,
    screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 } }) },
    shell: {
      openExternal: async (url) => {
        openedUrl = url;
      },
    },
    fs: { existsSync: () => true },
    path: { join: (...parts) => parts.join('/') },
    rootDir: '/electron',
    isSmokeTest: false,
    markCleanExit: () => {},
  });

  assert.deepEqual(options.webPreferences, {
    nodeIntegration: false,
    contextIsolation: true,
    webSecurity: true,
    sandbox: true,
    preload: '/electron/preload.cjs',
  });
  assert.equal(options.minWidth, 1024);
  assert.equal(options.minHeight, 640);
  assert.deepEqual(externalHandler({ url: 'https://example.com' }), { action: 'deny' });
  await Promise.resolve();
  assert.equal(openedUrl, 'https://example.com/');
  openedUrl = '';
  assert.deepEqual(externalHandler({ url: 'file:///etc/passwd' }), { action: 'deny' });
  assert.deepEqual(externalHandler({ url: 'not a valid URL' }), { action: 'deny' });
  await Promise.resolve();
  assert.equal(openedUrl, '');
});
