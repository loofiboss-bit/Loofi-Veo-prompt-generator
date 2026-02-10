
import { StockAsset } from '@core/types';

// Mock Data for Videos (Pexels-style structure)
const MOCK_VIDEOS: StockAsset[] = [
    {
        id: 'vid_1',
        type: 'video',
        title: 'Aerial City Night',
        author: 'Tom Fisk',
        duration: 15,
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', // Placeholder reliable video
        thumbnailUrl: 'https://images.pexels.com/videos/3195640/free-video-3195640.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500'
    },
    {
        id: 'vid_2',
        type: 'video',
        title: 'Forest Stream',
        author: 'Kelly Lacy',
        duration: 10,
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://images.pexels.com/videos/5737839/pexels-photo-5737839.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500'
    },
    {
        id: 'vid_3',
        type: 'video',
        title: 'Busy Office Timelapse',
        author: 'Pressmaster',
        duration: 8,
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://images.pexels.com/videos/855018/free-video-855018.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500'
    },
    {
        id: 'vid_4',
        type: 'video',
        title: 'Ocean Waves Slow Mo',
        author: 'Kindel Media',
        duration: 12,
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnailUrl: 'https://images.pexels.com/videos/4782135/pexels-photo-4782135.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500'
    },
    {
        id: 'vid_5',
        type: 'video',
        title: 'Cyberpunk Neon Street',
        author: 'Aleksandar Pasaric',
        duration: 6,
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        thumbnailUrl: 'https://images.pexels.com/videos/2603664/free-video-2603664.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500'
    },
    {
        id: 'vid_6',
        type: 'video',
        title: 'Coffee Pouring',
        author: 'Chevanon',
        duration: 5,
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        thumbnailUrl: 'https://images.pexels.com/videos/3053785/free-video-3053785.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500'
    }
];

// Mock Data for Audio
const MOCK_AUDIO: StockAsset[] = [
    {
        id: 'aud_1',
        type: 'audio',
        title: 'Cinematic Suspense',
        author: 'SoundBay',
        duration: 30,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    },
    {
        id: 'aud_2',
        type: 'audio',
        title: 'Upbeat Corporate',
        author: 'MusicStart',
        duration: 60,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    },
    {
        id: 'aud_3',
        type: 'audio',
        title: 'Ambient Nature',
        author: 'RelaxSounds',
        duration: 45,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const searchStockVideo = async (query: string): Promise<StockAsset[]> => {
    await delay(500); // Simulate network latency
    const q = query.toLowerCase();
    // Filter mock data based on query matching title or author
    return MOCK_VIDEOS.filter(v => 
        !q || v.title.toLowerCase().includes(q) || v.author.toLowerCase().includes(q)
    );
};

export const searchStockAudio = async (query: string): Promise<StockAsset[]> => {
    await delay(500);
    const q = query.toLowerCase();
    return MOCK_AUDIO.filter(a => 
        !q || a.title.toLowerCase().includes(q) || a.author.toLowerCase().includes(q)
    );
};
