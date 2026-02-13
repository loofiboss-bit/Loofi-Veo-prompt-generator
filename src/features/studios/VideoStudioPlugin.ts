import { PluginManifest, PluginContext } from '@core/types/plugin';

export const VideoStudioManifest: PluginManifest = {
    id: 'video-studio',
    name: 'Veo Video Studio',
    version: '1.0.0',
    description: 'Professional video generation using Google Veo',
    author: 'Loofi',
    permissions: ['ui:studio', 'storage'],
    hooks: {
        onActivate: 'activate',
        onDeactivate: 'deactivate'
    },
    main: 'index.ts',
};

export const VideoStudioInstance = {
    activate: async (context: PluginContext) => {
        const module = await import('./VideoGenerationStudio');

        context.api.ui.registerStudio({
            id: 'video',
            title: 'Video Studio',
            component: module.default,
            props: {} // Props are now handled internally via store
        });
    },
    deactivate: async () => {
        // Cleanup if necessary
    }
};
