/**
 * Input Component Tests
 * Verifies rendering, label, helper text, validation states, icons, and ref forwarding.
 */

import React from 'react';
import { render, screen } from '../../../test-utils';
import Input from './Input';

describe('Input', () => {
  it('renders a basic input', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with label linked by htmlFor', () => {
    render(<Input label="Email" id="email-input" />);
    const label = screen.getByText('Email');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'email-input');
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('auto-generates id when not provided', () => {
    render(<Input label="Name" />);
    const label = screen.getByText('Name');
    const forAttr = label.getAttribute('for');
    expect(forAttr).toMatch(/^input-/);
    // The input should have a matching id
    const input = screen.getByLabelText('Name');
    expect(input.id).toBe(forAttr);
  });

  it('renders helper text', () => {
    render(<Input helperText="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('applies error state border color', () => {
    render(<Input state="error" placeholder="broken" />);
    const input = screen.getByPlaceholderText('broken');
    expect(input.className).toContain('border-red-500');
  });

  it('applies success state border color', () => {
    render(<Input state="success" placeholder="ok" />);
    const input = screen.getByPlaceholderText('ok');
    expect(input.className).toContain('border-green-500');
  });

  it('applies warning state border color', () => {
    render(<Input state="warning" placeholder="warn" />);
    const input = screen.getByPlaceholderText('warn');
    expect(input.className).toContain('border-yellow-500');
  });

  it('renders left icon with padding', () => {
    const icon = <span data-testid="left-icon">🔍</span>;
    render(<Input leftIcon={icon} placeholder="search" />);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('search');
    expect(input.className).toContain('pl-10');
  });

  it('renders right icon with padding', () => {
    const icon = <span data-testid="right-icon">✕</span>;
    render(<Input rightIcon={icon} placeholder="clear" />);
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('clear');
    expect(input.className).toContain('pr-10');
  });

  it('applies size classes', () => {
    render(<Input inputSize="lg" placeholder="large" />);
    const input = screen.getByPlaceholderText('large');
    expect(input.className).toContain('h-12');
  });

  it('applies fullWidth class', () => {
    render(<Input fullWidth placeholder="wide" />);
    const input = screen.getByPlaceholderText('wide');
    expect(input.className).toContain('w-full');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('accepts user input', async () => {
    const { user } = render(<Input placeholder="type here" />);
    const input = screen.getByPlaceholderText('type here');
    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });
});
