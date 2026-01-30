
import { VideoEffect, ChromaKeyEffect, CameraShakeEffect, ColorGradeEffect } from '../types';

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
 * Applies a stack of effects to a canvas context drawing operation.
 * 
 * @param ctx The Canvas Rendering Context
 * @param image The source image/video frame
 * @param effects The stack of effects to apply
 * @param width Target width
 * @param height Target height
 * @param time Current playback time (for shake animation)
 */
export const applyEffects = (
    ctx: CanvasRenderingContext2D, 
    image: CanvasImageSource, 
    effects: VideoEffect[], 
    width: number, 
    height: number,
    time: number
) => {
    // 1. Transform Calculation (Camera Shake)
    let dx = 0;
    let dy = 0;
    let scale = 1.0;
    
    // Accumulate standard CSS filters
    const cssFilters: string[] = [];

    effects.forEach(eff => {
        if (!eff.isEnabled) return;

        if (eff.type === 'shake') {
            const shake = eff as CameraShakeEffect;
            const seed = 12345;
            const speed = shake.speed * 5;
            const ampX = (shake.intensity * 20); // Max 20px shake
            const ampY = (shake.intensity * 20);

            const offsetX = noise(time * speed, seed) * ampX;
            const offsetY = noise(time * speed + 100, seed + 50) * ampY;

            dx += offsetX;
            dy += offsetY;
            
            // Apply overscan scale to hide edges
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
    // Note: CPU pixel manipulation is expensive. For 1080p, WebGL is preferred.
    // This implementation assumes reasonable resolution or proxy usage.
    const chromaEffect = effects.find(e => e.isEnabled && e.type === 'chroma') as ChromaKeyEffect | undefined;

    if (chromaEffect) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Parse hex color to RGB
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
                // Full transparent
                data[i + 3] = 0; 
            } else if (dist < sim + smooth) {
                // Smooth edge
                const alpha = (dist - sim) / smooth;
                data[i + 3] = Math.floor(alpha * 255);
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
};
