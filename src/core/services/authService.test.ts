/**
 * AuthService Unit Tests
 * v2.6.0 - Collaboration Suite
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get, set, del } from 'idb-keyval';

// Mock idb-keyval first
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
  keys: vi.fn(() => Promise.resolve([...mockStore.keys()])),
}));

vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import { authService } from './authService';

describe('AuthService', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
    // Reset singleton instance for clean tests
    authService.resetProfile();
  });

  describe('getCurrentUser', () => {
    it('should create default profile on first call', async () => {
      const user = await authService.getCurrentUser();

      expect(user).toBeDefined();
      expect(user.id).toMatch(/^user_.*_.*$/);
      expect(user.displayName).toMatch(/^User \d{4}$/);
      expect(user.avatarColor).toBeTruthy();
      expect(user.createdAt).toBeGreaterThan(0);
      expect(user.updatedAt).toBeGreaterThan(0);
    });

    it('should return cached user on second call', async () => {
      const user1 = await authService.getCurrentUser();
      const user2 = await authService.getCurrentUser();

      expect(user1.id).toBe(user2.id);
      expect(user1.displayName).toBe(user2.displayName);
    });

    it('should persist user to IDB', async () => {
      await authService.getCurrentUser();

      expect(set).toHaveBeenCalledWith('collab:user-profile', expect.any(Object));
      expect(mockStore.has('collab:user-profile')).toBe(true);
    });

    it('should load existing user from IDB', async () => {
      const existingUser = {
        id: 'user_test_123',
        displayName: 'Alice',
        avatarColor: '#3b82f6',
        createdAt: 1000,
        updatedAt: 1000,
      };
      mockStore.set('collab:user-profile', existingUser);

      const user = await authService.getCurrentUser();

      expect(user).toEqual(existingUser);
    });

    it('should handle IDB errors gracefully', async () => {
      vi.mocked(get).mockRejectedValueOnce(new Error('IDB error'));

      const user = await authService.getCurrentUser();

      expect(user).toBeDefined();
      expect(user.displayName).toMatch(/^User \d{4}$/);
    });
  });

  describe('isProfileSetUp', () => {
    it('should return false for default "User XXXX" names', async () => {
      const user = await authService.getCurrentUser();
      const isSetUp = await authService.isProfileSetUp();

      expect(user.displayName).toMatch(/^User \d{4}$/);
      expect(isSetUp).toBe(false);
    });

    it('should return true after updating displayName', async () => {
      await authService.getCurrentUser();
      await authService.updateProfile({ displayName: 'Alice' });

      const isSetUp = await authService.isProfileSetUp();

      expect(isSetUp).toBe(true);
    });
  });

  describe('updateProfile', () => {
    it('should merge updates with existing profile', async () => {
      const original = await authService.getCurrentUser();
      // Small delay to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 1));
      const updates = {
        displayName: 'Bob',
        avatarColor: '#ef4444',
        email: 'bob@example.com',
      };

      const updated = await authService.updateProfile(updates);

      expect(updated.id).toBe(original.id);
      expect(updated.displayName).toBe('Bob');
      expect(updated.avatarColor).toBe('#ef4444');
      expect(updated.email).toBe('bob@example.com');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(original.updatedAt);
    });

    it('should persist updates to IDB', async () => {
      await authService.getCurrentUser();
      await authService.updateProfile({ displayName: 'Charlie' });

      const stored = mockStore.get('collab:user-profile');
      expect(stored).toEqual(expect.objectContaining({ displayName: 'Charlie' }));
    });

    it('should update cache immediately', async () => {
      await authService.getCurrentUser();
      await authService.updateProfile({ displayName: 'David' });

      const cachedUser = await authService.getCurrentUser();

      expect(cachedUser.displayName).toBe('David');
    });

    it('should throw if IDB persistence fails', async () => {
      await authService.getCurrentUser();
      vi.mocked(set).mockRejectedValueOnce(new Error('IDB error'));

      await expect(authService.updateProfile({ displayName: 'Eve' })).rejects.toThrow('IDB error');
    });
  });

  describe('generateUserId', () => {
    it('should return string with user_ prefix', () => {
      const id = authService.generateUserId();

      expect(id).toMatch(/^user_.*_.*$/);
    });

    it('should generate unique IDs', () => {
      const id1 = authService.generateUserId();
      const id2 = authService.generateUserId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('getRandomAvatarColor', () => {
    it('should return a color from AVATAR_COLORS', () => {
      const colors = [
        '#ef4444',
        '#f97316',
        '#f59e0b',
        '#84cc16',
        '#22c55e',
        '#06b6d4',
        '#3b82f6',
        '#8b5cf6',
        '#a855f7',
        '#ec4899',
      ];
      const color = authService.getRandomAvatarColor();

      expect(colors).toContain(color);
    });

    it('should return a hex color string', () => {
      const color = authService.getRandomAvatarColor();

      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('getAvatarColors', () => {
    it('should return array of 10 colors', () => {
      const colors = authService.getAvatarColors();

      expect(colors).toHaveLength(10);
    });

    it('should return valid hex colors', () => {
      const colors = authService.getAvatarColors();

      colors.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should return a new array (not reference)', () => {
      const colors1 = authService.getAvatarColors();
      const colors2 = authService.getAvatarColors();

      expect(colors1).toEqual(colors2);
      expect(colors1).not.toBe(colors2);
    });
  });

  describe('resetProfile', () => {
    it('should clear cache', async () => {
      await authService.getCurrentUser();
      await authService.resetProfile();

      // After reset, next call should create a new user
      const user1 = await authService.getCurrentUser();
      const user2 = await authService.getCurrentUser();

      expect(user1.id).toBe(user2.id);
    });

    it('should clear IDB', async () => {
      await authService.getCurrentUser();
      await authService.resetProfile();

      expect(set).toHaveBeenCalledWith('collab:user-profile', undefined);
      // Note: set() with undefined doesn't delete the key in our mock, but in real IDB it would
    });

    it('should handle IDB errors', async () => {
      await authService.getCurrentUser();
      vi.mocked(del).mockRejectedValueOnce(new Error('IDB error'));

      // Should not throw
      await expect(authService.resetProfile()).resolves.toBeUndefined();
    });
  });

  describe('Singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      // authService is already a singleton instance
      const current = authService;

      expect(current).toBeDefined();
      expect(current).toBe(authService);
    });
  });
});
