
import { VisualDNA, SharedVisualDNA } from '../types';

// Mock Database
let MOCK_COMMUNITY_DB: SharedVisualDNA[] = [
    {
        id: 'share_1',
        name: 'Cyber Noir 2049',
        author: 'NeonDreamer',
        likes: 128,
        timestamp: Date.now() - 10000000,
        styleParams: {
            artStyle: 'Cyberpunk',
            lightingStyle: 'Neon glow',
            colorPalette: 'Synthwave neon',
            cameraMovement: 'Tracking shot',
            visualEffect: 'Rain and Thunder'
        }
    },
    {
        id: 'share_2',
        name: 'Vintage Kodak',
        author: 'FilmBuff',
        likes: 85,
        timestamp: Date.now() - 5000000,
        styleParams: {
            artStyle: 'Vintage 1950s film',
            lightingStyle: 'Soft, diffused light',
            colorPalette: 'Sepia tone',
            visualEffect: '8mm film grain',
            aspectRatio: '4:3'
        }
    },
    {
        id: 'share_3',
        name: 'Ghibli Hills',
        author: 'AnimeLover',
        likes: 240,
        timestamp: Date.now() - 2000000,
        styleParams: {
            artStyle: 'Ghibli Style',
            lightingStyle: 'High-key',
            colorPalette: 'Pastel colors',
            cameraMovement: 'Panning shot',
            visualEffect: 'Dream-like haze'
        }
    },
    {
        id: 'share_4',
        name: 'Wes Anderson',
        author: 'SymmetryKing',
        likes: 312,
        timestamp: Date.now() - 1000000,
        styleParams: {
            artStyle: 'Cinematic',
            customArtStyle: 'Wes Anderson Symmetrical',
            colorPalette: 'Pastel colors',
            compositionalGuide: 'Symmetry',
            cameraMovement: 'Static shot'
        }
    }
];

// Simulate API Latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchCommunityDNAs = async (): Promise<SharedVisualDNA[]> => {
    await delay(600); // Fake latency
    return [...MOCK_COMMUNITY_DB].sort((a, b) => b.likes - a.likes);
};

export const publishDNA = async (dna: VisualDNA, author: string): Promise<void> => {
    await delay(800);
    const newShare: SharedVisualDNA = {
        id: `share_${Date.now()}`,
        name: dna.name,
        author: author || 'Anonymous',
        styleParams: dna.styleParams,
        likes: 0,
        timestamp: Date.now()
    };
    MOCK_COMMUNITY_DB.unshift(newShare);
};

export const likeDNA = async (id: string): Promise<number> => {
    await delay(300);
    const item = MOCK_COMMUNITY_DB.find(d => d.id === id);
    if (item) {
        item.likes += 1;
        return item.likes;
    }
    return 0;
};
