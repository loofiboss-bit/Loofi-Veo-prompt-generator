export interface KeyboardShortcut {
    key: string;
    modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
    description: string;
    category: string;
    action: string; // Action identifier
}

export const keyboardShortcuts: KeyboardShortcut[] = [
    // General
    {
        key: 'k',
        modifiers: ['ctrl'],
        description: 'Quick search',
        category: 'General',
        action: 'search',
    },
    {
        key: '/',
        modifiers: ['ctrl'],
        description: 'Toggle help panel',
        category: 'General',
        action: 'toggle-help',
    },
    {
        key: '?',
        modifiers: [],
        description: 'Show keyboard shortcuts',
        category: 'General',
        action: 'show-shortcuts',
    },
    {
        key: ',',
        modifiers: ['ctrl'],
        description: 'Open settings',
        category: 'General',
        action: 'open-settings',
    },

    // Projects
    {
        key: 'n',
        modifiers: ['ctrl'],
        description: 'New project',
        category: 'Projects',
        action: 'new-project',
    },
    {
        key: 'o',
        modifiers: ['ctrl'],
        description: 'Open project',
        category: 'Projects',
        action: 'open-project',
    },
    {
        key: 'w',
        modifiers: ['ctrl'],
        description: 'Close project',
        category: 'Projects',
        action: 'close-project',
    },

    // Prompts
    {
        key: 'n',
        modifiers: ['ctrl', 'shift'],
        description: 'New prompt',
        category: 'Prompts',
        action: 'new-prompt',
    },
    {
        key: 's',
        modifiers: ['ctrl'],
        description: 'Save prompt',
        category: 'Prompts',
        action: 'save-prompt',
    },
    {
        key: 'd',
        modifiers: ['ctrl'],
        description: 'Duplicate prompt',
        category: 'Prompts',
        action: 'duplicate-prompt',
    },
    {
        key: 'Delete',
        modifiers: [],
        description: 'Delete selected prompt',
        category: 'Prompts',
        action: 'delete-prompt',
    },

    // Editing
    {
        key: 'z',
        modifiers: ['ctrl'],
        description: 'Undo',
        category: 'Editing',
        action: 'undo',
    },
    {
        key: 'z',
        modifiers: ['ctrl', 'shift'],
        description: 'Redo',
        category: 'Editing',
        action: 'redo',
    },
    {
        key: 'a',
        modifiers: ['ctrl'],
        description: 'Select all',
        category: 'Editing',
        action: 'select-all',
    },
    {
        key: 'f',
        modifiers: ['ctrl'],
        description: 'Find in prompt',
        category: 'Editing',
        action: 'find',
    },
    {
        key: 'h',
        modifiers: ['ctrl'],
        description: 'Find and replace',
        category: 'Editing',
        action: 'find-replace',
    },

    // Export & Share
    {
        key: 'e',
        modifiers: ['ctrl'],
        description: 'Export prompt',
        category: 'Export & Share',
        action: 'export-prompt',
    },
    {
        key: 'e',
        modifiers: ['ctrl', 'shift'],
        description: 'Export project',
        category: 'Export & Share',
        action: 'export-project',
    },
    {
        key: 'c',
        modifiers: ['ctrl', 'shift'],
        description: 'Copy to clipboard',
        category: 'Export & Share',
        action: 'copy-clipboard',
    },

    // View
    {
        key: 'b',
        modifiers: ['ctrl'],
        description: 'Toggle sidebar',
        category: 'View',
        action: 'toggle-sidebar',
    },
    {
        key: 't',
        modifiers: ['ctrl'],
        description: 'Toggle theme',
        category: 'View',
        action: 'toggle-theme',
    },
    {
        key: '=',
        modifiers: ['ctrl'],
        description: 'Zoom in',
        category: 'View',
        action: 'zoom-in',
    },
    {
        key: '-',
        modifiers: ['ctrl'],
        description: 'Zoom out',
        category: 'View',
        action: 'zoom-out',
    },
    {
        key: '0',
        modifiers: ['ctrl'],
        description: 'Reset zoom',
        category: 'View',
        action: 'zoom-reset',
    },

    // Navigation
    {
        key: 'ArrowUp',
        modifiers: ['ctrl'],
        description: 'Previous prompt',
        category: 'Navigation',
        action: 'previous-prompt',
    },
    {
        key: 'ArrowDown',
        modifiers: ['ctrl'],
        description: 'Next prompt',
        category: 'Navigation',
        action: 'next-prompt',
    },
    {
        key: 'Home',
        modifiers: ['ctrl'],
        description: 'Go to first prompt',
        category: 'Navigation',
        action: 'first-prompt',
    },
    {
        key: 'End',
        modifiers: ['ctrl'],
        description: 'Go to last prompt',
        category: 'Navigation',
        action: 'last-prompt',
    },

    // Templates
    {
        key: 't',
        modifiers: ['ctrl', 'shift'],
        description: 'Browse templates',
        category: 'Templates',
        action: 'browse-templates',
    },
    {
        key: 's',
        modifiers: ['ctrl', 'shift'],
        description: 'Save as template',
        category: 'Templates',
        action: 'save-template',
    },
];

export const getShortcutsByCategory = (category: string): KeyboardShortcut[] => {
    return keyboardShortcuts.filter(shortcut => shortcut.category === category);
};

export const getShortcutCategories = (): string[] => {
    return Array.from(new Set(keyboardShortcuts.map(s => s.category)));
};

export const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifiers = shortcut.modifiers || [];

    const parts = modifiers.map(mod => {
        switch (mod) {
            case 'ctrl':
                return isMac ? '⌘' : 'Ctrl';
            case 'shift':
                return isMac ? '⇧' : 'Shift';
            case 'alt':
                return isMac ? '⌥' : 'Alt';
            case 'meta':
                return isMac ? '⌘' : 'Win';
            default:
                return mod;
        }
    });

    parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);

    return parts.join(isMac ? '' : '+');
};

export const matchesShortcut = (
    event: KeyboardEvent,
    shortcut: KeyboardShortcut
): boolean => {
    const modifiers = shortcut.modifiers || [];

    // Check key
    if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
        return false;
    }

    // Check modifiers
    const hasCtrl = modifiers.includes('ctrl') || modifiers.includes('meta');
    const hasShift = modifiers.includes('shift');
    const hasAlt = modifiers.includes('alt');

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlPressed = isMac ? event.metaKey : event.ctrlKey;

    return (
        ctrlPressed === hasCtrl &&
        event.shiftKey === hasShift &&
        event.altKey === hasAlt
    );
};
