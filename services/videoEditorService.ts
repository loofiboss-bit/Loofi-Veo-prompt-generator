
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

/**
 * Loads the FFmpeg WASM binary.
 * We use the CDN approach to keep the initial bundle size low.
 */
const loadFFmpeg = async (): Promise<FFmpeg> => {
    if (ffmpeg) {
        return ffmpeg;
    }

    ffmpeg = new FFmpeg();

    // Log FFmpeg messages to console for debugging
    ffmpeg.on('log', ({ message }) => {
        console.debug('FFmpeg:', message);
    });

    // Using unpkg CDN for the core files. 
    // Using version 0.12.6 which is stable for @ffmpeg/ffmpeg 0.12.x
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpeg;
};

/**
 * Stitches multiple video URLs into a single MP4 file.
 * Uses the FFmpeg 'concat' demuxer.
 * 
 * @param videoUrls Array of blob URLs or remote URLs to video files
 * @param outputName Desired name for the final file
 * @param onProgress Optional callback for progress updates
 * @returns ObjectURL of the stitched video
 */
export const stitchVideos = async (
    videoUrls: string[], 
    outputName: string = 'output.mp4',
    onProgress?: (msg: string) => void
): Promise<string> => {
    const instance = await loadFFmpeg();
    
    if (onProgress) onProgress("Loading video files...");

    // 1. Write files to MEMFS
    const inputNames: string[] = [];
    
    try {
        for (let i = 0; i < videoUrls.length; i++) {
            const name = `input_${i}.mp4`;
            inputNames.push(name);
            
            // fetchFile handles Blob URLs, Data URIs, and HTTP URLs
            const data = await fetchFile(videoUrls[i]);
            await instance.writeFile(name, data);
        }

        // 2. Create the concat list file
        // Format: file 'filename'
        const listContent = inputNames.map(name => `file '${name}'`).join('\n');
        await instance.writeFile('concat_list.txt', listContent);

        if (onProgress) onProgress("Stitching clips...");

        // 3. Run FFmpeg Concat Command
        // -f concat: Use concat demuxer
        // -safe 0: Allow unsafe file paths (required for virtual fs)
        // -i concat_list.txt: Input file list
        // -c copy: Stream copy (no re-encoding) - FAST & Lossless
        await instance.exec([
            '-f', 'concat', 
            '-safe', '0', 
            '-i', 'concat_list.txt', 
            '-c', 'copy', 
            outputName
        ]);

        if (onProgress) onProgress("Finalizing...");

        // 4. Read output and create Blob
        const data = await instance.readFile(outputName);
        const blob = new Blob([data], { type: 'video/mp4' });
        
        // 5. Cleanup MEMFS to free memory
        for (const name of inputNames) {
            try { await instance.deleteFile(name); } catch(e) {}
        }
        try { await instance.deleteFile('concat_list.txt'); } catch(e) {}
        try { await instance.deleteFile(outputName); } catch(e) {}

        return URL.createObjectURL(blob);

    } catch (error) {
        console.error("Stitching failed:", error);
        throw new Error("Failed to stitch videos. Ensure all clips are valid.");
    }
};
