
import { GoogleGenAI, GenerateContentResponse, Type, Modality, Chat } from '@google/genai';
import { buildGeminiPrompt } from './promptBuilder';
import { PromptGenerationParams, VeoPromptResponse, GroundingChunk, EditedImageResponse } from '../types';
import { parseAndThrowApiError, ApiError, ApiErrorType } from '../utils/apiErrors';
import { appUIStrings } from '../translations';
import { MUSIC_GENRES } from '../constants';

// Returns a new instance of the GoogleGenAI client.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * advanced JSON cleaner and parser.
 * Handles:
 * 1. Markdown code blocks (```json ... ```)
 * 2. <think>...</think> blocks from reasoning models
 * 3. Raw text preambles/postambles
 */
function safelyParseJsonResponse<T>(responseText: string): T {
    const friendlyErrorMsg = "The AI returned data in an unexpected format. Please try again.";
    if (!responseText || !responseText.trim()) {
        throw new ApiError("The AI returned an empty response. Please try again.", ApiErrorType.JsonResponseError);
    }

    try {
        let cleanText = responseText;

        // 1. Remove <think>...</think> blocks (greedy match across newlines)
        cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/g, '');

        // 2. Remove Markdown code blocks
        cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // 3. Find the first '{' and the last '}' to isolate the JSON object
        const firstOpenBrace = cleanText.indexOf('{');
        const lastCloseBrace = cleanText.lastIndexOf('}');

        if (firstOpenBrace !== -1 && lastCloseBrace !== -1 && lastCloseBrace > firstOpenBrace) {
            cleanText = cleanText.substring(firstOpenBrace, lastCloseBrace + 1);
        }

        const parsed = JSON.parse(cleanText);
        
        // Null check after parse
        if (parsed === null) return {} as T;
        
        return parsed as T;
    } catch (e) {
        console.error("JSON parsing error:", e, "Raw response text:", responseText);
        throw new ApiError(friendlyErrorMsg, ApiErrorType.JsonResponseError, e);
    }
}


// In-memory cache for frequently requested suggestions to reduce redundant API calls.
const suggestionCache = new Map<string, any>();

/**
 * A higher-order function that adds in-memory caching to an async function.
 */
const withCache = <T extends (...args: any[]) => Promise<any>>(fn: T, fnName: string): T => {
    const cachedFn = async (...args: Parameters<T>): Promise<any> => {
        const cacheKey = `${fnName}:${JSON.stringify(args)}`;
        if (suggestionCache.has(cacheKey)) {
            return suggestionCache.get(cacheKey);
        }
        const result = await fn(...args);
        suggestionCache.set(cacheKey, result);
        return result;
    };
    return cachedFn as T;
};

// --- Uncached core function for keyword extraction ---
const _extractKeywordsFromIdeaUncached = async (idea: string, language: string, model: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = `You are an expert in search query optimization. Your task is to analyze the user's 'Core Idea' for a video and extract the most relevant and specific keywords that would be useful for a Google Search to find up-to-date information or visual references. Return only a list of these keywords. Focus on named entities (people, places, things), specific actions, and unique descriptive terms. Avoid generic words. Respond in the language with this ISO 639-1 code: ${language}.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash', 
            contents: `Extract keywords from this idea: "${idea}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        keywords: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'A specific and relevant keyword for a Google Search.'
                            }
                        }
                    },
                    required: ['keywords']
                }
            }
        });

        const jsonResponse = safelyParseJsonResponse<{ keywords: string[] }>(response.text || "{}");
        const keywords = jsonResponse.keywords || [];
        return keywords.length > 0 ? keywords.join(', ') : idea;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

const cachedExtractKeywords = withCache(_extractKeywordsFromIdeaUncached, 'extractKeywordsFromIdea');

export const extractKeywordsFromIdea = async (idea: string, language: string, model: string): Promise<string> => {
    try {
        return await cachedExtractKeywords(idea, language, model);
    } catch (error) {
        console.error("Keyword extraction failed, falling back to original idea:", error);
        return idea;
    }
};


/**
 * Generates a creative prompt for Veo based on user-defined parameters.
 */
export const generateVeoPrompt = async (
    params: PromptGenerationParams,
    userCoords?: { latitude: number, longitude: number } | null
): Promise<VeoPromptResponse> => {
  try {
    const ai = getAiClient();
    const systemInstruction = buildGeminiPrompt(params);
    let generationModel = params.model || 'gemini-3-pro-preview';
    
    const config: any = {
      systemInstruction,
      tools: []
    };

    // If Thinking Mode is enabled, force the Pro model and set the thinking budget.
    if (params.thinkingMode) {
        generationModel = 'gemini-3-pro-preview';
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    // The main content for the prompt/search query.
    let content = params.idea;

    if (params.useGoogleSearch) {
      config.tools.push({ googleSearch: {} });
      const ideaKeywords = await extractKeywordsFromIdea(params.idea, params.language, params.model);
      const keyElements = [
        ideaKeywords,
        params.environment,
        params.characterActions,
        params.artStyle === 'Custom' ? params.customArtStyle : params.artStyle,
      ].filter(el => el && el.trim() !== '' && !['Any', 'None'].includes(el)).join(', ');

      if (keyElements.trim()) content = keyElements;
    }

    if (params.useGoogleMaps) {
        config.tools.push({ googleMaps: {} });
        if (userCoords) {
            config.toolConfig = {
                retrievalConfig: { latLng: userCoords }
            };
        }
    }
    
    if (config.tools.length === 0) delete config.tools;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: generationModel,
      contents: content,
      config: config
    });

    const text = response.text;
    if (!text) {
        throw new Error("The AI model did not return a generated prompt. Please try again.");
    }

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    return {
      prompt: text,
      groundingChunks: groundingMetadata?.groundingChunks as GroundingChunk[] | undefined,
    };
  } catch (error) {
    parseAndThrowApiError(error);
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, 
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error('TTS generation failed, no audio data returned.');
        }
        return base64Audio;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generatePromptVariations = async (
    basePrompt: string, 
    language: 'en' | 'sv' | 'es' | 'fr' | 'de', 
    model: string,
    targetModel: 'veo' | 'sora'
): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const systemInstructionTemplate = (appUIStrings[language] || appUIStrings['en']).variationsSystemPrompt;
        const systemInstruction = systemInstructionTemplate
            .replace('{language}', language)
            .replace('{targetModel}', targetModel === 'sora' ? 'Sora' : 'Veo');

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model || 'gemini-3-pro-preview',
            contents: `Generate 3 variations for this prompt: "${basePrompt}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        variations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'A creative variation of the original prompt.'
                            }
                        }
                    },
                    required: ['variations']
                }
            }
        });

        const jsonResponse = safelyParseJsonResponse<{ variations: string[] }>(response.text || "{}");
        return jsonResponse.variations || [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const refinePrompt = async (currentPrompt: string, params: PromptGenerationParams): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstructionTemplate = (appUIStrings[params.language] || appUIStrings['en']).refineSystemPrompt;
        const systemInstruction = systemInstructionTemplate.replace('{targetModel}', params.targetModel === 'sora' ? 'Sora' : 'Veo');
        
        const userContent = `
            **Current Prompt to Refine:**
            "${currentPrompt}"

            **Key Creative Parameters:**
            - Art Style: ${params.artStyle === 'Custom' ? params.customArtStyle : params.artStyle}
            - Camera Movement: ${params.cameraMovement}
            - Color Palette: ${params.colorPalette}
            - Character Mood: ${params.characterMood}
            - Environment: ${params.environment}
            - Target Model: ${params.targetModel}
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: params.model || 'gemini-3-pro-preview',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        refinedPrompt: {
                            type: Type.STRING,
                            description: "The refined, single-paragraph cinematic prompt."
                        }
                    },
                    required: ['refinedPrompt']
                }
            }
        });
        
        const jsonResponse = safelyParseJsonResponse<{ refinedPrompt: string }>(response.text || "{}");
        return jsonResponse.refinedPrompt || currentPrompt;

    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const analyzeIdeaForModifiers = async (
    idea: string,
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    options: any,
    generateAsSeries: boolean,
    model: string,
    targetModel: 'veo' | 'sora'
): Promise<Partial<PromptGenerationParams>> => {
    try {
        const ai = getAiClient();
        const promptTemplates = (appUIStrings[language] || appUIStrings['en']).autoFillSystemPrompt;
        let systemInstruction = promptTemplates.base;

        if (targetModel === 'sora') {
            systemInstruction += `\n\n${promptTemplates.sora}`;
        } else {
            systemInstruction += `\n\n${promptTemplates.veo}`;
        }

        if (generateAsSeries) {
            systemInstruction += `\n\n**SERIES MODE ACTIVATED:** The user wants to generate a 3-part series. Suggest 'Documentary Narrator' or 'Standard Narrator'. Suggest 'Cinematic' styles and 'Tracking shot'.`;
        }

        const response = await ai.models.generateContent({
            model: model || 'gemini-3-pro-preview',
            contents: `Analyze this idea and suggest modifiers: "${idea}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        artStyle: { type: Type.STRING, enum: options.artStyles },
                        cameraMovement: { type: Type.STRING, enum: options.cameraMovements },
                        colorPalette: { type: Type.STRING, enum: options.colorPalettes },
                        timeOfDay: { type: Type.STRING, enum: options.timeOfDay },
                        weather: { type: Type.STRING, enum: options.weather },
                        visualEffect: { type: Type.STRING, enum: options.visualEffects },
                        cameraDistance: { type: Type.STRING, enum: options.cameraDistances },
                        characterGender: { type: Type.STRING, enum: options.characterGenders },
                        characterAge: { type: Type.STRING, enum: options.characterAges },
                        characterMood: { type: Type.STRING, enum: options.characterMoods },
                        characterPose: { type: Type.STRING, enum: options.characterPoses },
                        characterClothing: { type: Type.STRING, enum: options.characterClothings },
                        characterSkinTone: { type: Type.STRING, enum: options.characterSkinTones },
                        ambientSound: { type: Type.STRING, enum: options.ambientSounds },
                        soundEffectsIntensity: { type: Type.STRING, enum: options.soundEffectsIntensity },
                        voiceStyle: { type: Type.STRING, enum: options.voiceStyles },
                        architecturalStyle: { type: Type.STRING, enum: options.architecturalStyles },
                        lightingStyle: { type: Type.STRING, enum: options.lightingStyles },
                        compositionalGuide: { type: Type.STRING, enum: options.compositionalGuides },
                        motionIntensity: { type: Type.STRING, enum: options.motionIntensity },
                        creativityLevel: { type: Type.STRING, enum: options.creativityLevel },
                    },
                    required: ['artStyle', 'cameraMovement', 'colorPalette']
                }
            }
        });
        
        return safelyParseJsonResponse<Partial<PromptGenerationParams>>(response.text || "{}");

    } catch (error) {
        parseAndThrowApiError(error);
    }
};

const _suggestSunoTitlesUncached = async (idea: string, language: string, model: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestSunoTitlesSystemPrompt;
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Generate titles for this song idea: "${idea}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        titles: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['titles']
                }
            }
        });
        const jsonResponse = safelyParseJsonResponse<{ titles: string[] }>(response.text || "{}");
        return jsonResponse.titles || [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestSunoTitles = withCache(_suggestSunoTitlesUncached, 'suggestSunoTitles');

const _suggestSunoStylesUncached = async (idea: string, language: string, model: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestSunoStylesSystemPrompt.replace('{MUSIC_GENRES}', MUSIC_GENRES);
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Generate styles for this song idea: "${idea}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        styles: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['styles']
                }
            }
        });
        const jsonResponse = safelyParseJsonResponse<{ styles: string[] }>(response.text || "{}");
        return jsonResponse.styles || [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestSunoStyles = withCache(_suggestSunoStylesUncached, 'suggestSunoStyles');

export const generateLyricsForSuno = async (
    idea: string,
    styleOfMusic: string,
    lyricalTheme: string,
    language: string,
    model: string
): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = `You are an expert songwriter. Respond ONLY with a valid JSON object containing the lyrics. Respond in the language with this ISO 639-1 code: ${language}.`;
        const userContent = `Song Idea: "${idea}"\nStyle of Music: "${styleOfMusic}"\nLyrical Themes/Mood: "${lyricalTheme || 'Not specified'}"`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-3-pro-preview',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { lyrics: { type: Type.STRING } },
                    required: ['lyrics']
                }
            }
        });

        const jsonResponse = safelyParseJsonResponse<{ lyrics: string }>(response.text || "{}");
        const lyrics = jsonResponse.lyrics || '';
        return lyrics.replace(/\\n/g, '\n');

    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const suggestFullAudioDesign = async (
    params: any,
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    model: string,
    ambientSoundOptions: string[],
    soundEffectsIntensityOptions: string[]
): Promise<any> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestFullAudioSystemPrompt;
        const userContent = `Core Idea: "${params.idea}"\nEnvironment: "${params.environment}"\nMood: "${params.characterMood}"\nActions: "${params.characterActions}"\nArt Style: "${params.artStyle}"`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestedVoiceStyle: { type: Type.STRING, enum: params.voiceStyleOptions },
                        suggestedVoiceOverScript: { type: Type.STRING },
                        suggestedAmbientSound: { type: Type.STRING, enum: ambientSoundOptions },
                        suggestedSoundEffectsIntensity: { type: Type.STRING, enum: soundEffectsIntensityOptions }
                    },
                    required: ['suggestedVoiceStyle', 'suggestedVoiceOverScript', 'suggestedAmbientSound', 'suggestedSoundEffectsIntensity']
                }
            }
        });
        
        return safelyParseJsonResponse<any>(response.text || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

const _suggestCameraDetailsUncached = async (
    params: any, // idea, environment, mood, artStyle
    language: string,
    model: string,
    options: any // { movements, distances, lenses, guides }
): Promise<any> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestCameraDetailsSystemPrompt;
        
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Scene: "${params.idea}"\nEnvironment: "${params.environment}"\nMood: "${params.mood}"\nStyle: "${params.artStyle}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        cameraMovement: { type: Type.STRING, enum: options.movements },
                        cameraDistance: { type: Type.STRING, enum: options.distances },
                        lensType: { type: Type.STRING, enum: options.lenses },
                        compositionalGuide: { type: Type.STRING, enum: options.guides },
                    },
                    required: ['cameraMovement', 'cameraDistance', 'lensType', 'compositionalGuide']
                }
            }
        });
        return safelyParseJsonResponse<any>(response.text || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestCameraDetails = withCache(_suggestCameraDetailsUncached, 'suggestCameraDetails');

const _suggestArtStylesUncached = async (userInput: string, language: string, model: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Suggest art styles related to: "${userInput}"`,
            config: {
                systemInstruction: `Provide 4 concise, descriptive art styles. Respond in language code: ${language}. JSON format.`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { suggestions: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ['suggestions']
                }
            }
        });

        const jsonResponse = safelyParseJsonResponse<{ suggestions: string[] }>(response.text || "{}");
        return jsonResponse.suggestions || [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestArtStyles = withCache(_suggestArtStylesUncached, 'suggestArtStyles');

const _suggestSensoryDetailsUncached = async (environment: string, language: string, model: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestSensoryDetailsSystemPrompt;
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Generate sensory details for this environment: "${environment}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { sensoryDetails: { type: Type.STRING } },
                    required: ['sensoryDetails']
                }
            }
        });
        const jsonResponse = safelyParseJsonResponse<{ sensoryDetails: string }>(response.text || "{}");
        return jsonResponse.sensoryDetails || '';
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestSensoryDetails = withCache(_suggestSensoryDetailsUncached, 'suggestSensoryDetails');

const _suggestCharacterNuancesUncached = async (actions: string, mood: string, language: string, model: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestCharacterNuancesSystemPrompt;
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Generate nuances for mood '${mood}', actions: "${actions}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { nuances: { type: Type.STRING } },
                    required: ['nuances']
                }
            }
        });
        const jsonResponse = safelyParseJsonResponse<{ nuances: string }>(response.text || "{}");
        return jsonResponse.nuances || '';
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestCharacterNuances = withCache(_suggestCharacterNuancesUncached, 'suggestCharacterNuances');

const _suggestCharacterActionsUncached = async (
    archetype: string,
    mood: string,
    environment: string,
    idea: string,
    language: string,
    model: string
): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestCharacterActionsSystemPrompt;
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Core Idea: "${idea}"\nArchetype: "${archetype}"\nMood: "${mood}"\nEnvironment: "${environment}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { characterActions: { type: Type.STRING } },
                    required: ['characterActions']
                }
            }
        });
        const jsonResponse = safelyParseJsonResponse<{ characterActions: string }>(response.text || "{}");
        return jsonResponse.characterActions || '';
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestCharacterActions = withCache(_suggestCharacterActionsUncached, 'suggestCharacterActions');

const _suggestVisualEffectUncached = async (
    idea: string,
    environment: string,
    artStyle: string, 
    customArtStyle: string, 
    mood: string, 
    language: string, 
    model: string, 
    visualEffectOptions: string[]
): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestVisualEffectSystemPrompt.replace('{language}', language);
        const style = artStyle === 'Custom' ? customArtStyle : artStyle;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Scene Idea: "${idea}"\nEnvironment: "${environment}"\nArt Style: "${style}"\nMood: "${mood}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        visualEffect: { type: Type.STRING, enum: visualEffectOptions }
                    },
                    required: ['visualEffect']
                }
            }
        });
        const jsonResponse = safelyParseJsonResponse<{ visualEffect: string }>(response.text || "{}");
        return jsonResponse.visualEffect || 'None';
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestVisualEffect = withCache(_suggestVisualEffectUncached, 'suggestVisualEffect');

export const suggestAdvancedSettings = async (
    params: any,
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    model: string,
    options: any
): Promise<{ negativePrompt: string; motionIntensity: string; creativityLevel: string; }> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestAdvancedSystemPrompt;
        const artStyle = params.artStyle === 'Custom' ? params.customArtStyle : params.artStyle;
        const userContent = `Core Idea: "${params.idea}"\nEnvironment: "${params.environment}"\nArt Style: "${artStyle}"`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        negativePrompt: { type: Type.STRING },
                        motionIntensity: { type: Type.STRING, enum: options.motionIntensityOptions },
                        creativityLevel: { type: Type.STRING, enum: options.creativityLevelOptions },
                    },
                    required: ['negativePrompt', 'motionIntensity', 'creativityLevel']
                }
            }
        });
        
        return safelyParseJsonResponse<any>(response.text || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

const _suggestCharacterDetailsUncached = async (
    archetype: string,
    environment: string,
    language: string,
    model: string
): Promise<{ clothingSuggestions: string[], accessorySuggestions: string[] }> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Suggest clothing/accessories for '${archetype}' in "${environment}"`,
            config: {
                systemInstruction: `Provide 5 creative suggestions. JSON format. Language: ${language}`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        clothingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        accessorySuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['clothingSuggestions', 'accessorySuggestions']
                }
            }
        });

        const jsonResponse = safelyParseJsonResponse<{ clothingSuggestions: string[], accessorySuggestions: string[] }>(response.text || "{}");
        return jsonResponse || { clothingSuggestions: [], accessorySuggestions: [] };
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestCharacterDetails = withCache(_suggestCharacterDetailsUncached, 'suggestCharacterDetails');

const _suggestEnvironmentDetailsUncached = async (
    environment: string,
    idea: string,
    language: string,
    model: string
): Promise<{ environmentSensoryDetails: string, environmentDynamicEvents: string, environment?: string }> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestEnvironmentSystemPrompt;
        
        // Use idea as context if environment is missing
        const content = environment ? `Environment: "${environment}"` : `Core Idea: "${idea}". (Invent a suitable environment first)`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: content,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        environmentSensoryDetails: { type: Type.STRING },
                        environmentDynamicEvents: { type: Type.STRING },
                        // Optional: suggest the environment text itself if it was empty
                        environment: { type: Type.STRING, description: "Only provide if original environment was empty" }
                    },
                    required: ['environmentSensoryDetails', 'environmentDynamicEvents']
                }
            }
        });
        
        return safelyParseJsonResponse<any>(response.text || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestEnvironmentDetails = withCache(_suggestEnvironmentDetailsUncached, 'suggestEnvironmentDetails');

export const generateConceptArt = async (prompt: string, aspectRatio: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio as any,
            },
        });

        const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!base64ImageBytes) throw new Error('Image generation failed.');
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateStoryboard = async (prompt: string, aspectRatio: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const systemInstruction = `Break down the video prompt into 4 distinct keyframes. Respond ONLY with JSON: {"shots": ["prompt1", "prompt2", "prompt3", "prompt4"]}`;

        const textResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Break down: "${prompt}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { shots: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ['shots']
                }
            }
        });

        const { shots } = safelyParseJsonResponse<{ shots: string[] }>(textResponse.text || "{}");
        if (!shots || shots.length === 0) throw new Error("Failed to generate storyboard shots.");

        const imagePromises = shots.slice(0, 4).map((shotPrompt: string) => 
            ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: shotPrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio as any,
                },
            })
        );
        
        const imageResults = await Promise.all(imagePromises);
        return imageResults.map(response => {
            const b64 = response.generatedImages?.[0]?.image?.imageBytes;
            if (!b64) throw new Error('Failed to generate storyboard frame.');
            return `data:image/jpeg;base64,${b64}`;
        });

    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const editImageWithGemini = async (imageData: string, mimeType: string, prompt: string): Promise<EditedImageResponse> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: imageData, mimeType } },
                    { text: prompt }
                ]
            },
            config: { responseModalities: [Modality.IMAGE] },
        });
        
        const imageContent = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imageContent && imageContent.inlineData) {
            return {
                newImageBytes: imageContent.inlineData.data,
                newMimeType: imageContent.inlineData.mimeType,
            };
        }
        throw new Error('Image editing failed.');
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateVideo = async (
  prompt: string,
  uploadedImage: { data: string; mimeType: string } | null,
  aspectRatio: string,
  resolution: '1080p' | '720p',
  veoModel: 'fast' | 'quality'
): Promise<any> => {
  try {
    const ai = getAiClient();
    const modelName = veoModel === 'fast' ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';

    const request: any = {
      model: modelName,
      prompt,
      config: { numberOfVideos: 1, resolution, aspectRatio: aspectRatio as any },
    };
    
    if (uploadedImage) {
      request.image = { imageBytes: uploadedImage.data, mimeType: uploadedImage.mimeType };
    }
    
    const operation = await ai.models.generateVideos(request);
    return operation;
  } catch (error) {
    parseAndThrowApiError(error);
  }
};

export const pollVideoOperation = async (operation: any): Promise<any> => {
    try {
        const ai = getAiClient();
        return await ai.operations.getVideosOperation({ operation });
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const fetchVideo = async (downloadLink: string): Promise<string> => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API_KEY not set.");
        const response = await fetch(`${downloadLink}&key=${apiKey}`);
        if (!response.ok) throw response;
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const combinePromptVariations = async (
    variations: string[],
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    model: string,
    targetModel: 'veo' | 'sora'
): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).combineSystemPrompt
            .replace('{targetModel}', targetModel === 'sora' ? 'Sora' : 'Veo');
        const userContent = `Combine these into one prompt:\n\n${variations.join('\n---\n')}`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-3-pro-preview',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { combinedPrompt: { type: Type.STRING } },
                    required: ['combinedPrompt']
                }
            }
        });

        const jsonResponse = safelyParseJsonResponse<{ combinedPrompt: string }>(response.text || "{}");
        return jsonResponse.combinedPrompt || '';

    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const createChat = (): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: 'You are a helpful creative assistant for Veo Prompt Architect.' },
    });
};

export const sendMessageToChatStream = async (chat: Chat, message: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
    try {
        return chat.sendMessageStream({ message });
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const analyzeVideo = async (videoData: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { data: videoData, mimeType } },
                    { text: prompt }
                ]
            },
        });
        return response.text || "No response generated.";
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const analyzeAudio = async (audioData: string, mimeType: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: audioData, mimeType } },
                    { text: "Describe this audio mood and sounds for a video prompt. Concise." }
                ]
            },
        });
        return (response.text || "").trim();
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
