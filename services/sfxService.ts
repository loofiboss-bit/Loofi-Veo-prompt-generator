
import * as geminiService from './geminiService';
import { createWavHeader } from '../utils/audio';

/**
 * Generates a sound effect based on a text prompt.
 * Uses Gemini Native Audio (via geminiService) but allows for future swapping to other providers.
 * 
 * @param prompt Text description of the sound (e.g. "Heavy rain on tin roof").
 * @returns A Blob containing the audio data (WAV format).
 */
export const generateSound = async (prompt: string): Promise<Blob> => {
    if (!prompt.trim()) {
        throw new Error("Prompt is empty");
    }

    try {
        // 1. Generate Raw Audio Base64 from Gemini
        const base64Audio = await geminiService.generateSoundEffect(prompt);
        
        if (!base64Audio) {
            throw new Error("Audio generation failed");
        }

        // 2. Decode Base64 to Byte Array
        const byteCharacters = atob(base64Audio);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // 3. Create WAV Header (Gemini Native Audio is 24kHz Mono 16-bit)
        // Adjust sample rate if model spec changes, currently standardized for preview-12-2025
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        
        const wavHeader = createWavHeader(byteArray.length, sampleRate, numChannels, bitsPerSample);

        // 4. Return Blob
        return new Blob([wavHeader, byteArray], { type: 'audio/wav' });

    } catch (error) {
        console.error("SFX Generation Error:", error);
        throw error;
    }
};

/**
 * Generates a seamless looping ambience texture based on a scene description.
 * Appends specific keywords to ensure the model generates background noise rather than distinct events.
 * 
 * @param sceneType The location or scene description (e.g. "Beach at sunset", "Cyberpunk city").
 */
export const getAmbience = async (sceneType: string): Promise<Blob> => {
    const prompt = `Looping background ambience, no music, environmental texture, continuous sound for: ${sceneType}`;
    return generateSound(prompt);
};

/**
 * Fallback / Mock implementation for testing without API usage (Optional)
 * Not used in primary flow but kept for structure requirements if needed.
 */
export const searchFreeSound = async (query: string): Promise<Blob | null> => {
    console.log(`Mock searching Freesound for: ${query}`);
    return null; // Placeholder
};
