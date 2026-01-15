
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { VideoFilters, TransitionType, CropConfig, TextOverlay, ColorGradeParams } from '../types';
import { ExportProfile } from '../config/exportProfiles';

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
 * Renders a static title card video clip.
 */
export const renderTitleCard = async (
    text: string, 
    duration: number = 3,
    styles: { background: string, color: string, fontSize: number },
    onProgress?: (msg: string) => void
): Promise<string> => {
    const instance = await loadFFmpeg();
    await loadFont(instance); // Ensure font is available

    const outputName = `title_${Date.now()}.mp4`;
    const bgColor = styles.background.replace('#', '0x'); // FFmpeg hex format
    
    // FFmpeg fontcolor accepts standard hex like white or #FFFFFF if escaped, but safe is 0xFFFFFF.
    const safeTextColor = `0x${styles.color.replace('#', '')}FF`; // RGBA

    // Safe text escaping for FFmpeg drawtext
    const safeText = text.replace(/'/g, "\\'").replace(/:/g, "\\:");

    const cmd = [
        '-f', 'lavfi',
        '-i', `color=c=${bgColor}:s=1920x1080:d=${duration}`,
        '-vf', `drawtext=fontfile=font.ttf:text='${safeText}':fontcolor=${safeTextColor}:fontsize=${styles.fontSize}:x=(w-text_w)/2:y=(h-text_h)/2`,
        '-c:v', 'libx264', '-t', `${duration}`, '-pix_fmt', 'yuv420p',
        outputName
    ];

    if (onProgress) onProgress("Rendering Title Card...");
    await instance.exec(cmd);

    const outData = await instance.readFile(outputName);
    const blob = new Blob([outData], { type: 'video/mp4' });
    
    // Cleanup
    try { await instance.deleteFile(outputName); } catch(e) {}

    return URL.createObjectURL(blob);
};

/**
 * Transcodes a video using a specific ExportProfile.
 */
export const transcodeVideo = async (
    sourceUrl: string,
    profile: ExportProfile,
    onProgress?: (msg: string) => void
): Promise<string> => {
    const instance = await loadFFmpeg();
    const inputName = 'input_transcode.mp4';
    const outputName = `output.${profile.container}`;

    if (onProgress) onProgress(`Preparing ${profile.label} export...`);

    // Write source file
    const data = await fetchFile(sourceUrl);
    await instance.writeFile(inputName, data);

    const cmd: string[] = ['-i', inputName];

    // Special handling for GIF palette generation
    if (profile.container === 'gif') {
        if (onProgress) onProgress("Generating palette for GIF...");
        cmd.push(
            '-vf', 
            'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
            '-f', 'gif'
        );
    } else {
        // Standard video arguments from profile
        cmd.push('-c:v', profile.videoCodec);
        
        if (profile.audioCodec) {
            cmd.push('-c:a', profile.audioCodec);
        } else {
            cmd.push('-an'); // No audio
        }

        // Add extra arguments from profile
        cmd.push(...profile.args);
    }

    cmd.push(outputName);

    if (onProgress) onProgress(`Encoding ${profile.label}... (This uses CPU)`);
    await instance.exec(cmd);

    const outData = await instance.readFile(outputName);
    
    // Cleanup
    try { await instance.deleteFile(inputName); } catch(e) {}
    try { await instance.deleteFile(outputName); } catch(e) {}

    return URL.createObjectURL(new Blob([outData], { type: profile.mimeType }));
};

/**
 * Stitches multiple video/audio clips into a single file.
 */
export const stitchVideos = async (
    clips: { 
        videoUrl: string; 
        audioUrl?: string; 
        audioVolume?: number; 
        dialogueText?: string;
        transitionToNext?: TransitionType; // Transition to occur AFTER this clip
        overlays?: TextOverlay[];
        colorGrade?: ColorGradeParams;
    }[], 
    outputName: string = 'intermediate.mp4',
    onProgress?: (msg: string) => void,
    filters?: VideoFilters,
    cropConfig?: CropConfig,
    backgroundMusicUrl?: string | null,
    audioSettings?: {
        volumes: { dialogue: number, music: number },
        autoDuck: boolean
    }
): Promise<string> => {
    const instance = await loadFFmpeg();
    
    const volDialogue = audioSettings?.volumes.dialogue ?? 1.0;
    const volMusic = audioSettings?.volumes.music ?? 0.5;
    const autoDuck = audioSettings?.autoDuck ?? true;

    // Load font if any clip has dialogue
    const hasSubtitles = clips.some(c => c.dialogueText);
    const hasOverlays = clips.some(c => c.overlays && c.overlays.length > 0);
    
    if (hasSubtitles || hasOverlays) {
        if (onProgress) onProgress("Loading fonts...");
        await loadFont(instance);
    }
    
    if (onProgress) onProgress("Loading media files...");

    // 1. Prepare Intermediate Clips (Scale + Subtitles + FPS Normalization + Audio Norm)
    const processedClips: { name: string; duration: number; hasAudio: boolean; transition: TransitionType }[] = [];
    
    // Determine Target Resolution
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
            
            // Get Duration
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
                let offsetX = Math.floor(cropConfig.xPercentage * maxOffsetX);
                if (offsetX % 2 !== 0) offsetX--;

                filterParts.push(`crop=${cropW}:${cropH}:${offsetX}:0`);
                filterParts.push(`scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:flags=lanczos`);
            } else {
                filterParts.push(`scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=decrease,pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2`);
            }
            
            // Color Grading (Per Shot)
            if (clip.colorGrade) {
                const cg = clip.colorGrade;
                filterParts.push(`eq=contrast=${cg.contrast}:brightness=${cg.brightness}:saturation=${cg.saturation}:gamma_r=${cg.gamma_r}:gamma_g=${cg.gamma_g}:gamma_b=${cg.gamma_b}`);
            }
            
            filterParts.push('setsar=1,fps=24');
            
            // Subtitles
            if (clip.dialogueText) {
                const safeText = clip.dialogueText.replace(/'/g, "\\'").replace(/:/g, "\\:");
                const fontSize = cropConfig ? 80 : 48;
                const yPos = cropConfig ? 'h-th-400' : 'h-th-50'; 
                filterParts.push(`drawtext=fontfile=font.ttf:text='${safeText}':fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=${yPos}:borderw=3:bordercolor=black`);
            }

            // Custom Text Overlays
            if (clip.overlays) {
                for (const overlay of clip.overlays) {
                    const safeText = overlay.text.replace(/'/g, "\\'").replace(/:/g, "\\:");
                    const hexColor = overlay.style.color.replace('#', '');
                    const color = `0x${hexColor}FF`;
                    const xPos = `(w*${overlay.position.x})/100 - (text_w/2)`;
                    const yPos = `(h*${overlay.position.y})/100 - (text_h/2)`;
                    const enable = `enable='between(t,${overlay.startTime},${overlay.startTime + overlay.duration})'`;
                    
                    let boxOptions = '';
                    if (overlay.style.backgroundColor && overlay.style.backgroundOpacity && overlay.style.backgroundOpacity > 0) {
                        const bgHex = overlay.style.backgroundColor.replace('#', '');
                        boxOptions = `:box=1:boxcolor=0x${bgHex}@${overlay.style.backgroundOpacity}:boxborderw=5`;
                    }

                    filterParts.push(`drawtext=fontfile=font.ttf:text='${safeText}':fontcolor=${color}:fontsize=${overlay.style.fontSize}:x=${xPos}:y=${yPos}${boxOptions}:${enable}`);
                }
            }

            const cmd = ['-i', rawVidName];
            
            if (hasAudio) {
                cmd.push('-i', rawAudName);
            } else {
                cmd.push('-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`);
            }
            
            cmd.push('-vf', filterParts.join(','));
            
            if (hasAudio) {
                const clipVol = clip.audioVolume !== undefined ? clip.audioVolume : 1.0;
                const effectiveVolume = clipVol * volDialogue;
                cmd.push('-filter:a', `volume=${effectiveVolume},aresample=44100`); 
            } else {
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
                hasAudio: true,
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
        
        if (backgroundMusicUrl) {
            inputArgs.push('-i', musicFileName);
        }

        const filterGraph: string[] = [];
        let offset = 0;
        const transDuration = 1.0; 

        let vPrev = `[0:v]`;
        let aPrev = `[0:a]`;
        
        for (let i = 0; i < processedClips.length - 1; i++) {
            const currentClip = processedClips[i];
            const transType = currentClip.transition;
            
            offset += currentClip.duration - (transType === 'cut' ? 0 : transDuration);
            
            const nextLabelV = `v${i+1}`;
            const nextLabelA = `a${i+1}`;
            
            let method = 'fade'; 
            if (transType === 'wipe_left') method = 'wipeleft';
            if (transType === 'fade_black') method = 'circleclose';

            const actualTransDur = transType === 'cut' ? 0.1 : transDuration;
            
            filterGraph.push(`${vPrev}[${i+1}:v]xfade=transition=${method}:duration=${actualTransDur}:offset=${offset}[${nextLabelV}];`);
            vPrev = `[${nextLabelV}]`;

            filterGraph.push(`${aPrev}[${i+1}:a]acrossfade=d=${actualTransDur}:c1=tri:c2=tri[${nextLabelA}];`);
            aPrev = `[${nextLabelA}]`;
        }

        // Global Filters
        let finalV = vPrev;
        const hasFilters = filters && (
            filters.contrast !== 100 || 
            filters.saturation !== 100 || 
            filters.sepia > 0 || 
            filters.grain > 0 ||
            (filters.vfxType && filters.vfxType !== 'none')
        );
        
        if (hasFilters) {
            const filterChainParts = [];
            
            if (filters!.contrast !== 100 || filters!.saturation !== 100) {
                filterChainParts.push(`eq=contrast=${(filters!.contrast/100).toFixed(2)}:saturation=${(filters!.saturation/100).toFixed(2)}`);
            }
            if (filters!.sepia > 0) filterChainParts.push(`colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`);
            
            if (filters!.grain > 0) filterChainParts.push(`noise=alls=${filters!.grain}:allf=t+u`);

            if (filters?.vfxType === 'grain') {
                filterChainParts.push(`noise=alls=${filters.vfxIntensity}:allf=t+u`);
            } else if (filters?.vfxType === 'vignette') {
                filterChainParts.push(`vignette='PI/4*${filters.vfxIntensity/100}'`); 
            } else if (filters?.vfxType === 'letterbox') {
                filterChainParts.push(`drawbox=x=0:y=0:w=iw:h=ih/8:t=fill:c=black,drawbox=x=0:y=ih-ih/8:w=iw:h=ih/8:t=fill:c=black`);
            }
            
            if (filterChainParts.length > 0) {
                filterGraph.push(`${vPrev}${filterChainParts.join(',')}[v_final];`);
                finalV = `[v_final]`;
            }
        }

        // Final Audio Mixing
        let finalA = aPrev;
        if (backgroundMusicUrl) {
            const musicIndex = processedClips.length;
            filterGraph.push(`[${musicIndex}:a]volume=${volMusic}[music_vol];`);
            
            if (autoDuck) {
                filterGraph.push(`[music_vol][${aPrev}]sidechaincompress=threshold=0.1:ratio=4:attack=50:release=300[a_ducked];`);
                filterGraph.push(`[a_ducked][${aPrev}]amix=inputs=2:duration=first[a_final];`);
            } else {
                filterGraph.push(`[music_vol][${aPrev}]amix=inputs=2:duration=first[a_final];`);
            }
            finalA = `[a_final]`;
        }

        // Execute Complex Filter
        if (processedClips.length === 1 && !backgroundMusicUrl && !hasFilters) {
            const cmd = ['-i', processedClips[0].name, '-c:v', 'copy', '-c:a', 'copy', outputName];
            await instance.exec(cmd);
        } else {
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
