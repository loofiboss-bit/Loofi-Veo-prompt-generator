/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Consolidated App component to the root directory for clarity.
import { App } from './App';
import { OnboardingProvider } from './shared/contexts/OnboardingContext';
import { AccessibilityProvider } from './shared/contexts/AccessibilityContext';
import { installGlobalUnhandledRejectionHandler } from './core/services/globalUnhandledRejectionService';
import { initCrashCounterGuards } from './core/services/crashCounterService';
import { performanceService } from './core/services/performanceService';
import { crashReporterService } from './core/services/crashReporterService';
import { telemetryService } from './core/services/telemetryService';
import { differentialUpdateService } from './core/services/differentialUpdateService';
import './index.css';
import './shared/styles/accessibility.css';

// Mark app startup time
performanceService.startMark('app-startup');

installGlobalUnhandledRejectionHandler();
initCrashCounterGuards();

// Initialize Production Desktop services (v2.0.0)
crashReporterService.initialize().catch(() => {});
telemetryService.initialize().catch(() => {});
differentialUpdateService.initialize().catch(() => {});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AccessibilityProvider>
      <OnboardingProvider>
        <App />
      </OnboardingProvider>
    </AccessibilityProvider>
  </React.StrictMode>,
);
