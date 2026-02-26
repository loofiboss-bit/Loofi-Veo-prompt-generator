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

  it('does not close on Escape when closeOnEscape is disabled', () => {
    const onClose = vi.fn();

    render(
      <AppDialog isOpen={true} onClose={onClose} closeOnEscape={false} showCloseButton={false}>
        <div>Dialog content</div>
      </AppDialog>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('consumes Escape so it does not propagate to window listeners', () => {
    const onClose = vi.fn();
    const windowListener = vi.fn();
    window.addEventListener('keydown', windowListener);

    render(
      <AppDialog isOpen={true} onClose={onClose} showCloseButton={false}>
        <div>Dialog content</div>
      </AppDialog>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(windowListener).not.toHaveBeenCalled();

    window.removeEventListener('keydown', windowListener);
  });

  it('only closes the top-most dialog on Escape when dialogs are stacked', () => {
    const onCloseBottom = vi.fn();
    const onCloseTop = vi.fn();

    render(
      <>
        <AppDialog isOpen={true} onClose={onCloseBottom} title="Bottom" showCloseButton={false}>
          <div>Bottom content</div>
        </AppDialog>
        <AppDialog isOpen={true} onClose={onCloseTop} title="Top" showCloseButton={false}>
          <div>Top content</div>
        </AppDialog>
      </>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCloseTop).toHaveBeenCalledTimes(1);
    expect(onCloseBottom).not.toHaveBeenCalled();
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
