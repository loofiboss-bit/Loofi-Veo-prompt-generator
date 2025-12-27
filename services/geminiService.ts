
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse, Chat } from "@google/genai";
import { parseAndThrowApiError } from '../utils/apiErrors';
import { retryOperation } from '../utils/retry';
import { PromptState, VeoPromptResponse } from '../types';
import { appUIStrings } from '../translations';
import { encode } from '../utils/audio';

// Helper to get the AI client
const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key is missing. Please set process.env.API_KEY.");
    }
    return new GoogleGenAI({ apiKey });
};

// Helper for caching
const cache = new Map<string, any>();
export const withCache = <T, Args extends any[]>(
    fn: (...args: Args) => Promise<T>,
    keyPrefix: string
) => {
    return async (...args: Args): Promise<T> => {
        const key = `${keyPrefix}-${JSON.stringify(args)}`;
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = await fn(...args);
        cache.set(key, result);
        return result;
    };
};

// Helper to safely parse JSON response
const safelyParseJsonResponse = <T>(text: string | undefined): T => {
    if (!text) throw new Error("Empty response from AI");
    try {
        const cleanedText = text.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error("Failed to parse JSON:", text);
        throw new Error("Failed to parse AI response as JSON");
    }
};

// --- Character Nuances ---
const _suggestCharacterNuancesUncached = async (actions: string, mood: string, language: string, model: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestCharacterNuancesSystemPrompt;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Generate subtle nuances for a character with mood '${mood}' performing these actions: "${actions}"`,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            nuances: {
                                type: Type.STRING,
                                description: "A string describing subtle character nuances."
                            }
                        },
                        required: ['nuances']
                    }
                }
            });

            const jsonResponse = safelyParseJsonResponse<{ nuances: string }>(response.text);
            return jsonResponse.nuances || '';
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};
export const suggestCharacterNuances = withCache(_suggestCharacterNuancesUncached, 'suggestCharacterNuances');

// --- Environment Details ---
export const suggestEnvironmentDetails = async (environment: string, language: string, model: string): Promise<{ environmentSensoryDetails?: string, environmentDynamicEvents?: string }> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Suggest sensory details and dynamic events for this environment: "${environment}". Return JSON.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            environmentSensoryDetails: { type: Type.STRING },
                            environmentDynamicEvents: { type: Type.STRING }
                        }
                    }
                }
            });
            return safelyParseJsonResponse(response.text);
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Sensory Details ---
export const suggestSensoryDetails = async (environment: string, language: string, model: string): Promise<string> => {
    const res = await suggestEnvironmentDetails(environment, language, model);
    return res.environmentSensoryDetails || '';
};

// --- Visual Effect ---
export const suggestVisualEffect = async (artStyle: string, customArtStyle: string, characterMood: string, language: string, model: string, availableEffects: string[]): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Suggest the best visual effect from this list: [${availableEffects.join(', ')}] for an art style "${artStyle} ${customArtStyle}" and mood "${characterMood}".`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { effect: { type: Type.STRING } }
                    }
                }
            });
            return safelyParseJsonResponse<{ effect: string }>(response.text).effect || 'None';
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Advanced Settings ---
export const suggestAdvancedSettings = async (context: any, language: string, model: string, options: any): Promise<any> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Suggest advanced settings (negativePrompt, motionIntensity, creativityLevel) for this video concept: ${JSON.stringify(context)}. Options: ${JSON.stringify(options)}`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            negativePrompt: { type: Type.STRING },
                            motionIntensity: { type: Type.STRING },
                            creativityLevel: { type: Type.STRING }
                        }
                    }
                }
            });
            return safelyParseJsonResponse(response.text);
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Art Styles ---
export const suggestArtStyles = async (input: string, language: string, model: string): Promise<string[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Suggest 3 specific art styles related to "${input}". Return a JSON array of strings.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            return safelyParseJsonResponse(response.text);
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Character Details ---
export const suggestCharacterDetails = async (archetype: string, environment: string, language: string, model: string): Promise<{ clothingSuggestions: string[], accessorySuggestions: string[] }> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Suggest 3 distinct clothing items and 3 accessories for a character with the archetype "${archetype}" located in this environment: "${environment}".
                Ensure the items are visually descriptive, contextually appropriate for the setting, and enhance the character's narrative role.
                Return a JSON object.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            clothingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            accessorySuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            });
            return safelyParseJsonResponse(response.text);
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Auto-fill Modifiers ---
export const analyzeIdeaForModifiers = async (idea: string, language: string, options: any, generateAsSeries: boolean, model: string, targetModel: string): Promise<any> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Analyze the idea: "${idea}" and select the best fit from the provided options for: artStyle, cameraMovement, timeOfDay, etc. Options: ${JSON.stringify(options)}`,
                config: { responseMimeType: "application/json" }
            });
            return safelyParseJsonResponse(response.text);
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Audio Design ---
export const suggestFullAudioDesign = async (params: any, language: string, model: string, ambientOptions: string[], sfxOptions: string[]): Promise<any> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Suggest a complete audio design, including voice style, voice-over script, ambient sound, and sound effect intensity, to match the scene's mood.
                Scene Context: ${JSON.stringify(params)}.
                Select the best fit from these Ambient Sound options: ${JSON.stringify(ambientOptions)}.
                Select the best fit from these SFX Intensity options: ${JSON.stringify(sfxOptions)}.
                Return a JSON object.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            suggestedVoiceStyle: { type: Type.STRING },
                            suggestedVoiceOverScript: { type: Type.STRING },
                            suggestedAmbientSound: { type: Type.STRING },
                            suggestedSoundEffectsIntensity: { type: Type.STRING }
                        }
                    }
                }
            });
            return safelyParseJsonResponse(response.text);
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Veo Prompt Generation ---
export const generateVeoPrompt = async (state: PromptState, userCoords: {latitude: number, longitude: number} | null): Promise<VeoPromptResponse> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            
            let tools: any[] = [];
            let toolConfig: any = undefined;

            if (state.useGoogleSearch) {
                 tools.push({ googleSearch: {} });
            }
            if (state.useGoogleMaps) {
                 tools.push({ googleMaps: {} });
                 if (userCoords) {
                     toolConfig = { retrievalConfig: { latLng: userCoords } };
                 }
            }
            
            // Construct a text prompt from the state manually since promptBuilder is essentially doing template replacement
            const promptText = `Construct a detailed video generation prompt based on this state: ${JSON.stringify(state)}. 
            ${state.targetModel === 'sora' ? 'Target Sora model style.' : 'Target Veo model style.'}
            If using tools, integrate the found information into the prompt.
            Return the final prompt string.`;

            const response = await ai.models.generateContent({
                model: state.model || 'gemini-3-pro-preview',
                contents: promptText,
                config: {
                    tools: tools.length > 0 ? tools : undefined,
                    toolConfig: toolConfig
                }
            });

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            
            return {
                prompt: response.text || '',
                groundingChunks: groundingChunks as any[]
            };

        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Video Generation (Veo) ---
export const generateVideo = async (prompt: string, image: { data: string, mimeType: string } | null, aspectRatio: string, resolution: '1080p' | '720p', veoModel: 'fast' | 'quality') => {
    return retryOperation(async () => {
        const ai = getAiClient();
        const model = veoModel === 'fast' ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';
        
        // Veo only supports 16:9 or 9:16
        const ar = (aspectRatio === '16:9' || aspectRatio === '9:16') ? aspectRatio : '16:9';

        const config: any = {
            numberOfVideos: 1,
            resolution: resolution,
            aspectRatio: ar
        };

        if (image) {
            return await ai.models.generateVideos({
                model,
                prompt,
                image: {
                    imageBytes: image.data,
                    mimeType: image.mimeType
                },
                config
            });
        } else {
            return await ai.models.generateVideos({
                model,
                prompt,
                config
            });
        }
    }, 2); // Limit video retries to 2 as they are expensive and long-running
};

export const pollVideoOperation = async (operation: any) => {
    // Polling is a lightweight operation, retry logic is good here to handle transient network blips
    return retryOperation(async () => {
        const ai = getAiClient();
        return await ai.operations.getVideosOperation({ operation });
    }, 5, 2000); // More retries for polling, higher delay
};

export const fetchVideo = async (uri: string): Promise<string> => {
    return retryOperation(async () => {
        const apiKey = process.env.API_KEY;
        const response = await fetch(`${uri}&key=${apiKey}`);
        if (!response.ok) throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    });
};

// --- Prompt Variations ---
export const generatePromptVariations = async (basePrompt: string, language: string, model: string, targetModel: string): Promise<string[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Generate 3 distinct variations of this video prompt: "${basePrompt}". Return JSON array.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            return safelyParseJsonResponse(response.text);
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const combinePromptVariations = async (variations: string[], language: string, model: string, targetModel: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Combine these prompt variations into one cohesive prompt: ${JSON.stringify(variations)}`
            });
            return response.text || '';
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Refine Prompt ---
export const refinePrompt = async (prompt: string, state: PromptState): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Refine and improve this video prompt for better visual generation: "${prompt}". Keep key elements from: ${JSON.stringify(state.idea)}`
            });
            return response.text || prompt;
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Concept Art ---
export const generateConceptArt = async (prompt: string, aspectRatio: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: (aspectRatio === '16:9' || aspectRatio === '9:16' || aspectRatio === '1:1') ? aspectRatio : '1:1',
                    outputMimeType: 'image/jpeg'
                }
            });
            const b64 = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${b64}`;
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Image Editing ---
export const editImageWithGemini = async (base64Image: string, mimeType: string, prompt: string): Promise<{ newImageBytes: string, newMimeType: string }> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Image, mimeType } },
                        { text: `Edit this image: ${prompt}` }
                    ]
                }
            });
            // Find image part
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return { newImageBytes: part.inlineData.data, newMimeType: part.inlineData.mimeType };
                }
            }
            throw new Error("No image generated");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Storyboard ---
export const generateStoryboard = async (prompt: string, aspectRatio: string): Promise<string[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: `Storyboard frames for: ${prompt}`,
                config: {
                    numberOfImages: 4,
                    aspectRatio: (aspectRatio === '16:9' || aspectRatio === '9:16' || aspectRatio === '1:1') ? aspectRatio : '1:1'
                }
            });
            return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Suno Studio ---
export const suggestSunoTitles = async (idea: string, language: string, model: string): Promise<string[]> => {
     return retryOperation(async () => {
         try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Suggest 5 song titles for an idea: "${idea}". Return JSON array.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            });
            return safelyParseJsonResponse(response.text);
        } catch (error) { parseAndThrowApiError(error); }
    });
};

export const suggestSunoStyles = async (idea: string, language: string, model: string): Promise<string[]> => {
     return retryOperation(async () => {
         try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Suggest 5 musical styles for a song about: "${idea}". Return JSON array.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            });
            return safelyParseJsonResponse(response.text);
        } catch (error) { parseAndThrowApiError(error); }
    });
};

export const generateLyricsForSuno = async (idea: string, style: string, theme: string, language: string, model: string): Promise<string> => {
     return retryOperation(async () => {
         try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Write lyrics for a song. Idea: "${idea}". Style: "${style}". Theme: "${theme}". Structure: Verse-Chorus-Verse-Chorus-Bridge-Chorus.`
            });
            return response.text || '';
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Video Analysis ---
export const analyzeVideo = async (base64Video: string, mimeType: string, prompt: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { data: base64Video, mimeType } },
                        { text: prompt }
                    ]
                }
            });
            return response.text || '';
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Chat ---
export const createChat = (): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: "You are a helpful assistant for building video prompts." }
    });
};

export const sendMessageToChatStream = async (chat: Chat, message: string) => {
    // Note: Streaming retries are complex. We usually don't retry the entire stream initiation automatically
    // to avoid duplicating partial content in the UI. We let the caller handle it.
    return await chat.sendMessageStream({ message });
};

// --- Audio / TTS ---
export const generateSpeech = async (text: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                    }
                }
            });
            return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const analyzeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { data: base64Audio, mimeType } },
                        { text: "Describe the ambient sound and mood of this audio clip in a short phrase suitable for a video prompt." }
                    ]
                }
            });
            return response.text || '';
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};
