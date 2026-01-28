
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse, Modality } from "@google/genai";
import { PromptState, VeoPromptResponse, ModelComparisonResponse, PromptVariation, EditedImageResponse, VisualDNA, Shot, ColorGradeParams, AgentAction, SunoLyricRequest, SongMetadata, StyleOptions, SunoPack, ColorGrade, Caption, SunoSettings } from "../types";
import { parseAndThrowApiError } from "../utils/apiErrors";
import { buildGeminiPrompt } from "./promptBuilder";
import { retryOperation } from "../utils/retry";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to clean JSON string from markdown code blocks
const cleanJson = (text: string | undefined): string => {
    if (!text) return "";
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    // Try to find the start and end of the JSON object/array
    const startObj = clean.indexOf("{");
    const startArr = clean.indexOf("[");
    
    // Determine which comes first to decide if object or array
    let startIndex = -1;
    if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
        startIndex = startObj;
    } else {
        startIndex = startArr;
    }

    if (startIndex !== -1) {
        // Find corresponding closing brace
        const isObj = clean[startIndex] === "{";
        const endIndex = clean.lastIndexOf(isObj ? "}" : "]");
        if (endIndex !== -1) {
            clean = clean.substring(startIndex, endIndex + 1);
        }
    }
    
    return clean;
};

// ... (Existing text generation functions: generateVeoPrompt, analyzeIdeaForModifiers, generatePromptVariations, suggestPromptIdeas) ...
// Note: Keeping existing functions but truncating for brevity in this response unless they need changes.
// Assuming generateVeoPrompt etc are unchanged.

export const generateVeoPrompt = async (state: PromptState, userCoords: { latitude: number, longitude: number } | null): Promise<VeoPromptResponse> => {
    const ai = getAiClient();
    const constructedPrompt = buildGeminiPrompt(state);
    
    let tools: any[] = [];
    let toolConfig: any = {};

    if (state.useGoogleSearch) {
        tools.push({ googleSearch: {} });
    }
    if (state.useGoogleMaps && userCoords) {
        tools.push({ googleMaps: {} });
        toolConfig = {
            retrievalConfig: {
                latLng: userCoords
            }
        };
    }

    const modelName = state.model || 'gemini-3-flash-preview';

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: modelName,
            contents: `You are an expert prompt engineer for AI Video Generation models (like Google Veo and Sora). 
            Refine the following user inputs into a single, highly detailed, cinematic prompt optimized for video generation.
            
            User Input Structure:
            ${constructedPrompt}
            
            Requirements:
            1. Consolidate into a cohesive paragraph.
            2. Enhance visual descriptions (lighting, texture, camera movement).
            3. Ensure physical plausibility if target is 'sora', or cinematic aesthetics if 'veo'.
            4. Keep it under 300 words.
            `,
            config: {
                tools: tools.length > 0 ? tools : undefined,
                toolConfig: Object.keys(toolConfig).length > 0 ? toolConfig : undefined,
            }
        }));

        return {
            prompt: response.text || "",
            groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
        };
    } catch (error) {
        parseAndThrowApiError(error);
        return { prompt: constructedPrompt };
    }
};

export const analyzeIdeaForModifiers = async (
    idea: string, 
    language: string, 
    options: any,
    generateAsSeries?: boolean, 
    model?: string, 
    targetModel?: string
): Promise<Partial<PromptState>> => {
    const ai = getAiClient();
    const prompt = `Analyze the video idea: "${idea}".
    Suggest optimal settings for the following fields to create a cinematic video.
    Return a JSON object matching the keys provided.
    
    Available Options (select best match or generate close alternative):
    ${JSON.stringify(options)}
    
    Also suggest values for:
    - environment (string)
    - characterActions (string)
    - audioMixVoice (number 0-100)
    - audioMixAmbient (number 0-100)
    - audioMixSfx (number 0-100)
    
    Language: ${language}.
    Target Model: ${targetModel || 'veo'}.
    Output JSON only.`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (error) {
        parseAndThrowApiError(error);
        return {};
    }
};

export const generatePromptVariations = async (basePrompt: string, language: string, model?: string, targetModel?: string): Promise<PromptVariation[]> => {
    const ai = getAiClient();
    const prompt = `Generate 4 distinct variations of this video prompt: "${basePrompt}".
    1. Realistic/Cinematic
    2. Stylized/Artistic
    3. Action-Oriented
    4. Minimalist/Moody
    
    Return JSON array: [{ "label": string, "prompt": string }]`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
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
                        required: ['label', 'prompt']
                    }
                }
            }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (error) {
        parseAndThrowApiError(error);
        return [];
    }
};

export const suggestPromptIdeas = async (currentIdea: string, language: string, model?: string): Promise<PromptVariation[]> => {
    const ai = getAiClient();
    const prompt = `Brainstorm 5 creative video concepts based on or related to: "${currentIdea || 'A cinematic scene'}".
    Return JSON array: [{ "label": "Short Title", "prompt": "Detailed description..." }]`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (error) {
        parseAndThrowApiError(error);
        return [];
    }
};

// ... (Existing Image & Vision functions) ...

export const generateConceptArt = async (prompt: string, options?: { aspectRatio?: string, style?: string }): Promise<string> => {
    const ai = getAiClient();
    const aspectRatio = options?.aspectRatio || "1:1";
    
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio as any
                }
            }
        }));

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image generated");
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const generateStoryboard = async (prompt: string, aspectRatio: string): Promise<string[]> => {
    const ai = getAiClient();
    
    const images: string[] = [];
    const prompts = [
        `Opening shot: ${prompt}`,
        `Action shot: ${prompt}`,
        `Detail shot: ${prompt}`,
        `Closing shot: ${prompt}`
    ];

    const promises = prompts.map(p => generateConceptArt(p, { aspectRatio }));
    
    try {
        const results = await Promise.all(promises);
        return results;
    } catch (error) {
        parseAndThrowApiError(error);
        return [];
    }
};

export const editImageWithGemini = async (base64Image: string, mimeType: string, prompt: string): Promise<EditedImageResponse> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Image } },
                    { text: prompt }
                ]
            }
        }));

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return {
                    newImageBytes: part.inlineData.data,
                    newMimeType: part.inlineData.mimeType || 'image/png'
                };
            }
        }
        throw new Error("No edited image returned");
    } catch (error) {
        parseAndThrowApiError(error);
        throw error;
    }
};

export const analyzeVideo = async (base64Video: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Video } },
                    { text: prompt }
                ]
            }
        }));
        return response.text || "No analysis generated.";
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const analyzeImageForSFX = async (base64Image: string): Promise<string[]> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: base64Image } },
                    { text: "List 5 likely sound effects (SFX) that would be heard in this scene. Return as JSON string array." }
                ]
            },
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (error) {
        parseAndThrowApiError(error);
        return [];
    }
};

// ... (Existing Audio functions) ...

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName }
                    },
                },
            },
        }));
        
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) throw new Error("No audio generated");
        return audioData;
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

export const generateSoundEffect = async (description: string): Promise<string> => {
    // For now, we reuse TTS logic but prompt it to "Perform sound: X".
    return generateSpeech(`(Sound Effect) ${description}`, 'Fenrir');
};

// ... (Existing Transcribe, Analyze Audio functions) ...

export const transcribeAudio = async (audioBlob: Blob): Promise<Caption[]> => {
    const ai = getAiClient();
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
    });
    const base64 = await base64Promise;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: audioBlob.type, data: base64 } },
                    { text: "Transcribe this audio. Return JSON: [{text: string, startTime: number, endTime: number}]" }
                ]
            },
            config: { responseMimeType: "application/json" }
        }));
        
        const raw = JSON.parse(cleanJson(response.text));
        return raw.map((c: any, i: number) => ({
            id: `cap_${i}`,
            text: c.text,
            startTime: c.startTime,
            endTime: c.endTime,
            style: 'pop'
        }));
    } catch (error) {
        parseAndThrowApiError(error);
        return [];
    }
};

export const analyzeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Audio } },
                    { text: "Describe the background ambience and soundscape of this audio in one sentence." }
                ]
            }
        }));
        return response.text || "";
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

// --- Specialized Logic ---

// ... (Existing enhancePrompt, combinePromptVariations) ...

export const enhancePrompt = async (idea: string, context: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Enhance this video idea with cinematic details (${context}): "${idea}". Keep it concise.`
        }));
        return response.text || idea;
    } catch (error) {
        return idea;
    }
};

export const combinePromptVariations = async (variations: string[], language: string, model: string, targetModel: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Combine these prompt variations into one cohesive, detailed prompt:\n${variations.map(v => `- ${v}`).join('\n')}`
        }));
        return response.text || "";
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

// --- SUNO V3/V4 OPTIMIZED GENERATION ---
export const generateSunoPack = async (settings: SunoSettings): Promise<SunoPack> => {
    const ai = getAiClient();
    
    // Construct a context-aware prompt for Suno V3 style strings
    // Suno prefers: "Genre, Vibe, Instruments, Tempo, Voice Type"
    // It dislikes sentences.
    
    const inputContext = `
    Topic: "${settings.topic}"
    Genre Base: "${settings.genre}"
    Mood/Vibe: "${settings.mood}"
    Voice: "${settings.voice}"
    Tempo: "${settings.tempo}"
    Structure: "${settings.structure}"
    `;

    const systemInstruction = `You are a professional music producer and lyricist specializing in Suno.ai generation.
    
    TASK 1: Create a "Style Prompt" string optimized for Suno V3/V4.
    - Use comma-separated tags. NO sentences.
    - Order: Genre, Sub-genre, Vibe, Key Instruments, Tempo, Vocal Quality.
    - Example: "Dark Synthwave, slow tempo, 80bpm, female vocals, heavy bass, atmospheric, reverb"
    
    TASK 2: Write Lyrics.
    - Use proper meta-tags: [Verse], [Chorus], [Bridge], [Outro], [Instrumental Break].
    - If "Instrumental" is requested in Voice, return only [Instrumental] tag or minimal ad-libs.
    - Ensure structure matches the requested type (${settings.structure}).
    
    TASK 3: Create a Title and Explanation.
    
    Output JSON: { "title": string, "style": string, "lyrics": string, "explanation": string }`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview', // High creative capability
            contents: `Generate a song package based on: ${inputContext}`,
            config: { 
                systemInstruction: systemInstruction,
                responseMimeType: "application/json" 
            }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (error) {
        parseAndThrowApiError(error);
        throw error;
    }
};

export const extendSunoLyrics = async (currentLyrics: string, topic: string, style: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Extend these song lyrics with a new section (e.g. Verse 2, Bridge, or Outro) that fits the flow.
            
            Current Lyrics:
            "${currentLyrics}"
            
            Context:
            Topic: ${topic}
            Style: ${style}
            
            Return ONLY the new added lines with their [Tags]. Do not repeat existing lyrics.`,
        }));
        return response.text?.trim() || "";
    } catch (error) {
        parseAndThrowApiError(error);
        return "";
    }
};

// ... (Rest of existing specialized functions: model comparison, physics, cinematography, etc.) ...
// Assuming they remain unchanged.

export const generateModelComparison = async (idea: string, language: string): Promise<ModelComparisonResponse> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Generate two distinct prompts for the idea: "${idea}".
            1. Optimized for Google Veo (Cinematic, visual terms).
            2. Optimized for OpenAI Sora (Physics, simulation terms).
            Return JSON: { "veoPrompt": string, "soraPrompt": string }`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (error) {
        parseAndThrowApiError(error);
        throw error;
    }
};

export const validatePhysicsLogic = async (state: PromptState): Promise<{isValid: boolean; issues: string[]}> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Use pro for reasoning
            contents: `Analyze this video prompt for physics consistency: "${state.idea} ${state.characterActions}".
            Return JSON: { "isValid": boolean, "issues": string[] }`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (error) {
        return { isValid: true, issues: [] };
    }
};

export const validateCinematography = async (state: PromptState): Promise<{isValid: boolean; issues: string[]}> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze cinematography settings: Camera=${state.cameraMovement}, Lens=${state.lensType}, Lighting=${state.lightingStyle}.
            Are these compatible? Return JSON: { "isValid": boolean, "issues": string[] }`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (error) {
        return { isValid: true, issues: [] };
    }
};

export const suggestFullAudioDesign = async (params: any, language: string, model: string, ambientOptions: string[], sfxIntensityOptions: string[]) => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Suggest audio settings for: "${params.idea}". Action: "${params.characterActions}".
            Return JSON: { "suggestedVoiceStyle": string, "suggestedVoiceOverScript": string, "suggestedAmbientSound": string, "suggestedSoundEffectsIntensity": string }`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        throw e;
    }
};

export const suggestEnvironmentDetails = async (currentEnv: string, idea: string, language: string, model: string) => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Suggest detailed environment descriptions for: "${idea}". Current: "${currentEnv}".
            Return JSON: { "environment": string, "environmentSensoryDetails": string, "environmentDynamicEvents": string }`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { throw e; }
};

export const suggestSensoryDetails = async (env: string, weather: string, time: string, language: string, model: string) => {
    const ai = getAiClient();
    const res = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Suggest sensory details (smell, touch, sound) for: ${env} at ${time}, ${weather}. Return string.`
    }));
    return res.text || "";
};

export const suggestCharacterNuances = async (action: string, mood: string, language: string, model: string) => {
    const ai = getAiClient();
    const res = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Suggest subtle character nuances/micro-expressions for someone doing: "${action}" feeling ${mood}. Return string.`
    }));
    return res.text || "";
};

export const suggestVisualEffect = async (style: string, customStyle: string, mood: string, language: string, model: string, options: string[]) => {
    const ai = getAiClient();
    const res = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Suggest a visual effect from [${options.join(',')}] for Style: ${style}, Mood: ${mood}. Return only the effect name.`
    }));
    return res.text?.trim() || "None";
};

export const suggestAdvancedSettings = async (params: any, language: string, model: string, options: any) => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Suggest advanced settings for: "${params.idea}".
            Return JSON: { "negativePrompt": string, "motionIntensity": string, "creativityLevel": string }`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { throw e; }
};

export const suggestArtStyles = async (input: string, language: string, model: string): Promise<string[]> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Suggest 5 art styles related to: "${input}". Return JSON array of strings.`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { return []; }
};

export const suggestCharacterDetails = async (archetype: string, env: string, language: string, model: string) => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Suggest clothing and accessories for a ${archetype} in ${env}.
            Return JSON: { "clothingSuggestions": string[], "accessorySuggestions": string[] }`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { throw e; }
};

export const suggestCameraSetup = async (params: any, options: any, model: string) => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Suggest camera settings for scene: "${params.idea}".
            Return JSON: { "cameraMovement": string, "cameraDistance": string, "lensType": string, "compositionalGuide": string }`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { throw e; }
};

export const suggestCharacterActionFlow = async (params: any, model: string) => {
    const ai = getAiClient();
    const res = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Suggest a sequence of actions for a ${params.archetype} in "${params.idea}". Return string paragraph.`
    }));
    return res.text || "";
};

export const refinePrompt = async (prompt: string, state: PromptState): Promise<string> => {
    const ai = getAiClient();
    const res = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Refine this video prompt for better clarity and detail: "${prompt}". Return only the new prompt.`
    }));
    return res.text || prompt;
};

export const restructurePrompt = async (prompt: string, model: string): Promise<string> => {
    const ai = getAiClient();
    const res = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Restructure this prompt into a logical flow (Subject -> Action -> Environment -> Style): "${prompt}". Return only the new prompt.`
    }));
    return res.text || prompt;
};

export const mixVisualDNA = async (dnaA: VisualDNA, dnaB: VisualDNA, balance: number): Promise<Partial<PromptState>> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Mix two visual styles. 
            Style A: ${JSON.stringify(dnaA.styleParams)}.
            Style B: ${JSON.stringify(dnaB.styleParams)}.
            Balance: ${balance}% Style B.
            Return JSON of merged PromptState style fields.`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { throw e; }
};

export const generateFromWizard = async (subject: string, mood: string, style: string, location: string, language: string): Promise<Partial<PromptState>> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create video settings for: Subject "${subject}", Mood "${mood}", Style "${style}", Location "${location}".
            Return JSON of PromptState fields.`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { throw e; }
};

export const calculateColorGrade = async (sourceFrameBase64: string, targetFrameBase64: string): Promise<ColorGrade> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: sourceFrameBase64 } },
                    { inlineData: { mimeType: 'image/png', data: targetFrameBase64 } },
                    { text: "Analyze the color grade difference. Return JSON with adjustment values for target to match source: { contrast: number (0.5-1.5), saturation: number (0-2), brightness: number (0.5-1.5), sepia: number (0-1), hueRotate: number (-180 to 180) }" }
                ]
            },
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { throw e; }
};

export const generateColorGrade = async (description: string): Promise<ColorGrade> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate color grade settings for mood: "${description}".
            Return JSON: { contrast: number, saturation: number, brightness: number, sepia: number, hueRotate: number }`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { throw e; }
};

export const bridgeScenes = async (contextA: string, contextB: string): Promise<Partial<Shot>[]> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate 1-2 bridging shots to transition from "${contextA}" to "${contextB}".
            Return JSON array of objects with { action: string, camera: string }.`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { throw e; }
};

export const generateLocationDescription = async (name: string, styleHint: string, language: string): Promise<string> => {
    const ai = getAiClient();
    const res = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Describe the visual location "${name}" with style "${styleHint}". Detailed and cinematic.`
    }));
    return res.text || "";
};

export const interpretCameraPath = async (path: {x:number, y:number}[]): Promise<string> => {
    const ai = getAiClient();
    const res = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this 2D normalized path points: ${JSON.stringify(path)}. 
        Describe the camera movement (e.g. Pan Right, Tilt Up, Dolly In). Return string.`
    }));
    return res.text || "";
};

export const generateStyleVariations = async (idea: string): Promise<string[]> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate 4 distinct visual style prompts for "${idea}". 
            Return JSON array of strings.`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { return []; }
};

export const generateStyleThumbnail = async (prompt: string): Promise<string> => {
    return generateConceptArt(prompt, { aspectRatio: '1:1' });
};

export const extractStyleDNA = async (prompt: string): Promise<Partial<PromptState>> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze this prompt and extract style parameters: "${prompt}".
            Return JSON of PromptState style fields (artStyle, lightingStyle, colorPalette, cameraMovement).`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { throw e; }
};

export const generateAmbiencePrompt = async (location: string): Promise<string> => {
    const ai = getAiClient();
    const res = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Describe the background soundscape/ambience for: "${location}". Return string.`
    }));
    return res.text || "";
};

export const generateAmbienceAudio = async (description: string): Promise<string> => {
    return generateSpeech(`(Ambience) ${description}`, 'Fenrir');
};

export const extractVisualKeywords = async (script: string): Promise<{keyword: string, time: number, duration: number}[]> => {
    const ai = getAiClient();
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze script: "${script}". Identify key visual concepts for B-Roll.
            Return JSON array: [{ "keyword": string, "time": number (estimated start sec), "duration": number }]`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) { return []; }
};

export const translateScript = async (script: string, targetLang: string): Promise<string> => {
    const ai = getAiClient();
    const res = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate this dialogue to ${targetLang}, preserving context and tone: "${script}".`
    }));
    return res.text || script;
};

// Chat App Helper
export const createAppChat = () => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: "You are a helpful Director Assistant for the Veo Video Editor. You can execute commands like adding scenes or changing settings.",
            tools: [
                { functionDeclarations: [
                    {
                        name: 'add_scene',
                        description: 'Add a new empty shot/scene to the storyboard timeline.',
                    },
                    {
                        name: 'clear_timeline',
                        description: 'Clear all shots from the timeline and reset the workspace.',
                    },
                    {
                        name: 'set_aspect_ratio',
                        description: 'Set the aspect ratio of the project video.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                ratio: {
                                    type: Type.STRING,
                                    description: 'The target aspect ratio (e.g. "16:9", "9:16", "1:1").'
                                }
                            },
                            required: ['ratio']
                        }
                    },
                    {
                        name: 'set_mood',
                        description: 'Set the overall mood/lighting style for the project.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                mood: {
                                    type: Type.STRING,
                                    description: 'The mood description (e.g. "Dark", "Happy", "Cinematic").'
                                }
                            },
                            required: ['mood']
                        }
                    }
                ]}
            ]
        }
    });
};
