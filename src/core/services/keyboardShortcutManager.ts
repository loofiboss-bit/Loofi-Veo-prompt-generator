/**
 * Keyboard Shortcut Manager
 * Handles global keyboard shortcuts with conflict detection
 */

import { get, set } from 'idb-keyval';
import { logger } from './loggerService';

const SHORTCUTS_KEY = 'keyboard-shortcuts';

export interface KeyboardShortcut {
    id: string;
    name: string;
    description: string;
    keys: string; // e.g., "Ctrl+S", "Ctrl+Shift+E"
    action: () => void;
    category: ShortcutCategory;
    context?: string; // Optional context where shortcut is active
    isCustom?: boolean;
}

export type ShortcutCategory =
    | 'general'
    | 'project'
    | 'editing'
    | 'navigation'
    | 'generation'
    | 'export';

interface ShortcutRegistry {
    [key: string]: KeyboardShortcut;
}

let shortcuts: ShortcutRegistry = {};
let customShortcuts: Record<string, string> = {}; // id -> custom keys
let isEnabled = true;

/**
 * Default shortcuts
 */
const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, 'action'>[] = [
    // General
    {
        id: 'help',
        name: 'Show Shortcuts Help',
        description: 'Display keyboard shortcuts overlay',
        keys: '?',
        category: 'general',
    },
    {
        id: 'command-palette',
        name: 'Command Palette',
        description: 'Open quick command palette',
        keys: 'Ctrl+K',
        category: 'general',
    },
    {
        id: 'toggle-fullscreen',
        name: 'Toggle Fullscreen',
        description: 'Enter or exit fullscreen mode',
        keys: 'F11',
        category: 'general',
    },
    {
        id: 'settings',
        name: 'Open Settings',
        description: 'Open application settings',
        keys: 'Ctrl+,',
        category: 'general',
    },

    // Project
    {
        id: 'new-project',
        name: 'New Project',
        description: 'Create a new project',
        keys: 'Ctrl+N',
        category: 'project',
    },
    {
        id: 'open-project',
        name: 'Open Project',
        description: 'Open existing project',
        keys: 'Ctrl+O',
        category: 'project',
    },
    {
        id: 'save-project',
        name: 'Save Project',
        description: 'Save current project',
        keys: 'Ctrl+S',
        category: 'project',
    },
    {
        id: 'save-as-template',
        name: 'Save as Template',
        description: 'Save current configuration as template',
        keys: 'Ctrl+Shift+S',
        category: 'project',
    },

    // Editing
    {
        id: 'undo',
        name: 'Undo',
        description: 'Undo last action',
        keys: 'Ctrl+Z',
        category: 'editing',
    },
    {
        id: 'redo',
        name: 'Redo',
        description: 'Redo last undone action',
        keys: 'Ctrl+Shift+Z',
        category: 'editing',
    },
    {
        id: 'duplicate-shot',
        name: 'Duplicate Shot',
        description: 'Duplicate current shot',
        keys: 'Ctrl+D',
        category: 'editing',
    },
    {
        id: 'delete-shot',
        name: 'Delete Shot',
        description: 'Delete current shot',
        keys: 'Ctrl+Shift+D',
        category: 'editing',
    },
    {
        id: 'toggle-comment',
        name: 'Toggle Comment',
        description: 'Add or remove comment',
        keys: 'Ctrl+/',
        category: 'editing',
    },

    // Navigation
    {
        id: 'next-tab',
        name: 'Next Tab',
        description: 'Switch to next tab',
        keys: 'Ctrl+Tab',
        category: 'navigation',
    },
    {
        id: 'prev-tab',
        name: 'Previous Tab',
        description: 'Switch to previous tab',
        keys: 'Ctrl+Shift+Tab',
        category: 'navigation',
    },
    {
        id: 'focus-search',
        name: 'Focus Search',
        description: 'Focus search input',
        keys: 'Ctrl+F',
        category: 'navigation',
    },

    // Generation
    {
        id: 'generate-prompt',
        name: 'Generate Prompt',
        description: 'Generate AI prompt',
        keys: 'Ctrl+Enter',
        category: 'generation',
    },
    {
        id: 'new-shot',
        name: 'Add New Shot',
        description: 'Add a new shot to storyboard',
        keys: 'Shift+N',
        category: 'generation',
    },
    {
        id: 'quick-generate',
        name: 'Quick Generate',
        description: 'Generate with current settings',
        keys: 'Ctrl+G',
        category: 'generation',
    },

    // Export
    {
        id: 'export-prompt',
        name: 'Export Prompt',
        description: 'Export current prompt',
        keys: 'Ctrl+Shift+E',
        category: 'export',
    },
    {
        id: 'export-project',
        name: 'Export Project',
        description: 'Export entire project',
        keys: 'Ctrl+E',
        category: 'export',
    },
    {
        id: 'copy-prompt',
        name: 'Copy Prompt',
        description: 'Copy prompt to clipboard',
        keys: 'Ctrl+Shift+C',
        category: 'export',
    },
];

/**
 * Initialize keyboard shortcut system
 */
export async function initShortcuts(): Promise<void> {
    try {
        // Load custom shortcuts
        customShortcuts = await get<Record<string, string>>(SHORTCUTS_KEY) || {};
        logger.info(`Keyboard shortcuts initialized with ${Object.keys(customShortcuts).length} custom shortcuts`);
    } catch (error) {
        logger.error('Failed to initialize shortcuts', error);
    }
}

/**
 * Register a shortcut
 */
export function registerShortcut(shortcut: KeyboardShortcut): void {
    // Use custom keys if available
    const keys = customShortcuts[shortcut.id] || shortcut.keys;

    // Check for conflicts
    const conflict = Object.values(shortcuts).find(s => s.keys === keys && s.id !== shortcut.id);
    if (conflict) {
        logger.warn(`Shortcut conflict: ${keys} already used by ${conflict.name}`);
    }

    shortcuts[shortcut.id] = { ...shortcut, keys };
    logger.debug(`Registered shortcut: ${shortcut.name} (${keys})`);
}

/**
 * Unregister a shortcut
 */
export function unregisterShortcut(id: string): void {
    delete shortcuts[id];
    logger.debug(`Unregistered shortcut: ${id}`);
}

/**
 * Handle keyboard event
 */
export function handleKeyboardEvent(event: KeyboardEvent): boolean {
    if (!isEnabled) return false;

    const keyCombo = buildKeyCombo(event);

    // Find matching shortcut
    const shortcut = Object.values(shortcuts).find(s => s.keys === keyCombo);

    if (shortcut) {
        // Check context if specified
        if (shortcut.context) {
            const activeElement = document.activeElement;
            if (!activeElement?.closest(`[data-context="${shortcut.context}"]`)) {
                return false;
            }
        }

        event.preventDefault();
        event.stopPropagation();

        try {
            shortcut.action();
            logger.debug(`Executed shortcut: ${shortcut.name}`);
            return true;
        } catch (error) {
            logger.error(`Failed to execute shortcut ${shortcut.name}`, error);
            return false;
        }
    }

    return false;
}

/**
 * Build key combination string from event
 */
function buildKeyCombo(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');

    // Handle special keys
    let key = event.key;
    if (key === ' ') key = 'Space';
    if (key === 'Escape') key = 'Esc';
    if (key.length === 1) key = key.toUpperCase();

    parts.push(key);

    return parts.join('+');
}

/**
 * Get all registered shortcuts
 */
export function getAllShortcuts(): KeyboardShortcut[] {
    return Object.values(shortcuts);
}

/**
 * Get shortcuts by category
 */
export function getShortcutsByCategory(category: ShortcutCategory): KeyboardShortcut[] {
    return Object.values(shortcuts).filter(s => s.category === category);
}

/**
 * Customize shortcut keys
 */
export async function customizeShortcut(id: string, newKeys: string): Promise<void> {
    try {
        // Check for conflicts
        const conflict = Object.values(shortcuts).find(s => s.keys === newKeys && s.id !== id);
        if (conflict) {
            throw new Error(`Shortcut ${newKeys} already used by ${conflict.name}`);
        }

        // Update custom shortcuts
        customShortcuts[id] = newKeys;
        await set(SHORTCUTS_KEY, customShortcuts);

        // Update registered shortcut
        if (shortcuts[id]) {
            shortcuts[id].keys = newKeys;
            shortcuts[id].isCustom = true;
        }

        logger.info(`Customized shortcut ${id} to ${newKeys}`);
    } catch (error) {
        logger.error('Failed to customize shortcut', error);
        throw error;
    }
}

/**
 * Reset shortcut to default
 */
export async function resetShortcut(id: string): Promise<void> {
    try {
        delete customShortcuts[id];
        await set(SHORTCUTS_KEY, customShortcuts);

        // Find default keys
        const defaultShortcut = DEFAULT_SHORTCUTS.find(s => s.id === id);
        if (defaultShortcut && shortcuts[id]) {
            shortcuts[id].keys = defaultShortcut.keys;
            shortcuts[id].isCustom = false;
        }

        logger.info(`Reset shortcut ${id} to default`);
    } catch (error) {
        logger.error('Failed to reset shortcut', error);
        throw error;
    }
}

/**
 * Reset all shortcuts to defaults
 */
export async function resetAllShortcuts(): Promise<void> {
    try {
        customShortcuts = {};
        await set(SHORTCUTS_KEY, customShortcuts);

        // Reset all registered shortcuts
        for (const id in shortcuts) {
            const defaultShortcut = DEFAULT_SHORTCUTS.find(s => s.id === id);
            if (defaultShortcut) {
                shortcuts[id].keys = defaultShortcut.keys;
                shortcuts[id].isCustom = false;
            }
        }

        logger.info('Reset all shortcuts to defaults');
    } catch (error) {
        logger.error('Failed to reset all shortcuts', error);
        throw error;
    }
}

/**
 * Enable/disable shortcuts
 */
export function setShortcutsEnabled(enabled: boolean): void {
    isEnabled = enabled;
    logger.info(`Shortcuts ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if shortcuts are enabled
 */
export function areShortcutsEnabled(): boolean {
    return isEnabled;
}

/**
 * Export shortcuts configuration
 */
export async function exportShortcuts(): Promise<string> {
    try {
        const exportData = {
            version: '1.2.0',
            exportDate: new Date().toISOString(),
            shortcuts: customShortcuts,
        };

        return JSON.stringify(exportData, null, 2);
    } catch (error) {
        logger.error('Failed to export shortcuts', error);
        throw error;
    }
}

/**
 * Import shortcuts configuration
 */
export async function importShortcuts(jsonData: string): Promise<void> {
    try {
        const data = JSON.parse(jsonData);

        if (!data.shortcuts || typeof data.shortcuts !== 'object') {
            throw new Error('Invalid shortcuts data format');
        }

        // Validate shortcuts
        for (const [id, keys] of Object.entries(data.shortcuts)) {
            if (typeof keys !== 'string') {
                throw new Error(`Invalid keys for shortcut ${id}`);
            }
        }

        customShortcuts = data.shortcuts;
        await set(SHORTCUTS_KEY, customShortcuts);

        // Update registered shortcuts
        for (const id in customShortcuts) {
            if (shortcuts[id]) {
                shortcuts[id].keys = customShortcuts[id];
                shortcuts[id].isCustom = true;
            }
        }

        logger.info('Imported shortcuts configuration');
    } catch (error) {
        logger.error('Failed to import shortcuts', error);
        throw error;
    }
}

/**
 * Get default shortcuts (for reference)
 */
export function getDefaultShortcuts(): Omit<KeyboardShortcut, 'action'>[] {
    return DEFAULT_SHORTCUTS;
}

/**
 * Check for shortcut conflicts
 */
export function checkConflicts(): Array<{ keys: string; shortcuts: KeyboardShortcut[] }> {
    const conflicts: Array<{ keys: string; shortcuts: KeyboardShortcut[] }> = [];
    const keyMap = new Map<string, KeyboardShortcut[]>();

    // Group shortcuts by keys
    for (const shortcut of Object.values(shortcuts)) {
        const existing = keyMap.get(shortcut.keys) || [];
        existing.push(shortcut);
        keyMap.set(shortcut.keys, existing);
    }

    // Find conflicts
    for (const [keys, shortcuts] of keyMap.entries()) {
        if (shortcuts.length > 1) {
            conflicts.push({ keys, shortcuts });
        }
    }

    return conflicts;
}
