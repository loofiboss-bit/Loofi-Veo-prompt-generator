import { GoogleGenAI, GenerateContentResponse, GenerateVideosOperation, GenerateContentParameters, Modality, Type, Schema } from "@google/genai";
import { EditedImageResponse, GroundingChunk, VeoPromptResponse, SelectOption } from '../types';
import { buildGeminiPrompt } from './promptBuilder';
import { PromptGenerationParams } from '../types';
import { youtubeSystemPrompt, autoFillSystemPrompt, variationsSystemPrompt } from '../translations';
import { parseAndThrowApiError } from '../utils/apiErrors';

if (!process.env.API_KEY) {
  console.error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const generateVeoPrompt = async (params: PromptGenerationParams): Promise<VeoPromptResponse> => {
  const fullPrompt = buildGeminiPrompt(params);

  try {
    const config: GenerateContentParameters['config'] = {};
    if (params.useGoogleSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: config,
    });
    
    const promptText = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;

    return { prompt: promptText, groundingChunks };
  } catch (error) {
    parseAndThrowApiError(error);
  }
};


export const generateArt = async (prompt: string, aspectRatio: string, count: number = 1): Promise<string[]> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: count,
              outputMimeType: 'image/jpeg',
              aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("API did not return any images.");
        }

        return response.generatedImages.map(img => img.image.imageBytes);
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generateVideo = async (prompt: string): Promise<GenerateVideosOperation> => {
    try {
        const operation = await ai.models.generateVideos({
          model: 'veo-2.0-generate-001',
          prompt: prompt,
          config: {
            numberOfVideos: 1
          }
        });
        return operation;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const getVideosOperation = async (operation: GenerateVideosOperation): Promise<GenerateVideosOperation> => {
    try {
        const updatedOperation = await ai.operations.getVideosOperation({ operation: operation });
        return updatedOperation;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const downloadVideo = async (uri: string): Promise<Blob> => {
    try {
        const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            throw response;
        }
        return response.blob();
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<EditedImageResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imagePart && imagePart.inlineData) {
      return {
        newImageBytes: imagePart.inlineData.data,
        newMimeType: imagePart.inlineData.mimeType,
      };
    } else {
      throw new Error("API response did not contain an image part.");
    }
  } catch (error) {
    parseAndThrowApiError(error);
  }
};

export const analyzeYouTubeVideo = async (url: string, language: 'en' | 'sv' | 'es' | 'fr' | 'de'): Promise<string> => {
    const systemInstruction = youtubeSystemPrompt[language];
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this YouTube URL and generate a core idea: ${url}`,
            config: { systemInstruction },
        });
        return response.text;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const analyzeIdeaForModifiers = async (
    idea: string,
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    options: { [key: string]: SelectOption[] }
): Promise<Partial<PromptGenerationParams>> => {
    
    const systemInstruction = autoFillSystemPrompt[language];
    
    const createEnumSchema = (opts: SelectOption[]): Schema => ({
        type: Type.STRING,
        enum: opts.map(o => o.value).filter(v => v !== 'Any' && v !== 'Custom' && v !== 'None'),
    });

    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            environment: { type: Type.STRING, description: "A concise description of the scene's environment." },
            timeOfDay: createEnumSchema(options.timeOfDayOptions),
            weather: createEnumSchema(options.weatherOptions),
            characterActions: { type: Type.STRING, description: "A concise description of the main character and their actions." },
            artStyle: createEnumSchema(options.artStyles),
            colorPalette: createEnumSchema(options.colorPalettes),
            cameraMovement: createEnumSchema(options.cameraMovements),
        },
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Here is the core idea: "${idea}". Please fill out the JSON with the best-fitting options.`,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

export const generatePromptVariations = async (basePrompt: string, language: 'en' | 'sv' | 'es' | 'fr' | 'de'): Promise<string[]> => {
    const systemInstruction = variationsSystemPrompt[language];
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            variations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
            },
        },
        required: ['variations'],
    };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Here is the base prompt: "${basePrompt}"`,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema,
            },
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result.variations || [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
};