
import { PromptState, CharacterProfile, Shot, LocationProfile } from '../types';
import { soraPromptTemplate } from '../translations';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { retryOperation } from '../utils/retry';

/**
 * Generates specific enhancement text for Veo 3 based on the parameter key and value.
 */
function getVeoEnhancement(key: string, value: string): string {
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

export const buildGeminiPrompt = (state: PromptState): string => {
    // Sora Emulation Mode
    if (state.targetModel === 'sora') {
        const lang = state.language || 'en';
        // Fallback to English if translation missing or using generic structure
        const template = soraPromptTemplate[lang] || soraPromptTemplate['en'];
        
        if (!template) {
            // Hard fallback if translation is completely missing
            return `Create a physics-compliant video simulation of: ${state.idea}. Ensure photorealism and causal consistency.`;
        }

        const paramsList = [
            `Environment: ${state.environment}`,
            state.timeOfDay !== 'Any' ? `Time: ${state.timeOfDay}` : '',
            state.weather !== 'Any' ? `Weather: ${state.weather}` : '',
            state.artStyle ? `Visual Style: ${state.artStyle}` : '',
            state.cameraMovement !== 'Static shot' ? `Camera: ${state.cameraMovement}` : '',
            state.motionIntensity ? `Motion: ${state.motionIntensity}` : '',
            state.environmentDynamicEvents ? `Dynamics: ${state.environmentDynamicEvents}` : '',
            state.environmentSensoryDetails ? `Sensory: ${state.environmentSensoryDetails}` : '',
            state.spatialMotions && Object.keys(state.spatialMotions).length > 0 
                ? `Spatial Directives: ${JSON.stringify(state.spatialMotions)}` 
                : ''
        ].filter(Boolean).join('\n');

        return template
            .replace('{idea}', state.idea)
            .replace('{parameterList}', paramsList);
    }

    // Veo 3.1 Mode (Cinematic Default)
    const segments: string[] = [];

    // 1. Core Subject & Action
    let core = state.idea.trim();
    if (!core) core = "A cinematic scene.";
    if (!/[.!?]$/.test(core)) core += '.';
    segments.push(core);

    if (state.characterActions) {
        segments.push(`Action: ${state.characterActions}`);
    }

    // 2. Visual Style & Enhancements
    if (state.artStyle) {
        let style = `Style: ${state.artStyle}`;
        if (state.artStyle === 'Custom') style = `Style: ${state.customArtStyle}`;
        style += getVeoEnhancement('artStyle', state.artStyle === 'Custom' ? state.customArtStyle : state.artStyle);
        segments.push(style);
    }

    // 3. Environment
    if (state.environment) {
        let env = `Setting: ${state.environment}`;
        env += getVeoEnhancement('environment', state.environment);
        segments.push(env);
    }

    // 4. Lighting & Atmosphere
    const lighting = [];
    if (state.timeOfDay && state.timeOfDay !== 'Any') lighting.push(state.timeOfDay);
    if (state.weather && state.weather !== 'Any') lighting.push(state.weather);
    if (state.lightingStyle && state.lightingStyle !== 'Any') {
        lighting.push(state.lightingStyle + getVeoEnhancement('lightingStyle', state.lightingStyle));
    }
    if (lighting.length > 0) {
        segments.push(`Lighting/Atmosphere: ${lighting.join(', ')}.`);
    }

    // 5. Camera & Optics
    const camera = [];
    if (state.cameraMovement) camera.push(state.cameraMovement + getVeoEnhancement('cameraMovement', state.cameraMovement));
    if (state.cameraDistance) camera.push(state.cameraDistance);
    if (state.lensType) camera.push(state.lensType + getVeoEnhancement('lensType', state.lensType));
    if (state.compositionalGuide && state.compositionalGuide !== 'Any') camera.push(`Composition: ${state.compositionalGuide}`);
    
    if (camera.length > 0) {
        segments.push(`Cinematography: ${camera.join(', ')}.`);
    }

    // 6. Character Details
    if ((state.characterArchetype && state.characterArchetype !== 'Any') || (state.characterGender && state.characterGender !== 'Any')) {
        const charParts = [];
        if (state.characterArchetype !== 'Any') charParts.push(state.characterArchetype);
        if (state.characterGender !== 'Any') charParts.push(state.characterGender);
        if (state.characterAge !== 'Any') charParts.push(state.characterAge);
        if (state.characterClothing !== 'Any') {
            let cloth = state.characterClothing;
            if (state.characterSpecificClothing) cloth += ` (${state.characterSpecificClothing})`;
            cloth += getVeoEnhancement('characterClothing', state.characterClothing);
            charParts.push(cloth);
        }
        segments.push(`Character: ${charParts.join(', ')}.`);
    }

    // 7. Tech Specs
    const specs = [];
    if (state.resolution) specs.push(`Resolution: ${state.resolution}`);
    if (state.aspectRatio) specs.push(`Aspect Ratio: ${state.aspectRatio}`);
    if (state.visualEffect && state.visualEffect !== 'None') specs.push(`Effect: ${state.visualEffect}` + getVeoEnhancement('visualEffect', state.visualEffect));
    
    if (specs.length > 0) {
        segments.push(`Technical Specs: ${specs.join(', ')}.`);
    }

    // 8. Negative Prompt
    if (state.negativePrompt) {
        segments.push(`Negative Prompt (Exclude): ${state.negativePrompt}`);
    }
    
    // 9. Spatial Directions (New in v3)
    if (state.spatialMotions && Object.keys(state.spatialMotions).length > 0) {
        const spatialDirectives = Object.entries(state.spatialMotions)
            .map(([grid, motion]) => `Grid ${grid}: ${motion}`)
            .join('; ');
        segments.push(`Spatial Directives: ${spatialDirectives}.`);
    }

    return segments.join('\n\n');
};

/**
 * Builds a prompt for a single shot within a StoryBoard sequence, 
 * injecting detailed character profile AND location profile data if provided.
 */
export const buildShotPrompt = (
    globalContext: { style: string; character: string; setting: string },
    shot: Partial<Shot>,
    characterProfile?: CharacterProfile,
    locationProfile?: LocationProfile
): string => {
    const parts: string[] = [];

    // 1. Style & Setting (Context)
    if (globalContext.style) parts.push(`Visual Style: ${globalContext.style}`);
    
    // Logic: LocationProfile > Global Setting
    if (locationProfile) {
        parts.push(`Setting: ${locationProfile.description || locationProfile.name}`);
    } else if (globalContext.setting) {
        parts.push(`Setting: ${globalContext.setting}`);
    }

    // 2. Character & Action
    let characterText = globalContext.character || "A character";
    
    if (characterProfile) {
        // Detailed Profile Construction
        const attributes = [
            characterProfile.attributes.age !== 'Any' ? characterProfile.attributes.age : '',
            characterProfile.attributes.gender !== 'Any' ? characterProfile.attributes.gender : '',
            characterProfile.attributes.ethnicity !== 'Any' ? characterProfile.attributes.ethnicity : '',
            characterProfile.attributes.bodyType,
            characterProfile.attributes.skinTone !== 'Any' ? characterProfile.attributes.skinTone : ''
        ].filter(Boolean).join(', ');

        const appearance = [
            characterProfile.appearance.hair,
            characterProfile.appearance.eyes,
            characterProfile.appearance.distinguishingFeatures
        ].filter(Boolean).join(', ');

        const wardrobe = characterProfile.wardrobe ? `wearing ${characterProfile.wardrobe}` : '';

        // Combine into a dense visual description
        const descParts = [attributes, appearance, wardrobe].filter(Boolean).join('; ');
        
        // Explicitly name and describe the character for consistency
        characterText = `The character ${characterProfile.name} (${descParts})`;
    }

    // Explicit Action Structure
    parts.push(`${characterText} is ${shot.action}`);

    // 3. Camera
    if (shot.camera) parts.push(`Camera: ${shot.camera}`);

    // 4. Chroma Key / Green Screen Instruction
    if (shot.isGreenScreen) {
        parts.push("Subject stands against a solid, chroma-key green background. Even, flat studio lighting.");
    }

    return parts.join('. ') + '.';
};

/**
 * Checks the prompt against the Series Bible rules.
 * If rules are violated, returns a rewritten prompt compliant with the bible.
 * If no violation, returns the original prompt.
 */
export const enforceLore = async (prompt: string, bible: string): Promise<string> => {
    if (!bible || !bible.trim()) {
        return prompt;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const instruction = `You are a narrative continuity supervisor for a film production.
    
    Series Bible / Rules:
    "${bible}"
    
    Current Prompt:
    "${prompt}"
    
    Task: Check if the Current Prompt violates any rules in the Series Bible (e.g. anachronisms, wrong setting, impossible magic).
    
    If VIOLATION DETECTED:
    Rewrite the prompt to comply with the rules while preserving the original user intent and action as much as possible. Return ONLY the rewritten prompt.
    
    If NO VIOLATION:
    Return the string "NO_CHANGE".`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview', // Fast model for quick checks
            contents: instruction,
        }));

        const result = response.text?.trim();
        
        if (!result || result === "NO_CHANGE") {
            return prompt;
        }
        
        return result;
    } catch (error) {
        console.error("Lore enforcement failed, proceeding with original prompt.", error);
        return prompt;
    }
};
