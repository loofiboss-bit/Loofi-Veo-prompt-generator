/**
 * Test Utilities
 *
 * Custom render function that wraps components with all required providers.
 * Use this instead of @testing-library/react's render() in component tests.
 */

import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Provider wrapper for component tests.
 * Add context providers here as needed (Accessibility, Onboarding, etc.)
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
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
