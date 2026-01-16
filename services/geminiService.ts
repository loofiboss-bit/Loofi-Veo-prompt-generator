// ... existing imports
import { GoogleGenAI, Chat, Modality, GenerateContentResponse, Type } from "@google/genai";
import { PromptState, VeoPromptResponse, ModelComparisonResponse, PromptVariation, EditedImageResponse, VisualDNA, Shot, ColorGradeParams, AgentAction, SunoLyricRequest, SongMetadata } from "../types";
import { parseAndThrowApiError } from "../utils/apiErrors";
import { buildGeminiPrompt } from "./promptBuilder";
import { retryOperation } from "../utils/retry";

// ... existing helper functions (getAiClient, cleanJson, etc.) ...
// Helper to initialize the Google GenAI client
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to extract JSON from markdown code blocks
const cleanJson = (text: string | undefined): string => {
  if (!text) return "{}";
  let cleaned = text.replace(/```json\s*|\s*```/g, "");
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

// Helper to extract JSON Array from markdown code blocks
const cleanJsonArray = (text: string | undefined): string => {
    if (!text) return "[]";
    let cleaned = text.replace(/```json\s*|\s*```/g, "");
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    }
    return cleaned;
};

const getLanguageName = (code: string): string => {
    const names: Record<string, string> = {
        'en': 'English',
        'sv': 'Swedish',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German'
    };
    return names[code] || code;
};

// Internal Helper for Text Generation to reduce boilerplate
const generateText = async (model: string, prompt: string): Promise<string> => {
    const ai = getAiClient();
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: model,
        contents: prompt,
    }));
    return response.text?.trim() || "";
};

// ... [Keep existing functions] ...

// --- Lyric Assistant Logic ---

export const getWordSuggestions = async (word: string, context: string): Promise<{ rhymes: string[], nearRhymes: string[], synonyms: string[] }> => {
    const ai = getAiClient();
    const prompt = `You are a professional songwriting assistant. 
    Analyze the target word: "${word}".
    Context line: "${context}"

    Provide a JSON object with:
    1. 'rhymes': 5 perfect rhymes that fit the meter/vibe.
    2. 'nearRhymes': 5 slant or near rhymes (assonance/consonance) suitable for modern songwriting.
    3. 'synonyms': 3 rhythmic synonyms that could replace the word while keeping the meaning.

    Focus on words that are lyrical and evocative.`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        rhymes: { type: Type.ARRAY, items: { type: Type.STRING } },
                        nearRhymes: { type: Type.ARRAY, items: { type: Type.STRING } },
                        synonyms: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['rhymes', 'nearRhymes', 'synonyms']
                }
            }
        }));
        
        return JSON.parse(response.text || '{"rhymes": [], "nearRhymes": [], "synonyms": []}');
    } catch (error) {
        console.error("Word suggestion error", error);
        return { rhymes: [], nearRhymes: [], synonyms: [] };
    }
};

export const extendLyrics = async (previousLyrics: string, goal: 'verse_2' | 'bridge' | 'outro'): Promise<string> => {
    const prompt = `You are a professional songwriter continuing an existing song.
    
    Context (Last few lines):
    "${previousLyrics}"
    
    Task: Write the next section: ${goal.replace('_', ' ').toUpperCase()}.
    
    Guidelines:
    1. Maintain the exact rhyme scheme, rhythm, and tone of the context.
    2. Do NOT repeat lines from the context.
    3. Include appropriate meta-tags (e.g., [Verse 2], [Bridge]).
    4. Output ONLY the new lyrics.`;

    try {
        return await generateText('gemini-3-flash-preview', prompt);
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

// ... [Keep rest of existing functions] ...
export const enhancePrompt = async (rawText: string, styleContext: string = ''): Promise<string> => {
    const prompt = `You are an expert cinematographer. Rewrite the following user description into a detailed image generation prompt. 
    Add sensory details, specific camera lenses (e.g., 35mm, T1.5), lighting styles (e.g., Chiaroscuro), and textures. 
    Keep the original intent but maximize visual fidelity.
    
    Original: "${rawText}"
    ${styleContext ? `Style Context: ${styleContext}` : ''}
    
    Output ONLY the enhanced prompt text. Do not add explanations.`;

    try {
        return await generateText('gemini-3-pro-preview', prompt) || rawText;
    } catch (error) {
        parseAndThrowApiError(error);
        return rawText;
    }
};

export const suggestEnvironmentDetails = async (environment: string, idea: string, language: string, model: string) => {
    const ai = getAiClient();
    const prompt = `Analyze the following video concept and setting:
    Core Idea: "${idea}"
    Current Environment Setting: "${environment}"

    Task:
    1. If the Current Environment Setting is empty or very brief, write a detailed, cinematic description of the location suitable for Veo.
    2. Suggest specific, evocative sensory details (specific smells, textures, ambient sounds, lighting temperatures).
    3. Suggest dynamic background events or micro-movements that add life to the scene (e.g., wind moving objects, distant lights, background extras, weather shifts).

    Return a JSON object with the following keys:
    - 'environment': (String) The detailed environment description (only if you generated a better one, otherwise keep empty string).
    - 'environmentSensoryDetails': (String) A concise, comma-separated list of sensory details.
    - 'environmentDynamicEvents': (String) A concise, comma-separated list of dynamic background events.
    
    Language: ${language}`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateLocationDescription = async (name: string, style: string, language: string): Promise<string> => {
    const prompt = `Act as a film set designer and cinematographer.
    Create a detailed, evocative visual description for a location named: "${name}".
    
    Style Context: ${style || "Cinematic, Detailed"}
    
    Include:
    - Lighting atmosphere
    - Texture and materials
    - Key props or architectural features
    - Mood
    
    Keep it under 3 sentences, focused purely on visual description for a video generation prompt.
    Language: ${language}`;

    try {
        return await generateText('gemini-3-flash-preview', prompt);
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const suggestBRoll = async (scriptText: string, language: string): Promise<{ keyword: string; description: string }[]> => {
    const ai = getAiClient();
    
    const prompt = `Act as a professional video editor. Analyze the following script/dialogue.
    Identify 3 distinct nouns, concepts, or emotions mentioned that would make excellent visual "B-Roll" or "Cutaway" shots to break up the visual monotony of the dialogue.
    
    Script: "${scriptText}"
    
    Task: Return a JSON array of objects with:
    - "keyword": Short label (1-3 words).
    - "description": A highly descriptive, cinematic visual prompt for the cutaway shot (e.g. "Extreme close-up of a nervous hand tapping on the table, warm lighting").
    
    Language: ${language}`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonArray(response.text) || "[]");
    } catch (error) {
        parseAndThrowApiError(error);
        return [];
    }
};

export const interpretCameraPath = async (pathData: { x: number; y: number }[]): Promise<string> => {
    // Subsample path to reduce tokens (e.g., take every 5th point or max 20 points)
    const step = Math.max(1, Math.floor(pathData.length / 20));
    const sampledPath = pathData.filter((_, i) => i % step === 0 || i === pathData.length - 1);
    
    const prompt = `You are a camera operator. Analyze this 2D vector path on a screen.
    Coordinates are normalized (0,0 is Top-Left, 1,1 is Bottom-Right).
    
    Path Sequence:
    ${JSON.stringify(sampledPath)}
    
    Task: Describe the camera movement in cinematic terms relative to the frame.
    - Horizontal movement = Pan Left/Right or Truck Left/Right.
    - Vertical movement = Tilt Up/Down or Pedestal Up/Down.
    - Diagonal = Combine terms.
    - Curved = Arc Shot.
    
    Return ONLY a concise phrase describing the camera move (e.g., "Slow pan from left to right", "Arc movement upward").`;

    try {
        return await generateText('gemini-3-flash-preview', prompt);
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const generateVeoPrompt = async (state: PromptState, userCoords: { latitude: number; longitude: number } | null): Promise<VeoPromptResponse> => {
    const ai = getAiClient();
    const promptText = buildGeminiPrompt(state);
    
    if (state.useGoogleSearch || state.useGoogleMaps) {
        const tools: any[] = [];
        if (state.useGoogleSearch) tools.push({ googleSearch: {} });
        if (state.useGoogleMaps) tools.push({ googleMaps: {} });
        
        const toolConfig: any = {};
        if (state.useGoogleMaps && userCoords) {
             toolConfig.retrievalConfig = {
                latLng: {
                  latitude: userCoords.latitude,
                  longitude: userCoords.longitude
                }
             };
        }

        try {
            const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
                model: state.model,
                contents: `Enhance and validate this video prompt using real-world data if applicable:\n\n${promptText}`,
                config: { tools, toolConfig }
            }));
            return {
                prompt: response.text || promptText,
                groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
            };
        } catch (error) {
             console.warn("Grounding failed, returning prompt without grounding", error);
             return { prompt: promptText };
        }
    }

    return { prompt: promptText };
};

export const analyzeIdeaForModifiers = async (idea: string, language: string, options: any, isSeries: boolean, model: string, targetModel: string) => {
    const ai = getAiClient();
    const prompt = `Analyze this video idea: "${idea}". 
    
    1. Select the best fitting options from the provided lists to create a cinematic prompt for ${targetModel === 'sora' ? 'Sora' : 'Veo'}.
    
    Options Lists: ${JSON.stringify(options)}
    
    2. Also generate short, descriptive text for the following fields based on the idea (Language: ${language}):
       - "environment": A concise description of the scene setting.
       - "characterActions": A concise description of what the main subject is doing.
       - "characterSpecificClothing": Detailed clothing description matching the style/archetype.
       - "characterAccessories": 1-2 items they might be carrying or wearing.
    
    Return a JSON object with keys matching the option keys (e.g. artStyle, cameraMovement) AND the text fields above.
    For audioMix, return numbers for audioMixVoice, audioMixAmbient, audioMixSfx.
    Language: ${language}`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const suggestFullAudioDesign = async (context: any, language: string, model: string, ambientOptions: string[], sfxIntensityOptions: string[]) => {
    const ai = getAiClient();
    const prompt = `Suggest audio design for a video based on: ${JSON.stringify(context)}.
    Available Ambients: ${ambientOptions.join(', ')}.
    Available SFX Intensity: ${sfxIntensityOptions.join(', ')}.
    
    Return JSON with: suggestedVoiceStyle, suggestedVoiceOverScript, suggestedAmbientSound, suggestedSoundEffectsIntensity.
    Language: ${language}`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestSensoryDetails = async (environment: string, weather: string, time: string, language: string, model: string) => {
    const prompt = `Describe sensory details (smell, temperature, sound, texture) for: ${environment} during ${time} with ${weather} weather. Short, evocative phrase. Language: ${language}`;
    try {
        return await generateText(model || 'gemini-3-flash-preview', prompt);
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestCharacterNuances = async (action: string, mood: string, language: string, model: string) => {
    const prompt = `Suggest micro-expressions or subtle body language nuances for a character doing: "${action}" feeling "${mood}". Short phrase. Language: ${language}`;
    try {
        return await generateText(model || 'gemini-3-flash-preview', prompt);
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestVisualEffect = async (style: string, customStyle: string, mood: string, language: string, model: string, options: string[]) => {
    const ai = getAiClient();
    const prompt = `Select the best visual effect from this list: ${options.join(', ')} 
    for a video with style: ${style} ${customStyle} and mood: ${mood}. Return only the effect name. Language: ${language}`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return response.text?.trim() || "None";
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestAdvancedSettings = async (context: any, language: string, model: string, options: any) => {
    const ai = getAiClient();
    const prompt = `Act as a video generation expert. Analyze the video concept: ${JSON.stringify(context)}.

    Recommend optimal technical settings:
    1. **Negative Prompt**: Construct a comma-separated list of elements to exclude.
       - Base this on the 'artStyle' (e.g., if 'Photorealistic', exclude 'anime, cartoon').
       - Base this on the 'environment' (e.g., if 'desert', exclude 'trees, rain').
       - Include standard quality control terms (e.g., 'blurry, distorted, low quality').
    
    2. **Motion Intensity**: Choose the best fit from: ${JSON.stringify(options.motionIntensity)}.
       - 'High' for action/sports. 'Low' for landscapes/slow-mo.
    
    3. **Creativity Level**: Choose from: ${JSON.stringify(options.creativityLevel)}.

    Return JSON with keys: 'negativePrompt' (string), 'motionIntensity' (string), 'creativityLevel' (string).
    Language: ${language}`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestArtStyles = async (customInput: string, language: string, model: string) => {
    const ai = getAiClient();
    const prompt = `Suggest 5 specific art style terms related to "${customInput}". Return as JSON string array. Language: ${language}`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonArray(response.text) || "[]");
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestCharacterDetails = async (archetype: string, env: string, language: string, model: string) => {
    const ai = getAiClient();
    const prompt = `Suggest clothing and accessories for a ${archetype} in ${env}.
    Return JSON with 'clothingSuggestions' (string array) and 'accessorySuggestions' (string array). Language: ${language}`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const analyzeAudio = async (base64Audio: string, mimeType: string) => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Audio } },
                    { text: "Describe the ambient sound and atmosphere of this audio clip in a short phrase suitable for a video prompt." }
                ]
            }
        }));
        return response.text || "";
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestCameraSetup = async (context: any, options: any, model: string) => {
    const ai = getAiClient();
    const prompt = `Suggest camera settings for: ${JSON.stringify(context)}.
    Options: ${JSON.stringify(options)}.
    Return JSON with cameraMovement, cameraDistance, lensType, compositionalGuide.`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestCharacterActionFlow = async (context: any, model: string) => {
    const ai = getAiClient();
    const prompt = `Describe a short, cinematic sequence of actions for a character based on: ${JSON.stringify(context)}. Focus on visual storytelling.`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return response.text || "";
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const restructurePrompt = async (currentPrompt: string, model: string) => {
    const prompt = `Analyze the following video prompt and reorganize it into these clear logical sections for better AI interpretation:

    1. **Scene**: Environment, lighting, time of day, weather.
    2. **Character**: Appearance, actions, emotions.
    3. **Style**: Visual aesthetic, art style, atmosphere.
    4. **Technical Specs**: Camera angles, lenses, resolution, specific effects.

    Refine the wording to be more evocative and precise for video generation models like Veo. Use Markdown bolding for the section headers.

    Current Prompt: "${currentPrompt}"`;
    try {
        return await generateText(model || 'gemini-3-flash-preview', prompt) || currentPrompt;
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const validatePhysicsLogic = async (state: PromptState) => {
    const ai = getAiClient();
    const prompt = `Analyze this video prompt for physical logic and consistency.
    Prompt Data: ${JSON.stringify(state)}
    
    Identify any violations of physics or logic (e.g. conflicting lighting, impossible movement, temporal paradoxes).
    Return JSON: { isValid: boolean, issues: string[] }`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{\"isValid\": true, \"issues\": []}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const validateCinematography = async (state: PromptState) => {
    const ai = getAiClient();
    const prompt = `Analyze this video prompt for cinematography and technical filmmaking inconsistencies.
    Prompt Data: ${JSON.stringify(state)}

    Identify any conflicts or impossibilities in the following categories:
    1. Lighting (e.g., "Silhouette" combined with "High Key", "Night" combined with "Direct Sunlight").
    2. Optics/Lens (e.g., "Fisheye" combined with "Telephoto compression", "Macro" combined with "Wide Shot").
    3. Camera Movement (e.g., "Static Tripod" combined with "Tracking Shot").
    4. Aspect Ratio vs Composition (e.g. "Vertical 9:16" combined with "Ultra-wide panoramic composition").

    Return JSON: { "isValid": boolean, "issues": string[] }`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{\"isValid\": true, \"issues\": []}");
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const generatePromptVariations = async (basePrompt: string, language: string, model: string, targetModel: string): Promise<PromptVariation[]> => {
    const ai = getAiClient();
    const prompt = `Generate 3 distinct variations of this video prompt for ${targetModel}, each with a different artistic approach (e.g. Realistic, Stylized, Abstract).
    Base Prompt: "${basePrompt}"
    
    Return JSON array of objects with 'label' and 'prompt'. Language: ${language}`;
    
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonArray(response.text) || "[]");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const suggestPromptIdeas = async (input: string, language: string, model: string): Promise<PromptVariation[]> => {
    const ai = getAiClient();
    const prompt = `Brainstorm 5 creative video concepts based on: "${input}".
    Return JSON array of objects with 'label' (short title) and 'prompt' (description). Language: ${language}`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonArray(response.text) || "[]");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const refinePrompt = async (basePrompt: string, state: PromptState): Promise<string> => {
    const prompt = `Act as an expert filmmaker and cinematographer. Refine the following video generation prompt to be more descriptive, evocative, and visually stunning.

    Goal: Create a prompt that will generate a video with high emotional impact and strong visual storytelling.

    Guidelines:
    1. **Show, Don't Tell**: Instead of abstract concepts, describe specific visual details, actions, and interactions.
    2. **Sensory Details**: Incorporate lighting, texture, camera movement, and atmospheric effects to set the mood.
    3. **Cinematic Language**: Use terminology relevant to Veo/Sora (e.g., "volumetric lighting", "shallow depth of field", "slow motion").
    4. **Coherence**: Ensure the scene remains logically consistent while enhancing the artistic quality.

    Original Prompt: "${basePrompt}"

    Return ONLY the refined prompt text. Do not add introductory or concluding remarks.`;

    try {
        return await generateText(state.model || 'gemini-3-flash-preview', prompt) || basePrompt;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const rewriteDialogue = async (currentText: string, context: string, tone: string): Promise<string> => {
    const prompt = `You are a Hollywood script doctor. Rewrite the following dialogue line to be ${tone}.
    Context: ${context}
    Current line: "${currentText}"
    
    Return ONLY the rewritten line. Keep it concise and natural.`;

    try {
        return await generateText('gemini-3-flash-preview', prompt) || currentText;
    } catch (error) {
        parseAndThrowApiError(error);
        return currentText;
    }
};

export const generateConceptArt = async (prompt: string, options?: any, structureImageBase64?: string): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-image';
    
    let imagePrompt = prompt;
    if (options) {
        if (options.aspectRatio) imagePrompt += ` Aspect ratio: ${options.aspectRatio}.`;
        if (options.style) imagePrompt += ` Style: ${options.style}.`;
    }

    const contents: any = { parts: [{ text: imagePrompt }] };

    // If structure image (skeleton) is provided, pass it as input
    if (structureImageBase64) {
        contents.parts.unshift({
            inlineData: {
                mimeType: 'image/png',
                data: structureImageBase64
            }
        });
        imagePrompt += " Use the provided skeleton image as a strict structural reference for the character's pose.";
        contents.parts[1].text = imagePrompt; // Update text part
    }

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: contents,
        }));
        
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image generated.");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const inpaintingWithImagen = async (base64Image: string, base64Mask: string, prompt: string): Promise<string> => {
    const ai = getAiClient();
    
    try {
        const response = await retryOperation<any>(() => ai.models.generateImages({
            model: 'imagen-3.0-generate-001',
            prompt: prompt,
            image: { imageBytes: base64Image },
            mask: { imageBytes: base64Mask },
            config: {
                numberOfImages: 1,
                aspectRatio: '1:1', // Imagen usually keeps aspect ratio of input, this might be ignored
                outputMimeType: 'image/jpeg'
            }
        } as any));
        
        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (imageBytes) {
            return `data:image/jpeg;base64,${imageBytes}`;
        }
        throw new Error("No edited image returned.");
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const outpaintImage = async (base64Composite: string, base64Mask: string, prompt: string): Promise<string> => {
    // We reuse the inpainting logic because outpainting is technically inpainting on a larger canvas
    // where the original image is preserved and the new areas are masked for generation.
    return inpaintingWithImagen(base64Composite, base64Mask, prompt);
};

export const turnSketchToImage = async (sketchBase64: string, prompt: string): Promise<string> => {
    const ai = getAiClient();
    // Use gemini-2.5-flash-image for image-to-image capabilities via generation
    const model = 'gemini-2.5-flash-image';
    
    const textPrompt = `Turn this rough sketch into a high-quality, realistic image based on the following description: "${prompt}". 
    Maintain the composition and layout of the sketch exactly, but render it with photorealistic details, lighting, and textures.`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: sketchBase64 } },
                    { text: textPrompt }
                ]
            }
        }));
        
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image generated from sketch.");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateConceptImage = async (prompt: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<any>(() => ai.models.generateImages({
            model: 'imagen-3.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '16:9',
                outputMimeType: 'image/jpeg'
            }
        }));
        
        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (imageBytes) {
            return `data:image/jpeg;base64,${imageBytes}`;
        }
        throw new Error("No image generated.");
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const generateStoryboard = async (prompt: string, aspectRatio: string): Promise<string[]> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-image';
    const fullPrompt = `Generate a storyboard with 4 distinct sequential panels for this video concept. 
    Concept: ${prompt}. 
    Ensure consistency in style. Aspect Ratio: ${aspectRatio}.`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: fullPrompt + " Create a 2x2 grid image.",
        }));

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return [`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`];
                }
            }
        }
        return [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const refineStoryboardContinuity = async (
    shots: any[],
    globalContext: any,
    language: string,
    model: string,
    enableContextualFlow: boolean = true
): Promise<string[]> => {
    const ai = getAiClient();
    
    const sequenceDescription = shots.map((shot, index) => {
        return `Shot ${index + 1}:
        - Action: ${shot.action}
        - Camera: ${shot.camera || 'Standard'}
        - Character Context: ${shot.characterId ? 'Specific character actor' : 'Generic/Defined by global context'}
        - Location Context: ${shot.locationId ? 'Specific set location' : 'Generic/Defined by global context'}`;
    }).join('\n\n');

    let promptInstructions = "";
    
    if (enableContextualFlow) {
        promptInstructions = `
        CRITICAL: Ensure narrative continuity.
        1. Context: For Shot N, explicitly reference the end state of Shot N-1 in the scene description (e.g., "Continuing from the previous shot...").
        2. Ensure transitions are logical (e.g., if a character exits left in Shot 1, they should enter right or be in a new position consistent with that movement in Shot 2).
        3. Maintain strict visual consistency based on the Global Context.`;
    } else {
        promptInstructions = `
        1. Treat each shot as a distinct, standalone scene (e.g., for a montage).
        2. Focus on maximizing the visual impact of each individual prompt based on the Global Context.`;
    }

    const prompt = `You are a professional film editor and storyboard artist.
    Refine the following sequence of video generation prompts.
    
    Global Context (applies to all):
    - Style: ${globalContext.style}
    - Character: ${globalContext.character}
    - Setting: ${globalContext.setting}

    Shot Sequence:
    ${sequenceDescription}

    Task:
    For EACH shot, write a full, standalone video generation prompt.
    ${promptInstructions}
    
    Return a JSON array of strings, where each string is the full prompt for that shot index.
    Language: ${language}`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonArray(response.text) || "[]");
    } catch (error) {
        parseAndThrowApiError(error);
        return [];
    }
};

export const parseScriptToScenes = async (
    scriptText: string,
    availableCharacters: { id: string; name: string }[],
    availableLocations: { id: string; name: string }[], // New param
    language: string = 'en',
    model: string = 'gemini-3-pro-preview'
): Promise<{ action: string; camera: string; characterId: string; locationId: string }[]> => { // Updated return type
    const ai = getAiClient();
    const characterMap = availableCharacters.map(c => ({ id: c.id, name: c.name }));
    const locationMap = availableLocations.map(l => ({ id: l.id, name: l.name })); // New map
    
    const prompt = `Act as a professional storyboard artist and script supervisor.
    Break down the following raw script text into a sequence of distinct visual shots (scenes).

    Script Text:
    "${scriptText}"

    Available Characters (ID: Name):
    ${JSON.stringify(characterMap)}

    Available Locations (ID: Name):
    ${JSON.stringify(locationMap)}

    Task:
    1. Identify distinct visual beats.
    2. Suggest a camera angle/movement for each beat based on the action intensity and emotional context.
    3. If a character from the Available Characters list is the primary subject, map their ID.
    4. If the scene takes place in one of the Available Locations based on scene headers (e.g. "INT. KITCHEN") or context, map its ID.

    Return a JSON array of objects with keys:
    - 'action': (string) Concise visual description of the action.
    - 'camera': (string) Camera direction (e.g., "Close-up", "Wide Shot", "Tracking Shot").
    - 'characterId': (string) Matching ID from the list, or empty string if none/generic.
    - 'locationId': (string) Matching ID from the list, or empty string if none/generic.

    Language: ${language}`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonArray(response.text) || "[]");
    } catch (error) {
        parseAndThrowApiError(error);
        return [];
    }
};

export const bridgeScenes = async (
    sceneA_Context: string,
    sceneB_Context: string,
    numScenes: number = 1
): Promise<Partial<Shot>[]> => {
    const ai = getAiClient();
    
    const prompt = `You are a professional screenwriter and continuity editor.
    You have two scenes (Scene A and Scene B) that are currently disconnected.
    Your task is to write ${numScenes} intermediate scene(s) to logically bridge the gap between them in terms of narrative flow, character movement, and pacing.

    Scene A (Start): "${sceneA_Context}"
    Scene B (End): "${sceneB_Context}"

    Output:
    Return a JSON array of objects representing the new bridge scenes. Each object must have:
    - 'action': (string) Visual description of the action.
    - 'camera': (string) Suggested camera angle.
    - 'dialogueText': (string, optional) Dialogue if necessary.

    Ensure the transition is smooth and makes sense.`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonArray(response.text) || "[]");
    } catch (error) {
        parseAndThrowApiError(error);
        return [];
    }
};

export const combinePromptVariations = async (variations: string[], language: string, model: string, targetModel: string): Promise<string> => {
    const prompt = `Combine the best elements of these ${variations.length} video prompts into a single, cohesive master prompt for ${targetModel}.
    
    Variations:
    ${variations.map((v, i) => `${i+1}. ${v}`).join('\n')}
    
    Language: ${language}`;
    
    try {
        return await generateText(model || 'gemini-3-flash-preview', prompt);
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const editImageWithGemini = async (base64Image: string, mimeType: string, instruction: string): Promise<EditedImageResponse> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-image';
    
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Image } },
                    { text: instruction }
                ]
            }
        }));
        
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return {
                        newImageBytes: part.inlineData.data,
                        newMimeType: part.inlineData.mimeType
                    };
                }
            }
        }
        throw new Error("No edited image returned.");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

// --- Advanced Suno Generation Logic ---

export const generateSongLyrics = async (request: SunoLyricRequest): Promise<string> => {
    const langName = getLanguageName(request.language);
    
    let structureTemplate = "";

    // 1. Check for Custom Structure Override
    if (request.customStructure && request.customStructure.length > 0) {
        // Map custom array to vertical list format with brackets
        structureTemplate = request.customStructure.map(s => {
            // Ensure brackets for consistency, though Suno is flexible
            return s.startsWith('[') && s.endsWith(']') ? s : `[${s}]`;
        }).join('\n');
    } else {
        // 2. Fallback to Preset Structure
        switch (request.structure) {
            case 'pop_standard':
                structureTemplate = "[Intro]\n[Verse 1]\n[Chorus]\n[Verse 2]\n[Chorus]\n[Bridge]\n[Chorus]\n[Outro]";
                break;
            case 'rap_freestyle':
                structureTemplate = "[Intro]\n[Verse]\n[Ad-libs]\n[Verse]\n[Outro]";
                break;
            case 'edm_build':
                structureTemplate = "[Intro]\n[Build]\n[Drop]\n[Verse]\n[Build]\n[Drop]\n[Outro]";
                break;
            case 'ballad':
                structureTemplate = "[Intro]\n[Verse 1]\n[Pre-Chorus]\n[Chorus]\n[Verse 2]\n[Chorus]\n[Outro]";
                break;
            default:
                structureTemplate = "[Verse]\n[Chorus]";
        }
    }

    const prompt = `You are a hit songwriter. Write lyrics for a song about: "${request.topic}".
    Mood: ${request.mood}.
    Language: ${langName}.
    
    Use this strict structure template for Suno AI generation:
    ${structureTemplate}
    
    CRITICAL: 
    1. Include performance meta-tags in brackets like [Whisper], [Belting], [Bass Drop], [Guitar Solo] where appropriate to guide the AI generation.
    2. Return ONLY the lyrics and tags. No conversational text.`;

    try {
        return await generateText(request.model || 'gemini-3-flash-preview', prompt);
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const generateSunoTags = async (description: string, genre: string, bpm: number, model: string): Promise<string> => {
    const prompt = `Act as a Suno AI prompt engineer.
    Create a comma-separated list of musical style tags (max 120 chars) based on:
    Genre: ${genre}
    BPM: ${bpm}
    Vibe/Description: "${description}"
    
    Output strictly the tag string. Example: "Dark synthwave, 140bpm, aggressive female vocals, heavy bass"`;

    try {
        return await generateText(model || 'gemini-3-flash-preview', prompt);
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const generateSongMetadata = async (topic: string, mood: string): Promise<SongMetadata> => {
    const ai = getAiClient();
    const prompt = `You are a hit music producer.
    Topic: "${topic}"
    Mood: "${mood}"

    Task:
    1. Generate a catchy, creative Song Title (2-5 words).
    2. Generate a concise Style Description optimized for Suno.com (max 120 chars).
       - Include: Genre, specific instruments, vocal style (e.g. "Gritty male vocals"), and tempo/BPM.
       - Example: "Dark synthwave, arpeggiated bass, aggressive male vocals, 140bpm"

    Return strict JSON: { "title": "...", "styleDescription": "..." }`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
        return { title: "Untitled", styleDescription: "Pop" }; // Fallback
    }
};

// Deprecated / Legacy Support wrapper (optional, kept for safety if other components use it)
export const generateStructuredLyrics = async (topic: string, structure: string, mood: string, language: string, model: string): Promise<string> => {
    // Map string structure to enum if possible, or fallback
    let enumStructure: SunoLyricRequest['structure'] = 'pop_standard';
    const s = structure.toLowerCase();
    if (s.includes('rap') || s.includes('freestyle')) enumStructure = 'rap_freestyle';
    else if (s.includes('edm') || s.includes('drop')) enumStructure = 'edm_build';
    else if (s.includes('ballad')) enumStructure = 'ballad';

    return generateSongLyrics({
        topic,
        mood,
        structure: enumStructure,
        language,
        model
    });
};

// ... [Existing functions: suggestSunoTitles, suggestSunoStyles, generateSpeech, etc.] ...

export const suggestSunoTitles = async (idea: string, theme: string, language: string, model: string): Promise<string[]> => {
    const ai = getAiClient();
    const langName = getLanguageName(language);
    const themePart = theme ? ` Theme: ${theme}.` : '';
    const prompt = `Suggest 5 catchy song titles for a song about: "${idea}".${themePart} Return JSON string array. Language: ${langName}`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonArray(response.text) || "[]");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const suggestSunoStyles = async (idea: string, theme: string, language: string, model: string): Promise<string[]> => {
    const ai = getAiClient();
    const langName = getLanguageName(language);
    const themePart = theme ? ` Theme: ${theme}.` : '';
    const prompt = `Suggest 5 music style descriptions (e.g. "Upbeat Pop", "Melancholic Jazz") for a song about: "${idea}".${themePart} Return JSON string array. Language: ${langName}`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonArray(response.text) || "[]");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-preview-tts';
    
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        }));
        
        const audioPart = response.candidates?.[0]?.content?.parts?.[0];
        if (audioPart && audioPart.inlineData) {
            return audioPart.inlineData.data;
        }
        throw new Error("No audio generated.");
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateAmbiencePrompt = async (location: string): Promise<string> => {
    const prompt = `Describe the subtle background audio texture for this location: "${location}". 
    Focus on continuous sounds (wind, hum, traffic, distant waves) suitable for a seamless loop.
    Keep it concise and evocative.`;

    try {
        return await generateText('gemini-3-flash-preview', prompt);
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const generateAmbienceAudio = async (description: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            contents: { parts: [{ text: `Generate a continuous, loopable background sound texture of: ${description}. Do not include sudden loud noises or speech.` }] },
            config: {
                responseModalities: [Modality.AUDIO],
            },
        }));
        
        const audioPart = response.candidates?.[0]?.content?.parts?.[0];
        if (audioPart && audioPart.inlineData) {
            return audioPart.inlineData.data;
        }
        throw new Error("No audio generated.");
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const analyzeVideo = async (base64Video: string, mimeType: string, promptText: string) => {
    const ai = getAiClient();
    // Using gemini-3-pro-preview which handles multimodal tasks well
    const model = 'gemini-3-pro-preview';
    
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Video } },
                    { text: promptText }
                ]
            }
        }));
        return response.text || "";
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const createChat = (): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: "You are a helpful assistant for a video prompt generation app. Help users brainstorm ideas and refine prompts for Veo and Sora.",
        }
    });
};

export const sendMessageToChatStream = async (chat: Chat, message: string) => {
    try {
        // We don't wrap stream initiation in retry for now as stream consumption is complex to retry
        return await chat.sendMessageStream({ message });
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateModelComparison = async (idea: string, language: string): Promise<ModelComparisonResponse> => {
    const ai = getAiClient();
    const prompt = `Create two video prompts based on the idea: "${idea}".
    1. A prompt optimized for Veo 3.1 (Cinematic, visual aesthetics).
    2. A prompt optimized for Sora (Physics simulation, detailed motion).
    
    Return JSON with keys 'veoPrompt' and 'soraPrompt'. Language: ${language}`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        const json = JSON.parse(cleanJson(response.text) || "{}");
        return {
            veoPrompt: json.veoPrompt || "",
            soraPrompt: json.soraPrompt || ""
        };
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateVideo = async (prompt: string, image: any, aspectRatio: string, resolution: '1080p'|'720p', veoModel: 'fast'|'quality') => {
    const ai = getAiClient();
    const modelName = veoModel === 'quality' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
    
    const config: any = {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio,
    };

    try {
        const operation = await retryOperation<any>(() => ai.models.generateVideos({
            model: modelName,
            prompt: prompt,
            ...(image ? { image: { imageBytes: image.data, mimeType: image.mimeType } } : {}),
            config: config
        }));
        return operation;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const pollVideoOperation = async (operation: any) => {
    const ai = getAiClient();
    try {
        return await retryOperation<any>(() => ai.operations.getVideosOperation({ operation }));
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const fetchVideo = async (downloadLink: string): Promise<string> => {
    try {
        const response = await retryOperation(() => fetch(`${downloadLink}&key=${process.env.API_KEY}`));
        if (!response.ok) throw new Error("Failed to fetch video file.");
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        throw error;
    }
};

export const generateFromWizard = async (
    subject: string, 
    mood: string, 
    style: string, 
    location: string, 
    language: string
): Promise<Partial<PromptState>> => {
    const ai = getAiClient();
    const prompt = `Act as a creative director for video production.
    I have a 4-step concept:
    1. Core Subject: "${subject}"
    2. Mood: "${mood}"
    3. Visual Style: "${style}"
    4. Location: "${location}"

    Task: Create a full, detailed video generation profile based on these inputs.
    Infer the best settings for:
    - environment (detailed description based on location)
    - artStyle (map "${style}" to a specific art term like "Cinematic", "Anime", "Photorealistic", etc.)
    - cameraMovement (e.g. "Tracking shot", "Drone shot")
    - lightingStyle (e.g. "Low-key", "Golden Hour")
    - colorPalette
    - soundEffectsIntensity
    - characterActions (infer what the subject is doing in this context)
    - idea (combine inputs into a cohesive core idea sentence)

    Return a JSON object with keys matching a standard prompt state: 
    'idea', 'environment', 'artStyle', 'cameraMovement', 'lightingStyle', 'colorPalette', 'characterActions', 'ambientSound'.
    
    Language: ${language}`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
        return {};
    }
};

export const mixVisualDNA = async (dnaA: VisualDNA, dnaB: VisualDNA, balance: number): Promise<Partial<PromptState>> => {
    const ai = getAiClient();
    
    const prompt = `Act as a Visual Style Chemist. I have two distinct visual styles ("Visual DNA") that I want to merge into a new, cohesive style.
    
    Style A (${100 - balance}% influence):
    ${JSON.stringify(dnaA.styleParams)}
    
    Style B (${balance}% influence):
    ${JSON.stringify(dnaB.styleParams)}
    
    Task: Create a hybrid style object.
    - If balance is 0, return Style A. If 100, return Style B.
    - For values in between (e.g., 50), intelligently blend the parameters.
    - Example: If A is "Cyberpunk" and B is "Western", the result might be "Sci-Fi Western" with "Neon Dust" lighting.
    - Blend 'artStyle', 'lightingStyle', 'colorPalette', 'visualEffect', 'cameraMovement' carefully.
    - Ensure the result is a valid JSON object matching the PromptState structure.
    
    Return ONLY the JSON object with the merged parameters.`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
        return {};
    }
};

export const analyzeVideoForSFX = async (videoUrl: string): Promise<{ timestamp: number, description: string }[]> => {
    const ai = getAiClient();
    
    try {
        const videoResponse = await fetch(videoUrl);
        const blob = await videoResponse.blob();
        
        // Convert to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
        });
        reader.readAsDataURL(blob);
        const base64Data = await base64Promise;

        const prompt = `Watch this video. Identify distinct audio-visual events (e.g. footsteps, wind, explosions, ambient noise).
        Return a JSON list of objects with:
        - "description": A short phrase describing the sound effect (max 5 words).
        - "timestamp": The start time in seconds (float) relative to the video start.
        
        Example: [{"description": "heavy footsteps on gravel", "timestamp": 1.2}, {"description": "distant police siren", "timestamp": 4.5}]`;

        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'video/mp4', data: base64Data } },
                    { text: prompt }
                ]
            },
            config: { responseMimeType: "application/json" }
        }));

        return JSON.parse(cleanJsonArray(response.text) || "[]");
    } catch (error) {
        parseAndThrowApiError(error);
        return [];
    }
};

export const generateSoundEffect = async (description: string): Promise<string> => {
    const ai = getAiClient();
    
    try {
        // Using the native audio model for SFX generation
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            contents: { parts: [{ text: `Generate a sound effect of: ${description}. Do not include speech.` }] },
            config: {
                responseModalities: [Modality.AUDIO],
            },
        }));
        
        const audioPart = response.candidates?.[0]?.content?.parts?.[0];
        if (audioPart && audioPart.inlineData) {
            return audioPart.inlineData.data;
        }
        throw new Error("No audio generated.");
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const critiqueVideo = async (videoUrl: string, originalPrompt: string): Promise<{ score: number, feedback: string }> => {
    const ai = getAiClient();
    try {
        const videoResponse = await fetch(videoUrl);
        const blob = await videoResponse.blob();
        
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
        });
        reader.readAsDataURL(blob);
        const base64Data = await base64Promise;

        const prompt = `Watch this video. Compare it strictly to the following text prompt: "${originalPrompt}". Identify any missing elements (e.g., wrong color, missing object). Return a JSON object with:
        - "score": A number 1-10 reflecting accuracy.
        - "feedback": A 1-sentence critique of what is missing or wrong.`;

        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'video/mp4', data: base64Data } },
                    { text: prompt }
                ]
            },
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{\"score\": 0, \"feedback\": \"Unable to analyze.\"}");
    } catch (error) {
        console.error("Critique failed", error);
        return { score: 0, feedback: "Analysis failed." };
    }
}

// --- Style Tuner Methods ---

export const generateStyleVariations = async (basePrompt: string): Promise<string[]> => {
    const ai = getAiClient();
    const prompt = `Create 4 distinct, highly visual style descriptions based on the core concept: "${basePrompt}".
    
    Each description should represent a drastically different aesthetic (e.g., Noir, Pastel, Cyberpunk, Photorealistic, Oil Painting, etc.).
    Do not just list keywords; write a short, evocative sentence describing the look and feel.
    
    Return ONLY a JSON array of 4 strings. No markdown formatting.`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJsonArray(response.text) || "[]");
    } catch (error) {
        parseAndThrowApiError(error);
        return [];
    }
};

export const generateStyleThumbnail = async (description: string): Promise<string> => {
    const ai = getAiClient();
    // Using flash-image for speed on thumbnails
    const model = 'gemini-2.5-flash-image'; 
    
    // We add 'concept art' to ensure we get a stylistic representation
    const prompt = `Concept art, stylistic preview: ${description}`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
        }));
        
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        // Fallback or error handled by caller usually, but returning empty string lets UI handle placeholder
        return "";
    } catch (error) {
        // Allow failure for thumbnails without crashing app
        console.warn("Thumbnail generation failed", error);
        return "";
    }
};

export const extractStyleDNA = async (winningDescription: string): Promise<Partial<PromptState>> => {
    const ai = getAiClient();
    const prompt = `Analyze this visual description and map it to specific video generation parameters.
    
    Description: "${winningDescription}"
    
    Map to these JSON keys (use standard filmmaking terms):
    - artStyle (e.g. Cinematic, Anime, Noir, etc.)
    - lightingStyle (e.g. Golden Hour, Neon, Low-key)
    - colorPalette (e.g. Vibrant, Monochrome, Pastel)
    - visualEffect (e.g. Film Grain, Lens Flare, Glitch)
    - cameraMovement (e.g. Handheld, Static, Drone)
    
    Return JSON object.`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
        return {};
    }
};

export const calculateColorGrade = async (referenceImageBase64: string, targetImageBase64: string): Promise<ColorGradeParams> => {
    const ai = getAiClient();
    const prompt = `You are a professional colorist. Analyze these two images.
    Image 1 is the REFERENCE (Desired Look).
    Image 2 is the TARGET (Source to modify).

    Goal: Adjust the TARGET to match the color grading (white balance, exposure, saturation, contrast) of the REFERENCE.

    Return a JSON object for an FFmpeg 'eq' filter with these properties:
    - contrast (0.0 to 2.0, default 1.0)
    - brightness (-1.0 to 1.0, default 0.0)
    - saturation (0.0 to 3.0, default 1.0)
    - gamma_r (0.1 to 10.0, default 1.0)
    - gamma_g (0.1 to 10.0, default 1.0)
    - gamma_b (0.1 to 10.0, default 1.0)

    Only return the JSON.`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: referenceImageBase64 } },
                    { inlineData: { mimeType: 'image/jpeg', data: targetImageBase64 } },
                    { text: prompt }
                ]
            },
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text) || "{}");
    } catch (error) {
        parseAndThrowApiError(error);
        // Return default values on error (no change)
        return { contrast: 1, brightness: 0, saturation: 1, gamma_r: 1, gamma_g: 1, gamma_b: 1 };
    }
}

// --- AUTO-DIRECTOR AGENT ---

/**
 * The Auto-Director Agent analyzes user intent and returns a structured JSON command to modify the application state.
 */
export const directorAgent = async (userQuery: string, currentProjectState: string): Promise<AgentAction> => {
    const ai = getAiClient();
    
    const prompt = `You are the Auto-Director for a video production app.
    Your goal is to help the user modify their storyboard and project settings based on their natural language requests.
    
    Current Project Context (Summary):
    ${currentProjectState}
    
    Available Tools:
    1. 'update_shot': Modify a specific shot's action, camera, or dialogue.
    2. 'add_shot': Create a new shot at the end of the storyboard.
    3. 'remove_shot': Delete a specific shot by ID.
    4. 'set_global': Update global style, character description, or setting.
    5. 'chat': General conversation if no specific action is needed.
    
    User Query: "${userQuery}"
    
    Instructions:
    - Analyze the user query.
    - Select the most appropriate tool.
    - If updating/removing, infer the Shot ID from context (e.g. "Change the second shot" -> ID 2). If unsure, ask in 'chat'.
    - If adding a shot, invent a creative 'action' based on the context.
    - Return a JSON object matching the Schema.
    - IMPORTANT: The 'reply' field should be a short, professional confirmation of what you did (e.g. "I've updated the camera angle for Shot 3.").
    
    Output JSON Schema:
    {
      "tool": "update_shot" | "add_shot" | "remove_shot" | "set_global" | "chat",
      "reply": string,
      "parameters": {
        "shotId": number (optional),
        "field": "action" | "camera" | "dialogueText" | "style" | "character" | "setting" (optional),
        "value": string (optional)
      }
    }`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview', // Fast reasoning
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tool: { type: Type.STRING, enum: ['update_shot', 'add_shot', 'remove_shot', 'set_global', 'chat'] },
                        reply: { type: Type.STRING },
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                shotId: { type: Type.INTEGER },
                                field: { type: Type.STRING },
                                value: { type: Type.STRING }
                            }
                        }
                    },
                    required: ['tool', 'reply', 'parameters']
                }
            }
        }));
        
        return JSON.parse(response.text || '{"tool": "chat", "reply": "I am having trouble understanding that request.", "parameters": {}}');
    } catch (error) {
        console.error("Director Agent Error", error);
        return {
            tool: 'chat',
            reply: "I encountered an error trying to process that request.",
            parameters: {}
        };
    }
};