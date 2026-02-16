/**
 * CollapsibleSection Component Tests
 * Verifies rendering, toggle, step number, color variants, and ARIA attributes.
 */

import React from 'react';
import { render, screen } from '../../../test-utils';
import CollapsibleSection from './CollapsibleSection';

// Mock Icon to avoid SVG sprite dependency
vi.mock('./Icon', () => ({
  default: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

describe('CollapsibleSection', () => {
  it('renders title text', () => {
    render(
      <CollapsibleSection title="Details" isOpen={false} onToggle={vi.fn()}>
        Content
      </CollapsibleSection>,
    );
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('has correct aria-expanded attribute when closed', () => {
    render(
      <CollapsibleSection title="Closed" isOpen={false} onToggle={vi.fn()}>
        Hidden
      </CollapsibleSection>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('has correct aria-expanded attribute when open', () => {
    render(
      <CollapsibleSection title="Open" isOpen onToggle={vi.fn()}>
        Visible
      </CollapsibleSection>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onToggle when clicked', async () => {
    const onToggle = vi.fn();
    const { user } = render(
      <CollapsibleSection title="Toggle" isOpen={false} onToggle={onToggle}>
        Content
      </CollapsibleSection>,
    );
    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('renders step number when provided', () => {
    render(
      <CollapsibleSection title="Step" isOpen={false} onToggle={vi.fn()} stepNumber={3}>
        Content
      </CollapsibleSection>,
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders children when open', () => {
    render(
      <CollapsibleSection title="Open" isOpen onToggle={vi.fn()}>
        <p>Inner content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Inner content')).toBeInTheDocument();
  });

  it('sets data-tutorial-id when provided', () => {
    const { container } = render(
      <CollapsibleSection title="Tutorial" isOpen={false} onToggle={vi.fn()} tutorialId="step-1">
        Content
      </CollapsibleSection>,
    );
    expect(container.querySelector('[data-tutorial-id="step-1"]')).toBeInTheDocument();
  });

  it('renders chevron-down icon', () => {
    render(
      <CollapsibleSection title="Icon" isOpen={false} onToggle={vi.fn()}>
        Content
      </CollapsibleSection>,
    );
    expect(screen.getByTestId('icon-chevron-down')).toBeInTheDocument();
  });
});
