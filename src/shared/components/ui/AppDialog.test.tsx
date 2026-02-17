import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../test-utils';
import { AppDialog } from './AppDialog';

describe('AppDialog', () => {
  it('closes on backdrop click when enabled', () => {
    const onClose = vi.fn();

    render(
      <AppDialog isOpen={true} onClose={onClose} showCloseButton={false}>
        <div>Dialog content</div>
      </AppDialog>,
    );

    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key when enabled', () => {
    const onClose = vi.fn();

    render(
      <AppDialog isOpen={true} onClose={onClose} showCloseButton={false}>
        <div>Dialog content</div>
      </AppDialog>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus within the dialog', () => {
    render(
      <AppDialog isOpen={true} onClose={() => {}} showCloseButton={false}>
        <button>First</button>
        <button>Last</button>
      </AppDialog>,
    );

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('locks and restores body scroll while open', () => {
    const { unmount } = render(
      <AppDialog isOpen={true} onClose={() => {}} showCloseButton={false}>
        <div>Dialog content</div>
      </AppDialog>,
    );

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
