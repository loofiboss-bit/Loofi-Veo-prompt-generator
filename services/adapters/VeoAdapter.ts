
import { VideoModelAdapter } from './VideoModelAdapter';
import { PromptState } from '../../types';
import { interpolateVariables } from '../promptBuilder';

export class VeoAdapter implements VideoModelAdapter {
    
    validateConstraints(state: PromptState): string[] {
        const warnings: string[] = [];
        // Veo currently has strict aspect ratio preferences in some versions
        if (['16:9', '9:16'].indexOf(state.aspectRatio) === -1) {
            warnings.push("Veo is optimized for 16:9 and 9:16. Other ratios may result in cropping.");
        }
        return warnings;
    }

    getEnhancements(key: keyof PromptState, value: string): string {
        if (!value) return '';

        switch (key) {
            case 'artStyle':
                if (value.toLowerCase().includes('cinematic')) {
                    return ' (Target: IMAX digital quality, fine grain 35mm film stock, high dynamic range color grading, Arri Alexa sensor aesthetics)';
                } else if (value.toLowerCase().includes('photorealistic')) {
                    return ' (Target: 8k raw photography, ultra-realistic textures, ray-traced reflections, perfect white balance, optical lens imperfections)';
                } else if (value.toLowerCase().includes('anime')) {
                    return ' (Target: High-budget studio production, Makoto Shinkai style lighting, detailed backgrounds, fluid frame rates, vibrant cell shading)';
                } else if (value.toLowerCase().includes('vintage')) {
                    return ' (Target: Authentic period film stock, color bleed, soft vignetting, dust and scratches, warm analog saturation)';
                } else if (value.toLowerCase().includes('found footage')) {
                    return ' (Target: Handheld camcorder aesthetic, damaged film grain, light leaks, heavy vignette, lower frame rate for authenticity)';
                }
                break;
            case 'cameraMovement':
                return ' (Execution: Professional stabilization, cinematic velocity curves, motivated camera movement, parallax effect for depth)';
            case 'lightingStyle':
                return ' (Execution: Volumetric fog effects, subsurface scattering on skin/materials, physically based light falloff, high contrast ratios)';
            case 'visualEffect':
                if (value !== 'None') {
                    return ' (Execution: Integrated via optical simulation, consistent with scene lighting and depth, not just a post-process overlay)';
                }
                break;
            case 'characterClothing':
                return ' (Detail: High-resolution fabric weave, realistic cloth physics reacting to wind/movement, accurate draping, tangible material weight)';
            case 'environment':
                return ' (Detail: Richly populated background, atmospheric depth, ambient occlusion, intricate set design, photogrammetry-level texture assets)';
            case 'lensType':
                if (value.includes('Macro')) return ' (Optics: Extremely shallow depth of field, sharp focus plane, smooth creamy bokeh)';
                if (value.includes('Anamorphic')) return ' (Optics: Oval bokeh, horizontal lens flares, cinematic aspect ratio)';
                break;
        }
        return '';
    }

    buildPrompt(state: PromptState, variables: Record<string, string>): string {
        // Interpolate variables first to ensure all {{KEY}} tags are resolved
        const iState = { ...state };
        iState.idea = interpolateVariables(state.idea, variables);
        iState.environment = interpolateVariables(state.environment, variables);
        iState.characterActions = interpolateVariables(state.characterActions, variables);

        const segments: string[] = [];

        // 1. Core Subject & Action
        let core = iState.idea.trim();
        if (!core) core = "A cinematic scene.";
        if (!/[.!?]$/.test(core)) core += '.';
        segments.push(core);

        if (iState.characterActions) {
            segments.push(`Action: ${iState.characterActions}`);
        }

        // 2. Visual Style & Enhancements
        if (iState.artStyle) {
            let style = `Style: ${iState.artStyle}`;
            if (iState.artStyle === 'Custom') style = `Style: ${iState.customArtStyle}`;
            style += this.getEnhancements('artStyle', iState.artStyle === 'Custom' ? iState.customArtStyle : iState.artStyle);
            segments.push(style);
        }

        // 3. Environment
        if (iState.environment) {
            let env = `Setting: ${iState.environment}`;
            env += this.getEnhancements('environment', iState.environment);
            segments.push(env);
        }

        // 4. Lighting & Atmosphere
        const lighting = [];
        if (iState.timeOfDay && iState.timeOfDay !== 'Any') lighting.push(iState.timeOfDay);
        if (iState.weather && iState.weather !== 'Any') lighting.push(iState.weather);
        if (iState.lightingStyle && iState.lightingStyle !== 'Any') {
            lighting.push(iState.lightingStyle + this.getEnhancements('lightingStyle', iState.lightingStyle));
        }
        if (lighting.length > 0) {
            segments.push(`Lighting/Atmosphere: ${lighting.join(', ')}.`);
        }

        // 5. Camera & Optics
        const camera = [];
        if (iState.cameraMovement) camera.push(iState.cameraMovement + this.getEnhancements('cameraMovement', iState.cameraMovement));
        if (iState.cameraDistance) camera.push(iState.cameraDistance);
        if (iState.lensType) camera.push(iState.lensType + this.getEnhancements('lensType', iState.lensType));
        if (iState.compositionalGuide && iState.compositionalGuide !== 'Any') camera.push(`Composition: ${iState.compositionalGuide}`);
        
        if (camera.length > 0) {
            segments.push(`Cinematography: ${camera.join(', ')}.`);
        }

        // 6. Character Details
        if ((iState.characterArchetype && iState.characterArchetype !== 'Any') || (iState.characterGender && iState.characterGender !== 'Any')) {
            const charParts = [];
            if (iState.characterArchetype !== 'Any') charParts.push(iState.characterArchetype);
            if (iState.characterGender !== 'Any') charParts.push(iState.characterGender);
            if (iState.characterAge !== 'Any') charParts.push(iState.characterAge);
            if (iState.characterClothing !== 'Any') {
                let cloth = iState.characterClothing;
                if (iState.characterSpecificClothing) cloth += ` (${iState.characterSpecificClothing})`;
                cloth += this.getEnhancements('characterClothing', iState.characterClothing);
                charParts.push(cloth);
            }
            segments.push(`Character: ${charParts.join(', ')}.`);
        }

        // 7. Tech Specs
        const specs = [];
        if (iState.resolution) specs.push(`Resolution: ${iState.resolution}`);
        if (iState.aspectRatio) specs.push(`Aspect Ratio: ${iState.aspectRatio}`);
        if (iState.visualEffect && iState.visualEffect !== 'None') specs.push(`Effect: ${iState.visualEffect}` + this.getEnhancements('visualEffect', iState.visualEffect));
        
        if (specs.length > 0) {
            segments.push(`Technical Specs: ${specs.join(', ')}.`);
        }

        // 8. Negative Prompt
        if (iState.negativePrompt) {
            segments.push(`Negative Prompt (Exclude): ${iState.negativePrompt}`);
        }
        
        // 9. Spatial Directions (New in v3)
        if (iState.spatialMotions && Object.keys(iState.spatialMotions).length > 0) {
            const spatialDirectives = Object.entries(iState.spatialMotions)
                .map(([grid, motion]) => `Grid ${grid}: ${motion}`)
                .join('; ');
            segments.push(`Spatial Directives: ${spatialDirectives}.`);
        }

        return segments.join('\n\n');
    }
}
