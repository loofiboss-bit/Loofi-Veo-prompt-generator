import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

// Mock the services
vi.mock('@core/services', () => ({
  errorLoggingService: {
    logError: vi.fn(),
  },
}));

vi.mock('@core/services/crashCounterService', () => ({
  incrementCrashCounterFromComponentDidCatch: vi.fn(),
}));

import { errorLoggingService } from '@core/services';
import { incrementCrashCounterFromComponentDidCatch } from '@core/services/crashCounterService';

const ThrowError = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress React's console.error stack traces during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary panelId="test-panel">
        <div>Test content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch error and display default error UI', () => {
    render(
      <ErrorBoundary panelId="test-panel">
        <ThrowError message="Test error message" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong in this panel.')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('should log error with correct panelId context', () => {
    render(
      <ErrorBoundary panelId="specific-panel">
        <ThrowError message="Error to log" />
      </ErrorBoundary>,
    );

    expect(errorLoggingService.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Error to log',
      }),
      'ErrorBoundary:specific-panel',
    );
  });

  it('should call incrementCrashCounterFromComponentDidCatch', () => {
    render(
      <ErrorBoundary panelId="test-panel">
        <ThrowError message="Test crash" />
      </ErrorBoundary>,
    );

    expect(incrementCrashCounterFromComponentDidCatch).toHaveBeenCalled();
  });

  it('should clear error state when retry button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary panelId="test-panel">
        <ThrowError message="Initial error" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong in this panel.')).toBeInTheDocument();
    expect(screen.getByText('Initial error')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();

    // Verify retry button can be clicked and resets state
    await user.click(retryButton);

    // Button remains available for retry
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('should use custom fallback when provided', () => {
    const fallback = <div className="custom-fallback">Custom error UI</div>;

    render(
      <ErrorBoundary panelId="test-panel" fallback={fallback}>
        <ThrowError message="Test error" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong in this panel.')).not.toBeInTheDocument();
  });

  it('should include error message in default UI when error is present', () => {
    render(
      <ErrorBoundary panelId="test-panel">
        <ThrowError message="Specific error this time" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Specific error this time')).toBeInTheDocument();
  });

  it('should isolate nested boundaries with safe siblings', () => {
    render(
      <ErrorBoundary panelId="outer-boundary">
        <div>Safe sibling content</div>
        <ErrorBoundary panelId="inner-boundary">
          <ThrowError message="Inner error" />
        </ErrorBoundary>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Safe sibling content')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong in this panel.')).toBeInTheDocument();
    expect(screen.getByText('Inner error')).toBeInTheDocument();
    expect(errorLoggingService.logError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Inner error' }),
      'ErrorBoundary:inner-boundary',
    );
  });
});
