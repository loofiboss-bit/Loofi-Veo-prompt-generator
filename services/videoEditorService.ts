
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { VideoFilters } from '../types';

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
 * Stitches multiple video/audio clips into a single MP4 file.
 * Applies optional global video filters (contrast, saturation, grain, sepia).
 * 
 * @param clips Array of objects containing videoUrl, optional audioUrl, and audioVolume
 * @param outputName Desired name for the final file
 * @param onProgress Optional callback for progress updates
 * @param filters Optional global video filters to apply
 * @returns ObjectURL of the stitched video
 */
export const stitchVideos = async (
    clips: { videoUrl: string; audioUrl?: string; audioVolume?: number }[], 
    outputName: string = 'output.mp4',
    onProgress?: (msg: string) => void,
    filters?: VideoFilters
): Promise<string> => {
    const instance = await loadFFmpeg();
    
    if (onProgress) onProgress("Loading media files...");

    // Intermediate file names for the concat list
    const finalSegments: string[] = [];
    
    try {
        // 1. Prepare Segments (Audio Mixing)
        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            const vidName = `raw_vid_${i}.mp4`;
            const audName = `raw_aud_${i}.wav`;
            const segmentName = `segment_${i}.mp4`;

            // Write Video
            const vidData = await fetchFile(clip.videoUrl);
            await instance.writeFile(vidName, vidData);

            if (clip.audioUrl) {
                // If audio exists, merge it with video into a temp segment
                if (onProgress) onProgress(`Mixing audio for shot ${i + 1}...`);
                const audData = await fetchFile(clip.audioUrl);
                await instance.writeFile(audName, audData);

                // Merge: Copy video stream, encode audio to AAC, shorten to shortest stream (video usually)
                // Use volume filter for audio
                const volume = clip.audioVolume !== undefined ? clip.audioVolume : 1.0;
                
                await instance.exec([
                    '-i', vidName,
                    '-i', audName,
                    '-c:v', 'copy',
                    '-filter:a', `volume=${volume}`,
                    '-c:a', 'aac',
                    '-map', '0:v:0',
                    '-map', '1:a:0',
                    '-shortest',
                    segmentName
                ]);
                
                // Clean up raw inputs to save memory
                await instance.deleteFile(vidName);
                await instance.deleteFile(audName);
                
                finalSegments.push(segmentName);
            } else {
                finalSegments.push(vidName); 
            }
        }

        // 2. Create the concat list file
        const listContent = finalSegments.map(name => `file '${name}'`).join('\n');
        await instance.writeFile('concat_list.txt', listContent);

        // 3. Concat and Filter
        const tempJoined = 'temp_joined.mp4';
        
        // If filters are active, we must re-encode. If not, we can stream copy.
        const hasFilters = filters && (
            filters.contrast !== 100 || 
            filters.saturation !== 100 || 
            filters.sepia > 0 || 
            filters.grain > 0
        );

        if (hasFilters) {
            // A. Concat First (Stream Copy) to intermediate
            if (onProgress) onProgress("Stitching clips (pass 1)...");
            await instance.exec([
                '-f', 'concat', 
                '-safe', '0', 
                '-i', 'concat_list.txt', 
                '-c', 'copy', 
                tempJoined
            ]);

            // B. Build Filter Chain
            const filterChainParts = [];
            
            // EQ Filter (Contrast/Saturation)
            // FFmpeg values are 1.0 based. UI is 100 based.
            if (filters.contrast !== 100 || filters.saturation !== 100) {
                const c = (filters.contrast / 100).toFixed(2);
                const s = (filters.saturation / 100).toFixed(2);
                filterChainParts.push(`eq=contrast=${c}:saturation=${s}`);
            }

            // Sepia Filter (Color Channel Mixer)
            // Standard Sepia Matrix:
            // R = tr*r + tg*g + tb*b
            // Identity: 1 0 0 / 0 1 0 / 0 0 1
            // Sepia: .393 .769 .189 / .349 .686 .168 / .272 .534 .131
            // We interpolate based on strength (0-1)
            if (filters.sepia > 0) {
                const strength = Math.min(1, Math.max(0, filters.sepia / 100));
                const inv = 1 - strength;
                
                const rr = (0.393 * strength + 1 * inv).toFixed(3);
                const rg = (0.769 * strength).toFixed(3);
                const rb = (0.189 * strength).toFixed(3);
                
                const gr = (0.349 * strength).toFixed(3);
                const gg = (0.686 * strength + 1 * inv).toFixed(3);
                const gb = (0.168 * strength).toFixed(3);
                
                const br = (0.272 * strength).toFixed(3);
                const bg = (0.534 * strength).toFixed(3);
                const bb = (0.131 * strength + 1 * inv).toFixed(3);

                filterChainParts.push(`colorchannelmixer=${rr}:${rg}:${rb}:0:${gr}:${gg}:${gb}:0:${br}:${bg}:${bb}`);
            }

            // Noise Filter (Grain)
            if (filters.grain > 0) {
                // alls = intensity (0-100), allf = 't+u' (temporal + uniform noise)
                const g = Math.min(100, Math.max(0, filters.grain));
                filterChainParts.push(`noise=alls=${g}:allf=t+u`);
            }

            const filterString = filterChainParts.join(',');

            // C. Apply Filters (Re-encode)
            if (onProgress) onProgress("Applying color grading (slow)...");
            
            // Note: -preset ultrafast helps with speed in browser WASM
            await instance.exec([
                '-i', tempJoined,
                '-vf', filterString,
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-c:a', 'copy', // Copy audio from temp joined
                outputName
            ]);

            // Cleanup intermediate
            try { await instance.deleteFile(tempJoined); } catch(e) {}

        } else {
            // Fast Path: Just Concat
            if (onProgress) onProgress("Stitching clips...");
            await instance.exec([
                '-f', 'concat', 
                '-safe', '0', 
                '-i', 'concat_list.txt', 
                '-c', 'copy', 
                outputName
            ]);
        }

        if (onProgress) onProgress("Finalizing...");

        // 4. Read output and create Blob
        const data = await instance.readFile(outputName);
        const blob = new Blob([data], { type: 'video/mp4' });
        
        // 5. Cleanup MEMFS
        for (const name of finalSegments) {
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
