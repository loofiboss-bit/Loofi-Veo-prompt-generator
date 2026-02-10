import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import {
    keyboardShortcuts,
    getShortcutCategories,
    getShortcutsByCategory,
    formatShortcut,
    type KeyboardShortcut
} from '@infrastructure/database/migrations/keyboardShortcuts';

interface KeyboardShortcutsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsProps> = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const categories = getShortcutCategories();

    const filteredShortcuts = searchQuery
        ? keyboardShortcuts.filter(
            (shortcut) =>
                shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                shortcut.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : keyboardShortcuts;

    const groupedShortcuts = categories.reduce((acc, category) => {
        const shortcuts = searchQuery
            ? filteredShortcuts.filter((s) => s.category === category)
            : getShortcutsByCategory(category);

        if (shortcuts.length > 0) {
            acc[category] = shortcuts;
        }
        return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <div className="keyboard-shortcuts-modal">
                {/* Header */}
                <div className="shortcuts-header">
                    <h2 className="shortcuts-title">Keyboard Shortcuts</h2>
                    <p className="shortcuts-subtitle">
                        Boost your productivity with these keyboard shortcuts
                    </p>
                </div>

                {/* Search */}
                <div className="shortcuts-search">
                    <Input
                        type="text"
                        placeholder="Search shortcuts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        }
                        fullWidth
                    />
                </div>

                {/* Shortcuts List */}
                <div className="shortcuts-content">
                    {Object.entries(groupedShortcuts).map(([category, shortcuts], categoryIndex) => (
                        <div
                            key={category}
                            className="shortcuts-category animate-fade-in-up"
                            style={{ animationDelay: `${categoryIndex * 0.05}s` }}
                        >
                            <h3 className="shortcuts-category-title">{category}</h3>
                            <div className="shortcuts-list">
                                {shortcuts.map((shortcut, index) => (
                                    <div
                                        key={`${shortcut.category}-${shortcut.key}-${index}`}
                                        className="shortcut-item"
                                    >
                                        <span className="shortcut-description">{shortcut.description}</span>
                                        <div className="shortcut-keys">
                                            {formatShortcut(shortcut).split(/(?=[+⌘⇧⌥])|\+/).map((key, i) => (
                                                key && (
                                                    <kbd key={i} className="shortcut-key">
                                                        {key.replace('+', '')}
                                                    </kbd>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {Object.keys(groupedShortcuts).length === 0 && (
                        <div className="shortcuts-empty">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <p>No shortcuts found matching "{searchQuery}"</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="shortcuts-footer">
                    <p>
                        Press <kbd className="shortcut-key">?</kbd> anytime to open this dialog
                    </p>
                </div>
            </div>

            <style>{`
        .keyboard-shortcuts-modal {
          padding: var(--spacing-6);
        }

        .shortcuts-header {
          margin-bottom: var(--spacing-6);
          text-align: center;
        }

        .shortcuts-title {
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-2);
        }

        .shortcuts-subtitle {
          font-size: var(--font-size-base);
          color: var(--color-text-secondary);
          margin: 0;
        }

        .shortcuts-search {
          margin-bottom: var(--spacing-6);
        }

        .shortcuts-content {
          max-height: 60vh;
          overflow-y: auto;
          padding-right: var(--spacing-2);
        }

        .shortcuts-category {
          margin-bottom: var(--spacing-6);
        }

        .shortcuts-category:last-child {
          margin-bottom: 0;
        }

        .shortcuts-category-title {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-3);
          padding-bottom: var(--spacing-2);
          border-bottom: 1px solid var(--color-border);
        }

        .shortcuts-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2);
        }

        .shortcut-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-3) var(--spacing-4);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }

        .shortcut-item:hover {
          background: var(--color-bg-tertiary);
        }

        .shortcut-description {
          font-size: var(--font-size-base);
          color: var(--color-text-primary);
        }

        .shortcut-keys {
          display: flex;
          gap: var(--spacing-1);
          align-items: center;
        }

        .shortcut-key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          padding: 0 var(--spacing-2);
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-family: var(--font-mono, 'SF Mono', 'Monaco', 'Consolas', monospace);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05),
                      inset 0 -1px 0 rgba(0, 0, 0, 0.1);
        }

        .shortcuts-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-12) var(--spacing-6);
          text-align: center;
          color: var(--color-text-tertiary);
        }

        .shortcuts-empty svg {
          margin-bottom: var(--spacing-4);
          opacity: 0.5;
        }

        .shortcuts-empty p {
          margin: 0;
          font-size: var(--font-size-base);
        }

        .shortcuts-footer {
          margin-top: var(--spacing-6);
          padding-top: var(--spacing-4);
          border-top: 1px solid var(--color-border);
          text-align: center;
        }

        .shortcuts-footer p {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin: 0;
        }

        .shortcuts-footer .shortcut-key {
          margin: 0 var(--spacing-1);
        }

        @media (max-width: 768px) {
          .keyboard-shortcuts-modal {
            padding: var(--spacing-4);
          }

          .shortcut-item {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-2);
          }

          .shortcut-keys {
            align-self: flex-end;
          }
        }
      `}</style>
        </Modal>
    );
};

export default KeyboardShortcutsModal;
