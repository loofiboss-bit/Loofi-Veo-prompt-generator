
import { GoogleGenAI, GenerateContentResponse, Type, Modality, Chat } from '@google/genai';
import { buildGeminiPrompt } from './promptBuilder';
import { PromptGenerationParams, VeoPromptResponse, GroundingChunk, EditedImageResponse, PromptState } from '../types';
import { parseAndThrowApiError } from '../utils/apiErrors';
import { appUIStrings } from '../translations';
import { MUSIC_GENRES } from '../constants';

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper for safely parsing JSON
const safelyParseJsonResponse = (text: string | undefined): any => {
  if (!text) return null;
  try {
    // Remove markdown code blocks if present
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Failed to parse JSON response:", e);
    return null;
  }
};

// Helper for generic JSON generation
async function generateJson<T>(
  prompt: string,
  systemInstruction: string,
  model: string = 'gemini-2.5-flash'
): Promise<T> {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      systemInstruction,
    }
  });
  const json = safelyParseJsonResponse(response.text);
  if (!json) {
      throw new Error("Failed to parse AI response as JSON. The model may be overloaded or produced invalid output.");
  }
  return json;
}

/**
 * Generates a creative prompt for Veo based on user-defined parameters.
 * Now supports Multimodal inputs (Image and Audio) to influence the prompt generation.
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

    // Prepare multimodal content parts
    const contentParts: any[] = [];

    // 1. Text Content
    let textContent = params.idea;
    if (params.useGoogleSearch) {
      config.tools.push({ googleSearch: {} });
    }
    
    contentParts.push({ text: textContent });

    // 2. Image Content (Multimodal)
    // If the user provided an image, we send it to the model so it can describe it or use it as inspiration.
    if (params.uploadedImage) {
        contentParts.push({
            inlineData: {
                mimeType: params.uploadedImage.mimeType,
                data: params.uploadedImage.data
            }
        });
        // Add a guiding instruction for the image
        contentParts.push({ text: "\n\n[System Note: The user has provided the above reference image. Use its visual style, composition, and details to inform the generated prompt description.]" });
    }

    // 3. Audio Content (Multimodal)
    if (params.uploadedAudio) {
        contentParts.push({
            inlineData: {
                mimeType: params.uploadedAudio.mimeType,
                data: params.uploadedAudio.data
            }
        });
        // Add a guiding instruction for the audio
        contentParts.push({ text: "\n\n[System Note: The user has provided the above reference audio. Analyze its mood, tempo, and atmosphere. Incorporate these auditory qualities into the 'Audio Design' and 'Mood' sections of the generated prompt.]" });
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
      contents: { parts: contentParts }, // Send as parts array for multimodal support
      config: config
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    return {
      prompt: response.text || '',
      groundingChunks: groundingMetadata?.groundingChunks as GroundingChunk[] | undefined,
    };
  } catch (error) {
    parseAndThrowApiError(error);
  }
};

/**
 * Analyzes an audio file to extract mood and descriptive keywords.
 */
export const analyzeAudioContent = async (audioData: string, mimeType: string, language: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: {
                parts: [
                    { inlineData: { data: audioData, mimeType } },
                    { text: `Analyze this audio file. Describe the mood, tempo, instrumentation (if any), and overall atmosphere in a few concise sentences. Respond in ${language}.` }
                ]
            }
        });
        return response.text || "";
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
}

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

export const pollVideoOperation = async (operation: any): Promise<any> => {
    try {
        const ai = getAiClient();
        return await ai.operations.getVideosOperation({ operation });
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const fetchVideo = async (uri: string): Promise<string> => {
    try {
        const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error('Failed to download video');
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
  } catch (error) {
    parseAndThrowApiError(error);
  }
};

export const generatePromptVariations = async (basePrompt: string, language: string, model: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).variationsSystemPrompt.replace('{language}', language);
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: basePrompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json'
            }
        });
        const variations = safelyParseJsonResponse(response.text);
        if (!Array.isArray(variations)) {
             throw new Error("Failed to parse variations as array");
        }
        return variations;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const refinePrompt = async (basePrompt: string, promptState: PromptState): Promise<string> => {
    try {
        const ai = getAiClient();
        const language = promptState.language;
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).refineSystemPrompt.replace('{targetModel}', promptState.targetModel);
        
        const response = await ai.models.generateContent({
            model: promptState.model || 'gemini-2.5-flash',
            contents: JSON.stringify({
                originalPrompt: basePrompt,
                keyParameters: {
                    artStyle: promptState.artStyle,
                    mood: promptState.characterMood,
                    lighting: promptState.lightingStyle
                }
            }),
            config: {
                systemInstruction,
                responseMimeType: 'application/json'
            }
        });
        const result = safelyParseJsonResponse(response.text);
        return result?.refinedPrompt || result?.prompt || response.text;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const combinePromptVariations = async (variations: string[], language: string, model: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = (appUIStrings[language] || appUIStrings['en']).combineSystemPrompt;
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: JSON.stringify({ variations }),
            config: {
                systemInstruction,
                responseMimeType: 'application/json'
            }
        });
        const result = safelyParseJsonResponse(response.text);
        return result?.combinedPrompt || response.text;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateConceptArt = async (prompt: string, aspectRatio: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: { aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9" }
            }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image generated");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateStoryboard = async (prompt: string, aspectRatio: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        // Generate 4 separate images for storyboard
        const images: string[] = [];
        // Sequential generation to respect rate limits if needed, or parallel
        // For simplicity and rate limits, we'll do sequential for now
        for (let i = 1; i <= 4; i++) {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [{ text: `Storyboard frame ${i} of 4: ${prompt}` }]
                },
                config: {
                    imageConfig: { aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9" }
                }
            });
             for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                }
            }
        }
        return images;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const analyzeIdeaForModifiers = async (idea: string, language: string, options: any, isSeries: boolean, model: string, targetModel: string) => {
    try {
        const t = appUIStrings[language] || appUIStrings['en'];
        let systemInstruction = t.autoFillSystemPrompt.base;
        if (targetModel === 'sora') systemInstruction += "\n" + t.autoFillSystemPrompt.sora;
        else systemInstruction += "\n" + t.autoFillSystemPrompt.veo;

        const response = await generateJson<any>(
            JSON.stringify({ idea, options, isSeries }),
            systemInstruction,
            model
        );
        return response;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const suggestFullAudioDesign = async (context: any, language: string, model: string, ambientOptions: string[], sfxOptions: string[]) => {
    try {
        const t = appUIStrings[language] || appUIStrings['en'];
        const response = await generateJson<any>(
            JSON.stringify({ context, ambientOptions, sfxOptions }),
            t.suggestFullAudioSystemPrompt,
            model
        );
        return response;
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestEnvironmentDetails = async (environment: string, language: string, model: string) => {
    try {
        const t = appUIStrings[language] || appUIStrings['en'];
        return await generateJson<any>(environment, t.suggestEnvironmentSystemPrompt, model);
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestSensoryDetails = async (environment: string, language: string, model: string) => {
    try {
        const t = appUIStrings[language] || appUIStrings['en'];
        const res = await generateJson<any>(environment, t.suggestSensoryDetailsSystemPrompt, model);
        return res?.sensoryDetails || (typeof res === 'string' ? res : '');
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestCharacterNuances = async (actions: string, mood: string, language: string, model: string) => {
    try {
        const t = appUIStrings[language] || appUIStrings['en'];
        const res = await generateJson<any>(JSON.stringify({ actions, mood }), t.suggestCharacterNuancesSystemPrompt, model);
        return res?.nuances || (typeof res === 'string' ? res : '');
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestVisualEffect = async (artStyle: string, customArtStyle: string, mood: string, language: string, model: string, options: string[]) => {
    try {
        const t = appUIStrings[language] || appUIStrings['en'];
        const res = await generateJson<any>(JSON.stringify({ artStyle, customArtStyle, mood, options }), t.suggestVisualEffectSystemPrompt, model);
        return res?.visualEffect || (typeof res === 'string' ? res : 'None');
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestAdvancedSettings = async (context: any, language: string, model: string, options: any) => {
    try {
        const t = appUIStrings[language] || appUIStrings['en'];
        return await generateJson<any>(JSON.stringify({ context, options }), t.suggestAdvancedSystemPrompt, model);
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestArtStyles = async (customStyle: string, language: string, model: string) => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Suggest 5 specific art style terms or artists related to: "${customStyle}". Return JSON array of strings.`,
            config: { responseMimeType: 'application/json' }
        });
        const res = safelyParseJsonResponse(response.text);
        return Array.isArray(res) ? res : [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestCharacterDetails = async (archetype: string, environment: string, language: string, model: string) => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: JSON.stringify({ archetype, environment }),
            config: {
                systemInstruction: `Suggest 5 specific clothing items and 5 accessories for a character archetype in a given environment. Return JSON object with keys "clothingSuggestions" (string array) and "accessorySuggestions" (string array).`,
                responseMimeType: 'application/json'
            }
        });
        return safelyParseJsonResponse(response.text);
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const editImageWithGemini = async (base64Image: string, mimeType: string, prompt: string): Promise<EditedImageResponse> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType } },
                    { text: prompt }
                ]
            }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return {
                    newImageBytes: part.inlineData.data,
                    newMimeType: part.inlineData.mimeType
                };
            }
        }
        throw new Error("No edited image returned");
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestSunoTitles = async (idea: string, language: string, model: string): Promise<string[]> => {
    try {
        const t = appUIStrings[language] || appUIStrings['en'];
        const res = await generateJson<any>(idea, t.suggestSunoTitlesSystemPrompt, model);
        return Array.isArray(res) ? res : (res?.titles || []);
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestSunoStyles = async (idea: string, language: string, model: string): Promise<string[]> => {
    try {
        const t = appUIStrings[language] || appUIStrings['en'];
        const systemPrompt = t.suggestSunoStylesSystemPrompt.replace('{MUSIC_GENRES}', MUSIC_GENRES);
        const res = await generateJson<any>(idea, systemPrompt, model);
        return Array.isArray(res) ? res : (res?.styles || []);
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const generateLyricsForSuno = async (idea: string, style: string, language: string, model: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-pro',
            contents: `Write lyrics for a song about "${idea}" in the style of "${style}". Format it with [Verse], [Chorus], [Bridge] tags. Respond in ${language}.`
        });
        return response.text || '';
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const analyzeVideo = async (videoData: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Video analysis works best with Pro
            contents: {
                parts: [
                    { inlineData: { data: videoData, mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text || '';
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const createChat = (systemInstruction?: string) => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: systemInstruction || "You are a helpful AI assistant specialized in video prompt engineering." }
    });
};

export const sendMessageToChatStream = async (chat: Chat, message: string) => {
    try {
        return await chat.sendMessageStream({ message });
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
