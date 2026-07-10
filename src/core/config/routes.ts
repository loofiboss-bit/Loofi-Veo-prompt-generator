/**
 * Standalone route path constants.
 *
 * Kept separate from `router.tsx` so application code can import navigation
 * paths without creating a circular dependency back through the router.
 */

export const ROUTES = {
  HOME: '/',
  COMPOSER: '/composer',
  TIMELINE: '/timeline',
  OPTIMIZE: '/optimize',
  DIRECTOR: '/director',
  SETTINGS: '/settings',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
