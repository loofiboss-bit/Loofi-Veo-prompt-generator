
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

const loadFFmpeg = async (): Promise<FFmpeg> => {
    if (ffmpeg) {
        return ffmpeg;
    }

    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => console.debug('FFmpeg Proxy:', message));

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpeg;
};

/**
 * Generates a low-resolution proxy video for performance editing.
 * Target: 360p height, ultrafast preset, low CRF, AAC audio.
 * 
 * @param originalFile The source video Blob or File.
 * @returns Promise<string> Blob URL of the proxy video.
 */
export const generateProxy = async (originalFile: Blob | File): Promise<string> => {
    const instance = await loadFFmpeg();
    const inputName = `input_${Date.now()}.mp4`;
    const outputName = `proxy_${Date.now()}.mp4`;

    try {
        const data = await fetchFile(originalFile);
        await instance.writeFile(inputName, data);

        // Command details:
        // -vf scale=-2:360 : Scale height to 360px, width auto-calc (even number)
        // -c:v libx264 : H.264 video codec
        // -profile:v baseline : Compatibility profile
        // -preset ultrafast : Fastest encoding speed
        // -crf 35 : High compression (lower visual quality, smaller size)
        // -c:a aac -b:a 96k : AAC audio at reduced bitrate
        // -r 24 : Enforce 24fps for consistency in editor
        
        await instance.exec([
            '-i', inputName,
            '-vf', 'scale=-2:360',
            '-c:v', 'libx264',
            '-profile:v', 'baseline',
            '-preset', 'ultrafast',
            '-crf', '35',
            '-c:a', 'aac',
            '-b:a', '96k',
            '-r', '24',
            outputName
        ]);

        const outData = await instance.readFile(outputName);
        const blob = new Blob([outData as unknown as BlobPart], { type: 'video/mp4' });
        
        return URL.createObjectURL(blob);

    } catch (error) {
        console.error("Smart Proxy Generation failed:", error);
        // Fallback: If proxy gen fails, we return the original URL so the app doesn't break,
        // but performance won't improve.
        return URL.createObjectURL(originalFile);
    } finally {
        // Cleanup memory filesystem
        try { await instance.deleteFile(inputName); } catch (e) {}
        try { await instance.deleteFile(outputName); } catch (e) {}
    }
};
