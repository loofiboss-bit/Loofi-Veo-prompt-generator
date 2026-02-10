import React from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import './AccessibilitySettings.css';

/**
 * AccessibilitySettings component
 * Provides UI for managing accessibility preferences
 */
export const AccessibilitySettings: React.FC = () => {
    const {
        reducedMotion,
        highContrast,
        fontSize,
        screenReaderAnnouncements,
        keyboardNavigation,
        focusVisible,
        updateSettings,
        resetSettings,
        announce,
    } = useAccessibility();

    const handleReducedMotionChange = (enabled: boolean) => {
        updateSettings({ reducedMotion: enabled });
        announce(
            enabled ? 'Reduced motion enabled' : 'Reduced motion disabled',
            'polite'
        );
    };

    const handleHighContrastChange = (enabled: boolean) => {
        updateSettings({ highContrast: enabled });
        announce(
            enabled ? 'High contrast mode enabled' : 'High contrast mode disabled',
            'polite'
        );
    };

    const handleFontSizeChange = (size: number) => {
        updateSettings({ fontSize: size });
        announce(`Font size set to ${Math.round(size * 100)}%`, 'polite');
    };

    const handleScreenReaderChange = (enabled: boolean) => {
        updateSettings({ screenReaderAnnouncements: enabled });
        if (enabled) {
            announce('Screen reader announcements enabled', 'polite');
        }
    };

    const handleKeyboardNavigationChange = (enabled: boolean) => {
        updateSettings({ keyboardNavigation: enabled });
        announce(
            enabled ? 'Keyboard navigation enabled' : 'Keyboard navigation disabled',
            'polite'
        );
    };

    const handleFocusVisibleChange = (enabled: boolean) => {
        updateSettings({ focusVisible: enabled });
        announce(
            enabled ? 'Focus indicators enabled' : 'Focus indicators disabled',
            'polite'
        );
    };

    const handleReset = () => {
        resetSettings();
        announce('Accessibility settings reset to defaults', 'polite');
    };

    return (
        <div className="accessibility-settings" role="region" aria-labelledby="accessibility-heading">
            <h2 id="accessibility-heading" className="accessibility-settings__title">
                Accessibility Settings
            </h2>

            <p className="accessibility-settings__description">
                Customize your experience to meet your accessibility needs.
            </p>

            <div className="accessibility-settings__options">
                {/* Reduced Motion */}
                <div className="accessibility-setting">
                    <div className="accessibility-setting__header">
                        <label htmlFor="reduced-motion" className="accessibility-setting__label">
                            Reduce Motion
                        </label>
                        <input
                            type="checkbox"
                            id="reduced-motion"
                            className="accessibility-setting__toggle"
                            checked={reducedMotion}
                            onChange={(e) => handleReducedMotionChange(e.target.checked)}
                            aria-describedby="reduced-motion-desc"
                        />
                    </div>
                    <p id="reduced-motion-desc" className="accessibility-setting__description">
                        Minimize animations and transitions for a calmer experience.
                    </p>
                </div>

                {/* High Contrast */}
                <div className="accessibility-setting">
                    <div className="accessibility-setting__header">
                        <label htmlFor="high-contrast" className="accessibility-setting__label">
                            High Contrast Mode
                        </label>
                        <input
                            type="checkbox"
                            id="high-contrast"
                            className="accessibility-setting__toggle"
                            checked={highContrast}
                            onChange={(e) => handleHighContrastChange(e.target.checked)}
                            aria-describedby="high-contrast-desc"
                        />
                    </div>
                    <p id="high-contrast-desc" className="accessibility-setting__description">
                        Increase color contrast for better readability.
                    </p>
                </div>

                {/* Font Size */}
                <div className="accessibility-setting">
                    <label htmlFor="font-size" className="accessibility-setting__label">
                        Font Size: {Math.round(fontSize * 100)}%
                    </label>
                    <input
                        type="range"
                        id="font-size"
                        className="accessibility-setting__slider"
                        min="0.75"
                        max="2.0"
                        step="0.25"
                        value={fontSize}
                        onChange={(e) => handleFontSizeChange(parseFloat(e.target.value))}
                        aria-describedby="font-size-desc"
                        aria-valuemin={75}
                        aria-valuemax={200}
                        aria-valuenow={Math.round(fontSize * 100)}
                        aria-valuetext={`${Math.round(fontSize * 100)} percent`}
                    />
                    <p id="font-size-desc" className="accessibility-setting__description">
                        Adjust text size for comfortable reading.
                    </p>
                </div>

                {/* Screen Reader Announcements */}
                <div className="accessibility-setting">
                    <div className="accessibility-setting__header">
                        <label htmlFor="screen-reader" className="accessibility-setting__label">
                            Screen Reader Announcements
                        </label>
                        <input
                            type="checkbox"
                            id="screen-reader"
                            className="accessibility-setting__toggle"
                            checked={screenReaderAnnouncements}
                            onChange={(e) => handleScreenReaderChange(e.target.checked)}
                            aria-describedby="screen-reader-desc"
                        />
                    </div>
                    <p id="screen-reader-desc" className="accessibility-setting__description">
                        Enable announcements for screen reader users.
                    </p>
                </div>

                {/* Keyboard Navigation */}
                <div className="accessibility-setting">
                    <div className="accessibility-setting__header">
                        <label htmlFor="keyboard-nav" className="accessibility-setting__label">
                            Keyboard Navigation
                        </label>
                        <input
                            type="checkbox"
                            id="keyboard-nav"
                            className="accessibility-setting__toggle"
                            checked={keyboardNavigation}
                            onChange={(e) => handleKeyboardNavigationChange(e.target.checked)}
                            aria-describedby="keyboard-nav-desc"
                        />
                    </div>
                    <p id="keyboard-nav-desc" className="accessibility-setting__description">
                        Enable full keyboard navigation support.
                    </p>
                </div>

                {/* Focus Indicators */}
                <div className="accessibility-setting">
                    <div className="accessibility-setting__header">
                        <label htmlFor="focus-visible" className="accessibility-setting__label">
                            Focus Indicators
                        </label>
                        <input
                            type="checkbox"
                            id="focus-visible"
                            className="accessibility-setting__toggle"
                            checked={focusVisible}
                            onChange={(e) => handleFocusVisibleChange(e.target.checked)}
                            aria-describedby="focus-visible-desc"
                        />
                    </div>
                    <p id="focus-visible-desc" className="accessibility-setting__description">
                        Show visual indicators for focused elements.
                    </p>
                </div>
            </div>

            <div className="accessibility-settings__actions">
                <button
                    className="accessibility-settings__reset"
                    onClick={handleReset}
                    aria-label="Reset accessibility settings to defaults"
                >
                    Reset to Defaults
                </button>
            </div>

            <div className="accessibility-settings__info">
                <h3 className="accessibility-settings__info-title">Keyboard Shortcuts</h3>
                <ul className="accessibility-settings__shortcuts">
                    <li><kbd>Tab</kbd> - Navigate forward</li>
                    <li><kbd>Shift</kbd> + <kbd>Tab</kbd> - Navigate backward</li>
                    <li><kbd>Enter</kbd> or <kbd>Space</kbd> - Activate buttons</li>
                    <li><kbd>Esc</kbd> - Close modals and dialogs</li>
                    <li><kbd>?</kbd> or <kbd>F1</kbd> - Open help panel</li>
                </ul>
            </div>
        </div>
    );
};
