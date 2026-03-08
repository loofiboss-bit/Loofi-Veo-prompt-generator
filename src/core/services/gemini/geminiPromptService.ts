/**
 * Prompt generation, variation, suggestion, and refinement services.
 * Split from the monolithic geminiService.ts for maintainability.
 * @module core/services/gemini/geminiPromptService
 */
import { Type, Tool, ToolConfig } from '@google/genai';
import {
  PromptState,
  VeoPromptResponse,
  ModelComparisonResponse,
  PromptVariation,
  VisualDNA,
} from '@core/types';
import { parseAndThrowApiError } from '@core/utils/apiErrors';
import { buildGeminiPrompt } from '../promptBuilder';
import { getAiClient, cleanJson, resilientCall, getPromptModel } from './aiClient';
import { streamGenerateContent, type StreamChunkCallback } from '@core/utils/streaming';

// ---------------------------------------------------------------------------
// Domain-specific parameter interfaces (replaces `any` params)
// ---------------------------------------------------------------------------

/** Options map passed to `analyzeIdeaForModifiers`. Keys are PromptState field names. */
export interface ModifierOptions {
  [fieldName: string]: string[];
}

export interface AudioDesignParams {
  artStyle: string;
  cameraMovement: string;
  idea: string;
  environment: string;
  characterActions: string;
  characterMood: string;
  voiceStyleOptions: string[];
}

export interface AdvancedSettingsParams {
  idea: string;
  environment: string;
  characterActions: string;
  artStyle: string;
  customArtStyle: string;
  cameraMovement: string;
  targetModel: string;
}

export interface AdvancedSettingsOptions {
  motionIntensity: string[];
  creativityLevel: string[];
}

export interface CameraSetupParams {
  idea: string;
  artStyle: string;
  mood: string;
}

export interface CameraSetupOptions {
  movements: string[];
  distances: string[];
  lenses: string[];
  guides: string[];
}

export interface ActionFlowParams {
  idea: string;
  archetype: string;
  environment: string;
  mood: string;
}

// ---------------------------------------------------------------------------
// Core prompt generation
// ---------------------------------------------------------------------------

export const generateVeoPrompt = async (state: PromptState): Promise<VeoPromptResponse> => {
  const ai = getAiClient();
  const constructedPrompt = buildGeminiPrompt(state);

  let tools: Tool[] = [];
  const toolConfig: ToolConfig = {};

  if (state.useGoogleSearch) {
    tools.push({ googleSearch: {} });
  }

  const modelName = getPromptModel(state.model);

  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
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
          },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );

    return {
      prompt: response.text || '',
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
    };
  } catch (error) {
    parseAndThrowApiError(error);
    return { prompt: constructedPrompt };
  }
};

// ---------------------------------------------------------------------------
// Streaming prompt generation (v2.5.0)
// ---------------------------------------------------------------------------

/** Options for streaming prompt generation */
export interface StreamingPromptOptions {
  /** Called for each text chunk */
  onChunk: StreamChunkCallback;
  /** AbortSignal to cancel the stream */
  signal?: AbortSignal;
}

/**
 * Stream-generate a Veo prompt, calling `onChunk` for progressive UI updates.
 * Falls back to the non-streaming `generateVeoPrompt` if the stream fails.
 */
export const generateVeoPromptStreaming = async (
  state: PromptState,
  options: StreamingPromptOptions,
): Promise<VeoPromptResponse> => {
  const ai = getAiClient();
  const constructedPrompt = buildGeminiPrompt(state);

  let tools: Tool[] = [];
  const toolConfig: ToolConfig = {};

  if (state.useGoogleSearch) {
    tools.push({ googleSearch: {} });
  }

  const modelName = getPromptModel(state.model);

  try {
    const result = await streamGenerateContent(
      ai,
      {
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
        },
      },
      {
        onChunk: options.onChunk,
        signal: options.signal,
      },
    );

    return { prompt: result.text || constructedPrompt };
  } catch (error) {
    parseAndThrowApiError(error);
    return { prompt: constructedPrompt };
  }
};

export const generateBRollPrompt = async (
  scriptSegment: string,
  visualStyle: string,
): Promise<string> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Create a visual prompt for a B-Roll (cutaway) video shot that illustrates this text: '${scriptSegment}'. Keep it abstract and atmospheric. Style: ${visualStyle}. Return only the prompt string.`,
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return response.text || '';
  } catch (error) {
    parseAndThrowApiError(error);
    return '';
  }
};

export const analyzeIdeaForModifiers = async (
  idea: string,
  language: string,
  options: ModifierOptions,
  generateAsSeries?: boolean,
  model?: string,
  targetModel?: string,
): Promise<Partial<PromptState>> => {
  const ai = getAiClient();
  const modelName = getPromptModel(model);
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
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    parseAndThrowApiError(error);
    return {};
  }
};

export const generatePromptVariations = async (
  basePrompt: string,
  language: string,
  model?: string,
  _targetModel?: string,
): Promise<PromptVariation[]> => {
  const ai = getAiClient();
  const modelName = getPromptModel(model);
  const prompt = `Generate 4 distinct variations of this video prompt: "${basePrompt}".
    1. Realistic/Cinematic
    2. Stylized/Artistic
    3. Action-Oriented
    4. Minimalist/Moody

    Return JSON array: [{ "label": string, "prompt": string }]`;

  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                },
                required: ['label', 'prompt'],
              },
            },
          },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    parseAndThrowApiError(error);
    return [];
  }
};

export const suggestPromptIdeas = async (
  currentIdea: string,
  language: string,
  model?: string,
): Promise<PromptVariation[]> => {
  const ai = getAiClient();
  const modelName = getPromptModel(model);
  const prompt = `Brainstorm 5 creative video concepts based on or related to: "${currentIdea || 'A cinematic scene'}".
    Return JSON array: [{ "label": "Short Title", "prompt": "Detailed description..." }]`;

  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    parseAndThrowApiError(error);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Prompt enhancement & combination
// ---------------------------------------------------------------------------

export const enhancePrompt = async (idea: string, context: string): Promise<string> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Enhance this video idea with cinematic details (${context}): "${idea}". Keep it concise.`,
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return response.text || idea;
  } catch {
    return idea;
  }
};

export const combinePromptVariations = async (
  variations: string[],
  _language: string,
  _model: string,
  _targetModel: string,
): Promise<string> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Combine these prompt variations into one cohesive, detailed prompt:\n${variations.map((v) => `- ${v}`).join('\n')}`,
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return response.text || '';
  } catch (error) {
    parseAndThrowApiError(error);
    return '';
  }
};

export const refinePrompt = async (prompt: string, _state: PromptState): Promise<string> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  const res = await resilientCall(
    () =>
      ai.models.generateContent({
        model: modelName,
        contents: `Refine this video prompt for better clarity and detail: "${prompt}". Return only the new prompt.`,
      }),
    { endpoint: 'gemini-prompt', model: modelName },
  );
  return res.text || prompt;
};

export const restructurePrompt = async (prompt: string, _model: string): Promise<string> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  const res = await resilientCall(
    () =>
      ai.models.generateContent({
        model: modelName,
        contents: `Restructure this prompt into a logical flow (Subject -> Action -> Environment -> Style): "${prompt}". Return only the new prompt.`,
      }),
    { endpoint: 'gemini-prompt', model: modelName },
  );
  return res.text || prompt;
};

// ---------------------------------------------------------------------------
// Model comparison & validation
// ---------------------------------------------------------------------------

export const generateModelComparison = async (
  idea: string,
  _language: string,
): Promise<ModelComparisonResponse> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Generate two distinct prompts for the idea: "${idea}".
            1. Optimized for Google Veo (Cinematic, visual terms).
            2. Optimized for OpenAI Sora (Physics, simulation terms).
            Return JSON: { "veoPrompt": string, "soraPrompt": string }`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    parseAndThrowApiError(error);
    throw error;
  }
};

export const validatePhysicsLogic = async (
  state: PromptState,
): Promise<{ isValid: boolean; issues: string[] }> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Analyze this video prompt for physics consistency: "${state.idea} ${state.characterActions}".
            Return JSON: { "isValid": boolean, "issues": string[] }`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch {
    return { isValid: true, issues: [] };
  }
};

export const validateCinematography = async (
  state: PromptState,
): Promise<{ isValid: boolean; issues: string[] }> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Analyze cinematography settings: Camera=${state.cameraMovement}, Lens=${state.lensType}, Lighting=${state.lightingStyle}.
            Are these compatible? Return JSON: { "isValid": boolean, "issues": string[] }`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch {
    return { isValid: true, issues: [] };
  }
};

// ---------------------------------------------------------------------------
// AI suggestion helpers (environment, sensory, character, camera, style, etc.)
// ---------------------------------------------------------------------------

export const suggestFullAudioDesign = async (
  params: AudioDesignParams,
  _language: string,
  _model: string,
  _ambientOptions: string[],
  _sfxIntensityOptions: string[],
) => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Suggest audio settings for: "${params.idea}". Action: "${params.characterActions}".
            Return JSON: { "suggestedVoiceStyle": string, "suggestedVoiceOverScript": string, "suggestedAmbientSound": string, "suggestedSoundEffectsIntensity": string }`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    throw e;
  }
};

export const suggestEnvironmentDetails = async (
  currentEnv: string,
  idea: string,
  _language: string,
  _model: string,
) => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Suggest detailed environment descriptions for: "${idea}". Current: "${currentEnv}".
            Return JSON: { "environment": string, "environmentSensoryDetails": string, "environmentDynamicEvents": string }`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    throw e;
  }
};

export const suggestSensoryDetails = async (
  env: string,
  weather: string,
  time: string,
  _language: string,
  _model: string,
) => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  const res = await resilientCall(
    () =>
      ai.models.generateContent({
        model: modelName,
        contents: `Suggest sensory details (smell, touch, sound) for: ${env} at ${time}, ${weather}. Return string.`,
      }),
    { endpoint: 'gemini-prompt', model: modelName },
  );
  return res.text || '';
};

export const suggestCharacterNuances = async (
  action: string,
  mood: string,
  _language: string,
  _model: string,
) => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  const res = await resilientCall(
    () =>
      ai.models.generateContent({
        model: modelName,
        contents: `Suggest subtle character nuances/micro-expressions for someone doing: "${action}" feeling ${mood}. Return string.`,
      }),
    { endpoint: 'gemini-prompt', model: modelName },
  );
  return res.text || '';
};

export const suggestVisualEffect = async (
  style: string,
  _customStyle: string,
  mood: string,
  _language: string,
  _model: string,
  options: string[],
) => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  const res = await resilientCall(
    () =>
      ai.models.generateContent({
        model: modelName,
        contents: `Suggest a visual effect from [${options.join(',')}] for Style: ${style}, Mood: ${mood}. Return only the effect name.`,
      }),
    { endpoint: 'gemini-prompt', model: modelName },
  );
  return res.text?.trim() || 'None';
};

export const suggestAdvancedSettings = async (
  params: AdvancedSettingsParams,
  _language: string,
  _model: string,
  _options: AdvancedSettingsOptions,
) => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Suggest advanced settings for: "${params.idea}".
            Return JSON: { "negativePrompt": string, "motionIntensity": string, "creativityLevel": string }`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    throw e;
  }
};

export const suggestArtStyles = async (
  input: string,
  _language: string,
  _model: string,
): Promise<string[]> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Suggest 5 art styles related to: "${input}". Return JSON array of strings.`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch {
    return [];
  }
};

export const suggestCharacterDetails = async (
  archetype: string,
  env: string,
  _language: string,
  _model: string,
) => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Suggest clothing and accessories for a ${archetype} in ${env}.
            Return JSON: { "clothingSuggestions": string[], "accessorySuggestions": string[] }`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    throw e;
  }
};

export const generateCharacterDNA = async (
  name: string,
  archetype: string,
  traits: string,
): Promise<string> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Create a dense, highly detailed "Visual DNA" prompt for a character.
            This description will be used to generate consistent character appearances across multiple video shots.

            Name: "${name}"
            Archetype: "${archetype}"
            Traits/Clothing: "${traits}"

            Focus on: facial features, specific clothing details, colors, textures, and distinguishing marks.
            Do NOT include actions or environment. Just the physical appearance description.
            Keep it under 100 words.`,
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return response.text || '';
  } catch (e) {
    throw e;
  }
};

export const suggestCameraSetup = async (
  params: CameraSetupParams,
  _options: CameraSetupOptions,
  _model: string,
) => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Suggest camera settings for scene: "${params.idea}".
            Return JSON: { "cameraMovement": string, "cameraDistance": string, "lensType": string, "compositionalGuide": string }`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    throw e;
  }
};

export const suggestCharacterActionFlow = async (params: ActionFlowParams, _model: string) => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  const res = await resilientCall(
    () =>
      ai.models.generateContent({
        model: modelName,
        contents: `Suggest a sequence of actions for a ${params.archetype} in "${params.idea}". Return string paragraph.`,
      }),
    { endpoint: 'gemini-prompt', model: modelName },
  );
  return res.text || '';
};

// ---------------------------------------------------------------------------
// Visual DNA & style
// ---------------------------------------------------------------------------

export const mixVisualDNA = async (
  dnaA: VisualDNA,
  dnaB: VisualDNA,
  balance: number,
): Promise<Partial<PromptState>> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Mix two visual styles.
            Style A: ${JSON.stringify(dnaA.styleParams)}.
            Style B: ${JSON.stringify(dnaB.styleParams)}.
            Balance: ${balance}% Style B.
            Return JSON of merged PromptState style fields.`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    throw e;
  }
};

export const generateFromWizard = async (
  subject: string,
  mood: string,
  style: string,
  location: string,
  _language: string,
): Promise<Partial<PromptState>> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Create video settings for: Subject "${subject}", Mood "${mood}", Style "${style}", Location "${location}".
            Return JSON of PromptState fields.`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    throw e;
  }
};

export const generateStyleVariations = async (idea: string): Promise<string[]> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Generate 4 distinct visual style prompts for "${idea}".
            Return JSON array of strings.`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch {
    return [];
  }
};

export const extractStyleDNA = async (prompt: string): Promise<Partial<PromptState>> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Analyze this prompt and extract style parameters: "${prompt}".
            Return JSON of PromptState style fields (artStyle, lightingStyle, colorPalette, cameraMovement).`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    throw e;
  }
};

export const translateScript = async (script: string, targetLang: string): Promise<string> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  const res = await resilientCall(
    () =>
      ai.models.generateContent({
        model: modelName,
        contents: `Translate this dialogue to ${targetLang}, preserving context and tone: "${script}".`,
      }),
    { endpoint: 'gemini-prompt', model: modelName },
  );
  return res.text || script;
};

export const extractVisualKeywords = async (
  script: string,
): Promise<{ keyword: string; time: number; duration: number }[]> => {
  const ai = getAiClient();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Analyze script: "${script}". Identify key visual concepts for B-Roll.
            Return JSON array: [{ "keyword": string, "time": number (estimated start sec), "duration": number }]`,
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-prompt', model: modelName },
    );
    return JSON.parse(cleanJson(response.text));
  } catch {
    return [];
  }
};
