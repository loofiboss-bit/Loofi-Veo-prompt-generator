import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface AccessibilitySettings {
  /**
   * Reduce motion for animations
   */
  reducedMotion: boolean;

  /**
   * High contrast mode
   */
  highContrast: boolean;

  /**
   * Font size multiplier (1.0 = normal, 1.5 = 150%, etc.)
   */
  fontSize: number;

  /**
   * Enable screen reader announcements
   */
  screenReaderAnnouncements: boolean;

  /**
   * Keyboard navigation enabled
   */
  keyboardNavigation: boolean;

  /**
   * Focus visible indicators
   */
  focusVisible: boolean;

  /**
   * Enlarged touch targets (opt-in)
   */
  enhancedTouchTargets: boolean;

  /**
   * Increased text spacing (opt-in)
   */
  enhancedTextSpacing: boolean;
}

interface AccessibilityContextValue extends AccessibilitySettings {
  /**
   * Update accessibility settings
   */
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;

  /**
   * Announce message to screen readers
   */
  announce: (message: string, priority?: 'polite' | 'assertive') => void;

  /**
   * Reset to default settings
   */
  resetSettings: () => void;
}

const defaultSettings: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  fontSize: 1.0,
  screenReaderAnnouncements: true,
  keyboardNavigation: true,
  focusVisible: true,
  enhancedTouchTargets: false,
  enhancedTextSpacing: false,
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }

    // Check system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    return {
      ...defaultSettings,
      reducedMotion: prefersReducedMotion,
      highContrast: prefersHighContrast,
    };
  });

  // Save to localStorage when settings change
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));

    // Apply settings to document
    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', settings.highContrast);
    document.documentElement.classList.toggle('focus-visible', settings.focusVisible);
    document.documentElement.classList.toggle(
      'a11y-enhanced-touch-targets',
      settings.enhancedTouchTargets,
    );
    document.documentElement.classList.toggle(
      'a11y-enhanced-text-spacing',
      settings.enhancedTextSpacing,
    );
    document.documentElement.style.fontSize = `${settings.fontSize * 16}px`;
  }, [settings]);

  // Listen for system preference changes
  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setSettings((prev) => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setSettings((prev) => ({ ...prev, highContrast: e.matches }));
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (!settings.screenReaderAnnouncements) return;

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
    },
    [settings.screenReaderAnnouncements],
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const value: AccessibilityContextValue = {
    ...settings,
    updateSettings,
    announce,
    resetSettings,
  };

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};
