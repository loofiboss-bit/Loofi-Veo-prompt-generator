
import { PromptState, CharacterProfile, Shot, LocationProfile } from '../types';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { retryOperation } from '../utils/retry';
import { VideoModelAdapter } from './adapters/VideoModelAdapter';
import { VeoAdapter } from './adapters/VeoAdapter';
import { SoraAdapter } from './adapters/SoraAdapter';
import { getStoredApiKey } from './apiKeyService';

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
 * Factory function to get the appropriate adapter.
 */
const getModelAdapter = (model: string): VideoModelAdapter => {
    if (model === 'sora') {
        return new SoraAdapter();
    }
    // Default to Veo for 'veo' or any fallback
    return new VeoAdapter();
};

/**
 * Main Entry Point: Builds the prompt using the appropriate model adapter.
 */
export const buildGeminiPrompt = (state: PromptState, variables: Record<string, string> = {}): string => {
    const adapter = getModelAdapter(state.targetModel);

    // Optional: Log validation warnings to console (or could return them)
    const warnings = adapter.validateConstraints(state);
    if (warnings.length > 0) {
        console.warn("Prompt constraints:", warnings);
    }

    return adapter.buildPrompt(state, variables);
};

/**
 * Builds a prompt for a single shot within a StoryBoard sequence.
 * Kept as a standalone utility for now, but uses interpolation shared logic.
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
 */
export const enforceLore = async (prompt: string, bible: string): Promise<string> => {
    if (!bible || !bible.trim()) {
        return prompt;
    }

    const apiKey = getStoredApiKey() || process.env.API_KEY;
    if (!apiKey) {
        throw new Error('No API key configured. Please set your Gemini API key in Settings.');
    }
    const ai = new GoogleGenAI({ apiKey });

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
            model: 'gemini-3-pro-preview', // High reasoning model for rule enforcement
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
