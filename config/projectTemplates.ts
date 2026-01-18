
import { PromptState, IconName } from '../types';
import { INITIAL_STATE } from '../constants';
import { StudioType } from '../hooks/useStudios';

export interface ProjectTemplate {
    id: string;
    label: string;
    description: string;
    icon: IconName;
    gradient: string;
    settings: Partial<PromptState>;
    autoOpen?: StudioType;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
    {
        id: 'cinema',
        label: 'Cinematic Movie',
        description: 'Story-driven workflow. Wide aspect ratio, 24fps aesthetics, and storyboard focus.',
        icon: 'film',
        gradient: 'from-amber-600 to-orange-600',
        settings: {
            ...INITIAL_STATE,
            aspectRatio: '16:9',
            artStyle: 'Cinematic',
            veoModel: 'quality', // Prioritize quality over speed
            targetModel: 'veo',
            lightingStyle: 'Low-key', // Dramatic lighting
            audioMix: { voice: 1.0, ambient: 0.5, sfx: 0.8 }
        },
        autoOpen: 'story' // Open Storyboard
    },
    {
        id: 'music_video',
        label: 'Music Video',
        description: 'Audio-reactive visuals. Starts with AI song generation and visualizer setup.',
        icon: 'music',
        gradient: 'from-fuchsia-600 to-purple-600',
        settings: {
            ...INITIAL_STATE,
            aspectRatio: '16:9',
            artStyle: 'Abstract', // Good for visualizers
            visualEffect: 'Neon glow',
            veoModel: 'fast', // Fast for syncing multiple clips
            audioMix: { voice: 0, ambient: 0, sfx: 0 } // Music dominant
        },
        autoOpen: 'suno' // Open Suno Studio
    },
    {
        id: 'social_vertical',
        label: 'Social / TikTok',
        description: 'Viral formatting. 9:16 vertical video, fast pacing, and engagement focus.',
        icon: 'smartphone',
        gradient: 'from-cyan-500 to-blue-500',
        settings: {
            ...INITIAL_STATE,
            aspectRatio: '9:16',
            artStyle: 'Photorealistic',
            optimizeFor8Seconds: true, // Shorter loops
            motionIntensity: 'High',
            includeOverlayText: true, // Captions usually needed
            veoModel: 'fast'
        },
        // No auto-open, goes to prompt builder for idea
    },
    {
        id: 'sora_physics',
        label: 'Physics Simulation',
        description: 'Leverage OpenAI Sora for complex physics, fluid dynamics, and realism.',
        icon: 'globe',
        gradient: 'from-emerald-500 to-teal-600',
        settings: {
            ...INITIAL_STATE,
            targetModel: 'sora',
            artStyle: 'Photorealistic',
            creativityLevel: 'Grounded', // Physics needs grounding
            aspectRatio: '16:9'
        },
        autoOpen: 'compare' // Open Comparison tool to fine-tune physics prompt
    }
];
