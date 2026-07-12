import { _electron as electron, expect, test } from '@playwright/test';

test('packaged Electron boots the production bundle with the narrow bridge', async () => {
  const executablePath = process.env.PACKAGED_ELECTRON_PATH;
  test.skip(!executablePath, 'PACKAGED_ELECTRON_PATH is set only by packaged release jobs.');

  const app = await electron.launch({ executablePath });
  try {
    const window = await app.firstWindow();
    await expect(window.getByRole('heading', { name: 'Create', exact: true })).toBeVisible({
      timeout: 20_000,
    });
    const bridgeShape = await window.evaluate(() => ({
      platform: window.electron?.platform,
      canExecuteProvider: typeof window.electron?.executeProvider === 'function',
      leaksCredentialRead: Object.hasOwn(window.electron ?? {}, 'getSecureItem'),
      leaksArbitraryDownload: Object.hasOwn(window.electron ?? {}, 'downloadBlockRange'),
    }));
    expect(bridgeShape.platform).toBeTruthy();
    expect(bridgeShape.canExecuteProvider).toBe(true);
    expect(bridgeShape.leaksCredentialRead).toBe(false);
    expect(bridgeShape.leaksArbitraryDownload).toBe(false);
  } finally {
    await app.close();
  }
});
