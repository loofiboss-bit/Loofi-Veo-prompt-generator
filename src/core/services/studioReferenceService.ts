import type { Asset } from '@core/types';
import { mediaAssetService } from './mediaAssetService';

class StudioReferenceService {
  private static instance: StudioReferenceService;
  static getInstance() {
    return (this.instance ??= new StudioReferenceService());
  }

  async importImage(file: File, projectId: string): Promise<Asset> {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
      throw new Error('Choose a PNG, JPEG or WebP image.');
    if (!file.size || file.size > 20 * 1024 * 1024)
      throw new Error('Images must be between 1 byte and 20 MB.');
    const id = crypto.randomUUID();
    const key = 'studio:' + projectId + ':' + id;
    await mediaAssetService.storeBlob(key, file);
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('The image could not be read.'));
      reader.readAsDataURL(file);
    });
    return {
      id,
      name: file.name,
      type: 'image',
      mimeType: file.type,
      data,
      storageKey: key,
      url: (await mediaAssetService.getObjectUrl(key)) ?? '',
      groupId: projectId,
    };
  }
}

export const studioReferenceService = StudioReferenceService.getInstance();
