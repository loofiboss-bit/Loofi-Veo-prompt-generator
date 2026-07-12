import { useEffect, useCallback } from 'react';

/**
 * Custom hook for keyboard navigation
 * Provides utilities for managing focus and keyboard interactions
 */

interface KeyboardNavigationOptions {
  /**
   * Enable/disable keyboard navigation
   */
  enabled?: boolean;

  /**
   * Callback when Escape key is pressed
   */
  onEscape?: () => void;

  /**
   * Callback when Enter key is pressed
   */
  onEnter?: () => void;

  /**
   * Enable arrow key navigation
   */
  enableArrowKeys?: boolean;

  /**
   * Callback for arrow key navigation
   */
  onArrowKey?: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions = {}) => {
  const { enabled = true, onEscape, onEnter, enableArrowKeys = false, onArrowKey } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      switch (event.key) {
        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;

        case 'Enter':
          if (onEnter) {
            event.preventDefault();
            onEnter();
          }
          break;

        case 'ArrowUp':
          if (enableArrowKeys && onArrowKey) {
            event.preventDefault();
            onArrowKey('up');
          }
          break;

        case 'ArrowDown':
          if (enableArrowKeys && onArrowKey) {
            event.preventDefault();
            onArrowKey('down');
          }
          break;

        case 'ArrowLeft':
          if (enableArrowKeys && onArrowKey) {
            event.preventDefault();
            onArrowKey('left');
          }
          break;

        case 'ArrowRight':
          if (enableArrowKeys && onArrowKey) {
            event.preventDefault();
            onArrowKey('right');
          }
          break;
      }
    },
    [enabled, onEscape, onEnter, enableArrowKeys, onArrowKey],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
};

/**
 * Hook for managing focus trap in modals and dialogs
 */
export const useFocusTrap = (
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean = true,
) => {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when trap is activated
    firstElement?.focus();

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [containerRef, isActive]);
};

/**
 * Hook for managing roving tabindex navigation (for lists, menus, etc.)
 */
export const useRovingTabIndex = (
  containerRef: React.RefObject<HTMLElement | null>,
  itemSelector: string = '[role="menuitem"], [role="option"], [role="tab"]',
) => {
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let currentIndex = 0;

    const updateTabIndexes = () => {
      const items = container.querySelectorAll<HTMLElement>(itemSelector);
      items.forEach((item, index) => {
        item.tabIndex = index === currentIndex ? 0 : -1;
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const items = container.querySelectorAll<HTMLElement>(itemSelector);
      if (items.length === 0) return;

      let handled = false;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          currentIndex = (currentIndex + 1) % items.length;
          handled = true;
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          currentIndex = (currentIndex - 1 + items.length) % items.length;
          handled = true;
          break;

        case 'Home':
          currentIndex = 0;
          handled = true;
          break;

        case 'End':
          currentIndex = items.length - 1;
          handled = true;
          break;
      }

      if (handled) {
        event.preventDefault();
        updateTabIndexes();
        items[currentIndex]?.focus();
      }
    };

    updateTabIndexes();
    container.addEventListener('keydown', handleKeyDown);

    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, itemSelector]);
};
