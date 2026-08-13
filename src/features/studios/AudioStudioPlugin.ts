import { useEffect } from 'react';
import type { PluginManifest, PluginContext, StudioPlugin } from '@core/types/plugin';

interface LegacySunoEntryProps {
  onClose?: () => void;
}

/** Keep the plugin id/deep-link alive while routing the old modal entry point into Studio. */
const LegacySunoEntry = ({ onClose }: LegacySunoEntryProps) => {
  useEffect(() => {
    onClose?.();
    window.location.hash = '#/studio?mode=music';
  }, [onClose]);
  return null;
};

export const AudioStudioManifest: PluginManifest = {
  id: 'veo-audio-studio',
  name: 'Audio Studio',
  version: '1.0.0',
  description: 'AI Music Generation Studio (Suno)',
  author: 'Veo',
  main: 'virtual',
  permissions: ['ui:studio'],
  hooks: {
    onActivate: 'activate',
  },
};

export const AudioStudioInstance: StudioPlugin = {
  activate: async (context: PluginContext) => {
    context.api.ui.registerStudio({
      id: 'suno',
      title: 'Suno Audio Studio',
      component: LegacySunoEntry,
    });
  },
};
