const KEYTAR_SERVICE = 'veo-prompt-generator';
const KEYTAR_KEYS = new Set(['gemini-api-key']);

function validateKeytarKey(key) {
  if (!KEYTAR_KEYS.has(key)) throw new Error('Unsupported credential key.');
  return key;
}

function registerCredentialsIpc({ ipcMain, keytar }) {
  ipcMain.handle('keychain-has', async (_, key) => {
    try {
      return Boolean(await keytar.getPassword(KEYTAR_SERVICE, validateKeytarKey(key)));
    } catch {
      return false;
    }
  });

  ipcMain.handle('keychain-set', async (_, key, value) => {
    try {
      validateKeytarKey(key);
      if (typeof value !== 'string' || value.length < 8 || value.length > 4096) return false;
      await keytar.setPassword(KEYTAR_SERVICE, key, value);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('keychain-delete', async (_, key) => {
    try {
      await keytar.deletePassword(KEYTAR_SERVICE, validateKeytarKey(key));
    } catch {
      // Deletion is intentionally best-effort and never exposes vault errors.
    }
  });
}

module.exports = { KEYTAR_SERVICE, registerCredentialsIpc, validateKeytarKey };
