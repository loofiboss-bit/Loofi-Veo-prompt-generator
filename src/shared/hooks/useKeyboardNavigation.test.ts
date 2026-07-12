import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardNavigation, useFocusTrap, useRovingTabIndex } from './useKeyboardNavigation';
import React from 'react';

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onEscape when Escape is pressed', () => {
    const onEscape = vi.fn();
    renderHook(() => useKeyboardNavigation({ onEscape }));

    fireKey('Escape');

    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('should call onEnter when Enter is pressed', () => {
    const onEnter = vi.fn();
    renderHook(() => useKeyboardNavigation({ onEnter }));

    fireKey('Enter');

    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('should not fire handlers when disabled', () => {
    const onEscape = vi.fn();
    const onEnter = vi.fn();
    renderHook(() => useKeyboardNavigation({ enabled: false, onEscape, onEnter }));

    fireKey('Escape');
    fireKey('Enter');

    expect(onEscape).not.toHaveBeenCalled();
    expect(onEnter).not.toHaveBeenCalled();
  });

  it('should call onArrowKey with correct direction for ArrowUp', () => {
    const onArrowKey = vi.fn();
    renderHook(() => useKeyboardNavigation({ enableArrowKeys: true, onArrowKey }));

    fireKey('ArrowUp');

    expect(onArrowKey).toHaveBeenCalledWith('up');
  });

  it('should call onArrowKey with correct direction for ArrowDown', () => {
    const onArrowKey = vi.fn();
    renderHook(() => useKeyboardNavigation({ enableArrowKeys: true, onArrowKey }));

    fireKey('ArrowDown');

    expect(onArrowKey).toHaveBeenCalledWith('down');
  });

  it('should call onArrowKey with correct direction for ArrowLeft', () => {
    const onArrowKey = vi.fn();
    renderHook(() => useKeyboardNavigation({ enableArrowKeys: true, onArrowKey }));

    fireKey('ArrowLeft');

    expect(onArrowKey).toHaveBeenCalledWith('left');
  });

  it('should call onArrowKey with correct direction for ArrowRight', () => {
    const onArrowKey = vi.fn();
    renderHook(() => useKeyboardNavigation({ enableArrowKeys: true, onArrowKey }));

    fireKey('ArrowRight');

    expect(onArrowKey).toHaveBeenCalledWith('right');
  });

  it('should not fire arrow handlers when enableArrowKeys is false', () => {
    const onArrowKey = vi.fn();
    renderHook(() => useKeyboardNavigation({ enableArrowKeys: false, onArrowKey }));

    fireKey('ArrowUp');
    fireKey('ArrowDown');
    fireKey('ArrowLeft');
    fireKey('ArrowRight');

    expect(onArrowKey).not.toHaveBeenCalled();
  });

  it('should not fire arrow handlers when onArrowKey is not provided', () => {
    renderHook(() => useKeyboardNavigation({ enableArrowKeys: true }));

    // Should not throw
    fireKey('ArrowUp');
  });

  it('should ignore unrelated keys', () => {
    const onEscape = vi.fn();
    const onEnter = vi.fn();
    const onArrowKey = vi.fn();
    renderHook(() =>
      useKeyboardNavigation({ onEscape, onEnter, enableArrowKeys: true, onArrowKey }),
    );

    fireKey('a');
    fireKey('Tab');
    fireKey('Shift');

    expect(onEscape).not.toHaveBeenCalled();
    expect(onEnter).not.toHaveBeenCalled();
    expect(onArrowKey).not.toHaveBeenCalled();
  });

  it('should default to enabled when no options provided', () => {
    // Should not throw when called with empty options
    renderHook(() => useKeyboardNavigation());
    fireKey('Escape');
  });

  it('should clean up event listener on unmount', () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useKeyboardNavigation({ onEscape }));

    unmount();
    fireKey('Escape');

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('should re-register when options change', () => {
    const onEscape1 = vi.fn();
    const onEscape2 = vi.fn();
    const { rerender } = renderHook(({ onEscape }) => useKeyboardNavigation({ onEscape }), {
      initialProps: { onEscape: onEscape1 },
    });

    fireKey('Escape');
    expect(onEscape1).toHaveBeenCalledOnce();

    rerender({ onEscape: onEscape2 });
    fireKey('Escape');
    expect(onEscape2).toHaveBeenCalledOnce();
  });
});

describe('useFocusTrap', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <button id="btn1">First</button>
      <input id="input1" />
      <button id="btn2">Last</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should focus the first focusable element on activate', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useFocusTrap(ref, true));

    expect(document.activeElement).toBe(container.querySelector('#btn1'));
  });

  it('should wrap focus from last to first on Tab', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useFocusTrap(ref, true));

    const lastBtn = container.querySelector('#btn2') as HTMLElement;
    lastBtn.focus();

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventSpy = vi.spyOn(tabEvent, 'preventDefault');
    container.dispatchEvent(tabEvent);

    expect(preventSpy).toHaveBeenCalled();
  });

  it('should wrap focus from first to last on Shift+Tab', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useFocusTrap(ref, true));

    const firstBtn = container.querySelector('#btn1') as HTMLElement;
    firstBtn.focus();

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    const preventSpy = vi.spyOn(tabEvent, 'preventDefault');
    container.dispatchEvent(tabEvent);

    expect(preventSpy).toHaveBeenCalled();
  });

  it('should not activate when isActive is false', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useFocusTrap(ref, false));

    // Focus should NOT be moved to first element
    expect(document.activeElement).not.toBe(container.querySelector('#btn1'));
  });

  it('should not activate when ref is null', () => {
    const ref = React.createRef<HTMLElement>();
    renderHook(() => useFocusTrap(ref, true));
    // Should not throw
  });

  it('should clean up on unmount', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    const removeSpy = vi.spyOn(container, 'removeEventListener');
    const { unmount } = renderHook(() => useFocusTrap(ref, true));

    unmount();
    expect(removeSpy).toHaveBeenCalled();
  });
});

describe('useRovingTabIndex', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <div role="menuitem" tabindex="0">Item 1</div>
      <div role="menuitem" tabindex="-1">Item 2</div>
      <div role="menuitem" tabindex="-1">Item 3</div>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should set initial tabindex values', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useRovingTabIndex(ref));

    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items[0].getAttribute('tabindex')).toBe('0');
    expect(items[1].getAttribute('tabindex')).toBe('-1');
    expect(items[2].getAttribute('tabindex')).toBe('-1');
  });

  it('should move focus forward on ArrowDown', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useRovingTabIndex(ref));

    const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    container.dispatchEvent(arrowEvent);

    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items[1].getAttribute('tabindex')).toBe('0');
    expect(items[0].getAttribute('tabindex')).toBe('-1');
  });

  it('should move focus forward on ArrowRight', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useRovingTabIndex(ref));

    const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    container.dispatchEvent(arrowEvent);

    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items[1].getAttribute('tabindex')).toBe('0');
  });

  it('should wrap from last to first on ArrowDown', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useRovingTabIndex(ref));

    // Move to item 2, then item 3, then wrap to item 1
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items[0].getAttribute('tabindex')).toBe('0');
  });

  it('should move to Home key', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useRovingTabIndex(ref));

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items[0].getAttribute('tabindex')).toBe('0');
  });

  it('should move to End key', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useRovingTabIndex(ref));

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items[2].getAttribute('tabindex')).toBe('0');
  });

  it('should handle ArrowUp/ArrowLeft for backward navigation', () => {
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useRovingTabIndex(ref));

    // ArrowUp from first should wrap to last
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items[2].getAttribute('tabindex')).toBe('0');
  });

  it('should not activate when ref is null', () => {
    const ref = React.createRef<HTMLElement>();
    renderHook(() => useRovingTabIndex(ref));
    // Should not throw
  });

  it('should accept custom item selector', () => {
    container.innerHTML = `
      <div class="item" tabindex="0">A</div>
      <div class="item" tabindex="-1">B</div>
    `;
    const ref = { current: container } as React.RefObject<HTMLElement>;
    renderHook(() => useRovingTabIndex(ref, '.item'));

    const items = container.querySelectorAll('.item');
    expect(items[0].getAttribute('tabindex')).toBe('0');
    expect(items[1].getAttribute('tabindex')).toBe('-1');
  });
});
