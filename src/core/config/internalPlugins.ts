import { pluginService } from '@core/services/pluginService';
import { logger } from '@core/services/loggerService';
import { ImageStudioManifest, ImageStudioInstance } from '@features/studios/ImageStudioPlugin';
import { AudioStudioManifest, AudioStudioInstance } from '@features/studios/AudioStudioPlugin';
import { VideoStudioManifest, VideoStudioInstance } from '@features/studios/VideoStudioPlugin';

export const registerInternalPlugins = async () => {
  try {
    await pluginService.registerInternalPlugin(ImageStudioManifest, ImageStudioInstance);
    await pluginService.registerInternalPlugin(AudioStudioManifest, AudioStudioInstance);
    await pluginService.registerInternalPlugin(VideoStudioManifest, VideoStudioInstance);
    logger.info('[InternalPlugins] Registration complete');
  } catch (error) {
    logger.error('[InternalPlugins] Failed to register internal plugins:', error);
  }
};
