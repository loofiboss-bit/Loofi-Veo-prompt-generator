import { GoogleGenAI, GenerateContentResponse, Type, Modality } from '@google/genai';
import { buildGeminiPrompt } from './promptBuilder';
import { PromptGenerationParams, VeoPromptResponse, GroundingChunk, EditedImageResponse } from '../types';
import { parseAndThrowApiError } from '../utils/apiErrors';
import { appUIStrings } from '../translations';

// Initialize the Google GenAI client
// The API key is sourced from environment variables, as per the guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a creative prompt for Veo based on user-defined parameters.
 */
export const generateVeoPrompt = async (params: PromptGenerationParams): Promise<VeoPromptResponse> => {
  try {
    const systemInstruction = buildGeminiPrompt(params);
    
    const config: any = {};
    if (params.useGoogleSearch) {
        config.tools = [{ googleSearch: {} }];
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: params.model || 'gemini-2.5-flash',
      contents: params.idea,
      config: {
        systemInstruction,
        ...config
      }
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    return {
      prompt: response.text,
      groundingChunks: groundingMetadata?.groundingChunks as GroundingChunk[] | undefined,
    };
  } catch (error) {
    parseAndThrowApiError(error);
  }
};

/**
 * Generates three variations for a given prompt.
 */
export const generatePromptVariations = async (basePrompt: string, language: string): Promise<string[]> => {
    try {
        const systemInstruction = `You are a creative assistant. Based on the user's prompt, generate 3 distinct, creative variations. The variations should explore different angles, styles, or interpretations of the original idea. Respond in the language with this ISO 639-1 code: ${language}.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate 3 variations for this prompt: "${basePrompt}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        variations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'A creative variation of the original prompt.'
                            }
                        }
                    },
                    required: ['variations']
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        return jsonResponse.variations || [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Analyzes a core idea and suggests modifiers using Gemini's JSON mode.
 */
export const analyzeIdeaForModifiers = async (
    idea: string,
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    options: {
        artStyles: string[];
        cameraMovements: string[];
        colorPalettes: string[];
    }
): Promise<Partial<PromptGenerationParams>> => {
    try {
        const systemInstruction = appUIStrings[language].autoFillSystemPrompt;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this idea and suggest modifiers: "${idea}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        environment: {
                            type: Type.STRING,
                            description: "A brief, vivid description of the scene's environment based on the idea."
                        },
                        artStyle: {
                            type: Type.STRING,
                            description: "The most fitting art style for the idea.",
                            enum: options.artStyles
                        },
                        cameraMovement: {
                            type: Type.STRING,
                            description: "A suitable camera movement that enhances the scene.",
                            enum: options.cameraMovements
                        },
                        colorPalette: {
                            type: Type.STRING,
                            description: "A color palette that matches the mood of the idea.",
                            enum: options.colorPalettes
                        }
                    }
                }
            }
        });
        
        return JSON.parse(response.text);

    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Generates concept art based on a prompt.
 */
export const generateConceptArt = async (prompt: string, aspectRatio: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
            },
        });

        const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!base64ImageBytes) {
            throw new Error('Image generation failed, no image bytes returned.');
        }
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Edits an existing image using a text prompt.
 */
export const editImageWithGemini = async (
    imageData: string,
    mimeType: string,
    prompt: string
): Promise<EditedImageResponse> => {
    try {
        const imagePart = {
            inlineData: { data: imageData, mimeType },
        };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        const imageContent = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imageContent && imageContent.inlineData) {
            return {
                newImageBytes: imageContent.inlineData.data,
                newMimeType: imageContent.inlineData.mimeType,
            };
        }
        
        throw new Error('Image editing failed to return an image.');
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Starts a video generation job.
 */
export const generateVideo = async (
  prompt: string, 
  uploadedImage: { data: string; mimeType: string } | null
): Promise<any> => {
    try {
        const request: any = {
            model: 'veo-2.0-generate-001',
            prompt,
            config: {
                numberOfVideos: 1,
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

/**
 * Polls the status of an ongoing video generation operation.
 */
export const pollVideoOperation = async (operation: any): Promise<any> => {
    try {
        const updatedOperation = await ai.operations.getVideosOperation({ operation });
        return updatedOperation;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};


/**
 * Fetches the generated video from its download URI.
 */
export const fetchVideo = async (downloadLink: string): Promise<string> => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            throw new Error("API_KEY environment variable not set.");
        }
        const response = await fetch(`${downloadLink}&key=${apiKey}`);
        if (!response.ok) {
            throw response;
        }
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);
    } catch (error) {
        parseAndThrowApiError(error);
    }
};
