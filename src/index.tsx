/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';
import { i18n } from '@core/config/i18n';
import { router } from '@core/config/router';
import { OnboardingProvider } from './shared/contexts/OnboardingContext';
import { AccessibilityProvider } from './shared/contexts/AccessibilityContext';
import { installGlobalUnhandledRejectionHandler } from './core/services/globalUnhandledRejectionService';
import { initCrashCounterGuards } from './core/services/crashCounterService';
import { crashReporterService } from './core/services/crashReporterService';
import { telemetryService } from './core/services/telemetryService';
import { differentialUpdateService } from './core/services/differentialUpdateService';
import { logger } from './core/services/loggerService';
import { useAppStore } from '@core/store/useAppStore';
import './index.css';
import './shared/styles/accessibility.css';
import './shared/styles/theme-presets.css';
import { themeService } from './core/services/themeService';
import { markStart, PERF_MARKS } from './core/utils/performanceMarks';

// Mark app startup time
markStart(PERF_MARKS.APP_STARTUP);

installGlobalUnhandledRejectionHandler();
initCrashCounterGuards();

// Initialize Production Desktop services (v2.0.0)
crashReporterService.initialize().catch((err) => {
  logger.error('Failed to initialize', 'CrashReporter', err);
});
telemetryService.initialize().catch((err) => {
  logger.error('Failed to initialize', 'Telemetry', err);
});
differentialUpdateService.initialize().catch((err) => {
  logger.error('Failed to initialize', 'DiffUpdate', err);
});

// Initialize theme service (v2.4.0)
themeService
  .initialize()
  .then(() => {
    useAppStore.getState().setTheme(themeService.getMode());
    themeService.subscribe((preferences) => {
      useAppStore.getState().setTheme(preferences.mode);
    });
  })
  .catch((err) => {
    logger.error('Failed to initialize', 'Theme', err);
  });

import { ErrorBoundary } from './shared/components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary panelId="app-root">
      <I18nextProvider i18n={i18n}>
        <AccessibilityProvider>
          <OnboardingProvider>
            <RouterProvider router={router} />
          </OnboardingProvider>
        </AccessibilityProvider>
      </I18nextProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
