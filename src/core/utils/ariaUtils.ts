/**
 * ARIA Utilities
 * Helper functions for managing ARIA attributes and accessibility
 */

/**
 * Generate a unique ID for ARIA relationships
 */
export const generateAriaId = (prefix: string = 'aria'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Announce a message to screen readers
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Check if an element is visible to screen readers
 */
export const isAriaHidden = (element: HTMLElement): boolean => {
  return element.getAttribute('aria-hidden') === 'true';
};

/**
 * Set ARIA expanded state
 */
export const setAriaExpanded = (element: HTMLElement, expanded: boolean): void => {
  element.setAttribute('aria-expanded', expanded.toString());
};

/**
 * Set ARIA pressed state for toggle buttons
 */
export const setAriaPressed = (element: HTMLElement, pressed: boolean): void => {
  element.setAttribute('aria-pressed', pressed.toString());
};

/**
 * Set ARIA selected state
 */
export const setAriaSelected = (element: HTMLElement, selected: boolean): void => {
  element.setAttribute('aria-selected', selected.toString());
};

/**
 * Set ARIA checked state
 */
export const setAriaChecked = (element: HTMLElement, checked: boolean | 'mixed'): void => {
  element.setAttribute('aria-checked', checked.toString());
};

/**
 * Set ARIA disabled state
 */
export const setAriaDisabled = (element: HTMLElement, disabled: boolean): void => {
  element.setAttribute('aria-disabled', disabled.toString());
};

/**
 * Set ARIA busy state (for loading states)
 */
export const setAriaBusy = (element: HTMLElement, busy: boolean): void => {
  element.setAttribute('aria-busy', busy.toString());
};

/**
 * Set ARIA invalid state (for form validation)
 */
export const setAriaInvalid = (element: HTMLElement, invalid: boolean): void => {
  element.setAttribute('aria-invalid', invalid.toString());
};

/**
 * Create ARIA label for an element
 */
export const setAriaLabel = (element: HTMLElement, label: string): void => {
  element.setAttribute('aria-label', label);
};

/**
 * Create ARIA description for an element
 */
export const setAriaDescription = (element: HTMLElement, description: string): void => {
  const descId = generateAriaId('desc');
  const descElement = document.createElement('span');
  descElement.id = descId;
  descElement.className = 'sr-only';
  descElement.textContent = description;

  element.appendChild(descElement);
  element.setAttribute('aria-describedby', descId);
};

/**
 * Link label to input using aria-labelledby
 */
export const linkLabelToInput = (input: HTMLElement, labelId: string): void => {
  input.setAttribute('aria-labelledby', labelId);
};

/**
 * Link description to input using aria-describedby
 */
export const linkDescriptionToInput = (input: HTMLElement, descriptionId: string): void => {
  const existing = input.getAttribute('aria-describedby');
  if (existing) {
    input.setAttribute('aria-describedby', `${existing} ${descriptionId}`);
  } else {
    input.setAttribute('aria-describedby', descriptionId);
  }
};

/**
 * Set ARIA role
 */
export const setAriaRole = (element: HTMLElement, role: string): void => {
  element.setAttribute('role', role);
};

/**
 * Set ARIA current state (for navigation)
 */
export const setAriaCurrent = (
  element: HTMLElement,
  current: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false',
): void => {
  element.setAttribute('aria-current', current);
};

/**
 * Set ARIA level (for headings)
 */
export const setAriaLevel = (element: HTMLElement, level: number): void => {
  element.setAttribute('aria-level', level.toString());
};

/**
 * Set ARIA value for range inputs
 */
export const setAriaValueNow = (
  element: HTMLElement,
  value: number,
  min?: number,
  max?: number,
  text?: string,
): void => {
  element.setAttribute('aria-valuenow', value.toString());

  if (min !== undefined) {
    element.setAttribute('aria-valuemin', min.toString());
  }

  if (max !== undefined) {
    element.setAttribute('aria-valuemax', max.toString());
  }

  if (text) {
    element.setAttribute('aria-valuetext', text);
  }
};

/**
 * Create a live region for dynamic content
 */
export const createLiveRegion = (
  priority: 'polite' | 'assertive' = 'polite',
  atomic: boolean = true,
): HTMLDivElement => {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', atomic.toString());
  liveRegion.className = 'sr-only';

  document.body.appendChild(liveRegion);

  return liveRegion;
};

/**
 * Update live region content
 */
export const updateLiveRegion = (liveRegion: HTMLElement, message: string): void => {
  liveRegion.textContent = message;
};

/**
 * Remove live region
 */
export const removeLiveRegion = (liveRegion: HTMLElement): void => {
  if (liveRegion.parentNode) {
    liveRegion.parentNode.removeChild(liveRegion);
  }
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
};

/**
 * Check if user prefers high contrast
 */
export const prefersHighContrast = (): boolean => {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-contrast: high)').matches;
};

/**
 * Check if user prefers dark mode
 */
export const prefersDarkMode = (): boolean => {
  return (
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(selector));
};

/**
 * Trap focus within a container
 */
export const trapFocus = (container: HTMLElement): (() => void) => {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Restore focus to a previously focused element
 */
export const createFocusRestorer = (): (() => void) => {
  const previouslyFocused = document.activeElement as HTMLElement;

  return () => {
    if (previouslyFocused && previouslyFocused.focus) {
      previouslyFocused.focus();
    }
  };
};
