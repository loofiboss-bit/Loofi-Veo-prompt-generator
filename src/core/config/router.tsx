/**
 * Router Configuration
 * v2.4.0 — Hash-based routing for Electron compatibility
 *
 * Uses createHashRouter for file:// protocol support in Electron.
 * Core routes: prompt builder (index), composer, timeline, settings.
 * Studios and modals remain Zustand state-driven.
 */

import React from 'react';
import { createHashRouter, Navigate } from 'react-router';
import { App } from '../../App';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { ROUTES } from './routes';

// Lazy-loaded route components
const TimelinePage = React.lazy(() =>
  import('@features/timeline/TimelinePage').then((m) => ({ default: m.TimelinePage })),
);

const CreatePage = React.lazy(() =>
  import('@features/create').then((module) => ({ default: module.CreatePage })),
);

const ProjectsPage = React.lazy(() =>
  import('@features/hubs').then((module) => ({ default: module.ProjectsPage })),
);

const AssetsPage = React.lazy(() =>
  import('@features/hubs').then((module) => ({ default: module.AssetsPage })),
);

const ActivityPage = React.lazy(() =>
  import('@features/hubs').then((module) => ({ default: module.ActivityPage })),
);

const SettingsPage = React.lazy(() =>
  import('@features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

export { ROUTES } from './routes';
export type { RoutePath } from './routes';

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
    path: ROUTES.HOME,
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to={ROUTES.CREATE} replace />,
      },
      {
        path: 'composer',
        element: <Navigate to={ROUTES.CREATE} replace />,
      },
      {
        path: 'create',
        element: (
          <ErrorBoundary panelId="route-create-panel">
            <React.Suspense fallback={<RoutePageSkeleton />}>
              <CreatePage />
            </React.Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'projects',
        element: (
          <ErrorBoundary panelId="route-projects-panel">
            <React.Suspense fallback={<RoutePageSkeleton />}>
              <ProjectsPage />
            </React.Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'assets',
        element: (
          <ErrorBoundary panelId="route-assets-panel">
            <React.Suspense fallback={<RoutePageSkeleton />}>
              <AssetsPage />
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
        path: 'optimize',
        element: <Navigate to={ROUTES.CREATE} replace />,
      },
      {
        path: 'director',
        element: <Navigate to={ROUTES.CREATE} replace />,
      },
      {
        path: 'activity',
        element: (
          <ErrorBoundary panelId="route-activity-panel">
            <React.Suspense fallback={<RoutePageSkeleton />}>
              <ActivityPage />
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
        element: <Navigate to={ROUTES.CREATE} replace />,
      },
    ],
  },
]);
