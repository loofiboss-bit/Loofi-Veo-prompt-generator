import { pluginService } from '@core/services/pluginService';
import { logger } from '@core/services/loggerService';

export const registerInternalPlugins = async () => {
  try {
    const [imagePlugin, audioPlugin, videoPlugin] = await Promise.all([
      import('@features/studios/ImageStudioPlugin'),
      import('@features/studios/AudioStudioPlugin'),
      import('@features/studios/VideoStudioPlugin'),
    ]);

    await pluginService.registerInternalPlugin(
      imagePlugin.ImageStudioManifest,
      imagePlugin.ImageStudioInstance,
    );
    await pluginService.registerInternalPlugin(
      audioPlugin.AudioStudioManifest,
      audioPlugin.AudioStudioInstance,
    );
    await pluginService.registerInternalPlugin(
      videoPlugin.VideoStudioManifest,
      videoPlugin.VideoStudioInstance,
    );
    logger.info('[InternalPlugins] Registration complete');
  } catch (error) {
    logger.error('[InternalPlugins] Failed to register internal plugins:', error);
  }
};
