import { PromptTemplate } from './types';

type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';

const templateData: { [key: string]: {
    name: { [lang in Language]: string };
    description: { [lang in Language]: string };
    icon: PromptTemplate['icon'];
    params: PromptTemplate['params'];
} } = {
    'cinematic-trailer': {
        name: { 
            en: 'Cinematic Movie Trailer', 
            sv: 'Filmisk Filmtrailer',
            es: 'Tráiler Cinematográfico',
            fr: 'Bande-annonce Cinématographique',
            de: 'Kinoreifer Filmtrailer'
        },
        description: { 
            en: 'Wide-screen, dramatic lighting, and epic feel. Perfect for a blockbuster look.', 
            sv: 'Widescreen, dramatisk ljussättning och episk känsla. Perfekt för en blockbuster-look.',
            es: 'Pantalla ancha, iluminación dramática y sensación épica. Perfecto para un look de superproducción.',
            fr: 'Grand écran, éclairage dramatique et ambiance épique. Parfait pour un look de blockbuster.',
            de: 'Breitbild, dramatische Beleuchtung und episches Gefühl. Perfekt für einen Blockbuster-Look.'
        },
        icon: 'palette',
        params: {
            artStyle: 'Cinematic',
            cameraDistance: 'Wide shot',
            visualEffect: 'Lens flare',
            colorPalette: 'Cool, blue tones',
            aspectRatio: '16:9',
            voiceStyle: 'Standard Narrator',
            ambientSound: 'Rain and Thunder',
            idea: 'An epic journey of a lone hero against a vast, intimidating landscape...',
        },
    },
    'viral-social-clip': {
        name: { 
            en: 'Viral Social Media Clip', 
            sv: 'Viralt Klipp för Sociala Medier',
            es: 'Clip Viral para Redes Sociales',
            fr: 'Clip Viral pour les Réseaux Sociaux',
            de: 'Virales Social-Media-Clip'
        },
        description: { 
            en: 'Vertical format, fast-paced, and eye-catching. Designed for maximum engagement.', 
            sv: 'Vertikalt format, högt tempo och iögonfallande. Designat för maximalt engagemang.',
            es: 'Formato vertical, ritmo rápido y llamativo. Diseñado para una máxima interacción.',
            fr: 'Format vertical, rythme rapide et accrocheur. Conçu pour un engagement maximal.',
            de: 'Vertikales Format, schnelles Tempo und auffällig. Entwickelt für maximales Engagement.'
        },
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
        name: { 
            en: 'Vintage Documentary', 
            sv: 'Vintage Dokumentär',
            es: 'Documental Vintage',
            fr: 'Documentaire Vintage',
            de: 'Vintage-Dokumentarfilm'
        },
        description: { 
            en: 'Archival look with a classic aspect ratio. Great for historical or nostalgic themes.', 
            sv: 'Arkivkänsla med klassiskt bildförhållande. Utmärkt för historiska eller nostalgiska teman.',
            es: 'Aspecto de archivo con una relación de aspecto clásica. Ideal para temas históricos o nostálgicos.',
            fr: 'Aspect d\'archive avec un ratio d\'aspect classique. Idéal pour les thèmes historiques ou nostalgiques.',
            de: 'Archiv-Look mit klassischem Seitenverhältnis. Ideal für historische oder nostalgische Themen.'
        },
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
        name: { 
            en: 'Animated Explainer', 
            sv: 'Animerad Förklaringsvideo',
            es: 'Video Explicativo Animado',
            fr: 'Vidéo Explicative Animée',
            de: 'Animiertes Erklärvideo'
        },
        description: { 
            en: 'Clean, simple animation with text overlays. Ideal for tutorials or product showcases.', 
            sv: 'Ren, enkel animation med textöverlagringar. Perfekt för guider eller produktpresentationer.',
            es: 'Animación limpia y sencilla con superposiciones de texto. Ideal para tutoriales o presentaciones de productos.',
            fr: 'Animation propre et simple avec des superpositions de texte. Idéal pour les tutoriels ou les présentations de produits.',
            de: 'Saubere, einfache Animation mit Texteinblendungen. Ideal für Tutorials oder Produktvorstellungen.'
        },
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
    'sora-2-emulation': {
        name: { 
            en: 'Sora 2 Emulation', 
            sv: 'Sora 2-emulering',
            es: 'Emulación de Sora 2',
            fr: 'Émulation Sora 2',
            de: 'Sora 2-Emulation'
        },
        description: { 
            en: 'Aims for hyper-realistic, narrative scenes with complex physics and camera work. Generates as a 3-part series by default.', 
            sv: 'Siktar på hyperrealistiska, narrativa scener med komplex fysik och kameraarbete. Genererar som en 3-delad serie som standard.',
            es: 'Busca escenas narrativas hiperrealistas con físicas complejas y trabajo de cámara. Genera como una serie de 3 partes por defecto.',
            fr: 'Vise des scènes narratives hyperréalistes avec une physique complexe et des mouvements de caméra. Génère par défaut une série en 3 parties.',
            de: 'Zielt auf hyperrealistische, narrative Szenen mit komplexer Physik und Kameraführung ab. Generiert standardmäßig als 3-teilige Serie.'
        },
        icon: 'magic',
        params: {
            artStyle: 'Photorealistic',
            cameraMovement: 'Drone shot, flying over',
            cameraDistance: 'Wide shot',
            lensType: 'Standard prime lens',
            visualEffect: 'None',
            colorPalette: 'Vibrant and saturated',
            aspectRatio: '16:9',
            motionIntensity: 'High',
            creativityLevel: 'Imaginative',
            generateAsSeries: true,
            idea: 'A golden retriever puppy playing in a field of flowers, with individual petals realistically interacting with its fur as it moves.',
            targetModel: 'sora',
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