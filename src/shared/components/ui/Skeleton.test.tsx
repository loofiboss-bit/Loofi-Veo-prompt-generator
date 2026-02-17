/**
 * Skeleton Component Tests
 * Verifies rendering, variants, count, custom dimensions, and presets.
 */

import React from 'react';
import { render } from '../../../test-utils';
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  StudioSkeleton,
  ModalSkeleton,
  TimelineSkeleton,
} from './Skeleton';

describe('Skeleton', () => {
  it('renders a single skeleton element by default', () => {
    const { container } = render(<Skeleton />);
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons).toHaveLength(1);
  });

  it('renders multiple skeleton elements with count', () => {
    const { container } = render(<Skeleton count={4} />);
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons).toHaveLength(4);
  });

  it('applies variant class', () => {
    const { container } = render(<Skeleton variant="circular" />);
    expect(container.querySelector('.skeleton-circular')).toBeInTheDocument();
  });

  it('applies custom width and height as px', () => {
    const { container } = render(<Skeleton width={200} height={50} />);
    const el = container.querySelector('.skeleton') as HTMLElement;
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('50px');
  });

  it('applies custom width and height as string', () => {
    const { container } = render(<Skeleton width="80%" height="2rem" />);
    const el = container.querySelector('.skeleton') as HTMLElement;
    expect(el.style.width).toBe('80%');
    expect(el.style.height).toBe('2rem');
  });

  it('sets aria-busy for accessibility', () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('.skeleton');
    expect(el).toHaveAttribute('aria-busy', 'true');
  });

  it('applies additional className', () => {
    const { container } = render(<Skeleton className="foo" />);
    expect(container.querySelector('.skeleton.foo')).toBeInTheDocument();
  });
});

describe('Skeleton Presets', () => {
  it('renders SkeletonText with default 3 lines', () => {
    const { container } = render(<SkeletonText />);
    expect(container.querySelectorAll('.skeleton-text')).toHaveLength(3);
  });

  it('renders SkeletonText with custom line count', () => {
    const { container } = render(<SkeletonText lines={5} />);
    expect(container.querySelectorAll('.skeleton-text')).toHaveLength(5);
  });

  it('renders SkeletonCard', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.querySelector('.skeleton-rectangular')).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton-text').length).toBeGreaterThanOrEqual(1);
  });

  it('renders SkeletonAvatar without text', () => {
    const { container } = render(<SkeletonAvatar />);
    expect(container.querySelector('.skeleton-avatar')).toBeInTheDocument();
    // Should not have text skeletons
    expect(container.querySelectorAll('.skeleton-text')).toHaveLength(0);
  });

  it('renders SkeletonAvatar with text', () => {
    const { container } = render(<SkeletonAvatar withText />);
    expect(container.querySelector('.skeleton-avatar')).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton-text')).toHaveLength(2);
  });

  it('renders StudioSkeleton', () => {
    const { container } = render(<StudioSkeleton />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(3);
  });

  it('renders ModalSkeleton', () => {
    const { container } = render(<ModalSkeleton />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(3);
  });

  it('renders TimelineSkeleton', () => {
    const { container } = render(<TimelineSkeleton />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(3);
  });
});
