/**
 * Modal Component Tests
 * Verifies open/close, title, footer, escape key, backdrop click, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent } from '../../../test-utils';
import Modal from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        Hidden
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when open with dialog role', () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        Visible
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });

  it('displays title and links aria-labelledby', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="My Modal">
        Content
      </Modal>,
    );
    expect(screen.getByText('My Modal')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('renders footer when provided', () => {
    render(
      <Modal isOpen onClose={vi.fn()} footer={<button>Save</button>}>
        Content
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('calls onClose on escape key', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        Content
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close on escape when closeOnEscape is false', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} closeOnEscape={false}>
        Content
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on backdrop click', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <Modal isOpen onClose={onClose}>
        Content
      </Modal>,
    );
    // Click the backdrop (the button with aria-label "Close modal" that's not the X button)
    const buttons = screen.getAllByLabelText('Close modal');
    const backdrop = buttons[0]; // First one is the backdrop
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close on backdrop click when disabled', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <Modal isOpen onClose={onClose} closeOnBackdropClick={false}>
        Content
      </Modal>,
    );
    const buttons = screen.getAllByLabelText('Close modal');
    const backdrop = buttons[0];
    await user.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows close button by default', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Test">
        Content
      </Modal>,
    );
    // Two "Close modal" buttons: backdrop + close button
    const closeButtons = screen.getAllByLabelText('Close modal');
    expect(closeButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Test" showCloseButton={false}>
        Content
      </Modal>,
    );
    // Only the backdrop "Close modal" should remain
    const closeButtons = screen.getAllByLabelText('Close modal');
    expect(closeButtons).toHaveLength(1);
  });

  it('applies size class', () => {
    render(
      <Modal isOpen onClose={vi.fn()} size="xl">
        Content
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('max-w-4xl');
  });
});
