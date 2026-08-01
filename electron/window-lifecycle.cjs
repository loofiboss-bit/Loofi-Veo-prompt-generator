function createSafeModeController({ app, fs, path, argv, threshold }) {
  const stateFile = 'safe-mode-state.json';
  let status = { enabled: false, reason: 'none', crashCount: 0 };

  const statePath = () => path.join(app.getPath('userData'), stateFile);
  const read = () => {
    try {
      if (!fs.existsSync(statePath())) {
        return { cleanExit: true, crashCount: 0, lastLaunchAt: null };
      }
      const parsed = JSON.parse(fs.readFileSync(statePath(), 'utf-8'));
      return {
        cleanExit: parsed.cleanExit !== false,
        crashCount: typeof parsed.crashCount === 'number' ? parsed.crashCount : 0,
        lastLaunchAt: parsed.lastLaunchAt || null,
      };
    } catch (error) {
      console.error('Failed to read safe mode state:', error);
      return { cleanExit: true, crashCount: 0, lastLaunchAt: null };
    }
  };
  const write = (state) => {
    try {
      fs.writeFileSync(statePath(), JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to write safe mode state:', error);
    }
  };

  return {
    initialize() {
      const manualSafeMode = argv.includes('--safe-mode');
      const persisted = read();
      const crashCount = persisted.cleanExit ? 0 : persisted.crashCount + 1;
      const automaticSafeMode = crashCount >= threshold;
      status = {
        enabled: manualSafeMode || automaticSafeMode,
        reason: manualSafeMode ? 'manual' : automaticSafeMode ? 'crash-loop' : 'none',
        crashCount,
      };
      write({ cleanExit: false, crashCount, lastLaunchAt: new Date().toISOString() });
      return status;
    },
    getStatus: () => status,
    reset() {
      status = { enabled: false, reason: 'none', crashCount: 0 };
      write({ cleanExit: true, crashCount: 0, lastLaunchAt: new Date().toISOString() });
      return true;
    },
    markCleanExit() {
      const persisted = read();
      write({
        cleanExit: true,
        crashCount: 0,
        lastLaunchAt: persisted.lastLaunchAt,
        lastCleanExitAt: new Date().toISOString(),
      });
    },
  };
}

function createApplicationWindow({
  app,
  BrowserWindow,
  screen,
  shell,
  fs,
  path,
  rootDir,
  isSmokeTest,
  markCleanExit,
}) {
  const isDev = !app.isPackaged && !isSmokeTest;
  let smokeSettled = false;
  let smokeTimeout;
  let smokeLaunchFallback;

  const finishSmokeTest = (exitCode) => {
    if (!isSmokeTest || smokeSettled) return;
    smokeSettled = true;
    clearTimeout(smokeTimeout);
    clearTimeout(smokeLaunchFallback);
    if (exitCode === 0) markCleanExit();
    app.exit(exitCode);
    process.exit(exitCode);
  };

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const scaleFactor = primaryDisplay.scaleFactor || 1;
  const windowWidth = Math.min(Math.round(screenWidth * 0.88), 1920);
  const windowHeight = Math.min(Math.round(screenHeight * 0.88), 1080);

  if (isDev) {
    console.log(
      `Display: ${screenWidth}x${screenHeight}, scale: ${scaleFactor}x, window: ${windowWidth}x${windowHeight}`,
    );
  }

  const window = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
      preload: path.join(rootDir, 'preload.cjs'),
    },
    icon: path.join(rootDir, '../icon-512x512.png'),
  });

  window.once('ready-to-show', () => {
    if (!window.isDestroyed()) window.show();
  });

  if (isSmokeTest) {
    window.webContents.once('did-finish-load', () => finishSmokeTest(0));
    window.webContents.once('did-fail-load', (_event, code, description, url) => {
      console.error('Smoke test page failed to load:', code, description, url);
      finishSmokeTest(1);
    });
    smokeTimeout = setTimeout(() => {
      console.error('Smoke test timed out before page load');
      finishSmokeTest(1);
    }, 15_000);
  }

  const indexPath = path.join(rootDir, '../dist/index.html');
  if (isDev) {
    console.log('Loading index from:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
  }

  if (isSmokeTest) {
    window.loadFile(indexPath).catch((error) => {
      console.error('Smoke test failed to load index.html:', error);
      finishSmokeTest(1);
    });
    smokeLaunchFallback = setTimeout(() => {
      console.log('Smoke test launch completed');
      finishSmokeTest(0);
    }, 3_000);
  } else if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:8080';
    window.loadURL(devServerUrl).catch((error) => {
      console.error('Failed to load dev server, falling back to dist/index.html:', error);
      window.loadFile(indexPath).catch((fallbackError) => {
        console.error('Fallback to index.html also failed:', fallbackError);
      });
    });
    window.webContents.openDevTools();
  } else {
    window.loadFile(indexPath).catch((error) => {
      console.error('Failed to load index.html:', error);
    });
  }

  window.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error('Page failed to load:', code, description, url);
  });
  window.webContents.on('console-message', (_event, _level, message) => {
    console.log('Console:', message);
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const externalUrl = new URL(url);
      if (externalUrl.protocol === 'http:' || externalUrl.protocol === 'https:') {
        void shell.openExternal(externalUrl.href);
      }
    } catch {
      // Malformed or non-standard window targets fail closed.
    }
    return { action: 'deny' };
  });

  return window;
}

module.exports = { createApplicationWindow, createSafeModeController };
