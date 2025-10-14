import { GoogleGenAI, GenerateContentResponse, Type, Modality } from '@google/genai';
import { buildGeminiPrompt } from './promptBuilder';
import { PromptGenerationParams, VeoPromptResponse, GroundingChunk, EditedImageResponse, SunoSongData } from '../types';
import { parseAndThrowApiError } from '../utils/apiErrors';
import { appUIStrings } from '../translations';
import { MUSIC_GENRES } from '../constants';

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
        timeOfDay: string[];
        weather: string[];
        visualEffects: string[];
        cameraDistances: string[];
        characterGenders: string[];
        characterAges: string[];
        characterClothings: string[];
        characterSkinTones: string[];
        ambientSounds: string[];
        voiceStyles: string[];
    },
    generateAsSeries: boolean
): Promise<Partial<PromptGenerationParams>> => {
    try {
        let systemInstruction = appUIStrings[language].autoFillSystemPrompt;

        if (generateAsSeries) {
            systemInstruction += `\n\n**SERIES MODE ACTIVATED:** The user wants to generate a 3-part series. Your suggestions should reflect this. Prioritize choices that build a narrative arc. For example, suggest a 'Documentary Narrator' or 'Standard Narrator' voice style to provide cohesion. Suggest 'Cinematic' or 'Photorealistic' art styles and camera movements like 'Tracking shot' that are well-suited for storytelling. Your environmental description should set a clear opening scene.`;
        }

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
                        },
                        timeOfDay: {
                            type: Type.STRING,
                            description: "The most appropriate time of day for the scene.",
                            enum: options.timeOfDay
                        },
                        weather: {
                            type: Type.STRING,
                            description: "The most fitting weather condition for the mood.",
                            enum: options.weather
                        },
                        visualEffect: {
                            type: Type.STRING,
                            description: "A subtle but effective visual effect to enhance the idea.",
                            enum: options.visualEffects
                        },
                        cameraDistance: {
                            type: Type.STRING,
                            description: "The ideal camera distance to frame the main subject.",
                            enum: options.cameraDistances
                        },
                        characterGender: {
                            type: Type.STRING,
                            description: "The most fitting gender for a character, if a character is implied in the idea. If no character is present, return 'Any'.",
                            enum: options.characterGenders
                        },
                        characterAge: {
                            type: Type.STRING,
                            description: "The most appropriate age for a character, if a character is implied. If no character, return 'Any'.",
                            enum: options.characterAges
                        },
                        characterClothing: {
                            type: Type.STRING,
                            description: "A suitable clothing style for a character, based on the context of the idea. If no character, return 'Any'.",
                            enum: options.characterClothings
                        },
                        characterSkinTone: {
                            type: Type.STRING,
                            description: "The most fitting skin tone for a character, if implied. Otherwise, return 'Any'.",
                            enum: options.characterSkinTones
                        },
                        characterSpecificClothing: {
                            type: Type.STRING,
                            description: "A brief description of specific, key clothing items if they are central to the idea."
                        },
                        characterAccessories: {
                            type: Type.STRING,
                            description: "A brief description of any important accessories the character might have."
                        },
                        ambientSound: {
                            type: Type.STRING,
                            description: "An immersive ambient sound that matches the environment and mood. Avoid 'None' unless the scene is meant to be silent.",
                            enum: options.ambientSounds
                        },
                        voiceStyle: {
                            type: Type.STRING,
                            description: "Suggest a voice-over style only if it's highly appropriate for the idea (e.g., a documentary or trailer). Otherwise, return 'None'.",
                            enum: options.voiceStyles
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
 * Generates song title, style, and lyrics for Suno AI.
 */
export const generateSunoSong = async (idea: string, language: string): Promise<SunoSongData> => {
    try {
        const systemInstruction = `You are an expert songwriter and musicologist acting as a creative director for the Suno AI music generator. Your task is to take a user's song idea and generate a complete, ready-to-use package optimized for Suno's latest models.

Your output MUST be a valid JSON object containing three keys: "title", "styleOfMusic", and "lyrics".

1.  **title**: Create a catchy, evocative song title based on the user's idea.
2.  **styleOfMusic**: Generate a rich, descriptive phrase for the "Style of Music" prompt. This is critical for modern text-to-music models. Instead of just a list of keywords, create a sentence that paints a picture of the song's sound. It should combine genre, mood, instrumentation, and production quality in a natural, evocative way. For example: "An epic cinematic rock anthem with powerful female vocals, soaring electric guitars, and a massive drum sound."
    *   Use the provided list for genre inspiration: ${MUSIC_GENRES}.
    *   The prompt must be under 180 characters.
3.  **lyrics**: Write musically-aware lyrics that are structured for a song.
    *   The lyrics must follow a logical song structure.
    *   Use metatags like [Intro], [Verse], [Chorus], [Bridge], [Guitar Solo], [Instrumental], [Outro] to define sections. Be creative and include instrumental breaks where appropriate for the song's style.
    *   Focus on meter, rhyme scheme, and evocative imagery that tells a story or explores the emotional core of the user's idea.

Respond in the language with this ISO 639-1 code: ${language}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a song package for this idea: "${idea}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: {
                            type: Type.STRING,
                            description: "The catchy title of the song."
                        },
                        styleOfMusic: {
                            type: Type.STRING,
                            description: "A detailed, descriptive style prompt for Suno AI, under 180 characters."
                        },
                        lyrics: {
                            type: Type.STRING,
                            description: "The full lyrics of the song, formatted with structural metatags like [Verse], [Chorus], and [Instrumental]."
                        }
                    },
                    required: ['title', 'styleOfMusic', 'lyrics']
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        // Ensure lyrics have proper newlines for display
        jsonResponse.lyrics = jsonResponse.lyrics.replace(/\\n/g, '\n');
        return jsonResponse;

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