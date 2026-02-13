import { useEffect, useLayoutEffect, useRef } from 'react';
import { useAppStore } from '@core/store/useAppStore';

export type KeyHandler = (e: KeyboardEvent) => void;
export type KeyMap = Record<string, KeyHandler>;

/**
 * Platform-reserved shortcuts that should always be passed through to the
 * browser/OS and never intercepted by custom hotkeys.
 */
const RESERVED_COMBOS = new Set([
  'CTRL+C', // Copy
  'CTRL+V', // Paste
  'CTRL+X', // Cut
  'CTRL+A', // Select all
  'CTRL+F', // Find
  'CTRL+R', // Reload (dev)
  'CTRL+SHIFT+I', // DevTools
  'CTRL+SHIFT+J', // Console
  'ALT+F4', // Close window (Windows/Linux)
]);

/**
 * Check if any modal overlay is currently open by scanning the DOM
 * for common modal attribute patterns. Returns true when a modal
 * dialog is displayed and app hotkeys should be suppressed.
 */
function isModalOpen(): boolean {
  // Check for dialog elements
  const openDialog = document.querySelector('dialog[open]');
  if (openDialog) return true;

  // Check for common modal patterns (role="dialog", data-modal, .modal-overlay)
  const modalElement = document.querySelector(
    '[role="dialog"]:not([aria-hidden="true"]), [data-modal="true"], .modal-overlay',
  );
  if (modalElement) return true;

  return false;
}

export const useHotkeys = (keyMap: KeyMap, active: boolean = true) => {
  const currentMap = useRef(keyMap);

  // Keep the latest keyMap without re-binding the event listener
  useLayoutEffect(() => {
    currentMap.current = keyMap;
  });

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      const key = event.key.toUpperCase();
      const ctrl = event.metaKey || event.ctrlKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      // Build combo key early so we can check reserved shortcuts
      const comboParts: string[] = [];
      if (ctrl) comboParts.push('CTRL');
      if (shift) comboParts.push('SHIFT');
      if (alt) comboParts.push('ALT');

      let mapKey = key;
      if (key === ' ') mapKey = 'SPACE';
      if (key === 'ESCAPE') mapKey = 'ESC';
      if (['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) return;

      comboParts.push(mapKey);
      const combo = comboParts.join('+');

      // Never intercept platform-reserved shortcuts
      if (RESERVED_COMBOS.has(combo)) return;

      // Global Undo/Redo Logic (works inside inputs for content undo)
      if (ctrl && key === 'Z') {
        // Inside inputs, let the browser handle native undo/redo
        if (isInput) return;
        event.preventDefault();
        event.stopPropagation();
        // Access temporal state at call-time to avoid stale closures
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const temporal = (useAppStore as any).temporal.getState();
        if (shift) {
          temporal.redo();
        } else {
          temporal.undo();
        }
        return;
      }

      // PC Redo (Ctrl+Y) — also skip when focused on inputs
      if (ctrl && key === 'Y') {
        if (isInput) return;
        event.preventDefault();
        event.stopPropagation();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (useAppStore as any).temporal.getState().redo();
        return;
      }

      const handler = currentMap.current[combo];

      if (handler) {
        // If typing in an input, only allow modifier combos (Ctrl/Alt) or Escape
        // Block single keys (like "?", "Space") to allow typing
        if (isInput && !ctrl && !alt && mapKey !== 'ESC') {
          return;
        }

        // Suppress app hotkeys (except ESC) when a modal dialog is open
        if (mapKey !== 'ESC' && isModalOpen()) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);
};
