/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Consolidated App component to the root directory for clarity.
import App from './App';
import { OnboardingProvider } from './shared/contexts/OnboardingContext';
import { AccessibilityProvider } from './shared/contexts/AccessibilityContext';
import './shared/styles/accessibility.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AccessibilityProvider>
      <OnboardingProvider>
        <App />
      </OnboardingProvider>
    </AccessibilityProvider>
  </React.StrictMode>
);