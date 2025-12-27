
import { GoogleGenAI, Type, Chat, Modality, GenerateContentResponse } from "@google/genai";
import { PromptState, VeoPromptResponse, EditedImageResponse, GroundingChunk } from '../types';
import { retryOperation } from '../utils/retry';
import { parseAndThrowApiError } from '../utils/apiErrors';
import { buildGeminiPrompt } from './promptBuilder';

const getAiClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const safelyParseJsonResponse = <T>(text: string): T => {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    try {
        return JSON.parse(cleanText) as T;
    } catch (e) {
        console.warn("Failed to parse JSON response:", text);
        return {} as T;
    }
};

export const generateVeoPrompt = async (state: PromptState, userCoords: {latitude: number, longitude: number} | null): Promise<VeoPromptResponse> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const prompt = buildGeminiPrompt(state);
            
            const systemInstruction = "You are an expert prompt engineer for generative video models like Veo and Sora. Your goal is to refine the user's input into a detailed, high-fidelity prompt.";
            
            const tools: any[] = [];
            if (state.useGoogleSearch) {
                tools.push({ googleSearch: {} });
            }
            if (state.useGoogleMaps && state.model.includes('gemini-2.5')) {
                 tools.push({ googleMaps: {} });
            }

            const toolConfig = (state.useGoogleMaps && userCoords) ? {
                retrievalConfig: {
                    latLng: {
                        latitude: userCoords.latitude,
                        longitude: userCoords.longitude
                    }
                }
            } : undefined;

            const response = await ai.models.generateContent({
                model: state.model,
                contents: prompt,
                config: {
                    systemInstruction,
                    tools: tools.length > 0 ? tools : undefined,
                    toolConfig: toolConfig,
                }
            });

            return {
                prompt: response.text || "",
                groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks as unknown as GroundingChunk[]
            };

        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const generatePromptVariations = async (basePrompt: string, language: string, model: string, targetModel: 'veo' | 'sora'): Promise<string[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Generate 3 distinct variations of the following video prompt. 
                Variation 1: More dramatic and cinematic.
                Variation 2: More surreal and abstract.
                Variation 3: More realistic and grounded.
                Target Model: ${targetModel}.
                Language: ${language}.
                Prompt: "${basePrompt}"`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            return safelyParseJsonResponse<string[]>(response.text || "[]");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const refinePrompt = async (prompt: string, state: PromptState): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: state.model,
                contents: `Refine this video prompt to be more descriptive, improving visual vocabulary and flow. Keep the core idea.
                Prompt: "${prompt}"`,
            });
            return response.text || prompt;
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const generateConceptArt = async (prompt: string, aspectRatio: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: prompt,
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatio as any
                    }
                }
            });
            
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image generated.");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const generateStoryboard = async (prompt: string, aspectRatio: string): Promise<string[]> => {
    const promises = Array(4).fill(null).map(() => generateConceptArt(prompt, aspectRatio));
    const results = await Promise.allSettled(promises);
    return results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<string>).value);
};

export const analyzeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Audio, mimeType: mimeType } },
                        { text: "Analyze this audio. Describe the ambient sound, mood, and any specific sound effects or voices present. Be concise." }
                    ]
                }
            });
            return response.text || "";
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const analyzeIdeaForModifiers = async (
    idea: string, 
    language: string, 
    options: any,
    generateAsSeries: boolean,
    model: string,
    targetModel: string
): Promise<Partial<PromptState>> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Analyze the following video idea and suggest suitable modifier values.
                Idea: "${idea}"
                Language: ${language}
                Return a JSON object matching the PromptState structure.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            artStyle: { type: Type.STRING },
                            cameraMovement: { type: Type.STRING },
                            timeOfDay: { type: Type.STRING },
                            weather: { type: Type.STRING },
                            characterGender: { type: Type.STRING },
                            characterArchetype: { type: Type.STRING },
                        }
                    }
                }
            });
            return safelyParseJsonResponse(response.text || "{}");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const suggestFullAudioDesign = async (
    params: any,
    language: string,
    model: string,
    ambientOptions: string[],
    sfxOptions: string[]
): Promise<{ suggestedVoiceStyle: string, suggestedVoiceOverScript: string, suggestedAmbientSound: string, suggestedSoundEffectsIntensity: string }> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Suggest audio design. Idea: ${params.idea}. Mood: ${params.characterMood}.`,
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
            return safelyParseJsonResponse(response.text || "{}");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const suggestEnvironmentDetails = async (environment: string, language: string, model: string): Promise<{ environmentSensoryDetails?: string, environmentDynamicEvents?: string }> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Suggest sensory details and dynamic events for: ${environment}`,
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
            return safelyParseJsonResponse(response.text || "{}");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const suggestSensoryDetails = async (environment: string, weather: string, timeOfDay: string, language: string, model: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Suggest 3-4 vivid sensory details (specifically sounds and smells) for this environment: "${environment}".
                Context: Weather is ${weather}, Time is ${timeOfDay}.
                Focus on atmospheric immersion.
                Return a JSON object with a single string property 'details' containing comma-separated phrases.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { details: { type: Type.STRING } }
                    }
                }
            });
            return safelyParseJsonResponse<{ details: string }>(response.text || "{}").details || '';
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const suggestCharacterNuances = async (actions: string, mood: string, language: string, model: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Suggest character nuances. Actions: ${actions}. Mood: ${mood}.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { nuances: { type: Type.STRING } }
                    }
                }
            });
            return safelyParseJsonResponse<{ nuances: string }>(response.text || "{}").nuances || '';
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const suggestVisualEffect = async (artStyle: string, customArtStyle: string, mood: string, language: string, model: string, options: string[]): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Suggest a visual effect. Art Style: ${artStyle} ${customArtStyle}. Mood: ${mood}. Options: ${options.join(', ')}`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { effect: { type: Type.STRING } }
                    }
                }
            });
            return safelyParseJsonResponse<{ effect: string }>(response.text || "{}").effect || 'None';
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const suggestAdvancedSettings = async (params: any, language: string, model: string, options: any): Promise<{ negativePrompt: string, motionIntensity: string, creativityLevel: string }> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Suggest negative prompt, motion intensity and creativity level. Idea: ${params.idea}.`,
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
            return safelyParseJsonResponse(response.text || "{}");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const suggestArtStyles = async (input: string, language: string, model: string): Promise<string[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Suggest 3 art styles based on: ${input}. Return simple string array.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            return safelyParseJsonResponse<string[]>(response.text || "[]");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const suggestCharacterDetails = async (archetype: string, environment: string, language: string, model: string): Promise<{ clothingSuggestions: string[], accessorySuggestions: string[] }> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Suggest clothing and accessories for a ${archetype} in ${environment}.`,
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
            return safelyParseJsonResponse(response.text || "{}");
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
                model: model,
                contents: `Combine these prompt variations into one cohesive prompt: ${JSON.stringify(variations)}`
            });
            return response.text || "";
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const editImageWithGemini = async (base64Image: string, mimeType: string, prompt: string): Promise<EditedImageResponse> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: base64Image, mimeType: mimeType } },
                        { text: prompt }
                    ]
                }
            });
            
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return {
                        newImageBytes: part.inlineData.data,
                        newMimeType: part.inlineData.mimeType || 'image/png'
                    };
                }
            }
            throw new Error("No edited image returned.");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const suggestSunoTitles = async (idea: string, language: string, model: string): Promise<string[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Suggest 3 song titles for a song about: "${idea}".`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            });
            return safelyParseJsonResponse<string[]>(response.text || "[]");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const suggestSunoStyles = async (idea: string, language: string, model: string): Promise<string[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Suggest 3 musical styles for a song about: "${idea}".`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            });
            return safelyParseJsonResponse<string[]>(response.text || "[]");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const generateLyricsForSuno = async (idea: string, style: string, theme: string, language: string, model: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Write lyrics for a song. Idea: ${idea}. Style: ${style}. Theme: ${theme}. Include [Verse], [Chorus] tags.`
            });
            return response.text || "";
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const generateSpeech = async (text: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: { parts: [{ text: text }] },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });
            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!audioData) throw new Error("No audio generated");
            return audioData;
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const analyzeVideo = async (base64Video: string, mimeType: string, prompt: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Video, mimeType: mimeType } },
                        { text: prompt }
                    ]
                }
            });
            return response.text || "";
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const createChat = (): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: "You are a helpful creative assistant." }
    });
};

export const sendMessageToChatStream = async function* (chat: Chat, message: string): AsyncGenerator<{ text: string }> {
    const responseStream = await chat.sendMessageStream({ message });
    for await (const chunk of responseStream) {
        yield { text: (chunk as GenerateContentResponse).text || "" };
    }
};

export const generateVideo = async (prompt: string, image: { imageBytes: string, mimeType: string } | null, aspectRatio: string, resolution: '1080p' | '720p', veoModel: 'fast' | 'quality'): Promise<any> => {
    try {
        const ai = getAiClient();
        const modelName = veoModel === 'fast' ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';
        
        const config: any = {
            numberOfVideos: 1,
            resolution: resolution,
            aspectRatio: aspectRatio,
        };

        const args: any = {
            model: modelName,
            prompt: prompt,
            config: config
        };

        if (image) {
            args.image = {
                imageBytes: image.imageBytes,
                mimeType: image.mimeType
            };
        }

        return await ai.models.generateVideos(args);
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const pollVideoOperation = async (operation: any): Promise<any> => {
    try {
        const ai = getAiClient();
        return await ai.operations.getVideosOperation({ operation: operation });
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const fetchVideo = async (downloadUri: string): Promise<string> => {
    try {
        const response = await fetch(`${downloadUri}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error("Failed to fetch video content");
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
