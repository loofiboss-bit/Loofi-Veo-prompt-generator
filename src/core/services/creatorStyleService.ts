import { get, update } from 'idb-keyval';
import type { CreatorStyleProfileV1 } from '@core/types/creatorDelivery';
import { logger } from '@core/services/loggerService';
const KEY = 'creator-style-profiles-v1';
export function validateCreatorStyle(profile: CreatorStyleProfileV1): void {
  if (
    !profile.name.trim() ||
    !/^#[0-9a-f]{6}$/i.test(profile.primaryColor) ||
    !/^#[0-9a-f]{6}$/i.test(profile.textColor) ||
    !['Noto Sans', 'Noto Serif'].includes(profile.fontFamily)
  )
    throw new Error('A name, two hex colors and a bundled font are required.');
}
class CreatorStyleService {
  private static instance: CreatorStyleService;
  static getInstance(): CreatorStyleService {
    return (this.instance ??= new CreatorStyleService());
  }
  async list(): Promise<CreatorStyleProfileV1[]> {
    return (await get<CreatorStyleProfileV1[]>(KEY)) ?? [];
  }
  async save(profile: CreatorStyleProfileV1): Promise<void> {
    validateCreatorStyle(profile);
    try {
      await update<CreatorStyleProfileV1[]>(KEY, (items) => [
        ...(items ?? []).filter((item) => item.id !== profile.id),
        structuredClone(profile),
      ]);
    } catch (error) {
      logger.error('Failed to save creator style', error);
      throw error;
    }
  }
}
export const creatorStyleService = CreatorStyleService.getInstance();
