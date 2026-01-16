
import { PromptState, CharacterProfile, Shot, LocationProfile } from '../types';
import { soraPromptTemplate } from '../translations';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { retryOperation } from '../utils/retry';

/**
 * Replaces {{KEY}} in text with values from the variables object.
 */
export const interpolateVariables = (text: string, variables: Record<string, string>): string => {
    if (!text) return "";
    return text.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (match, key) => {
        return variables[key] || match; // Return original {{KEY}} if missing, to signal error to user
    });
};

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

export const buildGeminiPrompt = (state: PromptState, variables: Record<string, string> = {}): string => {
    // 1. Interpolate variables into all text fields of the state first
    // Note: Shallow copy to avoid mutating original state
    const iState = { ...state };
    iState.idea = interpolateVariables(state.idea, variables);
    iState.environment = interpolateVariables(state.environment, variables);
    iState.characterActions = interpolateVariables(state.characterActions, variables);
    // ... we could interpolate more fields, but these are the main free-text ones.

    // Sora Emulation Mode
    if (iState.targetModel === 'sora') {
        const lang = iState.language || 'en';
        // Fallback to English if translation missing or using generic structure
        const template = soraPromptTemplate[lang] || soraPromptTemplate['en'];
        
        if (!template) {
            // Hard fallback if translation is completely missing
            return `Create a physics-compliant video simulation of: ${iState.idea}. Ensure photorealism and causal consistency.`;
        }

        const paramsList = [
            `Environment: ${iState.environment}`,
            iState.timeOfDay !== 'Any' ? `Time: ${iState.timeOfDay}` : '',
            iState.weather !== 'Any' ? `Weather: ${iState.weather}` : '',
            iState.artStyle ? `Visual Style: ${iState.artStyle}` : '',
            iState.cameraMovement !== 'Static shot' ? `Camera: ${iState.cameraMovement}` : '',
            iState.motionIntensity ? `Motion: ${iState.motionIntensity}` : '',
            iState.environmentDynamicEvents ? `Dynamics: ${iState.environmentDynamicEvents}` : '',
            iState.environmentSensoryDetails ? `Sensory: ${iState.environmentSensoryDetails}` : '',
            iState.spatialMotions && Object.keys(iState.spatialMotions).length > 0 
                ? `Spatial Directives: ${JSON.stringify(iState.spatialMotions)}` 
                : ''
        ].filter(Boolean).join('\n');

        return template
            .replace('{idea}', iState.idea)
            .replace('{parameterList}', paramsList);
    }

    // Veo 3.1 Mode (Cinematic Default)
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
        style += getVeoEnhancement('artStyle', iState.artStyle === 'Custom' ? iState.customArtStyle : iState.artStyle);
        segments.push(style);
    }

    // 3. Environment
    if (iState.environment) {
        let env = `Setting: ${iState.environment}`;
        env += getVeoEnhancement('environment', iState.environment);
        segments.push(env);
    }

    // 4. Lighting & Atmosphere
    const lighting = [];
    if (iState.timeOfDay && iState.timeOfDay !== 'Any') lighting.push(iState.timeOfDay);
    if (iState.weather && iState.weather !== 'Any') lighting.push(iState.weather);
    if (iState.lightingStyle && iState.lightingStyle !== 'Any') {
        lighting.push(iState.lightingStyle + getVeoEnhancement('lightingStyle', iState.lightingStyle));
    }
    if (lighting.length > 0) {
        segments.push(`Lighting/Atmosphere: ${lighting.join(', ')}.`);
    }

    // 5. Camera & Optics
    const camera = [];
    if (iState.cameraMovement) camera.push(iState.cameraMovement + getVeoEnhancement('cameraMovement', iState.cameraMovement));
    if (iState.cameraDistance) camera.push(iState.cameraDistance);
    if (iState.lensType) camera.push(iState.lensType + getVeoEnhancement('lensType', iState.lensType));
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
            cloth += getVeoEnhancement('characterClothing', iState.characterClothing);
            charParts.push(cloth);
        }
        segments.push(`Character: ${charParts.join(', ')}.`);
    }

    // 7. Tech Specs
    const specs = [];
    if (iState.resolution) specs.push(`Resolution: ${iState.resolution}`);
    if (iState.aspectRatio) specs.push(`Aspect Ratio: ${iState.aspectRatio}`);
    if (iState.visualEffect && iState.visualEffect !== 'None') specs.push(`Effect: ${iState.visualEffect}` + getVeoEnhancement('visualEffect', iState.visualEffect));
    
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
};

/**
 * Builds a prompt for a single shot within a StoryBoard sequence, 
 * injecting detailed character profile AND location profile data if provided.
 */
export const buildShotPrompt = (
    globalContext: { style: string; character: string; setting: string },
    shot: Partial<Shot>,
    characterProfile?: CharacterProfile,
    locationProfile?: LocationProfile,
    variables: Record<string, string> = {}
): string => {
    // 0. Interpolate Inputs
    const iGlobalStyle = interpolateVariables(globalContext.style, variables);
    const iGlobalCharacter = interpolateVariables(globalContext.character, variables);
    const iGlobalSetting = interpolateVariables(globalContext.setting, variables);
    const iShotAction = interpolateVariables(shot.action || "", variables);
    
    const parts: string[] = [];

    // 1. Style & Setting (Context)
    if (iGlobalStyle) parts.push(`Visual Style: ${iGlobalStyle}`);
    
    // Logic: LocationProfile > Global Setting
    if (locationProfile) {
        parts.push(`Setting: ${locationProfile.description || locationProfile.name}`);
    } else if (iGlobalSetting) {
        parts.push(`Setting: ${iGlobalSetting}`);
    }

    // 2. Character & Action
    let characterText = iGlobalCharacter || "A character";
    
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
    parts.push(`${characterText} is ${iShotAction}`);

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
