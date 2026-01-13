


import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { VideoFilters, TransitionType, CropConfig } from '../types';

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

// Helper to ensure font is loaded for subtitles
const loadFont = async (instance: FFmpeg) => {
    try {
        // Check if font already exists
        try {
            await instance.readFile('font.ttf');
            return;
        } catch (e) {
            // File doesn't exist, proceed to load
        }

        // Fetch a standard font (Roboto) from a reliable CDN
        const fontUrl = 'https://cdn.jsdelivr.net/gh/webfontkit/roboto/src/hinted/Roboto-Regular.ttf';
        const fontData = await fetchFile(fontUrl);
        await instance.writeFile('font.ttf', fontData);
    } catch (e) {
        console.warn("Failed to load subtitle font", e);
    }
};

// Helper to get duration of a blob video
const getVideoDuration = (blobUrl: string): Promise<number> => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = blobUrl;
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            const dur = video.duration;
            video.remove();
            resolve(dur);
        };
        video.onerror = () => {
            resolve(5); // Fallback to 5s if fail
        };
    });
};

/**
 * Stitches multiple video/audio clips into a single MP4 file.
 * Supports transitions (cut, crossfade, wipe) via complex filter graphs.
 * Also supports audio ducking if background music is provided.
 */
export const stitchVideos = async (
    clips: { 
        videoUrl: string; 
        audioUrl?: string; 
        audioVolume?: number; 
        dialogueText?: string;
        transitionToNext?: TransitionType; // Transition to occur AFTER this clip
    }[], 
    outputName: string = 'output.mp4',
    onProgress?: (msg: string) => void,
    filters?: VideoFilters,
    cropConfig?: CropConfig,
    backgroundMusicUrl?: string | null
): Promise<string> => {
    const instance = await loadFFmpeg();
    
    // Load font if any clip has dialogue
    const hasSubtitles = clips.some(c => c.dialogueText);
    if (hasSubtitles) {
        if (onProgress) onProgress("Loading fonts...");
        await loadFont(instance);
    }
    
    if (onProgress) onProgress("Loading media files...");

    // 1. Prepare Intermediate Clips (Scale + Subtitles + FPS Normalization + Audio Norm)
    // We need uniform streams for complex filters
    const processedClips: { name: string; duration: number; hasAudio: boolean; transition: TransitionType }[] = [];
    
    const TARGET_WIDTH = cropConfig ? 1080 : 1920;
    const TARGET_HEIGHT = cropConfig ? 1920 : 1080;
    
    try {
        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            const rawVidName = `raw_${i}.mp4`;
            const rawAudName = `raw_aud_${i}.wav`;
            const cleanName = `clean_${i}.mp4`;

            // Load Video
            const vidData = await fetchFile(clip.videoUrl);
            await instance.writeFile(rawVidName, vidData);
            
            // Get Duration (Critical for xfade offset)
            const duration = await getVideoDuration(clip.videoUrl);

            // Handle Audio
            let hasAudio = false;
            if (clip.audioUrl) {
                const audData = await fetchFile(clip.audioUrl);
                await instance.writeFile(rawAudName, audData);
                hasAudio = true;
            }

            // Normalization Filter Chain
            const filterParts = [];
            
            if (cropConfig) {
                const cropW = 608;
                const cropH = 1080;
                const maxOffsetX = 1920 - cropW;
                const offsetX = Math.floor(cropConfig.xPercentage * maxOffsetX);
                
                filterParts.push(`crop=${cropW}:${cropH}:${offsetX}:0`);
                filterParts.push(`scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:flags=lanczos`);
            } else {
                filterParts.push(`scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=decrease,pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2`);
            }
            
            filterParts.push('setsar=1,fps=24');
            
            if (clip.dialogueText) {
                const safeText = clip.dialogueText.replace(/'/g, "\\'").replace(/:/g, "\\:");
                const fontSize = cropConfig ? 80 : 48;
                const yPos = cropConfig ? 'h-th-200' : 'h-th-50'; 
                filterParts.push(`drawtext=fontfile=font.ttf:text='${safeText}':fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=${yPos}:borderw=3:bordercolor=black`);
            }

            const cmd = ['-i', rawVidName];
            
            // If audio exists, use it. If not, generate silent audio to keep stream count consistent
            // This is crucial for the complex filter graph later which expects [n:a] for every input
            if (hasAudio) {
                cmd.push('-i', rawAudName);
            } else {
                cmd.push('-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`);
            }
            
            cmd.push('-vf', filterParts.join(','));
            
            // Audio Filtering (Normalize if exists, or trim silence to video length)
            // We use -map to explicitly map the processed video and the correct audio source
            if (hasAudio) {
                const volume = clip.audioVolume !== undefined ? clip.audioVolume : 1.0;
                cmd.push('-filter:a', `volume=${volume},aresample=44100`); 
            } else {
                // Trim silence to video duration
                cmd.push('-filter:a', `atrim=duration=${duration},aresample=44100`);
            }

            cmd.push('-c:v', 'libx264', '-preset', 'ultrafast');
            cmd.push('-c:a', 'aac');
            cmd.push(cleanName);
            
            if (onProgress) onProgress(`Pre-processing Shot ${i + 1}/${clips.length}...`);
            await instance.exec(cmd);
            
            // Cleanup raw
            await instance.deleteFile(rawVidName);
            if (hasAudio) await instance.deleteFile(rawAudName);

            processedClips.push({
                name: cleanName,
                duration: duration,
                hasAudio: true, // We forced audio presence
                transition: clip.transitionToNext || 'cut'
            });
        }

        // Handle Background Music Loading
        let musicFileName = 'bg_music.mp3';
        if (backgroundMusicUrl) {
            const musicData = await fetchFile(backgroundMusicUrl);
            await instance.writeFile(musicFileName, musicData);
        }

        // 2. Build Complex Filter Graph
        if (onProgress) onProgress("Compositing transitions & audio mix...");

        const inputArgs: string[] = [];
        processedClips.forEach(c => inputArgs.push('-i', c.name));
        
        // Add music as the last input if present
        const musicIndex = processedClips.length;
        if (backgroundMusicUrl) {
            inputArgs.push('-i', musicFileName);
        }

        const filterGraph: string[] = [];
        let offset = 0;
        const transDuration = 1.0; 

        // Video Chain
        let vPrev = `[0:v]`;
        let aPrev = `[0:a]`;
        
        // Loop through clips to chain transitions
        for (let i = 0; i < processedClips.length - 1; i++) {
            const nextClip = processedClips[i+1];
            const currentClip = processedClips[i];
            const transType = currentClip.transition;
            
            offset += currentClip.duration - (transType === 'cut' ? 0 : transDuration);
            
            const nextLabelV = `v${i+1}`;
            const nextLabelA = `a${i+1}`;
            
            let method = 'fade'; 
            if (transType === 'wipe_left') method = 'wipeleft';
            if (transType === 'fade_black') method = 'circleclose';

            const actualTransDur = transType === 'cut' ? 0.1 : transDuration;
            
            // Video Transition
            filterGraph.push(`${vPrev}[${i+1}:v]xfade=transition=${method}:duration=${actualTransDur}:offset=${offset}[${nextLabelV}];`);
            vPrev = `[${nextLabelV}]`;

            // Audio Transition (using acrossfade to match xfade logic roughly)
            // acrossfade doesn't take 'offset', it just overlaps the ends.
            // Since we pre-processed clips to exact durations, simple chaining works.
            filterGraph.push(`${aPrev}[${i+1}:a]acrossfade=d=${actualTransDur}:c1=tri:c2=tri[${nextLabelA}];`);
            aPrev = `[${nextLabelA}]`;
        }

        // Add Global Filters (Color Grading)
        let finalV = vPrev;
        const hasFilters = filters && (filters.contrast !== 100 || filters.saturation !== 100 || filters.sepia > 0 || filters.grain > 0);
        
        if (hasFilters) {
            const filterChainParts = [];
            if (filters!.contrast !== 100 || filters!.saturation !== 100) {
                filterChainParts.push(`eq=contrast=${(filters!.contrast/100).toFixed(2)}:saturation=${(filters!.saturation/100).toFixed(2)}`);
            }
            if (filters!.sepia > 0) filterChainParts.push(`colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`);
            if (filters!.grain > 0) filterChainParts.push(`noise=alls=${filters!.grain}:allf=t+u`);
            
            if (filterChainParts.length > 0) {
                filterGraph.push(`${vPrev}${filterChainParts.join(',')}[v_final];`);
                finalV = `[v_final]`;
            }
        }

        // Final Audio Mixing with Ducking
        let finalA = aPrev;
        if (backgroundMusicUrl) {
            // Logic:
            // 1. Loop the music to match video duration (optional, here we assume music is long enough or just plays once)
            // 2. Use sidechaincompress. 
            //    [music] [voice] sidechaincompress [ducked_music]
            //    The voice track acts as the control signal.
            // 3. Mix [ducked_music] and [voice].
            
            // Note: sidechaincompress takes input to compress first, then control input.
            // So: [music][voice]sidechaincompress...
            
            filterGraph.push(`[${musicIndex}:a][${aPrev}]sidechaincompress=threshold=0.1:ratio=4:attack=50:release=300[a_ducked];`);
            filterGraph.push(`[a_ducked][${aPrev}]amix=inputs=2:duration=first[a_final];`);
            finalA = `[a_final]`;
        }

        // Execute Complex Filter
        if (processedClips.length === 1 && !backgroundMusicUrl && !hasFilters) {
            // Simple pass-through if nothing special
            const cmd = ['-i', processedClips[0].name, '-c:v', 'copy', '-c:a', 'copy', outputName];
            await instance.exec(cmd);
        } else {
            // Remove trailing semicolon
            const graphString = filterGraph.join('').slice(0, -1);
            
            const cmd = [
                ...inputArgs,
                '-filter_complex', graphString,
                '-map', finalV,
                '-map', finalA,
                '-c:v', 'libx264', '-preset', 'ultrafast',
                '-c:a', 'aac', '-b:a', '192k',
                outputName
            ];
            
            await instance.exec(cmd);
        }

        if (onProgress) onProgress("Done!");

        // 4. Read output
        const data = await instance.readFile(outputName);
        const blob = new Blob([data], { type: 'video/mp4' });
        
        // Cleanup
        for (const c of processedClips) {
            try { await instance.deleteFile(c.name); } catch(e) {}
        }
        if (backgroundMusicUrl) {
            try { await instance.deleteFile(musicFileName); } catch(e) {}
        }
        try { await instance.deleteFile(outputName); } catch(e) {}

        return URL.createObjectURL(blob);

    } catch (error) {
        console.error("Stitching failed:", error);
        throw new Error("Failed to stitch videos. Ensure all clips are valid.");
    }
};
