import { render, screen } from '@testing-library/react';
import { LocalOnlyBadge } from './LocalOnlyBadge';

it('renders local only text', () => {
  render(<LocalOnlyBadge />);
  expect(screen.getByText(/local only/i)).toBeInTheDocument();
});

it('has descriptive title attribute mentioning BroadcastChannel', () => {
  render(<LocalOnlyBadge />);
  expect(screen.getByTitle(/BroadcastChannel/i)).toBeInTheDocument();
});
