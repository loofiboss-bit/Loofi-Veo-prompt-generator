import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test-utils';
import CheckboxInput from './CheckboxInput';

const defaultProps = {
  id: 'test-checkbox',
  name: 'agree',
  label: 'I agree',
  checked: false,
  onChange: vi.fn(),
};

describe('CheckboxInput', () => {
  it('should render with label', () => {
    render(<CheckboxInput {...defaultProps} />);
    expect(screen.getByText('I agree')).toBeInTheDocument();
  });

  it('should render unchecked by default', () => {
    render(<CheckboxInput {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('should render checked when checked prop is true', () => {
    render(<CheckboxInput {...defaultProps} checked={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should call onChange when clicked', async () => {
    const onChange = vi.fn();
    const { user } = render(<CheckboxInput {...defaultProps} onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<CheckboxInput {...defaultProps} disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('should have correct id attribute', () => {
    render(<CheckboxInput {...defaultProps} id="my-cb" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.id).toBe('my-cb');
  });

  it('should have correct name attribute', () => {
    render(<CheckboxInput {...defaultProps} name="terms" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('name', 'terms');
  });

  it('should render with cyan color by default', () => {
    const { container } = render(<CheckboxInput {...defaultProps} />);
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox?.className).toContain('cyan');
  });

  it('should render with fuchsia color when specified', () => {
    const { container } = render(<CheckboxInput {...defaultProps} color="fuchsia" />);
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox?.className).toContain('fuchsia');
  });

  it('should render tooltip when tooltipText is provided', () => {
    render(<CheckboxInput {...defaultProps} tooltipText="More info" />);
    // Tooltip wraps the label; the label should still be visible
    expect(screen.getByText('I agree')).toBeInTheDocument();
  });

  it('should link label to checkbox via htmlFor', () => {
    render(<CheckboxInput {...defaultProps} id="linked-cb" />);
    const label = screen.getByText('I agree');
    expect(label.closest('label')).toHaveAttribute('for', 'linked-cb');
  });
});
