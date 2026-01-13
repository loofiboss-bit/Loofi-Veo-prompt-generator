
import { GoogleGenAI, Chat, Modality, GenerateContentResponse } from "@google/genai";
import { PromptState, VeoPromptResponse, ModelComparisonResponse, PromptVariation, EditedImageResponse, VisualDNA } from "../types";
import { parseAndThrowApiError } from "../utils/apiErrors";
import { buildGeminiPrompt } from "./promptBuilder";
import { retryOperation } from "../utils/retry";

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
    const ai = getAiClient();
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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        }));
        return response.text?.trim() || "";
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
    const ai = getAiClient();
    
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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        }));
        return response.text?.trim() || "";
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
             // In this specific case, we fall back to the ungrounded prompt instead of throwing
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
    const ai = getAiClient();
    const prompt = `Describe sensory details (smell, temperature, sound, texture) for: ${environment} during ${time} with ${weather} weather. Short, evocative phrase. Language: ${language}`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
        }));
        return response.text || "";
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const suggestCharacterNuances = async (action: string, mood: string, language: string, model: string) => {
    const ai = getAiClient();
    const prompt = `Suggest micro-expressions or subtle body language nuances for a character doing: "${action}" feeling "${mood}". Short phrase. Language: ${language}`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
        }));
        return response.text || "";
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
        }));
        return response.text || "";
    } catch (error) {
        parseAndThrowApiError(error);
    }
}

export const restructurePrompt = async (currentPrompt: string, model: string) => {
    const ai = getAiClient();
    const prompt = `Analyze the following video prompt and reorganize it into these clear logical sections for better AI interpretation:

    1. **Scene**: Environment, lighting, time of day, weather.
    2. **Character**: Appearance, actions, emotions.
    3. **Style**: Visual aesthetic, art style, atmosphere.
    4. **Technical Specs**: Camera angles, lenses, resolution, specific effects.

    Refine the wording to be more evocative and precise for video generation models like Veo. Use Markdown bolding for the section headers.

    Current Prompt: "${currentPrompt}"`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
        }));
        return response.text || currentPrompt;
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
    const ai = getAiClient();
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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: state.model || 'gemini-3-flash-preview',
            contents: prompt,
        }));
        return response.text || basePrompt;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateConceptArt = async (prompt: string, options?: any): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-image';
    
    let imagePrompt = prompt;
    if (options) {
        if (options.aspectRatio) imagePrompt += ` Aspect ratio: ${options.aspectRatio}.`;
        if (options.style) imagePrompt += ` Style: ${options.style}.`;
    }

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: imagePrompt,
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
    language: string = 'en',
    model: string = 'gemini-3-pro-preview'
): Promise<{ action: string; camera: string; characterId: string }[]> => {
    const ai = getAiClient();
    const characterMap = availableCharacters.map(c => ({ id: c.id, name: c.name }));
    
    const prompt = `Act as a professional storyboard artist and script supervisor.
    Break down the following raw script text into a sequence of distinct visual shots (scenes).

    Script Text:
    "${scriptText}"

    Available Characters (ID: Name):
    ${JSON.stringify(characterMap)}

    Task:
    1. Identify distinct visual beats.
    2. Suggest a camera angle/movement for each beat based on the action intensity and emotional context.
    3. If a character from the Available Characters list is the primary subject, map their ID.

    Return a JSON array of objects with keys:
    - 'action': (string) Concise visual description of the action.
    - 'camera': (string) Camera direction (e.g., "Close-up", "Wide Shot", "Tracking Shot").
    - 'characterId': (string) Matching ID from the list, or empty string if none/generic.

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

export const combinePromptVariations = async (variations: string[], language: string, model: string, targetModel: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `Combine the best elements of these ${variations.length} video prompts into a single, cohesive master prompt for ${targetModel}.
    
    Variations:
    ${variations.map((v, i) => `${i+1}. ${v}`).join('\n')}
    
    Language: ${language}`;
    
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

export const generateLyricsForSuno = async (idea: string, style: string, theme: string, language: string, model: string): Promise<string> => {
    const ai = getAiClient();
    const langName = getLanguageName(language);
    
    // Optimized prompt for Suno V5 structure
    const prompt = `Write song lyrics for a song about "${idea}". 
    Style: ${style}. 
    Theme: ${theme}. 
    
    Format the lyrics specifically for Suno AI (v3.5/v4/v5) music generation. Use the following structure and metatags (ensure tags are on their own lines with brackets):
    [Intro]
    [Verse 1]
    [Chorus]
    [Verse 2]
    [Chorus]
    [Bridge]
    [Guitar Solo] (if appropriate)
    [Chorus]
    [Outro]
    
    Language: ${langName}.
    Provide ONLY the lyrics and metatags. No conversational text.`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
        }));
        return response.text || "";
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
