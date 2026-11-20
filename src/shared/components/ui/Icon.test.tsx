import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Icon from './Icon';
import { ICON_REGISTRY, type IconName } from './iconRegistry';

describe('Icon', () => {
  it('renders an SVG with geometric primitives for every registered IconName', () => {
    const names = Object.keys(ICON_REGISTRY) as IconName[];
    expect(names.length).toBeGreaterThanOrEqual(90);

    for (const name of names) {
      const { container, unmount } = render(<Icon name={name} className="w-4 h-4" />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      const primitives = svg!.querySelectorAll('path, circle, rect, line, polyline, polygon');
      expect(primitives.length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('returns null safely for an unknown icon key at runtime', () => {
    const { container } = render(<Icon name={'__unknown__' as IconName} />);
    expect(container.querySelector('svg')).toBeNull();
  });
});
