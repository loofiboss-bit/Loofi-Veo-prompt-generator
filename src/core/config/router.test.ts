/**
 * Router Configuration Unit Tests
 * v2.4.0 — Tests for hash router setup and route definitions.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'mock-store'),
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
}));

// Mock loggerService
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Router Configuration', () => {
  it('should export ROUTES constant with expected paths', async () => {
    const { ROUTES } = await import('@core/config/router');
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.COMPOSER).toBe('/composer');
    expect(ROUTES.SETTINGS).toBe('/settings');
  });

  it('should export router instance', async () => {
    const { router } = await import('@core/config/router');
    expect(router).toBeDefined();
    expect(router.routes).toBeDefined();
    expect(Array.isArray(router.routes)).toBe(true);
  });

  it('should have a root route', async () => {
    const { router } = await import('@core/config/router');
    const rootRoute = router.routes.find((r) => r.path === '/');
    expect(rootRoute).toBeDefined();
  });

  it('should have child routes for composer and settings', async () => {
    const { router } = await import('@core/config/router');
    const rootRoute = router.routes.find((r) => r.path === '/');
    const children = rootRoute?.children || [];
    const childPaths = children.map((c) => c.path);
    expect(childPaths).toContain('composer');
    expect(childPaths).toContain('settings');
  });
});
