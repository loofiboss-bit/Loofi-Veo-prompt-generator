import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateAriaId,
  announceToScreenReader,
  isAriaHidden,
  setAriaExpanded,
  setAriaPressed,
  setAriaSelected,
  setAriaChecked,
  setAriaDisabled,
  setAriaBusy,
  setAriaInvalid,
  setAriaLabel,
  setAriaDescription,
  linkLabelToInput,
  linkDescriptionToInput,
  setAriaRole,
  setAriaCurrent,
  setAriaLevel,
  setAriaValueNow,
  createLiveRegion,
  updateLiveRegion,
  removeLiveRegion,
  prefersReducedMotion,
  prefersHighContrast,
  prefersDarkMode,
  getFocusableElements,
  trapFocus,
  createFocusRestorer,
} from './ariaUtils';

describe('generateAriaId', () => {
  it('should generate a string with default prefix', () => {
    const id = generateAriaId();
    expect(id).toMatch(/^aria-[a-z0-9]+$/);
  });

  it('should use custom prefix', () => {
    const id = generateAriaId('test');
    expect(id).toMatch(/^test-[a-z0-9]+$/);
  });

  it('should generate unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateAriaId()));
    expect(ids.size).toBe(100);
  });
});

describe('announceToScreenReader', () => {
  afterEach(() => {
    // Clean up any lingering announcements
    document.querySelectorAll('[role="status"]').forEach((el) => el.remove());
  });

  it('should add an announcement element to the body', () => {
    announceToScreenReader('Hello');
    const el = document.querySelector('[role="status"]');
    expect(el).not.toBeNull();
    expect(el!.textContent).toBe('Hello');
  });

  it('should set aria-live to polite by default', () => {
    announceToScreenReader('Test');
    const el = document.querySelector('[role="status"]');
    expect(el!.getAttribute('aria-live')).toBe('polite');
  });

  it('should support assertive priority', () => {
    announceToScreenReader('Urgent', 'assertive');
    const el = document.querySelector('[role="status"]');
    expect(el!.getAttribute('aria-live')).toBe('assertive');
  });

  it('should set aria-atomic to true', () => {
    announceToScreenReader('Atomic');
    const el = document.querySelector('[role="status"]');
    expect(el!.getAttribute('aria-atomic')).toBe('true');
  });

  it('should remove the element after delay', () => {
    vi.useFakeTimers();
    announceToScreenReader('Temp');
    expect(document.querySelector('[role="status"]')).not.toBeNull();
    vi.advanceTimersByTime(1000);
    expect(document.querySelector('[role="status"]')).toBeNull();
    vi.useRealTimers();
  });
});

describe('DOM attribute setters', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  it('isAriaHidden returns true when aria-hidden is true', () => {
    el.setAttribute('aria-hidden', 'true');
    expect(isAriaHidden(el)).toBe(true);
  });

  it('isAriaHidden returns false when not set', () => {
    expect(isAriaHidden(el)).toBe(false);
  });

  it('setAriaExpanded sets attribute', () => {
    setAriaExpanded(el, true);
    expect(el.getAttribute('aria-expanded')).toBe('true');
    setAriaExpanded(el, false);
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  it('setAriaPressed sets attribute', () => {
    setAriaPressed(el, true);
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });

  it('setAriaSelected sets attribute', () => {
    setAriaSelected(el, true);
    expect(el.getAttribute('aria-selected')).toBe('true');
  });

  it('setAriaChecked sets attribute including mixed', () => {
    setAriaChecked(el, true);
    expect(el.getAttribute('aria-checked')).toBe('true');
    setAriaChecked(el, 'mixed');
    expect(el.getAttribute('aria-checked')).toBe('mixed');
  });

  it('setAriaDisabled sets attribute', () => {
    setAriaDisabled(el, true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });

  it('setAriaBusy sets attribute', () => {
    setAriaBusy(el, true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('setAriaInvalid sets attribute', () => {
    setAriaInvalid(el, true);
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });

  it('setAriaLabel sets attribute', () => {
    setAriaLabel(el, 'My label');
    expect(el.getAttribute('aria-label')).toBe('My label');
  });

  it('setAriaRole sets role', () => {
    setAriaRole(el, 'button');
    expect(el.getAttribute('role')).toBe('button');
  });

  it('setAriaCurrent sets attribute', () => {
    setAriaCurrent(el, 'page');
    expect(el.getAttribute('aria-current')).toBe('page');
  });

  it('setAriaLevel sets attribute', () => {
    setAriaLevel(el, 3);
    expect(el.getAttribute('aria-level')).toBe('3');
  });
});

describe('setAriaDescription', () => {
  it('should append description element and set aria-describedby', () => {
    const el = document.createElement('div');
    setAriaDescription(el, 'A helpful description');
    const descId = el.getAttribute('aria-describedby');
    expect(descId).toBeTruthy();
    const descEl = el.querySelector(`#${descId}`);
    expect(descEl).not.toBeNull();
    expect(descEl!.textContent).toBe('A helpful description');
  });
});

describe('linkLabelToInput', () => {
  it('should set aria-labelledby', () => {
    const input = document.createElement('input');
    linkLabelToInput(input, 'label-123');
    expect(input.getAttribute('aria-labelledby')).toBe('label-123');
  });
});

describe('linkDescriptionToInput', () => {
  it('should set aria-describedby', () => {
    const input = document.createElement('input');
    linkDescriptionToInput(input, 'desc-1');
    expect(input.getAttribute('aria-describedby')).toBe('desc-1');
  });

  it('should append to existing aria-describedby', () => {
    const input = document.createElement('input');
    input.setAttribute('aria-describedby', 'existing');
    linkDescriptionToInput(input, 'desc-2');
    expect(input.getAttribute('aria-describedby')).toBe('existing desc-2');
  });
});

describe('setAriaValueNow', () => {
  let el: HTMLElement;
  beforeEach(() => {
    el = document.createElement('div');
  });

  it('should set aria-valuenow', () => {
    setAriaValueNow(el, 50);
    expect(el.getAttribute('aria-valuenow')).toBe('50');
  });

  it('should set min and max when provided', () => {
    setAriaValueNow(el, 50, 0, 100);
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
  });

  it('should set value text when provided', () => {
    setAriaValueNow(el, 50, 0, 100, '50%');
    expect(el.getAttribute('aria-valuetext')).toBe('50%');
  });

  it('should not set min/max when not provided', () => {
    setAriaValueNow(el, 50);
    expect(el.hasAttribute('aria-valuemin')).toBe(false);
    expect(el.hasAttribute('aria-valuemax')).toBe(false);
  });
});

describe('createLiveRegion', () => {
  afterEach(() => {
    document.querySelectorAll('[role="status"]').forEach((el) => el.remove());
  });

  it('should create a live region element appended to body', () => {
    const region = createLiveRegion();
    expect(region).toBeInstanceOf(HTMLDivElement);
    expect(document.body.contains(region)).toBe(true);
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
  });

  it('should support assertive priority', () => {
    const region = createLiveRegion('assertive');
    expect(region.getAttribute('aria-live')).toBe('assertive');
  });

  it('should support non-atomic', () => {
    const region = createLiveRegion('polite', false);
    expect(region.getAttribute('aria-atomic')).toBe('false');
  });
});

describe('updateLiveRegion', () => {
  it('should update text content', () => {
    const region = document.createElement('div');
    updateLiveRegion(region, 'Updated message');
    expect(region.textContent).toBe('Updated message');
  });
});

describe('removeLiveRegion', () => {
  it('should remove the element from its parent', () => {
    const container = document.createElement('div');
    const region = document.createElement('div');
    container.appendChild(region);
    removeLiveRegion(region);
    expect(container.contains(region)).toBe(false);
  });

  it('should not throw if element has no parent', () => {
    const region = document.createElement('div');
    expect(() => removeLiveRegion(region)).not.toThrow();
  });
});

describe('media query helpers', () => {
  it('prefersReducedMotion returns boolean', () => {
    expect(typeof prefersReducedMotion()).toBe('boolean');
  });

  it('prefersHighContrast returns boolean', () => {
    expect(typeof prefersHighContrast()).toBe('boolean');
  });

  it('prefersDarkMode returns boolean', () => {
    expect(typeof prefersDarkMode()).toBe('boolean');
  });
});

describe('getFocusableElements', () => {
  it('should find buttons and links', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>Click me</button>
      <a href="#">Link</a>
      <input type="text" />
      <select><option>Opt</option></select>
      <textarea></textarea>
      <div tabindex="0">Custom</div>
      <div>Not focusable</div>
      <button disabled>Nope</button>
      <div tabindex="-1">Skip</div>
    `;
    const focusable = getFocusableElements(container);
    // button, a, input, select, textarea, div[tabindex=0] = 6
    expect(focusable.length).toBe(6);
  });

  it('should return empty array for container with no focusable elements', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>No focus</p><span>Nothing</span>';
    expect(getFocusableElements(container)).toEqual([]);
  });
});

describe('trapFocus', () => {
  it('should return a cleanup function', () => {
    const container = document.createElement('div');
    container.innerHTML = '<button>A</button><button>B</button>';
    document.body.appendChild(container);
    const cleanup = trapFocus(container);
    expect(typeof cleanup).toBe('function');
    cleanup();
    container.remove();
  });

  it('should focus first element', () => {
    const container = document.createElement('div');
    const btn1 = document.createElement('button');
    btn1.textContent = 'First';
    const btn2 = document.createElement('button');
    btn2.textContent = 'Second';
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    const cleanup = trapFocus(container);
    expect(document.activeElement).toBe(btn1);
    cleanup();
    container.remove();
  });
});

describe('createFocusRestorer', () => {
  it('should restore focus to previously focused element', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.focus();
    expect(document.activeElement).toBe(btn);

    const restore = createFocusRestorer();

    // Focus something else
    const other = document.createElement('input');
    document.body.appendChild(other);
    other.focus();
    expect(document.activeElement).toBe(other);

    // Restore
    restore();
    expect(document.activeElement).toBe(btn);

    btn.remove();
    other.remove();
  });
});
