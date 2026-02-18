/**
 * Keyboard Shortcut Manager Unit Tests
 * Tests for keyboard shortcut registration and handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mocks for idb-keyval
const { mockGet, mockSet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
}));

vi.mock('idb-keyval', () => ({
  get: mockGet,
  set: mockSet,
}));

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  initShortcuts,
  registerShortcut,
  unregisterShortcut,
  handleKeyboardEvent,
  getAllShortcuts,
  getShortcutsByCategory,
  customizeShortcut,
  resetShortcut,
  resetAllShortcuts,
  setShortcutsEnabled,
  areShortcutsEnabled,
  exportShortcuts,
  importShortcuts,
  getDefaultShortcuts,
  checkConflicts,
  type KeyboardShortcut,
} from './keyboardShortcutManager';
import { logger } from './loggerService';

describe('keyboardShortcutManager', () => {
  const mockAction = vi.fn();

  const testShortcut: KeyboardShortcut = {
    id: 'test-shortcut',
    name: 'Test Shortcut',
    description: 'A test shortcut',
    keys: 'Ctrl+T',
    action: mockAction,
    category: 'general',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({});
    mockSet.mockResolvedValue(undefined);
    setShortcutsEnabled(true);
    // Reset customShortcuts by re-initializing from the mock (returns {})
    await initShortcuts();
  });

  afterEach(() => {
    // Clean up registered shortcuts
    const shortcuts = getAllShortcuts();
    shortcuts.forEach((s) => unregisterShortcut(s.id));
  });

  describe('initShortcuts', () => {
    it('should initialize with no custom shortcuts', async () => {
      mockGet.mockResolvedValue(null);

      await initShortcuts();

      expect(mockGet).toHaveBeenCalledWith('keyboard-shortcuts');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Keyboard shortcuts initialized'),
      );
    });

    it('should load custom shortcuts from storage', async () => {
      mockGet.mockResolvedValue({
        help: '?',
        'save-project': 'Ctrl+Shift+S',
      });

      await initShortcuts();

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('2 custom shortcuts'));
    });

    it('should handle storage errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Storage error'));

      await initShortcuts();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize shortcuts',
        expect.any(Error),
      );
    });
  });

  describe('registerShortcut', () => {
    it('should register a new shortcut', () => {
      registerShortcut(testShortcut);

      const shortcuts = getAllShortcuts();
      const registered = shortcuts.find((s) => s.id === 'test-shortcut');

      expect(registered).toBeDefined();
      expect(registered?.keys).toBe('Ctrl+T');
      expect(logger.debug).toHaveBeenCalledWith('Registered shortcut: Test Shortcut (Ctrl+T)');
    });

    it('should warn about conflicts when same keys are used', () => {
      registerShortcut(testShortcut);
      registerShortcut({ ...testShortcut, id: 'another-shortcut', name: 'Another' });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Shortcut conflict'));
    });

    it('should use custom keys if available', async () => {
      mockGet.mockResolvedValue({ 'test-shortcut': 'Ctrl+Shift+T' });
      await initShortcuts();

      registerShortcut(testShortcut);

      const shortcuts = getAllShortcuts();
      const registered = shortcuts.find((s) => s.id === 'test-shortcut');

      expect(registered?.keys).toBe('Ctrl+Shift+T');
    });
  });

  describe('unregisterShortcut', () => {
    it('should remove a registered shortcut', () => {
      registerShortcut(testShortcut);
      unregisterShortcut('test-shortcut');

      const shortcuts = getAllShortcuts();
      const found = shortcuts.find((s) => s.id === 'test-shortcut');

      expect(found).toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith('Unregistered shortcut: test-shortcut');
    });
  });

  describe('handleKeyboardEvent', () => {
    it('should execute shortcut action when matching key combo is pressed', () => {
      registerShortcut(testShortcut);

      const event = new KeyboardEvent('keydown', {
        key: 't', // lowercase as it comes from keyboard
        ctrlKey: true,
      });

      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(true);
      expect(mockAction).toHaveBeenCalled();
    });

    it('should not execute when shortcuts are disabled', () => {
      registerShortcut(testShortcut);
      setShortcutsEnabled(false);

      const event = new KeyboardEvent('keydown', {
        key: 'T',
        ctrlKey: true,
      });

      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(false);
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('should return false when no matching shortcut', () => {
      registerShortcut(testShortcut);

      const event = new KeyboardEvent('keydown', {
        key: 'Z',
        ctrlKey: true,
      });

      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(false);
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('should handle Ctrl+Shift combinations', () => {
      const shortcut: KeyboardShortcut = {
        ...testShortcut,
        keys: 'Ctrl+Shift+S',
      };
      registerShortcut(shortcut);

      const event = new KeyboardEvent('keydown', {
        key: 's', // lowercase as it comes from keyboard
        ctrlKey: true,
        shiftKey: true,
      });

      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(true);
      expect(mockAction).toHaveBeenCalled();
    });

    it('should handle special keys like F11', () => {
      const shortcut: KeyboardShortcut = {
        ...testShortcut,
        keys: 'F11',
      };
      registerShortcut(shortcut);

      const event = new KeyboardEvent('keydown', {
        key: 'F11',
      });

      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(true);
      expect(mockAction).toHaveBeenCalled();
    });

    it('should check context when specified', () => {
      const contextShortcut: KeyboardShortcut = {
        ...testShortcut,
        context: 'editor',
      };
      registerShortcut(contextShortcut);

      // Mock activeElement not in correct context
      Object.defineProperty(document, 'activeElement', {
        writable: true,
        value: {
          closest: vi.fn().mockReturnValue(null),
        },
      });

      const event = new KeyboardEvent('keydown', {
        key: 'T',
        ctrlKey: true,
      });

      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(false);
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('should handle errors in shortcut actions', () => {
      const errorAction = vi.fn().mockImplementation(() => {
        throw new Error('Action failed');
      });
      const errorShortcut: KeyboardShortcut = {
        ...testShortcut,
        action: errorAction,
      };
      registerShortcut(errorShortcut);

      const event = new KeyboardEvent('keydown', {
        key: 't', // lowercase
        ctrlKey: true,
      });

      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to execute shortcut'),
        expect.any(Error),
      );
    });

    it('should normalize metaKey to Ctrl', () => {
      registerShortcut(testShortcut);

      const event = new KeyboardEvent('keydown', {
        key: 't', // lowercase
        metaKey: true, // Mac Cmd key
      });

      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(true);
      expect(mockAction).toHaveBeenCalled();
    });

    it('should handle space key correctly', () => {
      const spaceShortcut: KeyboardShortcut = {
        ...testShortcut,
        keys: 'Ctrl+Space',
      };
      registerShortcut(spaceShortcut);

      const event = new KeyboardEvent('keydown', {
        key: ' ',
        ctrlKey: true,
      });

      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(true);
    });

    it('should handle escape key correctly', () => {
      const escapeShortcut: KeyboardShortcut = {
        ...testShortcut,
        keys: 'Esc',
      };
      registerShortcut(escapeShortcut);

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
      });

      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(true);
    });
  });

  describe('getAllShortcuts', () => {
    it('should return all registered shortcuts', () => {
      registerShortcut(testShortcut);
      registerShortcut({ ...testShortcut, id: 'another', keys: 'Ctrl+Z' });

      const shortcuts = getAllShortcuts();

      expect(shortcuts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getShortcutsByCategory', () => {
    it('should filter shortcuts by category', () => {
      registerShortcut({ ...testShortcut, category: 'general' });
      registerShortcut({ ...testShortcut, id: 'edit', category: 'editing' });

      const generalShortcuts = getShortcutsByCategory('general');

      expect(generalShortcuts.some((s) => s.id === 'test-shortcut')).toBe(true);
      expect(generalShortcuts.some((s) => s.id === 'edit')).toBe(false);
    });
  });

  describe('customizeShortcut', () => {
    it('should customize shortcut keys', async () => {
      await initShortcuts();
      registerShortcut(testShortcut);

      await customizeShortcut('test-shortcut', 'Ctrl+Shift+T');

      expect(mockSet).toHaveBeenCalledWith('keyboard-shortcuts', {
        'test-shortcut': 'Ctrl+Shift+T',
      });

      const shortcuts = getAllShortcuts();
      const customized = shortcuts.find((s) => s.id === 'test-shortcut');
      expect(customized?.keys).toBe('Ctrl+Shift+T');
      expect(customized?.isCustom).toBe(true);
    });

    it('should throw error on conflict', async () => {
      await initShortcuts();
      registerShortcut(testShortcut);
      registerShortcut({ ...testShortcut, id: 'another', keys: 'Ctrl+Z' });

      await expect(customizeShortcut('test-shortcut', 'Ctrl+Z')).rejects.toThrow(
        'Shortcut Ctrl+Z already used by',
      );
    });
  });

  describe('resetShortcut', () => {
    it('should reset shortcut to default keys', async () => {
      await initShortcuts();
      registerShortcut(testShortcut);
      await customizeShortcut('test-shortcut', 'Ctrl+Shift+T');

      await resetShortcut('test-shortcut');

      expect(mockSet).toHaveBeenCalledWith('keyboard-shortcuts', {});
    });
  });

  describe('resetAllShortcuts', () => {
    it('should reset all shortcuts to defaults', async () => {
      await initShortcuts();
      registerShortcut(testShortcut);
      await customizeShortcut('test-shortcut', 'Ctrl+Shift+T');

      await resetAllShortcuts();

      expect(mockSet).toHaveBeenCalledWith('keyboard-shortcuts', {});
      expect(logger.info).toHaveBeenCalledWith('Reset all shortcuts to defaults');
    });
  });

  describe('setShortcutsEnabled/areShortcutsEnabled', () => {
    it('should enable and disable shortcuts', () => {
      setShortcutsEnabled(false);
      expect(areShortcutsEnabled()).toBe(false);

      setShortcutsEnabled(true);
      expect(areShortcutsEnabled()).toBe(true);
    });
  });

  describe('exportShortcuts', () => {
    it('should export shortcuts configuration as JSON', async () => {
      mockGet.mockResolvedValue({ help: '?', 'save-project': 'Ctrl+Shift+S' });
      await initShortcuts();

      const exported = await exportShortcuts();
      const data = JSON.parse(exported);

      expect(data.version).toBe('1.2.0');
      expect(data.shortcuts).toEqual({ help: '?', 'save-project': 'Ctrl+Shift+S' });
      expect(data.exportDate).toBeDefined();
    });
  });

  describe('importShortcuts', () => {
    it('should import shortcuts configuration', async () => {
      await initShortcuts();
      registerShortcut(testShortcut);

      const importData = JSON.stringify({
        version: '1.2.0',
        shortcuts: { 'test-shortcut': 'Ctrl+Shift+T' },
      });

      await importShortcuts(importData);

      expect(mockSet).toHaveBeenCalledWith('keyboard-shortcuts', {
        'test-shortcut': 'Ctrl+Shift+T',
      });

      const shortcuts = getAllShortcuts();
      const imported = shortcuts.find((s) => s.id === 'test-shortcut');
      expect(imported?.keys).toBe('Ctrl+Shift+T');
    });

    it('should throw error on invalid format', async () => {
      await expect(importShortcuts('invalid json')).rejects.toThrow();
    });

    it('should throw error on missing shortcuts field', async () => {
      const invalidData = JSON.stringify({ version: '1.2.0' });

      await expect(importShortcuts(invalidData)).rejects.toThrow('Invalid shortcuts data format');
    });

    it('should validate shortcut key types', async () => {
      const invalidData = JSON.stringify({
        shortcuts: { test: 123 },
      });

      await expect(importShortcuts(invalidData)).rejects.toThrow('Invalid keys for shortcut test');
    });
  });

  describe('getDefaultShortcuts', () => {
    it('should return default shortcuts list', () => {
      const defaults = getDefaultShortcuts();

      expect(defaults.length).toBeGreaterThan(0);
      expect(defaults[0]).toHaveProperty('id');
      expect(defaults[0]).toHaveProperty('keys');
      expect(defaults[0]).toHaveProperty('category');
    });
  });

  describe('checkConflicts', () => {
    it('should detect shortcut conflicts when multiple shortcuts use same keys', () => {
      // Clear any existing shortcuts first
      getAllShortcuts().forEach((s) => unregisterShortcut(s.id));

      // Now register conflicting shortcuts
      registerShortcut(testShortcut);
      const conflict: KeyboardShortcut = {
        id: 'conflict',
        name: 'Conflict',
        description: 'A conflicting shortcut',
        keys: 'Ctrl+T', // Same keys as testShortcut
        action: vi.fn(),
        category: 'general',
      };
      registerShortcut(conflict);

      const conflicts = checkConflicts();

      expect(conflicts.length).toBeGreaterThan(0);
      const ctrlTConflict = conflicts.find((c) => c.keys === 'Ctrl+T');
      expect(ctrlTConflict).toBeDefined();
      expect(ctrlTConflict!.shortcuts.length).toBe(2);
    });

    it('should return empty array when no conflicts', () => {
      registerShortcut(testShortcut);
      registerShortcut({ ...testShortcut, id: 'unique', keys: 'Ctrl+U' });

      const conflicts = checkConflicts();

      expect(conflicts.length).toBe(0);
    });
  });
});
