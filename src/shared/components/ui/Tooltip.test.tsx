/**
 * Tooltip Component Tests
 * Verifies rendering, hover/focus visibility, keyboard toggle, and ARIA attributes.
 */

import React from 'react';
import { render, screen, fireEvent } from '../../../test-utils';
import Tooltip from './Tooltip';

describe('Tooltip', () => {
  it('renders children', () => {
    render(
      <Tooltip text="Help text">
        <span>Hover me</span>
      </Tooltip>,
    );
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('does not show tooltip text initially', () => {
    render(<Tooltip text="Hidden text" />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on mouse enter', () => {
    render(<Tooltip text="Visible on hover" />);
    // Hover over the info icon trigger
    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Visible on hover')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    render(<Tooltip text="Will hide" />);
    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on focus', () => {
    render(<Tooltip text="Focus tooltip" />);
    const trigger = screen.getByRole('button');
    fireEvent.focus(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip on blur', () => {
    render(<Tooltip text="Blur tooltip" />);
    const trigger = screen.getByRole('button');
    fireEvent.focus(trigger);
    fireEvent.blur(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('toggles tooltip with Enter key', () => {
    render(<Tooltip text="Keyboard toggle" />);
    const trigger = screen.getByRole('button');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('toggles tooltip with Space key', () => {
    render(<Tooltip text="Space toggle" />);
    const trigger = screen.getByRole('button');
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('has aria-describedby linking to tooltip', () => {
    render(<Tooltip text="Described" />);
    const trigger = screen.getByRole('button');
    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(describedBy).toMatch(/^tooltip-/);
    // Show tooltip and verify it has an ID
    fireEvent.mouseEnter(trigger);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.id).toMatch(/^tooltip-/);
  });
});
