/**
 * Button Component Tests
 * Verifies rendering, variants, sizes, loading state, icon placement, and disabled state.
 */

import React from 'react';
import { render, screen } from '../../../test-utils';
import Button from './Button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('applies variant class names', () => {
    const { rerender } = render(<Button variant="danger">Delete</Button>);
    let btn = screen.getByRole('button');
    expect(btn.className).toContain('from-red-600');

    rerender(<Button variant="ghost">Ghost</Button>);
    btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-transparent');
  });

  it('applies size class names', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('h-8');
    expect(btn.className).toContain('text-sm');
  });

  it('shows loading spinner and disables button when loading', () => {
    render(<Button loading>Saving</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    // Loading spinner SVG should be present
    expect(btn.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('supports isLoading alias', () => {
    render(<Button isLoading>Processing</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('renders icon on the left by default', () => {
    const icon = <span data-testid="icon">★</span>;
    render(<Button icon={icon}>Star</Button>);
    const btn = screen.getByRole('button');
    const iconEl = screen.getByTestId('icon');
    // Icon should come before the text
    expect(btn.firstElementChild).toBe(iconEl);
  });

  it('renders icon on the right when iconPosition="right"', () => {
    const icon = <span data-testid="icon">★</span>;
    render(
      <Button icon={icon} iconPosition="right">
        Star
      </Button>,
    );
    const btn = screen.getByRole('button');
    const iconEl = screen.getByTestId('icon');
    expect(btn.lastElementChild).toBe(iconEl);
  });

  it('applies fullWidth class', () => {
    render(<Button fullWidth>Wide</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('w-full');
  });

  it('forwards native button props', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <Button onClick={onClick} type="submit">
        Submit
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'submit');
    await user.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disables when disabled prop is set', () => {
    render(<Button disabled>Nope</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
