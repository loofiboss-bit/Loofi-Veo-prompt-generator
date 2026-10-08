import { describe, expect, it } from 'vitest';
import { NAVIGATION_DESTINATIONS, getNavigationDestination } from './navigation';
import { ROUTES } from './routes';

describe('navigation destinations', () => {
  it('defines eight unique canonical routes in workflow order', () => {
    expect(NAVIGATION_DESTINATIONS.map((destination) => destination.id)).toEqual([
      'start',
      'studio',
      'create',
      'timeline',
      'projects',
      'assets',
      'activity',
      'settings',
    ]);
    expect(new Set(NAVIGATION_DESTINATIONS.map((destination) => destination.path)).size).toBe(8);
    for (const destination of NAVIGATION_DESTINATIONS)
      expect(getNavigationDestination(destination.path)).toBe(destination);
  });
  it('keeps the legacy director route active in Production', () => {
    expect(getNavigationDestination(ROUTES.DIRECTOR)?.id).toBe('create');
    expect(getNavigationDestination(ROUTES.HOME)).toBeUndefined();
  });
});
