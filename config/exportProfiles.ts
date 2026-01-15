
export interface ExportProfile {
    id: string;
    label: string;
    description: string;
    container: string; // e.g., 'mp4', 'mov'
    videoCodec: string; // e.g., 'libx264'
    audioCodec?: string; // e.g., 'aac'
    args: string[]; // Extra ffmpeg arguments
    mimeType: string;
    estimatedBitrateMbps: number; // For size calculation
}

export const EXPORT_PROFILES: ExportProfile[] = [
    {
        id: 'social_h264',
        label: 'Social Media (H.264)',
        description: 'Optimized for Instagram, TikTok, and YouTube. Good balance of size and quality.',
        container: 'mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        args: ['-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'],
        mimeType: 'video/mp4',
        estimatedBitrateMbps: 8
    },
    {
        id: 'master_prores',
        label: 'Master (ProRes 422 HQ)',
        description: 'Production standard for editing in DaVinci Resolve or Premiere. Large file size.',
        container: 'mov',
        videoCodec: 'prores_ks',
        audioCodec: 'pcm_s16le',
        // profile:3 = HQ, vendor apl0 = Apple compatibility bits
        args: ['-profile:v', '3', '-vendor', 'apl0', '-bits_per_mb', '8000', '-pix_fmt', 'yuv422p10le'],
        mimeType: 'video/quicktime',
        estimatedBitrateMbps: 180
    },
    {
        id: 'web_vp9',
        label: 'Web Optimized (VP9)',
        description: 'High efficiency for web embedding. Smaller than H.264.',
        container: 'webm',
        videoCodec: 'libvpx-vp9',
        audioCodec: 'libopus',
        args: ['-b:v', '0', '-crf', '30', '-row-mt', '1'],
        mimeType: 'video/webm',
        estimatedBitrateMbps: 4
    },
    {
        id: 'gif_hq',
        label: 'Animated GIF (High Quality)',
        description: 'Looping animation. No audio. Max 15fps.',
        container: 'gif',
        videoCodec: 'gif',
        audioCodec: undefined,
        // Specialized filter graph is handled in service, these are output args
        args: [], 
        mimeType: 'image/gif',
        estimatedBitrateMbps: 5
    }
];
