/**
 * Toast Component Tests
 * Verifies rendering, type variants, dismiss callback, and accessibility.
 */

import React from 'react';
import { render, screen } from '../../../test-utils';
import Toast from './Toast';

// Mock Icon to avoid SVG sprite dependency
vi.mock('./Icon', () => ({
  default: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

describe('Toast', () => {
  it('renders success toast with message', () => {
    render(
      <Toast
        toast={{ id: '1', type: 'success', message: 'Saved successfully' }}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  it('renders error toast with message', () => {
    render(
      <Toast
        toast={{ id: '2', type: 'error', message: 'Something went wrong' }}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('has status role for accessibility', () => {
    render(<Toast toast={{ id: '3', type: 'info', message: 'Info toast' }} onDismiss={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live polite', () => {
    render(<Toast toast={{ id: '4', type: 'warning', message: 'Warning' }} onDismiss={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('renders dismiss button', () => {
    render(<Toast toast={{ id: '5', type: 'info', message: 'Dismiss me' }} onDismiss={vi.fn()} />);
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });

  it('renders different icons for different types', () => {
    const { rerender } = render(
      <Toast toast={{ id: '6', type: 'success', message: 'OK' }} onDismiss={vi.fn()} />,
    );
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();

    rerender(<Toast toast={{ id: '7', type: 'info', message: 'Info' }} onDismiss={vi.fn()} />);
    expect(screen.getByTestId('icon-lightbulb')).toBeInTheDocument();
  });

  it('applies type-specific styling classes', () => {
    const { container } = render(
      <Toast toast={{ id: '8', type: 'error', message: 'Error' }} onDismiss={vi.fn()} />,
    );
    const toastEl = container.firstElementChild as HTMLElement;
    expect(toastEl.className).toContain('border-red-500');
  });
});
