/**
 * Auth Service
 * v2.6.0 - Collaboration Suite
 *
 * Manages local user identity for collaboration features.
 * No external auth provider required — generates a persistent local profile
 * stored in IndexedDB. Optional email for future account linking.
 */

import { get, set } from 'idb-keyval';
import { logger } from './loggerService';
import type { CollaborationUser } from '@core/types';

const IDB_KEY = 'collab:user-profile';

/** Default avatar colors for random assignment */
const AVATAR_COLORS = [
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

class AuthService {
  private static instance: AuthService;
  private cachedUser: CollaborationUser | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get the current user profile, creating one if it doesn't exist.
   */
  async getCurrentUser(): Promise<CollaborationUser> {
    if (this.cachedUser) return this.cachedUser;

    try {
      const stored = await get<CollaborationUser>(IDB_KEY);
      if (stored) {
        this.cachedUser = stored;
        logger.info('AuthService', 'Loaded user profile', { userId: stored.id });
        return stored;
      }
    } catch (error) {
      logger.error('AuthService', 'Failed to load user profile', error);
    }

    // Create new profile
    const user = this.createDefaultProfile();
    await this.saveProfile(user);
    return user;
  }

  /**
   * Check if the user has set up their profile (has a display name).
   */
  async isProfileSetUp(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !user.displayName.startsWith('User ');
  }

  /**
   * Update the user's profile.
   */
  async updateProfile(
    updates: Partial<
      Pick<CollaborationUser, 'displayName' | 'avatarColor' | 'avatarUrl' | 'email'>
    >,
  ): Promise<CollaborationUser> {
    const current = await this.getCurrentUser();
    const updated: CollaborationUser = {
      ...current,
      ...updates,
      updatedAt: Date.now(),
    };

    await this.saveProfile(updated);
    logger.info('AuthService', 'Updated user profile', { userId: updated.id });
    return updated;
  }

  /**
   * Generate a unique user ID.
   */
  generateUserId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `user_${timestamp}_${random}`;
  }

  /**
   * Pick a random avatar color.
   */
  getRandomAvatarColor(): string {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }

  /**
   * Get available avatar colors.
   */
  getAvatarColors(): string[] {
    return [...AVATAR_COLORS];
  }

  /**
   * Reset user profile (for testing / debugging).
   */
  async resetProfile(): Promise<void> {
    this.cachedUser = null;
    try {
      await set(IDB_KEY, undefined);
      logger.info('AuthService', 'Profile reset');
    } catch (error) {
      logger.error('AuthService', 'Failed to reset profile', error);
    }
  }

  private createDefaultProfile(): CollaborationUser {
    const id = this.generateUserId();
    return {
      id,
      displayName: `User ${Math.floor(Math.random() * 9000) + 1000}`,
      avatarColor: this.getRandomAvatarColor(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private async saveProfile(user: CollaborationUser): Promise<void> {
    try {
      await set(IDB_KEY, user);
      this.cachedUser = user;
    } catch (error) {
      logger.error('AuthService', 'Failed to save user profile', error);
      throw error;
    }
  }
}

export const authService = AuthService.getInstance();
