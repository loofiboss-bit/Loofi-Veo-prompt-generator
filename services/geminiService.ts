
import { GoogleGenAI, GenerateContentResponse, Chat, Type, Schema, Modality } from "@google/genai";
import { PromptState, VeoPromptResponse, ModelComparisonResponse, PromptVariation, EditedImageResponse, GroundingChunk } from '../types';
import { retryOperation } from '../utils/retry';
import { parseAndThrowApiError, ApiError, ApiErrorType } from '../utils/apiErrors';
import { buildGeminiPrompt } from './promptBuilder';

const getAiClient = (): GoogleGenAI => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new ApiError('API Key is missing', ApiErrorType.InvalidApiKey);
  }
  return new GoogleGenAI({ apiKey });
};

const validateGeminiResponse = (response: GenerateContentResponse) => {
    if (!response) {
        throw new Error("Empty response from AI");
    }
};

/**
 * Generates the final prompt string for Veo using Gemini to construct the narrative.
 */
export const generateVeoPrompt = async (
    state: PromptState, 
    userCoords: { latitude: number; longitude: number } | null
): Promise<VeoPromptResponse> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const basePrompt = buildGeminiPrompt(state);
            
            const tools: any[] = [];
            if (state.useGoogleSearch) {
                tools.push({ googleSearch: {} });
            }
            // Note: Google Maps tool is only compatible with specific models, usually Gemini 2.5 series.
            // If the user selected a Gemini 3 model, we might need to fallback or skip maps if not supported.
            // For now, we only add if requested and if model supports it (logic simplified).
            if (state.useGoogleMaps && userCoords) {
                 tools.push({ googleMaps: {} });
            }

            const response = await ai.models.generateContent({
                model: state.model,
                contents: basePrompt,
                config: {
                    tools: tools.length > 0 ? tools : undefined,
                    toolConfig: (state.useGoogleMaps && userCoords) ? {
                        retrievalConfig: {
                            latLng: {
                                latitude: userCoords.latitude,
                                longitude: userCoords.longitude
                            }
                        }
                    } : undefined
                }
            });

            validateGeminiResponse(response);
            
            // Extract grounding chunks
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;

            return {
                prompt: response.text || "Failed to generate text.",
                groundingChunks
            };
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Refines a raw prompt into a cinematic one.
 */
export const refinePrompt = async (prompt: string, state: PromptState): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: state.model,
                contents: `You are an expert AI Prompt Engineer specializing in high-fidelity video generation models like Google Veo and Sora.
                
                Your task is to **REFINE** the following prompt. You must elevate it from a simple description to a **visually stunning, technically precise cinematic instruction**.

                **Focus Areas for Refinement:**
                1.  **Textures & Materiality**: Describe specific surface details (e.g., "brushed metal," "coarse wool," "translucent skin with subsurface scattering," "slick wet pavement").
                2.  **Lighting Mastery**: Define the light source, quality, and color temperature (e.g., "volumetric god rays," "harsh sodium-vapor streetlights," "soft diffused window light," "cinematic rim lighting").
                3.  **Camera Language**: Specify camera movement, lens choice, and focus (e.g., "anamorphic lens flares," "slow dolly zoom," "rack focus," "shallow depth of field," "wide-angle distortion").
                4.  **Atmosphere**: Fill the air (e.g., "swirling dust motes," "heavy humidity," "drifting embers").

                **Constraint:** 
                - Keep the core subject and action of the original prompt intact.
                - Do not add new plot points, only enhance the visual execution.
                - Output ONE cohesive paragraph.

                Original Prompt: "${prompt}"`,
            });
            validateGeminiResponse(response);
            return response.text || prompt;
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Generates prompt variations.
 */
export const generatePromptVariations = async (
    basePrompt: string, 
    language: string, 
    model: string,
    targetModel: 'veo' | 'sora'
): Promise<PromptVariation[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Generate 3 distinct variations of the following video generation prompt.
                Target Model: ${targetModel === 'sora' ? 'Sora (Physics/Simulation focus)' : 'Veo (Cinematic/Visual focus)'}.
                
                Base Prompt: "${basePrompt}"
                
                Return JSON in this format:
                [
                  { "label": "Short label (e.g. Noir Style)", "prompt": "Full prompt text..." },
                  ...
                ]`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                label: { type: Type.STRING },
                                prompt: { type: Type.STRING }
                            },
                            required: ["label", "prompt"]
                        }
                    }
                }
            });
            validateGeminiResponse(response);
            return JSON.parse(response.text || "[]");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Suggests creative ideas.
 */
export const suggestPromptIdeas = async (
    currentIdea: string, 
    language: string, 
    model: string
): Promise<PromptVariation[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Brainstorm 4 creative, visually distinct video concepts based on the input: "${currentIdea}".
                If input is empty, provide 4 random, high-quality cinematic ideas.
                
                Return JSON:
                [ { "label": "Title", "prompt": "Concept description..." } ]`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                label: { type: Type.STRING },
                                prompt: { type: Type.STRING }
                            },
                            required: ["label", "prompt"]
                        }
                    }
                }
            });
            validateGeminiResponse(response);
            return JSON.parse(response.text || "[]");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Combines multiple prompts.
 */
export const combinePromptVariations = async (
    prompts: string[], 
    language: string, 
    model: string,
    targetModel: 'veo' | 'sora'
): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Combine the following video prompts into a single, cohesive, high-quality prompt optimized for ${targetModel}.
                
                Prompts to combine:
                ${prompts.map((p, i) => `${i+1}. ${p}`).join('\n')}
                
                Ensure the result flows naturally and isn't just a list.`,
            });
            validateGeminiResponse(response);
            return response.text || "";
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Generates concept art.
 */
export const generateConceptArt = async (
    prompt: string, 
    optionsOrAspectRatio: string | { aspectRatio: string; negativePrompt?: string; style?: string; styleStrength?: number }
): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            let aspectRatio = '1:1';
            let finalPrompt = prompt;

            if (typeof optionsOrAspectRatio === 'string') {
                aspectRatio = optionsOrAspectRatio;
            } else {
                aspectRatio = optionsOrAspectRatio.aspectRatio;
                if (optionsOrAspectRatio.style && optionsOrAspectRatio.style !== 'None') {
                    finalPrompt = `${optionsOrAspectRatio.style} style. ${finalPrompt}`;
                }
                if (optionsOrAspectRatio.negativePrompt) {
                    // Note: Gemini Flash Image doesn't support negative prompt natively in config yet via SDK 
                    // consistently across all versions, so we append to prompt as exclusion instruction.
                    finalPrompt += ` --no ${optionsOrAspectRatio.negativePrompt}`;
                }
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image', // Default to nano banana for speed/cost
                contents: {
                    parts: [{ text: finalPrompt }]
                },
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatio,
                    }
                }
            });
            
            // Extract image
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

/**
 * Generates a storyboard (4 images).
 */
export const generateStoryboard = async (prompt: string, aspectRatio: string): Promise<string[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            // Imagen 3 (via gemini-3-pro-image-preview) or similar allows higher quality.
            // For storyboard, we might want consistent style.
            // Since we need multiple images, we can make parallel requests if the model doesn't support batching in one go via this SDK easily.
            // 'imagen-4.0-generate-001' supports numberOfImages.
            
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: `Storyboard sequence for: ${prompt}`,
                config: {
                    numberOfImages: 4,
                    aspectRatio: aspectRatio,
                    outputMimeType: 'image/jpeg'
                }
            });

            return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Edits an image.
 */
export const editImageWithGemini = async (
    imageBase64: string, 
    mimeType: string, 
    instruction: string
): Promise<EditedImageResponse> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: imageBase64 } },
                        { text: instruction }
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
            throw new Error("No edited image returned.");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Suno: Suggest Titles.
 */
export const suggestSunoTitles = async (idea: string, language: string, model: string): Promise<string[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Suggest 5 catchy song titles for a song about: "${idea}". Return as JSON array of strings.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            validateGeminiResponse(response);
            return JSON.parse(response.text || "[]");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Suno: Suggest Styles.
 */
export const suggestSunoStyles = async (idea: string, language: string, model: string): Promise<string[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Suggest 5 music styles (genre + vibe) for a song about: "${idea}". Return as JSON array of strings.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            validateGeminiResponse(response);
            return JSON.parse(response.text || "[]");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Suno: Generate Lyrics.
 */
export const generateLyricsForSuno = async (
    idea: string, 
    style: string, 
    theme: string, 
    language: string, 
    model: string
): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const prompt = `Write full song lyrics for a song about "${idea}".
            Style: ${style}
            Theme: ${theme || 'N/A'}
            Structure: Verse 1, Chorus, Verse 2, Chorus, Bridge, Chorus, Outro.
            Include [tags] for structure.`;
            
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt
            });
            validateGeminiResponse(response);
            return response.text || "";
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Generate Speech (TTS).
 */
export const generateSpeech = async (text: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: { parts: [{ text }] },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' }
                        }
                    }
                }
            });
            
            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!audioData) throw new Error("No audio generated.");
            return audioData;
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Video Analysis.
 */
export const analyzeVideo = async (videoBase64: string, mimeType: string, prompt: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview', // Multimodal expert
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: videoBase64 } },
                        { text: prompt }
                    ]
                }
            });
            validateGeminiResponse(response);
            return response.text || "";
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Audio Analysis.
 */
export const analyzeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: audioBase64 } },
                        { text: "Analyze this audio and describe the ambient sound and mood in a short phrase suitable for a video prompt description." }
                    ]
                }
            });
            validateGeminiResponse(response);
            return response.text || "";
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Create Chat Session.
 */
export const createChat = (): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: "You are an expert video prompt engineer assistant." }
    });
};

/**
 * Send Message Stream.
 */
export const sendMessageToChatStream = async (chat: Chat, message: string) => {
    return chat.sendMessageStream({ message });
};

/**
 * Generate Video (Veo).
 */
export const generateVideo = async (
    prompt: string, 
    image: { data: string, mimeType: string } | null,
    aspectRatio: string,
    resolution: '1080p' | '720p',
    model: 'fast' | 'quality'
) => {
    const ai = getAiClient();
    const modelName = model === 'fast' ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';
    
    // Veo config constraints
    const config: any = {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio,
    };

    const payload: any = {
        model: modelName,
        prompt: prompt,
        config: config
    };

    if (image) {
        payload.image = {
            imageBytes: image.data,
            mimeType: image.mimeType
        };
    }

    return await ai.models.generateVideos(payload);
};

/**
 * Poll Video Operation.
 */
export const pollVideoOperation = async (operation: any) => {
    const ai = getAiClient();
    return await ai.operations.getVideosOperation({ operation });
};

/**
 * Fetch Video content.
 */
export const fetchVideo = async (downloadLink: string): Promise<string> => {
    const apiKey = process.env.API_KEY;
    const res = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!res.ok) throw new Error("Failed to download video.");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
};

/**
 * Validates physics logic for Sora.
 */
export const validatePhysicsLogic = async (state: PromptState): Promise<{ isValid: boolean; issues: string[] }> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview', // Reasoning expert
                contents: `Analyze the following video generation prompt for physical and logical consistency.
                Idea: "${state.idea}"
                Environment: "${state.environment}"
                Action: "${state.characterActions}"
                
                Identify if there are contradictions (e.g. "dry pavement" in "heavy rain") or impossible physics given the realistic style.
                
                Return JSON: { "isValid": boolean, "issues": ["issue 1", ...] }`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            isValid: { type: Type.BOOLEAN },
                            issues: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            });
            validateGeminiResponse(response);
            return JSON.parse(response.text || '{"isValid": true, "issues": []}');
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

/**
 * Compare models.
 */
export const generateModelComparison = async (idea: string, language: string): Promise<ModelComparisonResponse> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Create two distinct video prompts based on the idea: "${idea}".
                
                1. "Veo Version": Focus on cinematic composition, lighting, and visual beauty.
                2. "Sora Version": Focus on physics simulation, object permanence, and temporal consistency.
                
                Return JSON: { "veoPrompt": "...", "soraPrompt": "..." }`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            veoPrompt: { type: Type.STRING },
                            soraPrompt: { type: Type.STRING }
                        }
                    }
                }
            });
            validateGeminiResponse(response);
            return JSON.parse(response.text || "{}");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

// --- Auto-fill / Suggestion Helpers ---

export const analyzeIdeaForModifiers = async (idea: string, language: string, options: any, isSeries: boolean, model: string, targetModel: string): Promise<Partial<PromptState>> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            
            // Construct strings from option arrays for the prompt
            const getOpts = (key: string) => (options[key] || []).join(', ');
            
            const prompt = `Role: Expert Film Director & Cinematographer.
            Task: Flesh out the technical and creative metadata for a video generation prompt based on the User's Core Idea.
            
            User Core Idea: "${idea}"
            Target Model: ${targetModel === 'sora' ? 'Sora (Physics/Simulation focus)' : 'Veo (Cinematic/Visual focus)'}.
            
            Instructions:
            1. **Descriptive Fields (Creative Writing)**: Write vivid, specific, and cinematic descriptions (approx 2 sentences, max 250 chars each) for:
               - 'environment': Describe the setting, lighting atmosphere, and background details.
               - 'characterActions': Describe specific movements, flow, interactions, and pacing.
               - 'characterSpecificClothing': Describe outfit details, fabrics, colors, and fit.
               - 'characterNuances': Micro-expressions, subtle habits, or emotional cues.
               - 'environmentSensoryDetails': Sounds, smells, air quality, humidity.
               - 'environmentDynamicEvents': Background motion (e.g., steam rising, leaves blowing, crowd movement).
            
            2. **Selection Fields (Strict Selection)**: Choose the single BEST fit from these provided lists:
               - 'artStyle': [${getOpts('artStyles')}]
               - 'cameraMovement': [${getOpts('cameraMovements')}]
               - 'timeOfDay': [${getOpts('timeOfDay')}]
               - 'weather': [${getOpts('weather')}]
               - 'lightingStyle': [${getOpts('lightingStyles')}]
               - 'colorPalette': [${getOpts('colorPalettes')}]
               - 'visualEffect': [${getOpts('visualEffects')}]
               - 'cameraDistance': [${getOpts('cameraDistances')}]
               - 'characterMood': [${getOpts('characterMoods')}]
               - 'characterArchetype': [${getOpts('characterArchetypes') || 'Hero, Villain, Mentor, etc.'}]
            
            3. **Audio Mix**: Suggest integer values (0-100) for 'audioMixVoice', 'audioMixAmbient', 'audioMixSfx'.
            
            Return strictly a JSON object with these keys.`;

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            validateGeminiResponse(response);
            return JSON.parse(response.text || "{}");
        } catch (error) {
            console.error("Auto-fill error", error);
            return {};
        }
    });
};

export const suggestFullAudioDesign = async (
    params: any, 
    language: string, 
    model: string, 
    ambientOptions: string[], 
    sfxIntensityOptions: string[]
): Promise<any> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            
            // Extract options passed in params or arguments
            // We expect voiceStyleOptions to be inside params based on existing usage
            const voices = params.voiceStyleOptions || [];
            const ambients = ambientOptions || [];
            const intensities = sfxIntensityOptions || [];

            const prompt = `Role: Expert Sound Designer & Audio Engineer.
            Task: Create a cohesive audio profile for the following video concept.

            Concept: "${params.idea}"
            Setting: "${params.environment}"
            Action: "${params.characterActions}"
            Mood: "${params.characterMood}"

            Instructions:
            1. **Voice Style**: Choose the BEST fit from this list: [${voices.join(', ')}].
            2. **Ambient Sound**: Choose the BEST fit from this list: [${ambients.join(', ')}].
            3. **SFX Intensity**: Choose the BEST fit from this list: [${intensities.join(', ')}].
            4. **Voice Over Script**: Write a compelling, short script (1-2 sentences) that fits the chosen Voice Style and Mood.

            Return strictly JSON:
            {
              "suggestedVoiceStyle": "string",
              "suggestedAmbientSound": "string",
              "suggestedSoundEffectsIntensity": "string",
              "suggestedVoiceOverScript": "string"
            }`;

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            validateGeminiResponse(response);
            return JSON.parse(response.text || "{}");
        } catch (error) {
            throw error;
        }
    });
};

export const suggestEnvironmentDetails = async (env: string, lang: string, model: string): Promise<any> => {
    // Implementation for environment details
    return _simpleJsonSuggest(model, `Suggest sensory details and dynamic events for environment: "${env}". Return JSON: { "environmentSensoryDetails": "...", "environmentDynamicEvents": "..." }`);
};

export const suggestSensoryDetails = async (env: string, weather: string, time: string, lang: string, model: string): Promise<string> => {
    const res = await _simpleJsonSuggest(model, `Describe sensory details (smell, sound, feeling) for: "${env}" during ${time} with ${weather} weather. Return JSON: { "details": "..." }`);
    return res.details || "";
};

export const suggestCharacterNuances = async (action: string, mood: string, lang: string, model: string): Promise<string> => {
    const res = await _simpleJsonSuggest(model, `Suggest subtle character nuances/micro-expressions for a character who is ${mood} and ${action}. Return JSON: { "nuances": "..." }`);
    return res.nuances || "";
};

export const suggestVisualEffect = async (style: string, customStyle: string, mood: string, lang: string, model: string, options: string[]): Promise<string> => {
    const res = await _simpleJsonSuggest(model, `Suggest a visual effect (e.g. Lens Flare, Chromatic Aberration) for a video with style "${style || customStyle}" and mood "${mood}". Pick from: ${options.join(', ')}. Return JSON: { "effect": "..." }`);
    return res.effect || "None";
};

export const suggestAdvancedSettings = async (params: any, lang: string, model: string, options: any): Promise<any> => {
    return _simpleJsonSuggest(model, `Suggest advanced settings for "${params.idea}". Return JSON: { "negativePrompt": "...", "motionIntensity": "...", "creativityLevel": "..." }`);
};

export const suggestArtStyles = async (input: string, lang: string, model: string): Promise<string[]> => {
    const res = await _simpleJsonSuggest(model, `Suggest 5 art styles related to "${input}". Return JSON: { "styles": ["...", ...] }`);
    return res.styles || [];
};

export const suggestCharacterDetails = async (archetype: string, env: string, lang: string, model: string): Promise<any> => {
    return _simpleJsonSuggest(model, `Suggest clothing and accessories for a "${archetype}" character in "${env}". Return JSON: { "clothingSuggestions": ["..."], "accessorySuggestions": ["..."] }`);
};

async function _simpleJsonSuggest(model: string, prompt: string): Promise<any> {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Suggestion error", e);
        return {};
    }
}
