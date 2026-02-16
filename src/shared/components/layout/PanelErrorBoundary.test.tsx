/**
 * PanelErrorBoundary Component Tests
 * Verifies error catching, fallback UI, and retry functionality.
 */

import React from 'react';
import { render, screen } from '../../../test-utils';
import PanelErrorBoundary from './PanelErrorBoundary';

// Mock logger to suppress console output
vi.mock('@core/services/loggerService', () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// A component that throws on render
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('PanelErrorBoundary', () => {
  // Suppress React error boundary console.error in tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <PanelErrorBoundary panelName="TestPanel">
        <div>Healthy content</div>
      </PanelErrorBoundary>,
    );
    expect(screen.getByText('Healthy content')).toBeInTheDocument();
  });

  it('shows fallback UI when child throws', () => {
    render(
      <PanelErrorBoundary panelName="CrashingPanel">
        <ThrowingComponent />
      </PanelErrorBoundary>,
    );
    expect(screen.getByText('CrashingPanel failed to render')).toBeInTheDocument();
    expect(screen.getByText(/still running/)).toBeInTheDocument();
  });

  it('shows retry button in fallback', () => {
    render(
      <PanelErrorBoundary panelName="RetryPanel">
        <ThrowingComponent />
      </PanelErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: 'Retry panel' })).toBeInTheDocument();
  });

  it('recovers after retry when component stops throwing', async () => {
    // Use a ref to control whether the child throws
    let shouldThrow = true;

    function ConditionalThrow() {
      if (shouldThrow) throw new Error('boom');
      return <div>Recovered</div>;
    }

    const { user } = render(
      <PanelErrorBoundary panelName="RecoverPanel">
        <ConditionalThrow />
      </PanelErrorBoundary>,
    );

    // Should show error state
    expect(screen.getByText('RecoverPanel failed to render')).toBeInTheDocument();

    // Stop throwing before retry
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: 'Retry panel' }));

    // Should now show recovered content
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('displays the panel name in the error message', () => {
    render(
      <PanelErrorBoundary panelName="Audio Studio">
        <ThrowingComponent />
      </PanelErrorBoundary>,
    );
    expect(screen.getByText('Audio Studio failed to render')).toBeInTheDocument();
  });
});
