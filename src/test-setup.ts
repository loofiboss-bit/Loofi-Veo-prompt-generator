/**
 * Vitest Global Setup
 * v2.0.0 - Testing Maturity
 *
 * Global mocks and configuration loaded before every test file.
 * Centralizes common mock patterns that were previously duplicated
 * across 20+ test files.
 */

import { vi, afterEach } from 'vitest';

// ─── Browser API Mocks ─────────────────────────────────────────────
// Guard all browser-only mocks for non-jsdom environments (e.g. @vitest-environment node)

if (typeof window !== 'undefined') {
  // matchMedia — required by any component that reads media queries
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// crypto.subtle — required by SHA-256, Ed25519
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      subtle: {
        digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        importKey: vi.fn().mockResolvedValue({}),
        verify: vi.fn().mockResolvedValue(true),
        exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        generateKey: vi.fn().mockResolvedValue({ publicKey: {}, privateKey: {} }),
        sign: vi.fn().mockResolvedValue(new ArrayBuffer(64)),
      },
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      },
      randomUUID: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    writable: true,
  });
}

// URL.createObjectURL / revokeObjectURL — required by Worker sandbox tests
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = vi.fn();
}

// AbortSignal.timeout — required by fetch timeout patterns
if (!AbortSignal.timeout) {
  AbortSignal.timeout = vi.fn().mockReturnValue(new AbortController().signal);
}

// ─── Cleanup ────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks();
});
