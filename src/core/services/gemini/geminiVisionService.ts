/**
 * Image generation, editing, and video/image analysis services.
 * Split from the monolithic geminiService.ts for maintainability.
 * @module core/services/gemini/geminiVisionService
 */
import { GenerateContentResponse } from '@google/genai';
import { EditedImageResponse } from '@core/types';
import { parseAndThrowApiError } from '@core/utils/apiErrors';
import { retryOperation } from '@core/utils/retry';
import { logger } from '@core/services/loggerService';
import { getAiClientAsync, getPromptModel, cleanJson, resilientCall } from './aiClient';

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

export const generateConceptArt = async (
  prompt: string,
  options?: { aspectRatio?: string; style?: string },
): Promise<string> => {
  const ai = await getAiClientAsync();
  const aspectRatio = options?.aspectRatio || '1:1';

  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            imageConfig: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              aspectRatio: aspectRatio as any,
            },
          },
        }),
      { endpoint: 'gemini-vision', model: 'gemini-2.5-flash-image' },
    );

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error('No image generated');
  } catch (error) {
    parseAndThrowApiError(error);
    return '';
  }
};

export const generateStoryboard = async (
  prompt: string,
  aspectRatio: string,
): Promise<string[]> => {
  const prompts = [
    `Opening shot: ${prompt}`,
    `Action shot: ${prompt}`,
    `Detail shot: ${prompt}`,
    `Closing shot: ${prompt}`,
  ];

  const promises = prompts.map((p) => generateConceptArt(p, { aspectRatio }));

  try {
    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    parseAndThrowApiError(error);
    return [];
  }
};

export const generateStyleThumbnail = async (prompt: string): Promise<string> => {
  return generateConceptArt(prompt, { aspectRatio: '1:1' });
};

// ---------------------------------------------------------------------------
// Image editing
// ---------------------------------------------------------------------------

export const editImageWithGemini = async (
  base64Image: string,
  mimeType: string,
  prompt: string,
): Promise<EditedImageResponse> => {
  const ai = await getAiClientAsync();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ inlineData: { mimeType, data: base64Image } }, { text: prompt }],
          },
        }),
      { endpoint: 'gemini-vision', model: 'gemini-2.5-flash-image' },
    );

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
          newImageBytes: part.inlineData.data ?? '',
          newMimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }
    throw new Error('No edited image returned');
  } catch (error) {
    parseAndThrowApiError(error);
    throw error;
  }
};

export const generateOutpaint = async (
  compositeBase64: string,
  maskBase64: string,
  prompt: string,
): Promise<string> => {
  const ai = await getAiClientAsync();
  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: compositeBase64 } },
            { inlineData: { mimeType: 'image/png', data: maskBase64 } },
            { text: prompt },
          ],
        },
      }),
    );

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    throw new Error('No image generated');
  } catch (error) {
    parseAndThrowApiError(error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Image & video analysis
// ---------------------------------------------------------------------------

export const describeImage = async (base64Image: string, mimeType: string): Promise<string> => {
  const ai = await getAiClientAsync();
  const modelName = getPromptModel();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              { inlineData: { mimeType, data: base64Image } },
              {
                text: 'Describe this image in detailed visual terms suitable for an image generation prompt. Focus on subject, setting, lighting, and style. Keep it under 50 words.',
              },
            ],
          },
        }),
      { endpoint: 'gemini-vision', model: modelName },
    );
    return response.text || 'A cinematic scene.';
  } catch (error) {
    parseAndThrowApiError(error);
    return '';
  }
};

export const analyzeVideo = async (
  base64Video: string,
  mimeType: string,
  prompt: string,
): Promise<string> => {
  const ai = await getAiClientAsync();
  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: getPromptModel(),
        contents: {
          parts: [{ inlineData: { mimeType, data: base64Video } }, { text: prompt }],
        },
      }),
    );
    return response.text || 'No analysis generated.';
  } catch (error) {
    parseAndThrowApiError(error);
    return '';
  }
};

export const analyzeImageForSFX = async (base64Image: string): Promise<string[]> => {
  const ai = await getAiClientAsync();
  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: getPromptModel(),
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64Image } },
            {
              text: 'List 5 likely sound effects (SFX) that would be heard in this scene. Return as JSON string array.',
            },
          ],
        },
        config: { responseMimeType: 'application/json' },
      }),
    );
    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    parseAndThrowApiError(error);
    return [];
  }
};

/**
 * Analyzes a sequence of video frames to detect specific audio events and their timing.
 * @param videoFrames Array of base64 image strings representing 1fps of video.
 * @returns JSON array of events with relative timestamp and description.
 */
export const analyzeVideoForSFX = async (
  videoFrames: string[],
): Promise<Array<{ timestamp: number; description: string }>> => {
  const ai = await getAiClientAsync();
  try {
    // Construct multipart content with all frames
    const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];

    // Add frames
    videoFrames.forEach((frameBase64, index) => {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: frameBase64,
        },
      });
      // Add text marker to help model identify time
      parts.push({ text: `[Frame at ${index}s]` });
    });

    // Add instructions
    parts.push({
      text: `You are a professional Foley Artist.
            Analyze this sequence of video frames (taken at 1 second intervals).
            Identify distinct, loud audio events (e.g. footsteps, door slam, explosion, engine rev, glass breaking).
            Ignore background ambience. Focus on specific impacts or actions.

            Return a JSON array of objects:
            [
              { "timestamp": number, "description": "string" }
            ]

            "timestamp" should be the estimated second (0-${videoFrames.length}) where the sound starts.
            "description" should be a short prompt to generate that specific sound effect.`,
    });

    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: getPromptModel(),
        contents: { parts },
        config: { responseMimeType: 'application/json' },
      }),
    );

    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    parseAndThrowApiError(error);
    return [];
  }
};

// --- Auto-Tagging Service ---
export const generateAssetTags = async (
  base64Data: string,
  mimeType: string,
): Promise<string[]> => {
  const ai = await getAiClientAsync();
  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: getPromptModel(), // Multimodal capable
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            {
              text: "Analyze this visual asset. Return a JSON array of 3-5 short, descriptive keywords (lowercase, single words) to categorize it (e.g. ['landscape', 'neon', 'character', 'red']). Return strictly JSON.",
            },
          ],
        },
        config: { responseMimeType: 'application/json' },
      }),
    );
    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    logger.warn('Auto-tagging failed', error);
    return [];
  }
};
