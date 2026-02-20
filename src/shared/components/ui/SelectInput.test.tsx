import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test-utils';
import SelectInput from './SelectInput';

const defaultProps = {
  label: 'Color',
  name: 'color',
  options: [
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
  ],
  value: 'red',
  onChange: vi.fn(),
};

describe('SelectInput', () => {
  it('should render with label', () => {
    render(<SelectInput {...defaultProps} />);
    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('should render all options', () => {
    render(<SelectInput {...defaultProps} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select.querySelectorAll('option')).toHaveLength(3);
  });

  it('should set the correct value', () => {
    render(<SelectInput {...defaultProps} value="blue" />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('blue');
  });

  it('should call onChange when selection changes', async () => {
    const onChange = vi.fn();
    const { user } = render(<SelectInput {...defaultProps} onChange={onChange} />);
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'green');
    expect(onChange).toHaveBeenCalled();
  });

  it('should show error message when error prop is set', () => {
    render(<SelectInput {...defaultProps} error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('should set aria-invalid when error is present', () => {
    render(<SelectInput {...defaultProps} error="Required" />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });

  it('should not set aria-invalid when no error', () => {
    render(<SelectInput {...defaultProps} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-invalid', 'false');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<SelectInput {...defaultProps} disabled />);
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('should render action button when provided', () => {
    render(
      <SelectInput
        {...defaultProps}
        actionButton={<button data-testid="action-btn">Act</button>}
      />,
    );
    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
  });

  it('should render ReactNode labels', () => {
    render(
      <SelectInput {...defaultProps} label={<span data-testid="custom-label">Custom</span>} />,
    );
    expect(screen.getByTestId('custom-label')).toBeInTheDocument();
  });

  it('should call onBlur when provided', async () => {
    const onBlur = vi.fn();
    const { user } = render(<SelectInput {...defaultProps} onBlur={onBlur} />);
    const select = screen.getByRole('combobox');
    await user.click(select);
    await user.tab();
    expect(onBlur).toHaveBeenCalled();
  });

  it('should have correct id based on name', () => {
    render(<SelectInput {...defaultProps} name="test-field" />);
    const select = screen.getByRole('combobox');
    expect(select.id).toBe('select-test-field');
  });
});
