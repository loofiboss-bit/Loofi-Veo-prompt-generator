import type { PluginManifest, PluginContext, StudioPlugin } from '@core/types/plugin';

export const ImageStudioManifest: PluginManifest = {
  id: 'veo-image-studio',
  name: 'Image Studio',
  version: '1.0.0',
  description: 'AI Image Generation Studio',
  author: 'Veo',
  main: 'virtual',
  permissions: ['ui:studio'],
  hooks: {
    onActivate: 'activate',
  },
};

export const ImageStudioInstance: StudioPlugin = {
  activate: async (context: PluginContext) => {
    const module = await import('./ImageStudio');

    context.api.ui.registerStudio({
      id: 'image',
      title: 'Image Studio',
      component: module.default,
    });
  },
};
