/**
 * Router Configuration Unit Tests
 * v2.4.0 — Tests for hash router setup and route definitions.
 */

import { describe, expect, it, vi } from 'vitest';

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

vi.mock('../../App', () => ({
  App: () => null,
}));

vi.mock('@features/composer/ComposerPanel', () => ({
  ComposerPanel: () => null,
}));

vi.mock('@features/settings/SettingsPage', () => ({
  SettingsPage: () => null,
}));

import * as routerModule from '@core/config/router';

describe('Router Configuration', () => {
  it('loads router module', () => {
    expect(routerModule).toBeDefined();
  });

  it('should export ROUTES constant with expected paths', () => {
    const { ROUTES } = routerModule;
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.COMPOSER).toBe('/composer');
    expect(ROUTES.SETTINGS).toBe('/settings');
  });

  it('should export router instance', () => {
    const { router } = routerModule;
    expect(router).toBeDefined();
    expect(router.routes).toBeDefined();
    expect(Array.isArray(router.routes)).toBe(true);
  });

  it('should have a root route', () => {
    const { router } = routerModule;
    const rootRoute = router.routes.find((r) => r.path === '/');
    expect(rootRoute).toBeDefined();
  });

  it('should have child routes for composer and settings', () => {
    const { router } = routerModule;
    const rootRoute = router.routes.find((r) => r.path === '/');
    const children = rootRoute?.children || [];
    const childPaths = children.map((c) => c.path);
    expect(childPaths).toContain('composer');
    expect(childPaths).toContain('settings');
  });
});
