import { GoogleGenAI, GenerateContentResponse, Type, Modality, Chat } from '@google/genai';
import { buildGeminiPrompt } from './promptBuilder';
import { PromptGenerationParams, VeoPromptResponse, GroundingChunk, EditedImageResponse } from '../types';
import { parseAndThrowApiError, ApiError, ApiErrorType } from '../utils/apiErrors';
import { appUIStrings } from '../translations';
import { MUSIC_GENRES } from '../constants';

// Returns a new instance of the GoogleGenAI client.
// This is called before each API request to ensure the most up-to-date API key is used,
// especially after the user selects a new key in the Veo flow.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Safely parses a JSON string from the Gemini API, handling potential markdown wrappers.
 * @param responseText The raw text from the API response.
 * @returns The parsed JSON object.
 * @throws An error with a user-friendly message if parsing fails or the response is empty.
 */
function safelyParseJsonResponse<T>(responseText: string): T {
    const friendlyErrorMsg = "The AI returned data in an unexpected format. Please try again.";
    if (!responseText || !responseText.trim()) {
        throw new ApiError("The AI returned an empty response. Please try again.", ApiErrorType.JsonResponseError);
    }
    try {
        // The Gemini API sometimes returns JSON wrapped in markdown backticks.
        const cleanResponseText = responseText.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(cleanResponseText) as T;
    } catch (e) {
        console.error("JSON parsing error:", e, "Raw response text:", responseText);
        throw new ApiError(friendlyErrorMsg, ApiErrorType.JsonResponseError, e);
    }
}


// In-memory cache for frequently requested suggestions to reduce redundant API calls.
const suggestionCache = new Map<string, any>();

/**
 * A higher-order function that adds in-memory caching to an async function.
 * Caches the result on success and propagates errors on failure without caching.
 * @param fn The async function to wrap.
 * @param fnName A unique name for the function to use in the cache key.
 * @returns A new async function with caching capabilities.
 */
const withCache = <T extends (...args: any[]) => Promise<any>>(fn: T, fnName: string): T => {
    const cachedFn = async (...args: Parameters<T>): Promise<any> => {
        const cacheKey = `${fnName}:${JSON.stringify(args)}`;
        if (suggestionCache.has(cacheKey)) {
            return suggestionCache.get(cacheKey);
        }
        // Await the result. If it fails, the promise rejects and the error propagates.
        // The result is only cached on success.
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
            model: model || 'gemini-2.5-flash', // Flash is sufficient for this task
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

        const jsonResponse = safelyParseJsonResponse<{ keywords: string[] }>(response.text);
        const keywords = jsonResponse.keywords || [];
        return keywords.length > 0 ? keywords.join(', ') : idea;
    } catch (error) {
        // Throw a structured error to be handled by the caller
        parseAndThrowApiError(error);
    }
};

// --- Create cached versions of functions ---
const cachedExtractKeywords = withCache(_extractKeywordsFromIdeaUncached, 'extractKeywordsFromIdea');

/**
 * Extracts key search terms from a core idea using the Gemini API for better search grounding.
 * This function includes a graceful fallback to the original idea if the API call fails.
 * @param idea - The user's core idea string.
 * @param language - The ISO 639-1 code for the language.
 * @param model - The Gemini model to use for extraction.
 * @returns A comma-separated string of keywords, or the original idea on failure.
 */
export const extractKeywordsFromIdea = async (idea: string, language: string, model: string): Promise<string> => {
    try {
        return await cachedExtractKeywords(idea, language, model);
    } catch (error) {
        // If keyword extraction fails, gracefully fall back to using the original idea.
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
    let generationModel = params.model || 'gemini-2.5-pro';
    
    // Base configuration for the model call.
    const config: any = {
      systemInstruction,
      tools: []
    };

    // If Thinking Mode is enabled, force the Pro model and set the thinking budget.
    if (params.thinkingMode) {
        generationModel = 'gemini-2.5-pro';
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

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    return {
      prompt: response.text,
      groundingChunks: groundingMetadata?.groundingChunks as GroundingChunk[] | undefined,
    };
  } catch (error) {
    parseAndThrowApiError(error);
  }
};

/**
 * Generates speech from text using the TTS model.
 * @param text The text to synthesize.
 * @returns A base64 encoded string of the raw PCM audio data.
 */
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
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A standard, clear voice
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

/**
 * Generates three variations for a given prompt.
 */
export const generatePromptVariations = async (basePrompt: string, language: 'en' | 'sv' | 'es' | 'fr' | 'de', model: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const systemInstructionTemplate = (appUIStrings[language] || appUIStrings['en']).variationsSystemPrompt;
        const systemInstruction = systemInstructionTemplate.replace('{language}', language);


        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model || 'gemini-2.5-pro',
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

        const jsonResponse = safelyParseJsonResponse<{ variations: string[] }>(response.text);
        return jsonResponse.variations || [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Refines a prompt to be more cinematic and detailed.
 */
export const refinePrompt = async (currentPrompt: string, params: PromptGenerationParams): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[params.language] || appUIStrings['en']).refineSystemPrompt;
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
            model: params.model || 'gemini-2.5-pro',
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
        
        const jsonResponse = safelyParseJsonResponse<{ refinedPrompt: string }>(response.text);
        return jsonResponse.refinedPrompt || currentPrompt;

    } catch (error) {
        parseAndThrowApiError(error);
    }
};


/**
 * Analyzes a core idea and suggests modifiers using Gemini's JSON mode.
 */
export const analyzeIdeaForModifiers = async (
    idea: string,
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    options: {
        artStyles: string[];
        cameraMovements: string[];
        colorPalettes: string[];
        timeOfDay: string[];
        weather: string[];
        visualEffects: string[];
        cameraDistances: string[];
        characterGenders: string[];
        characterAges: string[];
        characterMoods: string[];
        characterPoses: string[];
        characterClothings: string[];
        characterSkinTones: string[];
        ambientSounds: string[];
        soundEffectsIntensity: string[];
        voiceStyles: string[];
        architecturalStyles: string[];
        lightingStyles: string[];
        compositionalGuides: string[];
    },
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
            systemInstruction += `\n\n**SERIES MODE ACTIVATED:** The user wants to generate a 3-part series. Your suggestions should reflect this. Prioritize choices that build a narrative arc. For example, suggest a 'Documentary Narrator' or 'Standard Narrator' voice style to provide cohesion. Suggest 'Cinematic' or 'Photorealistic' art styles and camera movements like 'Tracking shot' that are well-suited for storytelling. Your environmental description should set a clear opening scene.`;
        }

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-pro',
            contents: `Analyze this idea and suggest modifiers: "${idea}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        environment: {
                            type: Type.STRING,
                            description: "A brief, vivid description of the scene's environment based on the idea."
                        },
                        environmentDynamicEvents: {
                            type: Type.STRING,
                            description: "A short, evocative description of background environmental events (e.g., 'steam rises from grates', 'leaves skitter across the pavement')."
                        },
                        architecturalStyle: {
                            type: Type.STRING,
                            description: "The most fitting architectural style for any buildings in the scene.",
                            enum: options.architecturalStyles
                        },
                        artStyle: {
                            type: Type.STRING,
                            description: "The most fitting art style for the idea.",
                            enum: options.artStyles
                        },
                        lightingStyle: {
                            type: Type.STRING,
                            description: "The most fitting lighting style to establish the scene's mood.",
                            enum: options.lightingStyles
                        },
                        cameraMovement: {
                            type: Type.STRING,
                            description: "A suitable camera movement that enhances the scene.",
                            enum: options.cameraMovements
                        },
                        compositionalGuide: {
                            type: Type.STRING,
                            description: "A classic compositional rule that would best frame the scene.",
                            enum: options.compositionalGuides
                        },
                        colorPalette: {
                            type: Type.STRING,
                            description: "A color palette that matches the mood of the idea.",
                            enum: options.colorPalettes
                        },
                        timeOfDay: {
                            type: Type.STRING,
                            description: "The most appropriate time of day for the scene.",
                            enum: options.timeOfDay
                        },
                        weather: {
                            type: Type.STRING,
                            description: "The most fitting weather condition for the mood.",
                            enum: options.weather
                        },
                        visualEffect: {
                            type: Type.STRING,
                            description: "A subtle but effective visual effect to enhance the idea.",
                            enum: options.visualEffects
                        },
                        cameraDistance: {
                            type: Type.STRING,
                            description: "The ideal camera distance to frame the main subject.",
                            enum: options.cameraDistances
                        },
                        characterActions: {
                            type: Type.STRING,
                            description: "A brief, dynamic description of the character's primary action in the scene, based on the core idea. e.g., 'sprinting across a rooftop', 'calmly sipping tea'."
                        },
                        characterObjectInteraction: {
                            type: Type.STRING,
                            description: "A short, specific description of how a character might be interacting with a small object or their immediate environment, revealing their mood or personality."
                        },
                        characterGender: {
                            type: Type.STRING,
                            description: "The most fitting gender for a character, if a character is implied in the idea. If no character is present, return 'Any'.",
                            enum: options.characterGenders
                        },
                        characterAge: {
                            type: Type.STRING,
                            description: "The most appropriate age for a character, if a character is implied. If no character, return 'Any'.",
                            enum: options.characterAges
                        },
                        characterMood: {
                            type: Type.STRING,
                            description: "The most fitting emotional mood for a character, if implied. If no character, return 'Any'.",
                            enum: options.characterMoods
                        },
                        characterPose: {
                            type: Type.STRING,
                            description: "A suitable physical pose for a character, based on the context. If no character, return 'Any'.",
                            enum: options.characterPoses
                        },
                        characterClothing: {
                            type: Type.STRING,
                            description: "A suitable clothing style for a character, based on the context of the idea. If no character, return 'Any'.",
                            enum: options.characterClothings
                        },
                        characterSkinTone: {
                            type: Type.STRING,
                            description: "The most fitting skin tone for a character, if implied. Otherwise, return 'Any'.",
                            enum: options.characterSkinTones
                        },
                        characterSpecificClothing: {
                            type: Type.STRING,
                            description: "Suggest specific clothing items that fit the character's context, archetype, and environment. e.g., 'a worn leather jacket with patches' for a rebel, or 'a flowing silk robe' for a sage."
                        },
                        characterAccessories: {
                            type: Type.STRING,
                            description: "Suggest accessories that add detail and personality to the character. e.g., 'a pair of round, wire-frame glasses' or 'a heavy, antique silver locket'."
                        },
                        ambientSound: {
                            type: Type.STRING,
                            description: "An immersive ambient sound that matches the environment and mood. Avoid 'None' unless the scene is meant to be silent.",
                            enum: options.ambientSounds
                        },
                        soundEffectsIntensity: {
                            type: Type.STRING,
                            description: "The most fitting intensity for sound effects based on the scene's dynamism. Use 'Subtle' for realism, 'Prominent' for dramatic impact.",
                            enum: options.soundEffectsIntensity
                        },
                        voiceStyle: {
                            type: Type.STRING,
                            description: "Suggest a voice-over style only if it's highly appropriate for the idea (e.g., a documentary or trailer). Otherwise, return 'None'.",
                            enum: options.voiceStyles
                        },
                        voiceOver: {
                            type: Type.STRING,
                            description: "A short, creative voice-over script (1-2 sentences) that is deeply integrated with all other suggested modifiers. The script should reflect the specific art style, environment, and character actions chosen. It must enhance the narrative, not just describe the visuals. For example, for a 'Noir' scene, a good script is 'In this city, the rain washes away everything but the secrets.' If the suggested voice style is 'None', this MUST be an empty string."
                        }
                    }
                }
            }
        });
        
        return safelyParseJsonResponse<Partial<PromptGenerationParams>>(response.text);

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
                            items: {
                                type: Type.STRING,
                                description: "A catchy and evocative song title."
                            }
                        }
                    },
                    required: ['titles']
                }
            }
        });
        const jsonResponse = safelyParseJsonResponse<{ titles: string[] }>(response.text);
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
                            items: {
                                type: Type.STRING,
                                description: "A descriptive 'Style of Music' prompt for Suno AI, under 180 characters."
                            }
                        }
                    },
                    required: ['styles']
                }
            }
        });
        const jsonResponse = safelyParseJsonResponse<{ styles: string[] }>(response.text);
        return jsonResponse.styles || [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestSunoStyles = withCache(_suggestSunoStylesUncached, 'suggestSunoStyles');


/**
 * Generates only the lyrics for a song based on an idea and style.
 */
export const generateLyricsForSuno = async (
    idea: string,
    styleOfMusic: string,
    lyricalTheme: string,
    language: string,
    model: string
): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = `You are an expert songwriter. Your task is to write musically-aware lyrics based on the user's song idea, desired style of music, and lyrical themes/mood. The lyrics should tell a story or explore the emotional core of the idea, adhering to any specified narrative arc or mood. Structure the lyrics for a song using metatags like [Intro], [Verse], [Chorus], [Bridge], [Guitar Solo], [Instrumental], [Outro]. Be creative and include instrumental breaks where appropriate for the song's style. Respond ONLY with a valid JSON object containing the lyrics. Respond in the language with this ISO 639-1 code: ${language}.`;

        const userContent = `Song Idea: "${idea}"\nStyle of Music: "${styleOfMusic}"\nLyrical Themes/Mood: "${lyricalTheme || 'Not specified'}"`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-pro',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        lyrics: {
                            type: Type.STRING,
                            description: "The full lyrics of the song, formatted with structural metatags like [Verse], [Chorus], and [Instrumental]."
                        }
                    },
                    required: ['lyrics']
                }
            }
        });

        const jsonResponse = safelyParseJsonResponse<{ lyrics: string }>(response.text);
        const lyrics = jsonResponse.lyrics || '';
        // Ensure lyrics have proper newlines for display
        return lyrics.replace(/\\n/g, '\n');

    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Suggests a complete audio design (voice style, script, ambient sound, and SFX intensity).
 */
export const suggestFullAudioDesign = async (
    params: {
        artStyle: string;
        cameraMovement: string;
        idea: string;
        environment: string;
        characterActions: string;
        characterMood: string;
        voiceStyleOptions: string[];
    },
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    model: string,
    ambientSoundOptions: string[],
    soundEffectsIntensityOptions: string[]
): Promise<{ 
    suggestedVoiceStyle: string; 
    suggestedVoiceOverScript: string; 
    suggestedAmbientSound: string;
    suggestedSoundEffectsIntensity: string;
}> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestFullAudioSystemPrompt;
        const userContent = `
            Core Idea: "${params.idea}"
            Art Style: "${params.artStyle}"
            Camera Movement: "${params.cameraMovement}"
            Environment: "${params.environment}"
            Character Actions: "${params.characterActions}"
            Character Mood: "${params.characterMood}"
        `;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestedVoiceStyle: {
                            type: Type.STRING,
                            description: "The most fitting voice-over style from the provided options.",
                            enum: params.voiceStyleOptions,
                        },
                        suggestedVoiceOverScript: {
                            type: Type.STRING,
                            description: "A short, creative voice-over script (1-2 sentences). Must be an empty string if suggestedVoiceStyle is 'None'."
                        },
                        suggestedAmbientSound: {
                            type: Type.STRING,
                            description: "The most fitting ambient sound from the provided options.",
                            enum: ambientSoundOptions,
                        },
                        suggestedSoundEffectsIntensity: {
                            type: Type.STRING,
                            description: "The most fitting intensity for sound effects based on the scene's mood.",
                            enum: soundEffectsIntensityOptions
                        }
                    },
                    required: [
                        'suggestedVoiceStyle', 
                        'suggestedVoiceOverScript',
                        'suggestedAmbientSound',
                        'suggestedSoundEffectsIntensity'
                    ]
                }
            }
        });
        
        return safelyParseJsonResponse<{ 
    suggestedVoiceStyle: string; 
    suggestedVoiceOverScript: string; 
    suggestedAmbientSound: string;
    suggestedSoundEffectsIntensity: string;
}>(response.text);

    } catch (error) {
        parseAndThrowApiError(error);
    }
};

const _suggestArtStylesUncached = async (userInput: string, language: string, model: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const systemInstruction = `You are an expert art historian and creative director. The user will provide a term, style, or artist's name. Your task is to provide 4 concise, descriptive, and inspiring alternative phrases or related styles that would be effective in a text-to-video prompt. Focus on evocative adjectives and technical terms. For example, if the user enters "Van Gogh", you might suggest "Post-Impressionist style with thick, swirling brushstrokes", "Vibrant impasto painting technique", "Expressive and emotional oil on canvas feel", "Emulating the 'Starry Night' color palette". Respond in the language with this ISO 639-1 code: ${language}.`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Suggest art styles related to: "${userInput}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'A descriptive and creative art style suggestion.'
                            }
                        }
                    },
                    required: ['suggestions']
                }
            }
        });

        const jsonResponse = safelyParseJsonResponse<{ suggestions: string[] }>(response.text);
        return jsonResponse.suggestions || [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Suggests related art styles based on user input. (Cached)
 */
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
                    properties: {
                        sensoryDetails: {
                            type: Type.STRING,
                            description: "A string of comma-separated sensory details."
                        }
                    },
                    required: ['sensoryDetails']
                }
            }
        });

        const jsonResponse = safelyParseJsonResponse<{ sensoryDetails: string }>(response.text);
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
};
export const suggestCharacterNuances = withCache(_suggestCharacterNuancesUncached, 'suggestCharacterNuances');

const _suggestVisualEffectUncached = async (artStyle: string, customArtStyle: string, mood: string, language: string, model: string, visualEffectOptions: string[]): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestVisualEffectSystemPrompt.replace('{language}', language);
        const style = artStyle === 'Custom' ? customArtStyle : artStyle;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Art Style: "${style}", Mood: "${mood}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        visualEffect: {
                            type: Type.STRING,
                            description: "The single most fitting visual effect.",
                            enum: visualEffectOptions
                        }
                    },
                    required: ['visualEffect']
                }
            }
        });
        const jsonResponse = safelyParseJsonResponse<{ visualEffect: string }>(response.text);
        return jsonResponse.visualEffect || 'None';
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestVisualEffect = withCache(_suggestVisualEffectUncached, 'suggestVisualEffect');

/**
 * Suggests values for advanced settings based on the prompt's context.
 */
export const suggestAdvancedSettings = async (
    params: {
        idea: string;
        artStyle: string;
        customArtStyle: string;
        cameraMovement: string;
        targetModel: 'veo' | 'sora';
    },
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    model: string,
    options: {
        motionIntensity: string[];
        creativityLevel: string[];
    }
): Promise<{ negativePrompt: string; motionIntensity: string; creativityLevel: string; }> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestAdvancedSystemPrompt;
        const artStyle = params.artStyle === 'Custom' ? params.customArtStyle : params.artStyle;
        const userContent = `
            Core Idea: "${params.idea}"
            Art Style: "${artStyle}"
            Camera Movement: "${params.cameraMovement}"
            Target Model: "${params.targetModel}"
        `;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        negativePrompt: {
                            type: Type.STRING,
                            description: "A comma-separated list of terms to avoid, tailored to the prompt's style (e.g., 'blurry, shaky' for cinematic prompts; 'photorealistic' for anime prompts)."
                        },
                        motionIntensity: {
                            type: Type.STRING,
                            description: "The most fitting motion intensity from the provided options.",
                            enum: options.motionIntensity,
                        },
                        creativityLevel: {
                            type: Type.STRING,
                            description: "The most fitting creativity level from the provided options.",
                            enum: options.creativityLevel
                        }
                    },
                    required: ['negativePrompt', 'motionIntensity', 'creativityLevel']
                }
            }
        });
        
        return safelyParseJsonResponse<{ negativePrompt: string; motionIntensity: string; creativityLevel: string; }>(response.text);

    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Analyzes a core idea and suggests more detailed, compelling descriptions for key fields.
 */
export const suggestCreativeDetails = async (
    idea: string,
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    targetModel: 'veo' | 'sora',
    model: string,
    options: {
        lightingStyles: string[];
        compositionalGuides: string[];
    }
): Promise<Partial<PromptGenerationParams>> => {
    try {
        const ai = getAiClient();
        let systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestCreativeDetailsSystemPrompt.base;
        if (targetModel === 'sora') {
            systemInstruction += `\n\n${(appUIStrings[language] || appUIStrings['en']).suggestCreativeDetailsSystemPrompt.sora}`;
        }

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-pro',
            contents: `Analyze and expand this core idea: "${idea}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        environment: {
                            type: Type.STRING,
                            description: "A highly detailed and cinematic description of the environment, incorporating sensory details and dynamic events."
                        },
                        characterActions: {
                            type: Type.STRING,
                            description: "A detailed sequence of character actions, including specific object interactions and subtle emotional nuances."
                        },
                        lightingStyle: {
                            type: Type.STRING,
                            description: "The most fitting lighting style to establish the scene's mood.",
                            enum: options.lightingStyles
                        },
                        compositionalGuide: {
                            type: Type.STRING,
                            description: "A classic compositional rule that would best frame the scene.",
                            enum: options.compositionalGuides
                        },
                    },
                    required: ['environment', 'characterActions', 'lightingStyle', 'compositionalGuide']
                }
            }
        });

        return safelyParseJsonResponse<Partial<PromptGenerationParams>>(response.text);
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Generates concept art based on a prompt.
 */
export const generateConceptArt = async (prompt: string, aspectRatio: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
            },
        });

        const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!base64ImageBytes) {
            throw new Error('Image generation failed, no image bytes returned.');
        }
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Generates a visual storyboard from a prompt.
 */
export const generateStoryboard = async (prompt: string, aspectRatio: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        // 1. Break the prompt into 4 shots
        const systemInstruction = `You are a storyboard artist's assistant. Your task is to analyze a video prompt and break it down into 4 distinct, visually compelling keyframes or shots that tell a story. Describe each shot as a concise, single-sentence prompt suitable for an image generation model. Respond ONLY with a valid JSON object containing a single key "shots", which is an array of 4 strings.`;

        const textResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Analyze and break down this prompt: "${prompt}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        shots: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'A concise, single-sentence description of a visual keyframe.'
                            }
                        }
                    },
                    required: ['shots']
                }
            }
        });

        const { shots } = safelyParseJsonResponse<{ shots: string[] }>(textResponse.text);
        if (!shots || !Array.isArray(shots) || shots.length === 0) {
            throw new Error("The AI was unable to break down the prompt into storyboard shots. Please try refining your prompt.");
        }

        // 2. Generate an image for each shot
        const imagePromises = shots.slice(0, 4).map((shotPrompt: string) => 
            ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: shotPrompt, // Use the generated shot description
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
                },
            })
        );
        
        const imageResults = await Promise.all(imagePromises);

        // 3. Format results
        return imageResults.map(response => {
            const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
            if (!base64ImageBytes) {
                throw new Error('Storyboard image generation failed for one or more shots. The request may have been blocked for safety reasons.');
            }
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        });

    } catch (error) {
        parseAndThrowApiError(error);
    }
};


/**
 * Edits an existing image using a text prompt.
 */
export const editImageWithGemini = async (
    imageData: string,
    mimeType: string,
    prompt: string
): Promise<EditedImageResponse> => {
    try {
        const ai = getAiClient();
        const imagePart = {
            inlineData: { data: imageData, mimeType },
        };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const imageContent = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imageContent && imageContent.inlineData) {
            return {
                newImageBytes: imageContent.inlineData.data,
                newMimeType: imageContent.inlineData.mimeType,
            };
        }
        
        throw new Error('Image editing failed to return an image. The model may have refused the request.');
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Starts a video generation job using Veo 3.1.
 */
export const generateVideo = async (
  prompt: string,
  uploadedImage: { data: string; mimeType: string } | null,
  aspectRatio: string,
  resolution: '1080p' | '720p',
  veoModel: 'fast' | 'quality'
): Promise<any> => {
  try {
    const ai = getAiClient();
    const modelName = veoModel === 'fast' 
      ? 'veo-3.1-fast-generate-preview' 
      : 'veo-3.1-generate-preview';

    const request: any = {
      model: modelName,
      prompt,
      config: {
        numberOfVideos: 1,
        resolution,
        aspectRatio: aspectRatio as '16:9' | '9:16',
      },
    };
    
    if (uploadedImage) {
      request.image = {
        imageBytes: uploadedImage.data,
        mimeType: uploadedImage.mimeType,
      };
    }
    
    const operation = await ai.models.generateVideos(request);
    return operation;
  } catch (error) {
    parseAndThrowApiError(error);
  }
};


/**
 * Polls the status of an ongoing video generation operation.
 */
export const pollVideoOperation = async (operation: any): Promise<any> => {
    try {
        const ai = getAiClient();
        const updatedOperation = await ai.operations.getVideosOperation({ operation });
        return updatedOperation;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};


/**
 * Fetches the generated video from its download URI.
 */
export const fetchVideo = async (downloadLink: string): Promise<string> => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            throw new Error("API_KEY environment variable not set.");
        }
        const response = await fetch(`${downloadLink}&key=${apiKey}`);
        if (!response.ok) {
            throw response; // Throw the response object itself to be parsed
        }
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Combines multiple prompt variations into a single, refined prompt using an AI model.
 */
export const combinePromptVariations = async (
    variations: string[],
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    model: string
): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).combineSystemPrompt;
        const userContent = `Please combine the following prompt variations into a single, superior prompt:\n\n---\n${variations.join('\n---\n')}`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-pro',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        combinedPrompt: {
                            type: Type.STRING,
                            description: "The final, merged, and refined prompt."
                        }
                    },
                    required: ['combinedPrompt']
                }
            }
        });

        const jsonResponse = safelyParseJsonResponse<{ combinedPrompt: string }>(response.text);
        return jsonResponse.combinedPrompt || '';

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
        const systemInstruction = `You are a creative assistant and stylist for film and video games. Your task is to suggest clothing and accessories for a character based on their archetype and the environment they are in.
Provide 5 creative and specific suggestions for clothing items and 5 for accessories. The suggestions should be detailed and help build the character's personality.
Respond ONLY with a valid JSON object.
Respond in the language with this ISO 639-1 code: ${language}.`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Suggest clothing and accessories for a '${archetype}' character in this environment: "${environment}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        clothingSuggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: "A creative and specific clothing item suggestion (e.g., 'a worn leather jacket with custom patches')."
                            }
                        },
                        accessorySuggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: "A creative and specific accessory suggestion (e.g., 'a pair of scratched aviator sunglasses')."
                            }
                        }
                    },
                    required: ['clothingSuggestions', 'accessorySuggestions']
                }
            }
        });

        const jsonResponse = safelyParseJsonResponse<{ clothingSuggestions: string[], accessorySuggestions: string[] }>(response.text);
        return jsonResponse || { clothingSuggestions: [], accessorySuggestions: [] };
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Suggests character clothing and accessories based on archetype and environment. (Cached)
 */
export const suggestCharacterDetails = withCache(_suggestCharacterDetailsUncached, 'suggestCharacterDetails');

const _suggestEnvironmentDetailsUncached = async (
    environment: string,
    language: string,
    model: string
): Promise<{ environmentSensoryDetails: string, environmentDynamicEvents: string }> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).suggestEnvironmentSystemPrompt;
        const userContent = `Environment Description: "${environment}"`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        environmentSensoryDetails: {
                            type: Type.STRING,
                            description: "A comma-separated list of rich sensory details (sights, sounds, smells, textures) that bring the environment to life."
                        },
                        environmentDynamicEvents: {
                            type: Type.STRING,
                            description: "A comma-separated list of subtle background actions or events that make the environment feel alive and dynamic."
                        }
                    },
                    required: ['environmentSensoryDetails', 'environmentDynamicEvents']
                }
            }
        });
        
        return safelyParseJsonResponse<{ environmentSensoryDetails: string, environmentDynamicEvents: string }>(response.text);
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
export const suggestEnvironmentDetails = withCache(_suggestEnvironmentDetailsUncached, 'suggestEnvironmentDetails');


/**
 * Creates a new Gemini Chat session instance.
 */
export const createChat = (): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: 'You are a friendly and helpful creative assistant for the Veo Prompt Architect app. Keep your answers concise and focused on helping the user with their video, image, or music creation process.',
        },
    });
};

/**
 * Sends a message to a chat session and returns a streaming response.
 */
export const sendMessageToChatStream = async (chat: Chat, message: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
    try {
        return chat.sendMessageStream({ message });
    } catch (error) {
        parseAndThrowApiError(error);
    }
};


/**
 * Analyzes a video file to extract information.
 * @param videoData - Base64 encoded video data.
 * @param mimeType - The MIME type of the video.
 * @param prompt - The user's question about the video.
 * @returns A text response from the model.
 */
export const analyzeVideo = async (videoData: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const videoPart = { inlineData: { data: videoData, mimeType } };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [videoPart, textPart] },
        });

        return response.text;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};