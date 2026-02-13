import { PluginManifest, PluginContext } from '../../core/types/plugin';

export const AudioStudioManifest: PluginManifest = {
    id: 'veo-audio-studio',
    name: 'Audio Studio',
    version: '1.0.0',
    description: 'AI Music Generation Studio (Suno)',
    author: 'Veo',
    main: 'virtual',
    permissions: ['ui:studio'],
    hooks: {
        onActivate: 'activate'
    }
};

export const AudioStudioInstance = {
    activate: async (context: PluginContext) => {
        const module = await import('./SunoSongStudio');

        context.api.ui.registerStudio({
            id: 'suno', // ID must match what app expects for now
            title: 'Suno Audio Studio',
            component: module.default
        });
    }
};
