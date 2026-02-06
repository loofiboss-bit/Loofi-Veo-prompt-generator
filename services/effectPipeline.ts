
import { VideoEffect, ChromaKeyEffect, CameraShakeEffect, ColorGradeEffect, VideoFilters } from '../types';
import { drawGrain } from '../utils/filmGrain';

// Pseudo-random noise function for deterministic shake
const noise = (t: number, seed: number = 0): number => {
    return (
        Math.sin(t * 1.5 + seed) * 0.5 + 
        Math.sin(t * 2.3 + seed * 2) * 0.3 + 
        Math.sin(t * 4.1 + seed * 3) * 0.2
    );
};

/**
 * Calculates a color distance in RGB space (simplified Euclidean)
 */
const colorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
    return Math.sqrt(
        (r2 - r1) * (r2 - r1) +
        (g2 - g1) * (g2 - g1) +
        (b2 - b1) * (b2 - b1)
    ) / 441.67; // Normalize to 0-1 (approx sqrt(255^2 * 3))
};

/**
 * Applies film emulation effects (Grain, Halation, Jitter).
 * 
 * @param ctx Destination context
 * @param width Width
 * @param height Height
 * @param config Film config object
 * @param time Current time
 */
export const applyFilmEmulation = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: NonNullable<VideoFilters['filmConfig']>,
    time: number,
    sourceCanvas?: HTMLCanvasElement // Optional source for halation passes
) => {
    if (!config.enabled) return;

    // 1. Jitter (Gate Weave)
    // Needs to happen BEFORE drawing the image usually, but here we assume image is already drawn 
    // or this is a post-pass.
    // If image is already on ctx, we can't easily shift it without clearing and redrawing.
    // Ideally, applyFilmEmulation is called *during* the draw phase.
    // Since we are adding this to the pipeline, let's assume this function handles overlays/post-proc 
    // OR returns the transform needed.
    
    // For pure overlay effects (Grain), we draw on top.
    // For Halation (Glow), we need source pixels.
    
    // 2. Halation (Bloom)
    if (config.halationIntensity > 0 && sourceCanvas) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = `blur(${Math.max(2, width * 0.01)}px) saturate(1.5)`; // Blur relative to width
        ctx.globalAlpha = config.halationIntensity / 100 * 0.6; // Max 0.6 opacity
        
        // Draw the source canvas again on top (Screen blend + Blur = Glow)
        // We assume sourceCanvas contains the clean frame
        ctx.drawImage(sourceCanvas, 0, 0, width, height);
        
        ctx.restore();
    }

    // 3. Film Grain
    if (config.grainIntensity > 0) {
        // Map 0-100 to 0-0.5 opacity roughly
        const strength = (config.grainIntensity / 100) * 0.5;
        drawGrain(ctx, width, height, strength, time);
    }
};

/**
 * Applies a stack of effects to a canvas context drawing operation.
 * 
 * @param ctx The Canvas Rendering Context
 * @param image The source image/video frame
 * @param effects The stack of effects to apply
 * @param width Target width
 * @param height Target height
 * @param time Current playback time (for shake animation)
 * @param filmConfig Global film emulation settings
 */
export const applyEffects = (
    ctx: CanvasRenderingContext2D, 
    image: CanvasImageSource, 
    effects: VideoEffect[], 
    width: number, 
    height: number,
    time: number,
    filmConfig?: VideoFilters['filmConfig']
) => {
    // 1. Transform Calculation (Camera Shake + Film Jitter)
    let dx = 0;
    let dy = 0;
    let scale = 1.0;
    
    // Accumulate standard CSS filters
    const cssFilters: string[] = [];

    // Clip-level effects
    effects.forEach(eff => {
        if (!eff.isEnabled) return;

        if (eff.type === 'shake') {
            const shake = eff as CameraShakeEffect;
            const seed = 12345;
            const speed = shake.speed * 5;
            const ampX = (shake.intensity * 20); 
            const ampY = (shake.intensity * 20);

            dx += noise(time * speed, seed) * ampX;
            dy += noise(time * speed + 100, seed + 50) * ampY;
            scale *= shake.scale;
        }

        if (eff.type === 'color') {
            const color = eff as ColorGradeEffect;
            if (color.brightness !== 1) cssFilters.push(`brightness(${color.brightness})`);
            if (color.contrast !== 1) cssFilters.push(`contrast(${color.contrast})`);
            if (color.saturation !== 1) cssFilters.push(`saturate(${color.saturation})`);
            if (color.sepia > 0) cssFilters.push(`sepia(${color.sepia})`);
            if (color.hueRotate !== 0) cssFilters.push(`hue-rotate(${color.hueRotate}deg)`);
        }
    });

    // Global Film Jitter (Gate Weave)
    if (filmConfig?.enabled && filmConfig.jitterIntensity > 0) {
        const jitterAmp = (filmConfig.jitterIntensity / 100) * 3; // Small jitter (max 3px)
        // High frequency noise
        dx += (Math.random() - 0.5) * jitterAmp;
        dy += (Math.random() - 0.5) * jitterAmp;
        // Slight scale breath
        scale *= (1 + (Math.random() - 0.5) * 0.002);
    }

    // 2. Apply CSS Filters
    ctx.filter = cssFilters.length > 0 ? cssFilters.join(' ') : 'none';

    // 3. Draw Image (with transforms)
    // Center scaling logic
    const scaledW = width * scale;
    const scaledH = height * scale;
    const centerX = (width - scaledW) / 2 + dx;
    const centerY = (height - scaledH) / 2 + dy;

    ctx.drawImage(image, centerX, centerY, scaledW, scaledH);
    
    // Reset Filter for subsequent draws
    ctx.filter = 'none';

    // 4. Pixel Manipulation (Chroma Key)
    const chromaEffect = effects.find(e => e.isEnabled && e.type === 'chroma') as ChromaKeyEffect | undefined;

    if (chromaEffect) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        const hex = chromaEffect.color.replace('#', '');
        const targetR = parseInt(hex.substring(0, 2), 16);
        const targetG = parseInt(hex.substring(2, 4), 16);
        const targetB = parseInt(hex.substring(4, 6), 16);
        
        const sim = chromaEffect.similarity;
        const smooth = chromaEffect.smoothness;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const dist = colorDistance(r, g, b, targetR, targetG, targetB);
            
            if (dist < sim) {
                data[i + 3] = 0; 
            } else if (dist < sim + smooth) {
                const alpha = (dist - sim) / smooth;
                data[i + 3] = Math.floor(alpha * 255);
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    // 5. Film Emulation (Overlay Passes)
    if (filmConfig?.enabled) {
        // Create a temp canvas if we need source for halation (expensive, optimization: pass image source directly if possible)
        // For halation, we need the *current state* of the canvas (after transforms/chroma).
        // Since we just drew to 'ctx', 'ctx.canvas' is the source.
        
        applyFilmEmulation(ctx, width, height, filmConfig, time, ctx.canvas);
    }
};
