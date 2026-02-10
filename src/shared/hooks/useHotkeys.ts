


import { useEffect, useLayoutEffect, useRef } from 'react';
import { useAppStore } from '@core/store/useAppStore';

export type KeyHandler = (e: KeyboardEvent) => void;
export type KeyMap = Record<string, KeyHandler>;

export const useHotkeys = (keyMap: KeyMap, active: boolean = true) => {
  const currentMap = useRef(keyMap);
  
  // Access temporal functions
  // We use getState here to avoid subscriptions in the effect, checking state at runtime
  const { undo, redo } = (useAppStore as any).temporal.getState();

  // Keep the latest keyMap without re-binding the event listener
  useLayoutEffect(() => {
    currentMap.current = keyMap;
  });

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;

      const key = event.key.toUpperCase();
      const ctrl = event.metaKey || event.ctrlKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      // Global Undo/Redo Logic (Overrides even inputs sometimes, but standard is allow)
      // Usually Undo is global unless specific input capture
      if (ctrl && key === 'Z') {
          event.preventDefault();
          event.stopPropagation();
          if (shift) {
              redo();
          } else {
              undo();
          }
          return;
      }
      
      // Mac Redo (Cmd+Shift+Z) handled above. 
      // PC Redo sometimes Ctrl+Y
      if (ctrl && key === 'Y') {
          event.preventDefault();
          event.stopPropagation();
          redo();
          return;
      }

      // Construct key signature
      const parts = [];
      if (ctrl) parts.push('CTRL');
      if (shift) parts.push('SHIFT');
      if (alt) parts.push('ALT');

      // Normalize Keys
      let mapKey = key;
      if (key === ' ') mapKey = 'SPACE';
      if (key === 'ESCAPE') mapKey = 'ESC';
      if (['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) return; 

      // Build combination string like "CTRL+ENTER"
      parts.push(mapKey);
      const combo = parts.join('+');

      const handler = currentMap.current[combo];

      if (handler) {
        // If typing in an input, only allow modifier combos (Ctrl/Alt) or Escape
        // Block single keys (like "?", "Space") to allow typing
        if (isInput && !ctrl && !alt && mapKey !== 'ESC') {
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