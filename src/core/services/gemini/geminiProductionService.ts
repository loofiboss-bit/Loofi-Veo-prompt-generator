/**
 * Production pipeline services: scene bridging, blocking, color grading, chat, and script breakdown.
 * Split from the monolithic geminiService.ts for maintainability.
 * @module core/services/gemini/geminiProductionService
 */
import { Type, GenerateContentResponse } from '@google/genai';
import { Shot, ColorGrade, ScriptBreakdownItem, CharacterProfile } from '@core/types';
import { parseAndThrowApiError } from '@core/utils/apiErrors';
import { retryOperation } from '@core/utils/retry';
import { getAiClient, cleanJson } from './aiClient';

// ---------------------------------------------------------------------------
// Color grading
// ---------------------------------------------------------------------------

export const calculateColorGrade = async (
  sourceFrameBase64: string,
  targetFrameBase64: string,
): Promise<ColorGrade> => {
  const ai = getAiClient();
  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: sourceFrameBase64 } },
            { inlineData: { mimeType: 'image/png', data: targetFrameBase64 } },
            {
              text: 'Analyze the color grade difference. Return JSON with adjustment values for target to match source: { contrast: number (0.5-1.5), saturation: number (0-2), brightness: number (0.5-1.5), sepia: number (0-1), hueRotate: number (-180 to 180) }',
            },
          ],
        },
        config: { responseMimeType: 'application/json' },
      }),
    );
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    throw e;
  }
};

export const generateColorGrade = async (description: string): Promise<ColorGrade> => {
  const ai = getAiClient();
  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate color grade settings for mood: "${description}".
            Return JSON: { contrast: number, saturation: number, brightness: number, sepia: number, hueRotate: number }`,
        config: { responseMimeType: 'application/json' },
      }),
    );
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    throw e;
  }
};

// ---------------------------------------------------------------------------
// Scene bridging & blocking
// ---------------------------------------------------------------------------

export const bridgeScenes = async (
  contextA: string,
  contextB: string,
): Promise<Partial<Shot>[]> => {
  const ai = getAiClient();
  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate 1-2 bridging shots to transition from "${contextA}" to "${contextB}".
            Return JSON array of objects with { action: string, camera: string }.`,
        config: { responseMimeType: 'application/json' },
      }),
    );
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    throw e;
  }
};

export const generateLocationDescription = async (
  name: string,
  styleHint: string,
  _language: string,
): Promise<string> => {
  const ai = getAiClient();
  const res = await retryOperation<GenerateContentResponse>(() =>
    ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Describe the visual location "${name}" with style "${styleHint}". Detailed and cinematic.`,
    }),
  );
  return res.text || '';
};

export const interpretCameraPath = async (path: { x: number; y: number }[]): Promise<string> => {
  const ai = getAiClient();
  const res = await retryOperation<GenerateContentResponse>(() =>
    ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze this 2D normalized path points: ${JSON.stringify(path)}.
        Describe the camera movement (e.g. Pan Right, Tilt Up, Dolly In). Return string.`,
    }),
  );
  return res.text || '';
};

// ---------------------------------------------------------------------------
// Chat & assistant
// ---------------------------------------------------------------------------

export const createAppChat = () => {
  const ai = getAiClient();
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction:
        'You are a helpful Director Assistant for the Veo Video Editor. You can execute commands like adding scenes or changing settings.',
      tools: [
        {
          functionDeclarations: [
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
                    description: 'The target aspect ratio (e.g. "16:9", "9:16", "1:1").',
                  },
                },
                required: ['ratio'],
              },
            },
            {
              name: 'set_mood',
              description: 'Set the overall mood/lighting style for the project.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  mood: {
                    type: Type.STRING,
                    description: 'The mood description (e.g. "Dark", "Happy", "Cinematic").',
                  },
                },
                required: ['mood'],
              },
            },
          ],
        },
      ],
    },
  });
};

// ---------------------------------------------------------------------------
// Script breakdown & blocking
// ---------------------------------------------------------------------------

/**
 * Breaks down a text script into a structured list of shots with visual prompts.
 * @param scriptText The raw script text.
 * @returns Promise resolving to an array of ScriptBreakdownItems.
 */
export const analyzeScriptBreakdown = async (
  scriptText: string,
): Promise<ScriptBreakdownItem[]> => {
  const ai = getAiClient();

  // We use gemini-3-pro for complex reasoning required to visualize scenes from text
  const modelName = 'gemini-3-pro-preview';

  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: modelName,
        contents: `You are a professional cinematographer and director.
            Analyze the following script and break it down into a shot list.

            For each shot, create a detailed "visual_prompt" suitable for an AI video generator (like Veo).
            Include lighting, camera angle, and action.

            Script:
            "${scriptText}"

            Return a JSON array of objects with this schema:
            {
              "scene_number": string (e.g. "1A"),
              "action_summary": string (short description for human readability),
              "visual_prompt": string (detailed prompt for AI video generation),
              "duration": number (estimated seconds, usually 3-5s per action)
            }
            `,
        config: {
          responseMimeType: 'application/json',
          // Provide schema hint via responseSchema if strictness needed, but text prompt usually sufficient for pro model
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scene_number: { type: Type.STRING },
                action_summary: { type: Type.STRING },
                visual_prompt: { type: Type.STRING },
                duration: { type: Type.NUMBER },
              },
              required: ['scene_number', 'action_summary', 'visual_prompt', 'duration'],
            },
          },
        },
      }),
    );

    const rawData = JSON.parse(cleanJson(response.text));

    // Map to internal type ensuring IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rawData.map((item: any, index: number) => ({
      id: `breakdown_${Date.now()}_${index}`,
      scene: item.scene_number,
      description: item.action_summary,
      visualPrompt: item.visual_prompt,
      duration: item.duration,
      status: 'pending',
    }));
  } catch (error) {
    parseAndThrowApiError(error);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Video generation
// ---------------------------------------------------------------------------

/**
 * Generates a seamless bridge video between two frames.
 * Uses Veo's image-to-video capabilities with start/end frames.
 */
export const generateBridgeVideo = async (
  startFrameBase64: string,
  endFrameBase64: string,
  prompt: string = 'Morph continuously and seamlessly from the start frame to the end frame.',
): Promise<string> => {
  const ai = getAiClient();
  const apiKey = process.env.API_KEY;

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: startFrameBase64,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9',
        lastFrame: {
          imageBytes: endFrameBase64,
          mimeType: 'image/png',
        },
      },
    });

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error('Bridge generation failed to return video URI.');

    // Return authenticated download link
    return `${videoUri}&key=${apiKey}`;
  } catch (error) {
    parseAndThrowApiError(error);
    return '';
  }
};

/**
 * Automatically creates a shot list (blocking) from a raw script snippet.
 * Analyzes the scene context to determine optimal camera angles and character positioning.
 *
 * @param scriptText The raw script snippet (dialogue or action).
 * @param availableCharacters List of characters to match against.
 * @returns Array of Partial Shot objects.
 */
export const generateBlockingFromScript = async (
  scriptText: string,
  availableCharacters: CharacterProfile[],
): Promise<Partial<Shot>[]> => {
  const ai = getAiClient();

  // Construct simplified character list for the model context
  const charContext = availableCharacters.map((c) => `${c.name} (ID: ${c.id})`).join(', ');

  const prompt = `You are an expert Director of Photography and Film Editor.
    Analyze the following script snippet. Break it down into a sequence of shots ("blocking") that visually tells the story.

    Determine the best camera angle (Wide, OTS, Close-up, etc.) for each moment.
    Assign characters to shots where applicable using the provided list.

    Available Characters: [${charContext}]

    Script:
    "${scriptText}"

    Return a JSON array of objects with the following structure:
    [
      {
        "action": "Description of visual action in the shot",
        "camera": "Camera movement/angle description",
        "characterId": "ID of the character focused on (or empty string if general/multiple)"
      }
    ]

    Ensure the shot list flows logically (e.g. Establishing -> Medium -> Close-ups).
    If a character in script matches one in the list, use their exact ID.`;

  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      }),
    );

    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    parseAndThrowApiError(error);
    return [];
  }
};
