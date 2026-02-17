/**
 * Test Utilities
 *
 * Custom render function that wraps components with all required providers.
 * Use this instead of @testing-library/react's render() in component tests.
 */

import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@core/config/i18n';

/**
 * Provider wrapper for component tests.
 * Includes MemoryRouter for routing context and I18nextProvider for translations.
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{children}</MemoryRouter>
    </I18nextProvider>
  );
}

/**
 * Custom render that wraps the component with all providers.
 * Returns the render result plus a pre-configured userEvent instance.
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render with our custom version
export { customRender as render };
