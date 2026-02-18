/**
 * Chip Component Tests
 * Verifies rendering, click handler, icon, and disabled state.
 */

import React from 'react';
import { render, screen } from '../../../test-utils';
import Chip from './Chip';

// Mock Icon to avoid SVG sprite dependency
vi.mock('./Icon', () => ({
  default: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

describe('Chip', () => {
  it('renders with label text', () => {
    render(<Chip label="Tag" onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Tag' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const { user } = render(<Chip label="Click" onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders icon when iconName is provided', () => {
    render(<Chip label="Star" onClick={vi.fn()} iconName="check" />);
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    render(<Chip label="Disabled" onClick={vi.fn()} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Chip label="Custom" onClick={vi.fn()} className="my-class" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('my-class');
  });
});
