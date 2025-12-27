
import { GoogleGenAI, Type, Chat, Modality, GenerateContentResponse } from "@google/genai";
import { PromptState, VeoPromptResponse, EditedImageResponse, GroundingChunk, PromptVariation, ModelComparisonResponse } from '../types';
import { retryOperation } from '../utils/retry';
import { parseAndThrowApiError, ApiError, ApiErrorType } from '../utils/apiErrors';
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

const validateGeminiResponse = (response: any) => {
    if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        const reason = candidate.finishReason;
        
        if (reason === 'SAFETY' || reason === 'BLOCKLIST' || reason === 'PROHIBITED_CONTENT' || reason === 'SPII' || reason === 'MALFORMED_FUNCTION_CALL') {
             throw new ApiError('Content generation blocked by safety filters or policy.', ApiErrorType.ContentBlocked);
        }
        if (reason === 'RECITATION') {
             throw new ApiError('Content blocked due to recitation (potential copyright) check.', ApiErrorType.ContentBlocked);
        }
        if (reason === 'OTHER') {
             // 'OTHER' can sometimes happen with valid content, but usually indicates an issue if no text is present.
             // We won't throw here, but rely on the caller to check for text existence.
        }
    } else if (response.promptFeedback && response.promptFeedback.blockReason) {
         throw new ApiError(`Prompt blocked: ${response.promptFeedback.blockReason}`, ApiErrorType.ContentBlocked);
    }
};

export const generateVeoPrompt = async (state: PromptState, userCoords: {latitude: number, longitude: number} | null): Promise<VeoPromptResponse> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const prompt = buildGeminiPrompt(state);
            
            const systemInstruction = `You are a world-class visual director and expert prompt engineer for state-of-the-art generative video models (Veo 3, Sora).

            Your Goal:
            Transform the user's structured parameters into a single, masterfully written, cohesive video description that minimizes hallucination and maximizes aesthetic quality.

            Key Directives:
            1.  **Micro-Details**: Don't just say "a forest". Say "a dense, mist-shrouded ancient forest with bioluminescent moss clinging to gnarled oak roots".
            2.  **Lighting & Color**: Specify the type of light (e.g., "diffused softbox lighting", "harsh noon sunlight", "neon rim lighting", "volumetric god rays"). Use precise color names (e.g., "crimson", "teal", "obsidian", "amber").
            3.  **Camera & Optic**: Define the lens aesthetics (e.g., "35mm anamorphic", "macro 100mm", "shallow depth of field with creamy bokeh") and movement dynamics ("slow push-in", "whip pan", "handheld shake").
            4.  **Physics & Motion**: Describe how objects move and interact with the environment. "The fabric ripples like water," "dust motes dance in the turbulence," "smoke swirls lazily."
            5.  **Atmosphere**: Describe the "air" of the scene (e.g., "thick with humidity", "crystal clear arctic air", "hazy industrial smog").
            6.  **Output Format**: Return a single, high-density paragraph suitable for direct input into a video generation model. Append a list of "Technical Tags" (e.g., "4k, 60fps, HDR, Ray-tracing, Unreal Engine 5 Style") at the very end.`;
            
            const tools: any[] = [];
            if (state.useGoogleSearch) {
                tools.push({ googleSearch: {} });
            }
            if (state.useGoogleMaps && state.model.includes('gemini-2.5')) {
                 tools.push({ googleMaps: {} });
            }

            // Correctly structured toolConfig for Google Maps
            const toolConfig = (state.useGoogleMaps && userCoords && state.model.includes('gemini-2.5')) ? {
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

            validateGeminiResponse(response);

            if (!response.text) {
                throw new ApiError("No text generated from the model.", ApiErrorType.ServerError);
            }

            return {
                prompt: response.text,
                groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks as unknown as GroundingChunk[]
            };

        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const generateModelComparison = async (idea: string, language: string): Promise<ModelComparisonResponse> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Analyze the following video idea and generate two distinct prompts for different video generation models.
                
                Core Idea: "${idea}"
                Language: ${language}
                
                1. **Veo Style**: Write a concise, punchy prompt optimized for aesthetics. Focus on camera, lighting, and visual style (e.g., "Cinematic 8k, golden hour"). Keep it under 4 sentences.
                2. **Sora Style**: Write a detailed, physics-based simulation prompt. Focus on cause-and-effect motion, object permanence, fluid dynamics, and temporal consistency. This should be longer and more descriptive (5-6 sentences).
                
                Return JSON.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            veoPrompt: { type: Type.STRING },
                            soraPrompt: { type: Type.STRING }
                        },
                        required: ["veoPrompt", "soraPrompt"]
                    }
                }
            });
            
            validateGeminiResponse(response);
            return safelyParseJsonResponse<ModelComparisonResponse>(response.text || "{}");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const validatePhysicsLogic = async (state: PromptState): Promise<{ isValid: boolean, issues: string[] }> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            
            // Construct a focused summary of the scene for physics analysis
            const sceneDescription = `
            Core Idea: ${state.idea}
            Environment: ${state.environment}
            Weather: ${state.weather}
            Actions: ${state.characterActions}
            Dynamic Events: ${state.environmentDynamicEvents}
            Visual Effects: ${state.visualEffect}
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `You are a Physics Engine Debugger for a hyper-realistic world simulator (Sora).
                Analyze the following video scene description for physical impossibilities, logical paradoxes, or hallucinations that would break immersion in a photorealistic simulation.
                
                Focus on:
                1. Newtonian Physics violations (gravity, momentum, mass).
                2. Thermodynamics violations (fire underwater, ice in lava, unmotivated light sources).
                3. Object Permanence & Consistency issues.
                4. Biological impossibilities (unless the genre implies fantasy/sci-fi, but even then, check for internal consistency).
                
                Input Scene:
                ${sceneDescription}
                
                If the genre (Context: ${state.artStyle}) allows for magic/sci-fi, be lenient, but flag blatant errors (e.g. "rain falling upwards" without a magical cause).
                
                Return JSON.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            isValid: { type: Type.BOOLEAN, description: "True if physically consistent or consistent within genre rules." },
                            issues: { 
                                type: Type.ARRAY, 
                                items: { type: Type.STRING },
                                description: "List of specific physics violations found. Empty if valid."
                            }
                        },
                        required: ["isValid", "issues"]
                    }
                }
            });
            
            validateGeminiResponse(response);
            return safelyParseJsonResponse(response.text || '{"isValid": true, "issues": []}');
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const generatePromptVariations = async (basePrompt: string, language: string, model: string, targetModel: 'veo' | 'sora'): Promise<PromptVariation[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: `Generate 4 distinct, high-quality creative variations of the following video prompt. 
                
                Directions:
                1. **Cinematic Realism**: Focus on photorealism, precise lighting, and tangible textures.
                2. **Stylized / Artistic**: Interpret the prompt with a unique visual style (e.g., Noir, Anime, Painterly, Avant-Garde).
                3. **Action-Oriented**: Emphasize movement, kinetics, and energy dynamics.
                4. **Atmospheric / Moody**: Focus on the feeling, ambient details, weather, and emotional tone.
                
                Target Model: ${targetModel}.
                Language: ${language}.
                Base Prompt: "${basePrompt}"`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                label: { type: Type.STRING, description: "The creative direction (e.g., 'Cinematic', 'Surreal')" },
                                prompt: { type: Type.STRING, description: "The detailed video prompt variation" }
                            },
                            required: ["label", "prompt"]
                        }
                    }
                }
            });
            validateGeminiResponse(response);
            return safelyParseJsonResponse<PromptVariation[]>(response.text || "[]");
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

export const suggestPromptIdeas = async (seed: string, language: string, model: string): Promise<PromptVariation[]> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            const contents = seed.trim() 
                ? `Generate 4 award-winning video concepts based on: "${seed}".` 
                : `Generate 4 unique, high-concept video prompt ideas suitable for a film festival. Vary the genres (e.g., Sci-Fi, Fantasy, Documentary, Experimental).`;

            const response = await ai.models.generateContent({
                model: model,
                contents: `${contents} 
                Language: ${language}.
                Ensure the descriptions are vivid, specific, and optimized for high-quality AI video generation. Use evocative language that implies visual splendor.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                label: { type: Type.STRING, description: "A catchy title or genre" },
                                prompt: { type: Type.STRING, description: "The detailed prompt text" }
                            },
                            required: ["label", "prompt"]
                        }
                    }
                }
            });
            validateGeminiResponse(response);
            return safelyParseJsonResponse<PromptVariation[]>(response.text || "[]");
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
                contents: `Act as a world-class Cinematographer and Screenwriter. Your goal is to rewrite the following video prompt to be visually stunning, highly detailed, and sensorially immersive.

                Directives:
                1.  **Enhance Visual Language**: Incorporate precise cinematic terminology (e.g., "chiaroscuro", "volumetric lighting", "deep depth of field", "anamorphic flare", "color grading", "camera movement") to explicitly define the visual style.
                2.  **Maximize Sensory Details**: Describe the texture of materials (e.g., "weathered stone", "iridescent scales"), the quality of light (e.g., "dappled", "harsh", "ethereal"), the density of the atmosphere, and specific sounds. Make the reader *feel* the scene.
                3.  **Elevate Verbs**: Use dynamic, active verbs to describe motion and interaction. Avoid passive voice.
                4.  **Maintain Intent**: Keep the core concept and subject of the original prompt but present it with much higher fidelity and artistic flair.
                5.  **Structure**: Ensure the prompt flows logically as a cohesive visual narrative.
                
                Original Prompt: "${prompt}"`,
            });
            validateGeminiResponse(response);
            return response.text || prompt;
        } catch (error) {
            parseAndThrowApiError(error);
        }
    });
};

interface ConceptArtOptions {
    aspectRatio: string;
    negativePrompt?: string;
    style?: string;
    styleStrength?: number;
}

export const generateConceptArt = async (prompt: string, options: string | ConceptArtOptions): Promise<string> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            let finalPrompt = `Concept art masterpiece, award-winning composition, highly detailed textures, dramatic lighting, volumetric atmosphere, 8k resolution. ${prompt}`;
            let aspectRatio = '1:1';
            let negativePrompt = '';

            if (typeof options === 'string') {
                aspectRatio = options;
            } else {
                aspectRatio = options.aspectRatio;
                // Append style if present
                if (options.style && options.style !== 'None') {
                    // Interpret style strength to adjust adjectives
                    const strength = options.styleStrength || 50;
                    let strengthModifier = '';
                    if (strength < 30) strengthModifier = 'a subtle hint of';
                    else if (strength > 70) strengthModifier = 'an intense, heavily stylized';
                    else strengthModifier = 'a distinct';
                    
                    finalPrompt += ` in ${strengthModifier} ${options.style} style.`;
                }
                
                // Append negative prompt if present (using natural language for gemini model)
                if (options.negativePrompt && options.negativePrompt.trim()) {
                    negativePrompt = options.negativePrompt.trim();
                    finalPrompt += ` Ensure the image does not contain: ${negativePrompt}.`;
                }
            }
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: finalPrompt,
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatio as any
                    }
                }
            });
            
            validateGeminiResponse(response);

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
    // Generate 4 distinct keyframes by slightly varying the prompt internally or just calling multiple times
    const promises = Array(4).fill(null).map((_, i) => {
        const framePrompt = `Storyboard keyframe ${i+1}/4, cinematic sequence. ${prompt}`;
        return generateConceptArt(framePrompt, aspectRatio);
    });
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
                        { text: "Analyze this audio track. Identify the genre, mood, key instruments, tempo, and any specific sound effects or ambient textures present. Provide a concise but descriptive summary suitable for a video generation prompt." }
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

export const analyzeIdeaForModifiers = async (
    idea: string, 
    language: string, 
    options: any,
    generateAsSeries: boolean,
    model: string,
    targetModel: string
): Promise<Partial<PromptState> & { audioMixVoice?: number, audioMixAmbient?: number, audioMixSfx?: number }> => {
    return retryOperation(async () => {
        try {
            const ai = getAiClient();
            // Using Gemini 3 Flash for faster, high-quality reasoning on modifiers
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Act as a professional Video Producer. Analyze the user's Core Idea and auto-fill EVERY applicable field in the video production manifest.
                
                Core Idea: "${idea}"
                Target Model Strategy: ${targetModel} (If 'sora', prioritize physics and realism. If 'veo', prioritize cinematic aesthetics.)
                Language: ${language}
                
                CRITICAL INSTRUCTION:
                - Do NOT hallucinate specific characters if none are implied. If the idea is "A drone shot of a forest", Character fields should remain 'Any' or empty.
                - Only fill fields that are *directly* relevant or strongly implied by the genre/tone of the idea.
                - For Audio Mix: Estimate the balance. (e.g. Dialogue heavy = High Voice, Nature = High Ambient).
                
                Return a JSON object matching the detailed schema provided.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            // Scene
                            environment: { type: Type.STRING },
                            environmentSensoryDetails: { type: Type.STRING },
                            environmentDynamicEvents: { type: Type.STRING },
                            timeOfDay: { type: Type.STRING },
                            weather: { type: Type.STRING },
                            architecturalStyle: { type: Type.STRING },
                            
                            // Character
                            characterActions: { type: Type.STRING },
                            characterNuances: { type: Type.STRING },
                            characterObjectInteraction: { type: Type.STRING },
                            characterGender: { type: Type.STRING },
                            characterEthnicity: { type: Type.STRING },
                            characterAge: { type: Type.STRING },
                            characterMood: { type: Type.STRING },
                            characterPose: { type: Type.STRING },
                            characterSkinTone: { type: Type.STRING },
                            characterArchetype: { type: Type.STRING },
                            characterSpecificClothing: { type: Type.STRING },
                            characterAccessories: { type: Type.STRING },
                            characterClothing: { type: Type.STRING }, // General style enum

                            // Style
                            artStyle: { type: Type.STRING },
                            customArtStyle: { type: Type.STRING },
                            lightingStyle: { type: Type.STRING },
                            colorPalette: { type: Type.STRING },
                            visualEffect: { type: Type.STRING },
                            animationPreset: { type: Type.STRING },

                            // Camera
                            cameraMovement: { type: Type.STRING },
                            cameraDistance: { type: Type.STRING },
                            lensType: { type: Type.STRING },
                            compositionalGuide: { type: Type.STRING },
                            aspectRatio: { type: Type.STRING },
                            resolution: { type: Type.STRING },

                            // Audio
                            voiceStyle: { type: Type.STRING },
                            voiceOver: { type: Type.STRING },
                            ambientSound: { type: Type.STRING },
                            soundEffectsIntensity: { type: Type.STRING },
                            // Flat number fields for audio mix
                            audioMixVoice: { type: Type.NUMBER },
                            audioMixAmbient: { type: Type.NUMBER },
                            audioMixSfx: { type: Type.NUMBER },

                            // Advanced
                            negativePrompt: { type: Type.STRING },
                            motionIntensity: { type: Type.STRING },
                            creativityLevel: { type: Type.STRING }
                        }
                    }
                }
            });
            validateGeminiResponse(response);
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
                contents: `Design a complete, immersive audio experience for this video.
                Idea: ${params.idea}
                Mood: ${params.characterMood}
                Visual Style: ${params.artStyle}
                
                Output:
                1. Voice Style: A suitable narrator tone or character voice description.
                2. Voice Over Script: A compelling, creative script (approx 2 sentences) that complements the visuals without just describing them.
                3. Ambient Sound: Choose a fitting background ambience that adds depth (e.g., 'distant city hum', 'crickets in a meadow').
                4. SFX Intensity: Appropriate level.`,
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
            validateGeminiResponse(response);
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
                contents: `Suggest sensory details and dynamic events for: ${environment}. 
                - Sensory Details: Focus on textures, smells, and ambient sounds.
                - Dynamic Events: Describe background motion (e.g., "leaves falling", "traffic moving").`,
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
            validateGeminiResponse(response);
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
            validateGeminiResponse(response);
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
                contents: `Suggest character nuances (micro-expressions, small gestures, breathing patterns). Actions: ${actions}. Mood: ${mood}.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { nuances: { type: Type.STRING } }
                    }
                }
            });
            validateGeminiResponse(response);
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
            
            // Construct context string
            let styleContext = artStyle;
            if (artStyle === 'Custom') {
                styleContext = customArtStyle || "Unspecified Custom Style";
            }
            
            const moodContext = mood === 'Any' ? "neutral/undefined" : mood;

            const response = await ai.models.generateContent({
                model: model,
                contents: `Act as a visual effects supervisor. Select the single best visual effect from the provided Options list that enhances the scene based on the Art Style and Mood.
                
                Context:
                - Art Style: ${styleContext}
                - Character/Scene Mood: ${moodContext}
                
                Options: ${options.join(', ')}
                
                Instructions:
                - Analyze the visual language of the art style.
                - Consider the emotional tone of the mood.
                - Choose the effect that best reinforces these elements.
                - If no specific effect is suitable, choose 'None'.
                
                Output: A JSON object with a single key "effect" matching exactly one string from the Options list.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { effect: { type: Type.STRING } }
                    }
                }
            });
            validateGeminiResponse(response);
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
            
            let artStylePrompt = params.artStyle;
            if (params.artStyle === 'Custom') {
                artStylePrompt = `Custom Style: ${params.customArtStyle}`;
            }

            const prompt = `Analyze the video concept and suggest advanced settings.
            
            Input Context:
            - Core Idea: "${params.idea}"
            - Art Style: "${artStylePrompt}"
            - Camera Movement: "${params.cameraMovement}"
            - Target Model: "${params.targetModel}"
            
            Task:
            1. Generate a "negativePrompt" (comma-separated terms) to avoid artifacts common to this style (e.g., "blur, distortion, low quality" for photorealism).
            2. Select the best "motionIntensity" from: [${options.motionIntensity.join(', ')}].
            3. Select the best "creativityLevel" from: [${options.creativityLevel.join(', ')}].
            
            Language: ${language}
            Return JSON.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview', // Upgraded to Gemini 3 Flash
                contents: prompt,
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
            validateGeminiResponse(response);
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
                contents: `Suggest 3 distinct art styles based on the description: "${input}". 
                Be specific (e.g., instead of just "Cyberpunk", say "Neon-Noir Cyberpunk with glitched VHS aesthetics").
                Return a simple string array.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            validateGeminiResponse(response);
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
                contents: `Suggest detailed clothing and accessories for a ${archetype} character in a ${environment} setting. Focus on visual storytelling items.`,
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
            validateGeminiResponse(response);
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
                contents: `Combine these prompt variations into one cohesive, master prompt. Blend the best elements of each to create a unique and vivid scene. Ensure the style is consistent.\n\nVariations: ${JSON.stringify(variations)}`
            });
            validateGeminiResponse(response);
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
                        { text: `Edit this image based on the following instruction. Maintain high quality and photorealism where appropriate. Instruction: ${prompt}` }
                    ]
                }
            });
            validateGeminiResponse(response);
            
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
                contents: `Suggest 3 catchy and relevant song titles for a song about: "${idea}". Make them memorable and evocative.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            });
            validateGeminiResponse(response);
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
                contents: `Suggest 3 intricate and creative musical style prompts for a song about: "${idea}". 
                Combine genres (e.g., 'Cyberpunk Jazz-Noir', 'Baroque Pop with Trap beats'). 
                Mention specific instruments, production qualities (e.g., 'reverb-drenched vocals', 'lo-fi vinyl crackle'), and tempo/mood.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            });
            validateGeminiResponse(response);
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
                contents: `Create a professional song structure for a track about: "${idea}".
                
                Style: ${style}
                Theme: ${theme}
                Language: ${language}
                
                Requirements:
                1. Use standard song structure tags: [Intro], [Verse 1], [Chorus], [Verse 2], [Bridge], [Chorus], [Outro].
                2. Suggest specific instrumental breaks in brackets (e.g., [Distorted Guitar Solo], [Ethereal Synth Pad Intro]).
                3. Ensure lyrics rely on concrete imagery and metaphors rather than abstract feelings. Avoid clichés.
                4. Match the rhythm and rhyme scheme to the specified genre.`
            });
            validateGeminiResponse(response);
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
            validateGeminiResponse(response);
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
                        { text: prompt || "Analyze this video." }
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

export const createChat = (): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: "You are a helpful creative assistant for a video production app. Help the user brainstorm ideas, refine prompts, and understand cinematic terminology. Keep answers concise and helpful." }
    });
};

export const sendMessageToChatStream = async function* (chat: Chat, message: string): AsyncGenerator<{ text: string }> {
    const responseStream = await chat.sendMessageStream({ message });
    for await (const chunk of responseStream) {
        // Validation for streaming chunks is subtler; assume valid if yielding text
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
