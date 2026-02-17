/**
 * ProfileSetup Component
 * v2.6.0 - Collaboration Suite
 *
 * Modal for setting up user display name and avatar color
 * before joining collaboration rooms.
 */

import React, { useState, useCallback } from 'react';
import { useCollaborationStore } from '@core/store/useCollaborationStore';
import { authService } from '@core/services/authService';

interface ProfileSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function ProfileSetup({ isOpen, onClose, onComplete }: ProfileSetupProps) {
  const { currentUser, setCurrentUser } = useCollaborationStore();
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '');
  const [selectedColor, setSelectedColor] = useState(currentUser?.avatarColor ?? '#3b82f6');
  const [isSaving, setIsSaving] = useState(false);

  const avatarColors = authService.getAvatarColors();

  const handleSave = useCallback(async () => {
    if (!displayName.trim()) return;
    setIsSaving(true);
    try {
      const updated = await authService.updateProfile({
        displayName: displayName.trim(),
        avatarColor: selectedColor,
      });
      setCurrentUser(updated);
      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  }, [displayName, selectedColor, setCurrentUser, onClose, onComplete]);

  if (!isOpen) return null;

  const initials =
    displayName
      .trim()
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Set Up Your Profile
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Choose how you appear to collaborators.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-4 justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg transition-colors"
              style={{ backgroundColor: selectedColor }}
            >
              {initials}
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              maxLength={30}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Avatar Color
            </label>
            <div className="flex flex-wrap gap-2 justify-center">
              {avatarColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900 scale-110'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!displayName.trim() || isSaving}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
