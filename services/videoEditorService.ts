
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { VideoFilters, TransitionType, CropConfig, TextOverlay, ColorGradeParams, MotionConfig, VisualizerConfig, ClipTransition } from '../types';
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

    ffmpeg.on('log', ({ message }) => {
        console.debug('FFmpeg:', message);
    });

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
        try {
            await instance.readFile('font.ttf');
            return;
        } catch (e) {
            // File doesn't exist, proceed to load
        }
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

export const generateProxy = async (
    sourceUrl: string,
    onProgress?: (msg: string) => void
): Promise<string> => {
    const instance = await loadFFmpeg();
    const inputName = `input_${Date.now()}.mp4`;
    const outputName = `proxy_${Date.now()}.mp4`;

    try {
        if (onProgress) onProgress("Generating Proxy...");

        const data = await fetchFile(sourceUrl);
        await instance.writeFile(inputName, data);

        const cmd = [
            '-i', inputName,
            '-vf', 'scale=-2:480',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-b:v', '500k',
            '-c:a', 'aac', 
            '-b:a', '96k',
            outputName
        ];

        await instance.exec(cmd);

        const outData = await instance.readFile(outputName);
        const blob = new Blob([outData], { type: 'video/mp4' });
        
        return URL.createObjectURL(blob);

    } catch (error) {
        console.error("Proxy generation failed", error);
        return sourceUrl; // Fallback to original
    } finally {
        try { await instance.deleteFile(inputName); } catch(e) {}
        try { await instance.deleteFile(outputName); } catch(e) {}
    }
};

export const renderTitleCard = async (
    text: string, 
    duration: number = 3,
    styles: { background: string, color: string, fontSize: number },
    onProgress?: (msg: string) => void
): Promise<string> => {
    const instance = await loadFFmpeg();
    await loadFont(instance); 

    const outputName = `title_${Date.now()}.mp4`;
    const bgColor = styles.background.replace('#', '0x'); 
    const safeTextColor = `0x${styles.color.replace('#', '')}FF`; 
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
    try { await instance.deleteFile(outputName); } catch(e) {}

    return URL.createObjectURL(blob);
};

export const transcodeVideo = async (
    sourceUrl: string,
    profile: ExportProfile,
    onProgress?: (msg: string) => void
): Promise<string> => {
    const instance = await loadFFmpeg();
    const inputName = 'input_transcode.mp4';
    const outputName = `output.${profile.container}`;

    if (onProgress) onProgress(`Preparing ${profile.label} export...`);

    const data = await fetchFile(sourceUrl);
    await instance.writeFile(inputName, data);

    const cmd: string[] = ['-i', inputName];

    if (profile.container === 'gif') {
        if (onProgress) onProgress("Generating palette for GIF...");
        cmd.push(
            '-vf', 
            'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
            '-f', 'gif'
        );
    } else {
        cmd.push('-c:v', profile.videoCodec);
        if (profile.audioCodec) {
            cmd.push('-c:a', profile.audioCodec);
        } else {
            cmd.push('-an'); 
        }
        cmd.push(...profile.args);
    }

    cmd.push(outputName);

    if (onProgress) onProgress(`Encoding ${profile.label}... (This uses CPU)`);
    await instance.exec(cmd);

    const outData = await instance.readFile(outputName);
    try { await instance.deleteFile(inputName); } catch(e) {}
    try { await instance.deleteFile(outputName); } catch(e) {}

    return URL.createObjectURL(new Blob([outData], { type: profile.mimeType }));
};

export const stitchVideos = async (
    clips: { 
        videoUrl: string; 
        audioUrl?: string; 
        audioVolume?: number; 
        dialogueText?: string;
        transition?: ClipTransition; // Updated to use object
        overlays?: TextOverlay[];
        colorGrade?: ColorGradeParams;
        motionConfig?: MotionConfig;
        isImage?: boolean;
        duration?: number;
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

    const hasSubtitles = clips.some(c => c.dialogueText);
    const hasOverlays = clips.some(c => c.overlays && c.overlays.length > 0);
    
    if (hasSubtitles || hasOverlays) {
        if (onProgress) onProgress("Loading fonts...");
        await loadFont(instance);
    }
    
    if (onProgress) onProgress("Loading media files...");

    // Pre-processing Clips (Scaling, Cropping, Effects)
    const processedClips: { name: string; duration: number; hasAudio: boolean; transition?: ClipTransition }[] = [];
    
    const TARGET_WIDTH = cropConfig ? 1080 : 1920;
    const TARGET_HEIGHT = cropConfig ? 1920 : 1080;
    
    try {
        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            const rawVidName = `raw_${i}.${clip.isImage ? 'png' : 'mp4'}`;
            const rawAudName = `raw_aud_${i}.wav`;
            const cleanName = `clean_${i}.mp4`;

            const vidData = await fetchFile(clip.videoUrl);
            await instance.writeFile(rawVidName, vidData);
            
            // For images, we must define duration
            const duration = clip.isImage ? (clip.duration || 5) : await getVideoDuration(clip.videoUrl);
            const totalFrames = Math.ceil(duration * 24);

            let hasAudio = false;
            if (clip.audioUrl) {
                const audData = await fetchFile(clip.audioUrl);
                await instance.writeFile(rawAudName, audData);
                hasAudio = true;
            }

            const filterParts = [];
            
            if (clip.motionConfig) {
                const { start, end } = clip.motionConfig;
                const zoomExpr = `${start.zoom}+(${end.zoom}-${start.zoom})*on/${totalFrames}`;
                const centerXExpr = `${start.x}+(${end.x}-${start.x})*on/${totalFrames}`;
                const centerYExpr = `${start.y}+(${end.y}-${start.y})*on/${totalFrames}`;
                const xExpr = `iw*(${centerXExpr}-1/(2*zoom))`;
                const yExpr = `ih*(${centerYExpr}-1/(2*zoom))`;
                
                filterParts.push(`zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:s=${TARGET_WIDTH}x${TARGET_HEIGHT}:fps=24`);
            } else if (clip.isImage) {
                // Static image needs zoompan or loop to become video
                // Just freeze it
                filterParts.push(`zoompan=d=${totalFrames}:s=${TARGET_WIDTH}x${TARGET_HEIGHT}:fps=24`);
            }

            if (cropConfig) {
                const cropW = 608;
                const cropH = 1080;
                const maxOffsetX = 1920 - cropW;
                let offsetX = Math.floor(cropConfig.xPercentage * maxOffsetX);
                if (offsetX % 2 !== 0) offsetX--;

                filterParts.push(`crop=${cropW}:${cropH}:${offsetX}:0`);
                filterParts.push(`scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:flags=lanczos`);
            } else if (!clip.motionConfig && !clip.isImage) {
                // For standard video without motion config, ensure scale
                filterParts.push(`scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=decrease,pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2`);
            }
            
            if (clip.colorGrade) {
                const cg = clip.colorGrade;
                filterParts.push(`eq=contrast=${cg.contrast}:brightness=${cg.brightness}:saturation=${cg.saturation}:gamma_r=${cg.gamma_r}:gamma_g=${cg.gamma_g}:gamma_b=${cg.gamma_b}`);
            }
            
            filterParts.push('setsar=1,fps=24');
            
            if (clip.dialogueText) {
                const safeText = clip.dialogueText.replace(/'/g, "\\'").replace(/:/g, "\\:");
                const fontSize = cropConfig ? 80 : 48;
                const yPos = cropConfig ? 'h-th-400' : 'h-th-50'; 
                filterParts.push(`drawtext=fontfile=font.ttf:text='${safeText}':fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=${yPos}:borderw=3:bordercolor=black`);
            }

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

            const cmd = [];
            if (clip.isImage) {
                 // Loop 1 means input is a single image, zoompan handles duration
                 cmd.push('-loop', '1', '-i', rawVidName);
            } else {
                 cmd.push('-i', rawVidName);
            }
            
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

            // Duration is controlled by filter chain for images (zoompan) or existing duration for video
            if (clip.isImage) {
                cmd.push('-t', `${duration}`);
            }

            cmd.push('-c:v', 'libx264', '-preset', 'ultrafast');
            cmd.push('-c:a', 'aac');
            cmd.push(cleanName);
            
            if (onProgress) onProgress(`Pre-processing Shot ${i + 1}/${clips.length}...`);
            await instance.exec(cmd);
            
            await instance.deleteFile(rawVidName);
            if (hasAudio) await instance.deleteFile(rawAudName);

            processedClips.push({
                name: cleanName,
                duration: duration,
                hasAudio: true,
                transition: clip.transition
            });
        }

        let musicFileName = 'bg_music.mp3';
        if (backgroundMusicUrl) {
            const musicData = await fetchFile(backgroundMusicUrl);
            await instance.writeFile(musicFileName, musicData);
        }

        if (onProgress) onProgress("Compositing transitions & audio mix...");

        // Input Setup
        const inputArgs: string[] = [];
        processedClips.forEach(c => inputArgs.push('-i', c.name));
        
        if (backgroundMusicUrl) {
            inputArgs.push('-i', musicFileName);
        }

        // XFADE FILTER GRAPH CONSTRUCTION
        const filterGraph: string[] = [];
        let offset = 0;
        
        // Initial streams are [0:v] and [0:a]
        let vPrev = `[0:v]`;
        let aPrev = `[0:a]`;
        
        // Iterate through clips to build chain
        for (let i = 0; i < processedClips.length - 1; i++) {
            const currentClip = processedClips[i];
            const nextClip = processedClips[i+1]; // We check the NEXT clip's transition entry to see how it transitions FROM current
            
            // Note: Data model has `transition` on the clip.
            // If Clip 2 has transition 'dissolve', it dissolves from Clip 1 to Clip 2.
            const transition = nextClip.transition || { type: 'cut', duration: 0 };
            const transType = transition.type;
            const transDuration = transition.duration; // Defaults usually to 1.0 or 0.5 if not cut

            // Calculate offset: Start time of this transition relative to the whole timeline
            // Offset = Current cumulative duration - transition duration
            // Since xfade takes the end of stream A and overlaps stream B
            offset += currentClip.duration - (transType === 'cut' ? 0 : transDuration);
            
            const nextLabelV = `v${i+1}`;
            const nextLabelA = `a${i+1}`;
            
            // Map types to FFmpeg xfade transition names
            let method = 'fade'; 
            if (transType === 'wipe_left') method = 'wipeleft';
            if (transType === 'fade_black') method = 'fadeblack'; // Requires newer ffmpeg, fallback to fade if fails in some contexts
            if (transType === 'dissolve') method = 'fade';

            const actualTransDur = transType === 'cut' ? 0 : transDuration;
            
            if (transType === 'cut') {
                 filterGraph.push(`${vPrev}[${i+1}:v]xfade=transition=fade:duration=0.01:offset=${offset}[${nextLabelV}];`);
                 filterGraph.push(`${aPrev}[${i+1}:a]acrossfade=d=0.01:c1=tri:c2=tri[${nextLabelA}];`);
            } else {
                 filterGraph.push(`${vPrev}[${i+1}:v]xfade=transition=${method}:duration=${actualTransDur}:offset=${offset}[${nextLabelV}];`);
                 filterGraph.push(`${aPrev}[${i+1}:a]acrossfade=d=${actualTransDur}:c1=tri:c2=tri[${nextLabelA}];`);
            }
            
            vPrev = `[${nextLabelV}]`;
            aPrev = `[${nextLabelA}]`;
        }

        let finalV = vPrev;
        
        // Global Filters (Post-Transition)
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

        // Processing Execution
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

/**
 * Creates an "Audio Reactor" video by combining a static image with an audio waveform visualization.
 */
export const generateVisualizerVideo = async (
    audioBlob: string,
    imageBlob: string,
    config: VisualizerConfig,
    onProgress?: (msg: string) => void
): Promise<string> => {
    const instance = await loadFFmpeg();
    const audioName = 'input_audio.wav';
    const imageName = 'input_bg.png';
    const outputName = 'output_viz.mp4';

    if (onProgress) onProgress("Preparing assets...");

    await instance.writeFile(audioName, await fetchFile(audioBlob));
    await instance.writeFile(imageName, await fetchFile(imageBlob));

    const color = config.color || 'cyan'; 
    const W = 1080;
    const H = 1080;

    let vizFilter = '';
    if (config.style === 'frequency') {
        vizFilter = `[0:a]showfreqs=s=${W}x${H/3}:mode=bar:colors=${color}[viz]`;
    } else if (config.style === 'lines') {
        vizFilter = `[0:a]showwaves=s=${W}x${H/3}:mode=cline:colors=${color}[viz]`;
    } else {
        vizFilter = `[0:a]showwaves=s=${W}x${H/3}:mode=line:colors=${color}[viz]`;
    }

    const bgFilter = `[1:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}[bg]`;
    const filterComplex = `${bgFilter};${vizFilter};[bg][viz]overlay=x=0:y=H-h:format=auto,format=yuv420p[outv]`;

    const cmd = [
        '-i', audioName,
        '-loop', '1', '-i', imageName,
        '-filter_complex', filterComplex,
        '-map', '[outv]',
        '-map', '0:a',
        '-shortest',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-preset', 'ultrafast',
        outputName
    ];

    if (onProgress) onProgress("Rendering Audio Reactor...");
    await instance.exec(cmd);

    const outData = await instance.readFile(outputName);
    const blob = new Blob([outData], { type: 'video/mp4' });

    try { await instance.deleteFile(audioName); } catch(e) {}
    try { await instance.deleteFile(imageName); } catch(e) {}
    try { await instance.deleteFile(outputName); } catch(e) {}

    return URL.createObjectURL(blob);
};

export const renderAudioVisualizer = async (
    audioBlob: Blob, 
    bgImage: Blob, 
    style: 'line' | 'circle'
): Promise<Blob> => {
    const instance = await loadFFmpeg();
    const audioName = 'vis_input.wav';
    const imageName = 'vis_bg.png';
    const outputName = 'vis_output.mp4';

    await instance.writeFile(audioName, await fetchFile(audioBlob));
    await instance.writeFile(imageName, await fetchFile(bgImage));

    // Simple visualization config
    // showwaves mode=line is robust. 'circle' needs showfreqs or advanced filtering, but we'll map circle to a different line mode for simplicity if needed or use showwavespic for static.
    // For animated circle, showfreqs with polar coords is complex in simple ffmpeg wasm without heavy libs.
    // We will stick to basic line waves as requested.
    
    // Filter: [0:a]showwaves=s=1280x720:mode=line:colors=cyan[v];[1:v][v]overlay=format=auto
    // We scale image to match video size
    
    // Low fps for performance as requested
    const fps = 15;
    const width = 1280;
    const height = 720;
    
    const cmd = [
        '-i', audioName,
        '-loop', '1', '-i', imageName,
        '-filter_complex', `[0:a]showwaves=s=${width}x${height}:mode=${style === 'circle' ? 'cline' : 'line'}:colors=cyan[v];[1:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}[bg];[bg][v]overlay=format=auto:shortest=1,format=yuv420p`,
        '-map', '0:a', // Include audio
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-r', String(fps),
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        outputName
    ];

    await instance.exec(cmd);

    const outData = await instance.readFile(outputName);
    const blob = new Blob([outData], { type: 'video/mp4' });

    try { await instance.deleteFile(audioName); } catch(e) {}
    try { await instance.deleteFile(imageName); } catch(e) {}
    try { await instance.deleteFile(outputName); } catch(e) {}

    return blob;
};
