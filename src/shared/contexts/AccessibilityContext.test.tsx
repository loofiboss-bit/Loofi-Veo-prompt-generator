import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import { AccessibilityProvider, useAccessibility } from './AccessibilityContext';

const TestHarness: React.FC = () => {
  const { enhancedTouchTargets, enhancedTextSpacing, updateSettings } = useAccessibility();

  return (
    <div>
      <span data-testid="touch-value">{String(enhancedTouchTargets)}</span>
      <span data-testid="spacing-value">{String(enhancedTextSpacing)}</span>
      <button onClick={() => updateSettings({ enhancedTouchTargets: true })}>Enable touch</button>
      <button onClick={() => updateSettings({ enhancedTextSpacing: true })}>Enable spacing</button>
    </div>
  );
};

describe('AccessibilityContext', () => {
  beforeEach(() => {
    localStorage.removeItem('accessibility-settings');
    document.documentElement.classList.remove('a11y-enhanced-touch-targets');
    document.documentElement.classList.remove('a11y-enhanced-text-spacing');
    document.documentElement.style.fontSize = '';
  });

  it('defaults enhanced layout options to false without root classes', () => {
    render(
      <AccessibilityProvider>
        <TestHarness />
      </AccessibilityProvider>,
    );

    expect(screen.getByTestId('touch-value')).toHaveTextContent('false');
    expect(screen.getByTestId('spacing-value')).toHaveTextContent('false');
    expect(document.documentElement.classList.contains('a11y-enhanced-touch-targets')).toBe(false);
    expect(document.documentElement.classList.contains('a11y-enhanced-text-spacing')).toBe(false);
  });

  it('applies opt-in root classes when enhanced modes are enabled', async () => {
    render(
      <AccessibilityProvider>
        <TestHarness />
      </AccessibilityProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enable touch' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enable spacing' }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-enhanced-touch-targets')).toBe(true);
      expect(document.documentElement.classList.contains('a11y-enhanced-text-spacing')).toBe(true);
    });
  });
});
