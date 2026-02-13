import { PluginManifest, PluginContext } from '../../core/types/plugin';

export const ImageStudioManifest: PluginManifest = {
    id: 'veo-image-studio',
    name: 'Image Studio',
    version: '1.0.0',
    description: 'AI Image Generation Studio',
    author: 'Veo',
    main: 'virtual',
    permissions: ['ui:studio'],
    hooks: {
        onActivate: 'activate'
    }
};

export const ImageStudioInstance = {
    activate: async (context: PluginContext) => {
        // Dynamic import logic here
        // We import the component which is in the same directory (or adjust path)
        const module = await import('./ImageStudio');

        context.api.ui.registerStudio({
            id: 'image',
            title: 'Image Studio',
            component: module.default
        });
    }
};
