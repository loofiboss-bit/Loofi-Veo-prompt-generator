import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock the store
const mockUndo = vi.fn();
const mockRedo = vi.fn();

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: {
    temporal: {
      getState: () => ({ undo: mockUndo, redo: mockRedo }),
    },
  },
}));

import { useHotkeys, type KeyMap } from './useHotkeys';

describe('useHotkeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
  }

  // ─── Basic Registration ──────────────────────────────────────────

  it('should call handler for registered key', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { SPACE: handler };

    renderHook(() => useHotkeys(keyMap));
    fireKey(' ');

    expect(handler).toHaveBeenCalled();
  });

  it('should not call handler when inactive', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { SPACE: handler };

    renderHook(() => useHotkeys(keyMap, false));
    fireKey(' ');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle ESC key', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { ESC: handler };

    renderHook(() => useHotkeys(keyMap));
    fireKey('Escape');

    expect(handler).toHaveBeenCalled();
  });

  it('should handle modifier combo CTRL+S', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { 'CTRL+S': handler };

    renderHook(() => useHotkeys(keyMap));
    fireKey('s', { ctrlKey: true });

    expect(handler).toHaveBeenCalled();
  });

  it('should handle ALT modifier', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { 'ALT+P': handler };

    renderHook(() => useHotkeys(keyMap));
    fireKey('p', { altKey: true });

    expect(handler).toHaveBeenCalled();
  });

  it('should handle CTRL+SHIFT combo', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { 'CTRL+SHIFT+S': handler };

    renderHook(() => useHotkeys(keyMap));
    fireKey('s', { ctrlKey: true, shiftKey: true });

    expect(handler).toHaveBeenCalled();
  });

  it('should not call handler for unregistered key', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { SPACE: handler };

    renderHook(() => useHotkeys(keyMap));
    fireKey('a');

    expect(handler).not.toHaveBeenCalled();
  });

  // ─── Reserved Combos ────────────────────────────────────────────

  it('should not intercept CTRL+C (reserved)', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { 'CTRL+C': handler };

    renderHook(() => useHotkeys(keyMap));
    fireKey('c', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not intercept CTRL+V (reserved)', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { 'CTRL+V': handler };

    renderHook(() => useHotkeys(keyMap));
    fireKey('v', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not intercept CTRL+A (reserved)', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { 'CTRL+A': handler };

    renderHook(() => useHotkeys(keyMap));
    fireKey('a', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  // ─── Modifier-only keys shouldn't match ─────────────────────────

  it('should ignore modifier-only key presses', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { CONTROL: handler };

    renderHook(() => useHotkeys(keyMap));
    fireKey('Control');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should ignore Shift-only key press', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { SHIFT: handler };

    renderHook(() => useHotkeys(keyMap));
    fireKey('Shift');

    expect(handler).not.toHaveBeenCalled();
  });

  // ─── Input suppression ──────────────────────────────────────────

  it('should suppress non-modifier keys when input is focused', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { SPACE: handler };

    // Create an input and focus it
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useHotkeys(keyMap));

    // Dispatch on window with target = input
    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should allow ESC even when input is focused', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { ESC: handler };

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useHotkeys(keyMap));

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should allow modifier combos in input fields', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { 'CTRL+S': handler };

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useHotkeys(keyMap));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();

    document.body.removeChild(input);
  });

  // ─── Undo/Redo integration ──────────────────────────────────────

  it('should call undo on CTRL+Z', () => {
    renderHook(() => useHotkeys({}));
    fireKey('z', { ctrlKey: true });

    expect(mockUndo).toHaveBeenCalled();
  });

  it('should call redo on CTRL+SHIFT+Z', () => {
    renderHook(() => useHotkeys({}));
    fireKey('z', { ctrlKey: true, shiftKey: true });

    expect(mockRedo).toHaveBeenCalled();
  });

  it('should call redo on CTRL+Y', () => {
    renderHook(() => useHotkeys({}));
    fireKey('y', { ctrlKey: true });

    expect(mockRedo).toHaveBeenCalled();
  });

  it('should not call undo when input is focused', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useHotkeys({}));

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(mockUndo).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  // ─── Modal suppression ─────────────────────────────────────────

  it('should suppress keys when modal dialog is open', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { SPACE: handler };

    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.appendChild(dialog);

    renderHook(() => useHotkeys(keyMap));
    fireKey(' ');

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(dialog);
  });

  it('should allow ESC when modal is open', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { ESC: handler };

    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.appendChild(dialog);

    renderHook(() => useHotkeys(keyMap));
    fireKey('Escape');

    expect(handler).toHaveBeenCalled();

    document.body.removeChild(dialog);
  });

  it('should suppress keys with role=dialog open', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { SPACE: handler };

    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    document.body.appendChild(modal);

    renderHook(() => useHotkeys(keyMap));
    fireKey(' ');

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(modal);
  });

  // ─── Cleanup ────────────────────────────────────────────────────

  it('should remove event listener on unmount', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { SPACE: handler };

    const { unmount } = renderHook(() => useHotkeys(keyMap));
    unmount();

    fireKey(' ');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should remove event listener when active changes to false', () => {
    const handler = vi.fn();
    const keyMap: KeyMap = { SPACE: handler };

    const { rerender } = renderHook(({ active }) => useHotkeys(keyMap, active), {
      initialProps: { active: true },
    });

    // Verify it works when active
    fireKey(' ');
    expect(handler).toHaveBeenCalledTimes(1);

    // Deactivate
    rerender({ active: false });

    fireKey(' ');
    expect(handler).toHaveBeenCalledTimes(1); // No additional calls
  });

  it('should use latest keyMap via ref', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { rerender } = renderHook(({ keyMap }) => useHotkeys(keyMap), {
      initialProps: { keyMap: { SPACE: handler1 } as KeyMap },
    });

    // Update keyMap
    rerender({ keyMap: { SPACE: handler2 } as KeyMap });

    fireKey(' ');
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });
});
