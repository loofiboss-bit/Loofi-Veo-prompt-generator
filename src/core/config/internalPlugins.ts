import { pluginService } from '@core/services/pluginService';
import { ImageStudioManifest, ImageStudioInstance } from '@features/studios/ImageStudioPlugin';
import { AudioStudioManifest, AudioStudioInstance } from '@features/studios/AudioStudioPlugin';
import { VideoStudioManifest, VideoStudioInstance } from '@features/studios/VideoStudioPlugin';

export const registerInternalPlugins = async () => {
  try {
    await pluginService.registerInternalPlugin(ImageStudioManifest, ImageStudioInstance);
    await pluginService.registerInternalPlugin(AudioStudioManifest, AudioStudioInstance);
    await pluginService.registerInternalPlugin(VideoStudioManifest, VideoStudioInstance);
    console.log('[InternalPlugins] Registration complete');
  } catch (error) {
    console.error('[InternalPlugins] Failed to register internal plugins:', error);
  }
};
