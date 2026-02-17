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
import { performanceService } from './core/services/performanceService';
import { crashReporterService } from './core/services/crashReporterService';
import { telemetryService } from './core/services/telemetryService';
import { differentialUpdateService } from './core/services/differentialUpdateService';
import { useAppStore } from './core/store/useAppStore';
import './index.css';
import './shared/styles/accessibility.css';
import './shared/styles/theme-presets.css';
import { themeService } from './core/services/themeService';

// Mark app startup time
performanceService.startMark('app-startup');

installGlobalUnhandledRejectionHandler();
initCrashCounterGuards();

// Initialize Production Desktop services (v2.0.0)
crashReporterService.initialize().catch((err) => {
  console.error('[CrashReporter] Failed to initialize:', err);
});
telemetryService.initialize().catch((err) => {
  console.error('[Telemetry] Failed to initialize:', err);
});
differentialUpdateService.initialize().catch((err) => {
  console.error('[DiffUpdate] Failed to initialize:', err);
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
    console.error('[Theme] Failed to initialize:', err);
  });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <AccessibilityProvider>
        <OnboardingProvider>
          <RouterProvider router={router} />
        </OnboardingProvider>
      </AccessibilityProvider>
    </I18nextProvider>
  </React.StrictMode>,
);
