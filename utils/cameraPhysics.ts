
import { CameraEffect } from '../types';

interface Transform2D {
    x: number;
    y: number;
    rot: number;
    scale: number;
}

// Pseudo-random noise function (Sine superposition)
// Returns value between -1 and 1
const noise = (t: number, seed: number = 0): number => {
    // Sum of sines with prime frequencies to avoid repeating patterns quickly
    return (
        Math.sin(t * 1.5 + seed) * 0.5 + 
        Math.sin(t * 2.3 + seed * 2) * 0.3 + 
        Math.sin(t * 4.1 + seed * 3) * 0.2
    );
};

export const calculateCameraTransform = (
    effect: CameraEffect, 
    clipTime: number, 
    duration: number
): string => {
    const { type, intensity, scale } = effect;
    const seed = 12345; // Default seed, could be added to effect type if needed

    let t: Transform2D = { x: 0, y: 0, rot: 0, scale: scale || 1.0 };

    if (type === 'handheld') {
        // Handheld: Rapid, jittery movement + slight rotation
        const speed = 2 + (intensity * 4); // Speed multiplier
        const ampX = 2 * intensity; // Max X %
        const ampY = 2 * intensity; // Max Y %
        const ampRot = 1 * intensity; // Max Rotation degrees

        t.x = noise(clipTime * speed, seed) * ampX;
        t.y = noise(clipTime * speed + 100, seed + 50) * ampY;
        t.rot = noise(clipTime * speed + 200, seed + 100) * ampRot;

    } else if (type === 'drift') {
        // Drift: Slow, continuous movement in one general direction
        // We use noise but at very low frequency
        const speed = 0.2 + (intensity * 0.5);
        const amp = 5 * intensity;

        // Use time to drive linear drift + slight noise
        t.x = (noise(clipTime * speed, seed) * amp); 
        t.y = (noise(clipTime * speed + 50, seed) * amp);

    } else if (type === 'zoom_in') {
        // Zoom In: Linear scale increase
        // Start at scale, end at scale + intensity
        const progress = Math.min(1, clipTime / duration);
        const zoomAmount = 0.5 * intensity; // Max 50% extra zoom
        t.scale = scale + (zoomAmount * progress);

    } else if (type === 'zoom_out') {
        // Zoom Out: Start zoomed in, move to base scale
        const progress = Math.min(1, clipTime / duration);
        const zoomAmount = 0.5 * intensity;
        // Start: scale + zoomAmount, End: scale
        t.scale = (scale + zoomAmount) - (zoomAmount * progress);
    }

    // Ensure scale is applied first so translations are relative
    return `scale(${t.scale}) translate(${t.x}%, ${t.y}%) rotate(${t.rot}deg)`;
};
