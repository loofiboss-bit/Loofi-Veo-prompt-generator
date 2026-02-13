/**
 * Typed Electron Bridge Utility
 *
 * Provides type-safe access to the Electron contextBridge API
 * exposed via preload.cjs. Replaces all `(window as any).electron`
 * patterns with a single runtime type guard.
 */

/**
 * Returns the typed ElectronAPI if running inside Electron,
 * or `undefined` when running in a browser.
 */
export function getElectron() {
  if (typeof window !== 'undefined' && window.electron) {
    return window.electron;
  }
  return undefined;
}

/**
 * Returns `true` when the app is running inside Electron.
 */
export function isElectronEnvironment(): boolean {
  return getElectron() !== undefined;
}
