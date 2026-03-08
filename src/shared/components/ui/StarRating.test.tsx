import { render, screen, fireEvent } from '@testing-library/react';
import { vi, it, describe, expect } from 'vitest';
import { StarRating } from './StarRating';

describe('StarRating', () => {
  it('renders 5 star buttons', () => {
    render(<StarRating value={0} onChange={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('calls onChange with correct rating on click', () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button')[2]); // 3rd star = rating 3
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('marks stars at or below value as pressed', () => {
    render(<StarRating value={3} onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[3]).toHaveAttribute('aria-pressed', 'false');
    expect(buttons[4]).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not call onChange when readonly', () => {
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} readonly />);
    fireEvent.click(screen.getAllByRole('button')[4]);
    expect(onChange).not.toHaveBeenCalled();
  });
});
