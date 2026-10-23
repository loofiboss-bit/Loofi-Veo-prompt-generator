import { afterEach, describe, expect, it, vi } from 'vitest';
import { getElectron, isElectronEnvironment } from './electronBridge';

describe('electronBridge', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    // Restore global window object after each test
    if (typeof originalWindow !== 'undefined') {
      globalThis.window = originalWindow;
      delete window.electron;
    }
  });

  describe('getElectron', () => {
    it('returns window.electron when running inside Electron', () => {
      const mockElectronBridge = {
        importDesktopMedia: vi.fn(),
        readDesktopMedia: vi.fn(),
      };

      window.electron = mockElectronBridge as unknown as NonNullable<Window['electron']>;

      expect(getElectron()).toBe(mockElectronBridge);
    });

    it('returns undefined when running in a standard browser (window.electron is undefined)', () => {
      delete window.electron;

      expect(getElectron()).toBeUndefined();
    });

    it('returns undefined when window is undefined (e.g., SSR / Node environment)', () => {
      // @ts-expect-error simulating non-browser environment
      delete globalThis.window;

      expect(getElectron()).toBeUndefined();
    });
  });

  describe('isElectronEnvironment', () => {
    it('returns true when running inside Electron', () => {
      const mockElectronBridge = {
        importDesktopMedia: vi.fn(),
      };

      window.electron = mockElectronBridge as unknown as NonNullable<Window['electron']>;

      expect(isElectronEnvironment()).toBe(true);
    });

    it('returns false when running in a browser environment', () => {
      delete window.electron;

      expect(isElectronEnvironment()).toBe(false);
    });

    it('returns false when window is undefined', () => {
      // @ts-expect-error simulating non-browser environment
      delete globalThis.window;

      expect(isElectronEnvironment()).toBe(false);
    });
  });
});
