import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('should render with title', () => {
    render(<EmptyState title="No items yet" />);
    expect(screen.getByText('No items yet')).toBeTruthy();
  });

  it('should render with custom icon', () => {
    render(<EmptyState icon="🎬" title="No scenes" />);
    expect(screen.getByText('🎬')).toBeTruthy();
  });

  it('should render description when provided', () => {
    render(<EmptyState title="Empty" description="Create your first scene to get started." />);
    expect(screen.getByText('Create your first scene to get started.')).toBeTruthy();
  });

  it('should not render description when absent', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector('.empty-state-desc')).toBeNull();
  });

  it('should render action button and fire callback', () => {
    const onAction = vi.fn();
    render(<EmptyState title="Empty" actionLabel="Create First" onAction={onAction} />);

    const btn = screen.getByRole('button', { name: /create first/i });
    expect(btn).toBeTruthy();

    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('should not render action button without both label and callback', () => {
    const { container } = render(<EmptyState title="Empty" actionLabel="Click me" />);
    expect(container.querySelector('.empty-state-action')).toBeNull();
  });

  it('should have an accessible role and label', () => {
    render(<EmptyState title="History empty" />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('aria-label')).toBe('History empty');
  });

  it('should apply custom className', () => {
    const { container } = render(<EmptyState title="Test" className="my-custom" />);
    const root = container.querySelector('.empty-state');
    expect(root?.classList.contains('my-custom')).toBe(true);
  });
});
