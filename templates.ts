import { PromptTemplate } from './types';

type Language = 'en' | 'sv';

const templateData: { [key: string]: {
    name: { [lang in Language]: string };
    description: { [lang in Language]: string };
    icon: PromptTemplate['icon'];
    params: PromptTemplate['params'];
} } = {
    'cinematic-trailer': {
        name: { en: 'Cinematic Movie Trailer', sv: 'Filmisk Filmtrailer' },
        description: { en: 'Wide-screen, dramatic lighting, and epic feel. Perfect for a blockbuster look.', sv: 'Widescreen, dramatisk ljussättning och episk känsla. Perfekt för en blockbuster-look.' },
        icon: 'palette',
        params: {
            artStyle: 'Cinematic',
            cameraDistance: 'Wide shot',
            visualEffect: 'Lens flare',
            colorPalette: 'Cool, blue tones',
            aspectRatio: '2.35:1',
            voiceStyle: 'Standard Narrator',
            ambientSound: 'Rain and Thunder',
            idea: 'An epic journey of a lone hero against a vast, intimidating landscape...',
        },
    },
    'viral-social-clip': {
        name: { en: 'Viral Social Media Clip', sv: 'Viralt Klipp för Sociala Medier' },
        description: { en: 'Vertical format, fast-paced, and eye-catching. Designed for maximum engagement.', sv: 'Vertikalt format, högt tempo och iögonfallande. Designat för maximalt engagemang.' },
        icon: 'globe',
        params: {
            artStyle: 'Gorilla Viral Style',
            cameraMovement: 'First-person POV',
            visualEffect: 'Glitch effect',
            colorPalette: 'Vibrant and saturated',
            aspectRatio: '9:16',
            voiceStyle: 'High-Energy Announcer',
            optimizeFor8Seconds: true,
            idea: 'A surprising or funny moment captured from a first-person perspective...',
        },
    },
    'vintage-documentary': {
        name: { en: 'Vintage Documentary', sv: 'Vintage Dokumentär' },
        description: { en: 'Archival look with a classic aspect ratio. Great for historical or nostalgic themes.', sv: 'Arkivkänsla med klassiskt bildförhållande. Utmärkt för historiska eller nostalgiska teman.' },
        icon: 'history',
        params: {
            artStyle: 'Vintage 1950s film',
            cameraMovement: 'Tracking shot',
            visualEffect: 'None',
            colorPalette: 'Sepia tone',
            aspectRatio: '4:3',
            voiceStyle: 'Documentary Narrator',
            idea: 'A look back at a pivotal moment in history, with grainy footage and a sense of authenticity...',
        },
    },
    'animated-explainer': {
        name: { en: 'Animated Explainer', sv: 'Animerad Förklaringsvideo' },
        description: { en: 'Clean, simple animation with text overlays. Ideal for tutorials or product showcases.', sv: 'Ren, enkel animation med textöverlagringar. Perfekt för guider eller produktpresentationer.' },
        icon: 'magic',
        params: {
            artStyle: 'Anime',
            cameraDistance: 'Wide shot',
            visualEffect: 'None',
            colorPalette: 'Vibrant and saturated',
            aspectRatio: '16:9',
            voiceStyle: 'AI Assistant Voice',
            includeOverlayText: true,
            idea: 'A simple animation explaining a complex topic with clear visuals and text...',
        },
    },
};

export const getPromptTemplates = (lang: Language): PromptTemplate[] => {
    return Object.keys(templateData).map(key => {
        const template = templateData[key];
        return {
            id: key,
            name: template.name[lang],
            description: template.description[lang],
            icon: template.icon,
            params: template.params,
        };
    });
};