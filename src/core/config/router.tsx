/**
 * Router Configuration
 * v2.4.0 — Hash-based routing for Electron compatibility
 *
 * Uses createHashRouter for file:// protocol support in Electron.
 * Core routes: prompt builder (index), composer, settings.
 * Studios and modals remain Zustand state-driven.
 */

import React from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import { App } from '../../App';

// Lazy-loaded route components
const ComposerPanel = React.lazy(() =>
  import('@features/composer/ComposerPanel').then((m) => ({ default: m.ComposerPanel })),
);

const SettingsPage = React.lazy(() =>
  import('@features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

/** Route path constants for type-safe navigation. */
export const ROUTES = {
  HOME: '/',
  COMPOSER: '/composer',
  SETTINGS: '/settings',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

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
          <React.Suspense
            fallback={
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <ComposerPanel />
          </React.Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <React.Suspense
            fallback={
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <SettingsPage />
          </React.Suspense>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
