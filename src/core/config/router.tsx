/**
 * Router Configuration
 * v2.4.0 — Hash-based routing for Electron compatibility
 *
 * Uses createHashRouter for file:// protocol support in Electron.
 * Core routes: prompt builder (index), composer, timeline, settings.
 * Studios and modals remain Zustand state-driven.
 */

import React from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import { App } from '../../App';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { Skeleton } from '@shared/components/ui/Skeleton';

// Lazy-loaded route components
const ComposerPanel = React.lazy(() =>
  import('@features/composer/ComposerPanel').then((m) => ({ default: m.ComposerPanel })),
);

const TimelinePage = React.lazy(() =>
  import('@features/timeline/TimelinePage').then((m) => ({ default: m.TimelinePage })),
);

const SettingsPage = React.lazy(() =>
  import('@features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

/** Route path constants for type-safe navigation. */
export const ROUTES = {
  HOME: '/',
  COMPOSER: '/composer',
  TIMELINE: '/timeline',
  SETTINGS: '/settings',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

function RoutePageSkeleton() {
  return (
    <div className="h-full w-full p-6 bg-slate-950 flex flex-col gap-3">
      <Skeleton variant="rectangular" className="h-12 w-48" />
      <Skeleton variant="rectangular" className="h-6 w-full" />
      <Skeleton variant="rectangular" className="h-6 w-3/4" />
      <Skeleton variant="rectangular" className="h-64 w-full" />
    </div>
  );
}

/**
 * Hash-based router instance.
 * Uses createHashRouter for Electron file:// protocol compatibility.
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        // Prompt Builder is rendered directly by the App shell when no child route matches
        element: null,
      },
      {
        path: 'composer',
        element: (
          <ErrorBoundary panelId="route-composer-panel">
            <React.Suspense fallback={<RoutePageSkeleton />}>
              <ComposerPanel />
            </React.Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'timeline',
        element: (
          <ErrorBoundary panelId="route-timeline-panel">
            <React.Suspense fallback={<RoutePageSkeleton />}>
              <TimelinePage />
            </React.Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'settings',
        element: (
          <ErrorBoundary panelId="route-settings-panel">
            <React.Suspense fallback={<RoutePageSkeleton />}>
              <SettingsPage />
            </React.Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
