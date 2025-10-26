import { GoogleGenAI, GenerateContentResponse, Type, Modality, Chat } from '@google/genai';
import { buildGeminiPrompt } from './promptBuilder';
import { PromptGenerationParams, VeoPromptResponse, GroundingChunk, EditedImageResponse, SunoSongData } from '../types';
import { parseAndThrowApiError } from '../utils/apiErrors';
import { appUIStrings } from '../translations';
import { MUSIC_GENRES } from '../constants';

// Returns a new instance of the GoogleGenAI client.
// This is called before each API request to ensure the most up-to-date API key is used,
// especially after the user selects a new key in the Veo flow.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });


/**
 * Extracts key search terms from a core idea using the Gemini API for better search grounding.
 * @param idea - The user's core idea string.
 * @param language - The ISO 639-1 code for the language.
 * @param model - The Gemini model to use for extraction.
 * @returns A comma-separated string of keywords, or the original idea on failure.
 */
const extractKeywordsFromIdea = async (idea: string, language: string, model: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = `You are an expert in search query optimization. Your task is to analyze the user's 'Core Idea' for a video and extract the most relevant and specific keywords that would be useful for a Google Search to find up-to-date information or visual references. Return only a list of these keywords. Focus on named entities (people, places, things), specific actions, and unique descriptive terms. Avoid generic words. Respond in the language with this ISO 639-1 code: ${language}.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash', // Flash is sufficient for this task
            contents: `Extract keywords from this idea: "${idea}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        keywords: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'A specific and relevant keyword for a Google Search.'
                            }
                        }
                    },
                    required: ['keywords']
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        const keywords = jsonResponse.keywords || [];
        if (keywords.length > 0) {
            return keywords.join(', ');
        }
        // If no keywords are found, fall back to the original idea.
        return idea;
    } catch (error) {
        // If keyword extraction fails, gracefully fall back to using the original idea.
        console.error("Keyword extraction failed, falling back to original idea:", error);
        return idea;
    }
};


/**
 * Generates a creative prompt for Veo based on user-defined parameters.
 */
export const generateVeoPrompt = async (
    params: PromptGenerationParams,
    userCoords?: { latitude: number, longitude: number } | null
): Promise<VeoPromptResponse> => {
  try {
    const ai = getAiClient();
    const systemInstruction = buildGeminiPrompt(params);
    let generationModel = params.model || 'gemini-2.5-pro';
    
    // Base configuration for the model call.
    const config: any = {
      systemInstruction,
      tools: []
    };

    // If Thinking Mode is enabled, force the Pro model and set the thinking budget.
    if (params.thinkingMode) {
        generationModel = 'gemini-2.5-pro';
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    // The main content for the prompt/search query.
    let content = params.idea;

    if (params.useGoogleSearch) {
      config.tools.push({ googleSearch: {} });
      const ideaKeywords = await extractKeywordsFromIdea(params.idea, params.language, params.model);
      const keyElements = [
        ideaKeywords,
        params.environment,
        params.characterActions,
        params.artStyle === 'Custom' ? params.customArtStyle : params.artStyle,
      ].filter(el => el && el.trim() !== '' && !['Any', 'None'].includes(el)).join(', ');

      if (keyElements.trim()) content = keyElements;
    }

    if (params.useGoogleMaps) {
        config.tools.push({ googleMaps: {} });
        if (userCoords) {
            config.toolConfig = {
                retrievalConfig: { latLng: userCoords }
            };
        }
    }
    
    if (config.tools.length === 0) delete config.tools;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: generationModel,
      contents: content,
      config: config
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
 * Generates speech from text using the TTS model.
 * @param text The text to synthesize.
 * @returns A base64 encoded string of the raw PCM audio data.
 */
export const generateSpeech = async (text: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A standard, clear voice
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error('TTS generation failed, no audio data returned.');
        }
        return base64Audio;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Generates three variations for a given prompt.
 */
export const generatePromptVariations = async (basePrompt: string, language: string, model: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const systemInstruction = `You are an expert creative director specializing in narrative and visual storytelling. The user will provide a master prompt for a video. Your task is to generate exactly 3 distinct and creative variations of this prompt.

Each variation must maintain the core subject and action of the original but must explore a completely different stylistic interpretation, narrative angle, or genre.

For example, if the original prompt is about a "knight fighting a dragon", your variations could be:
1.  **Genre Shift (Noir):** A gritty, rain-soaked, black-and-white scene focusing on the detective-like knight hunting the beast in a corrupt, shadowy kingdom.
2.  **Style Shift (Anime):** A vibrant, high-energy interpretation with dynamic camera angles, speed lines, and exaggerated, emotional character expressions.
3.  **Perspective Shift (Dragon's POV):** A quiet, contemplative version from the ancient dragon's perspective, portraying the knight as a fleeting, misguided intruder in its timeless domain.

Be bold in your reinterpretations. The goal is to provide genuinely different creative pathways from the same starting point. Respond in the language with this ISO 639-1 code: ${language}.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model || 'gemini-2.5-pro',
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
        characterMoods: string[];
        characterPoses: string[];
        characterClothings: string[];
        characterSkinTones: string[];
        ambientSounds: string[];
        voiceStyles: string[];
    },
    generateAsSeries: boolean,
    model: string,
    targetModel: 'veo' | 'sora'
): Promise<Partial<PromptGenerationParams>> => {
    try {
        const ai = getAiClient();
        let systemInstruction = appUIStrings[language].autoFillSystemPrompt;

        if (generateAsSeries) {
            systemInstruction += `\n\n**SERIES MODE ACTIVATED:** The user wants to generate a 3-part series. Your suggestions should reflect this. Prioritize choices that build a narrative arc. For example, suggest a 'Documentary Narrator' or 'Standard Narrator' voice style to provide cohesion. Suggest 'Cinematic' or 'Photorealistic' art styles and camera movements like 'Tracking shot' that are well-suited for storytelling. Your environmental description should set a clear opening scene.`;
        }
        
        if (targetModel === 'sora') {
            systemInstruction += `\n\n**SORA EMULATION MODE:** The user is targeting a Sora-like model, known for its world simulation and hyper-realism. Your suggestions must reflect this. Every choice must serve to create a scene that feels physically real, consistent, and cinematically captured.

- **World Simulation & Consistency:**
    - **Lived-in Environments:** The world should feel persistent and real. Suggest details that imply history, like 'faded posters peeling from a brick wall' or 'a well-worn wooden handle on a heavy door'.
    - **Cause and Effect:** Explicitly describe the physical consequences of actions. For example, if it's raining, suggest 'a character's hair is matted and dripping, their coat darkened with moisture'. A fast-moving car should 'kick up a spray of water from puddles on the asphalt'.
    - **Subtle Dynamics:** Include secondary motion that enhances realism. Suggest details like 'a character's breath fogging in the cold air', 'curtains gently swaying from an open window', or 'individual leaves rustling on a tree in the breeze'.

- **Hyper-Realistic Detail:**
    - **Textures & Materials:** Go beyond simple adjectives. Instead of 'old wall', suggest 'a crumbling brick wall with patches of moss growing in the damp crevices'. Describe how light interacts with these surfaces.
    - **Atmospheric Physics:** Suggest details like 'mist clinging to the ground in the early morning air' or 'heat haze shimmering above the asphalt on a summer day'.

- **Nuanced Character & Action:**
    - **Grounded Physicality:** Actions must be grounded in physical reality. Describe the effort or consequence of movement. 'A lone hiker trudges through deep snow, each step a visible effort, leaving a trail of deep footprints behind'.
    - **Object Interaction:** Instead of 'a person holds a cup', suggest 'a character's fingers gently wrap around a warm ceramic mug, steam rising to curl around their face'.
    - **Expressive Detail:** Instead of 'a person is surprised', suggest 'a character's eyes widen slightly, their hand instinctively rising to cover their mouth'.

- **Realistic Cinematography:**
    - **Plausible Camera Work:** Camera movements should feel physically plausible, as if operated by a real person or drone, complete with subtle imperfections like a slight drift or a gentle focus pull. Prioritize dynamic, professional movements like 'Drone shot, flying over' or 'Tracking shot'.
    - **Art Style:** **Aggressively prefer 'Photorealistic'** as the art style. It is the only correct choice unless the user's idea is explicitly animated. If the idea is fantastical but should look real (e.g., a dragon), 'Photorealistic' is still the correct choice.`;
        }

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-pro',
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
                        characterActions: {
                            type: Type.STRING,
                            description: "A brief, dynamic description of the character's primary action in the scene, based on the core idea. e.g., 'sprinting across a rooftop', 'calmly sipping tea'."
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
                        characterMood: {
                            type: Type.STRING,
                            description: "The most fitting emotional mood for a character, if implied. If no character, return 'Any'.",
                            enum: options.characterMoods
                        },
                        characterPose: {
                            type: Type.STRING,
                            description: "A suitable physical pose for a character, based on the context. If no character, return 'Any'.",
                            enum: options.characterPoses
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
                            description: "Suggest specific clothing items that fit the character's context, archetype, and environment. e.g., 'a worn leather jacket with patches' for a rebel, or 'a flowing silk robe' for a sage."
                        },
                        characterAccessories: {
                            type: Type.STRING,
                            description: "Suggest accessories that add detail and personality to the character. e.g., 'a pair of round, wire-frame glasses' or 'a heavy, antique silver locket'."
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
                        },
                        voiceOver: {
                            type: Type.STRING,
                            description: "A short, creative voice-over script (1-2 sentences) that is deeply integrated with all other suggested modifiers. The script should reflect the specific art style, environment, and character actions chosen. It must enhance the narrative, not just describe the visuals. For example, for a 'Noir' scene, a good script is 'In this city, the rain washes away everything but the secrets.' If the suggested voice style is 'None', this MUST be an empty string."
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
export const generateSunoSong = async (idea: string, language: string, model: string): Promise<SunoSongData> => {
    try {
        const ai = getAiClient();
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
            model: model || 'gemini-2.5-pro',
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
 * Generates only the lyrics for a song based on an idea and style.
 */
export const generateLyricsForSuno = async (
    idea: string,
    styleOfMusic: string,
    language: string,
    model: string
): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = `You are an expert songwriter. Your task is to write musically-aware lyrics based on the user's song idea and desired style of music. The lyrics should tell a story or explore the emotional core of the idea. Structure the lyrics for a song using metatags like [Intro], [Verse], [Chorus], [Bridge], [Guitar Solo], [Instrumental], [Outro]. Be creative and include instrumental breaks where appropriate for the song's style. Respond ONLY with a valid JSON object containing the lyrics. Respond in the language with this ISO 639-1 code: ${language}.`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-pro',
            contents: `Song Idea: "${idea}"\nStyle of Music: "${styleOfMusic}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        lyrics: {
                            type: Type.STRING,
                            description: "The full lyrics of the song, formatted with structural metatags like [Verse], [Chorus], and [Instrumental]."
                        }
                    },
                    required: ['lyrics']
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        const lyrics = jsonResponse.lyrics || '';
        // Ensure lyrics have proper newlines for display
        return lyrics.replace(/\\n/g, '\n');

    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Suggests an appropriate voice style and script based on scene context.
 */
export const suggestAudioDesign = async (
    params: {
        artStyle: string;
        cameraMovement: string;
        idea: string;
        environment: string;
        characterActions: string;
        characterMood: string;
        voiceStyleOptions: string[];
    },
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    model: string
): Promise<{ suggestedVoiceStyle: string; suggestedVoiceOverScript: string; }> => {
    try {
        const ai = getAiClient();
        const systemInstruction = appUIStrings[language].suggestAudioSystemPrompt;
        const userContent = `
            Core Idea: "${params.idea}"
            Art Style: "${params.artStyle}"
            Camera Movement: "${params.cameraMovement}"
            Environment: "${params.environment}"
            Character Actions: "${params.characterActions}"
            Character Mood: "${params.characterMood}"
        `;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestedVoiceStyle: {
                            type: Type.STRING,
                            description: "The most fitting voice-over style from the provided options.",
                            enum: params.voiceStyleOptions,
                        },
                        suggestedVoiceOverScript: {
                            type: Type.STRING,
                            description: "A short, creative voice-over script (1-2 sentences). Must be an empty string if suggestedVoiceStyle is 'None'."
                        }
                    },
                    required: ['suggestedVoiceStyle', 'suggestedVoiceOverScript']
                }
            }
        });

        return JSON.parse(response.text);

    } catch (error) {
        parseAndThrowApiError(error);
    }
};


/**
 * Suggests related art styles based on user input.
 */
export const suggestArtStyles = async (userInput: string, language: string, model: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const systemInstruction = `You are an expert art historian and creative director. The user will provide a term, style, or artist's name. Your task is to provide 4 concise, descriptive, and inspiring alternative phrases or related styles that would be effective in a text-to-video prompt. Focus on evocative adjectives and technical terms. For example, if the user enters "Van Gogh", you might suggest "Post-Impressionist style with thick, swirling brushstrokes", "Vibrant impasto painting technique", "Expressive and emotional oil on canvas feel", "Emulating the 'Starry Night' color palette". Respond in the language with this ISO 639-1 code: ${language}.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Suggest art styles related to: "${userInput}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'A descriptive and creative art style suggestion.'
                            }
                        }
                    },
                    required: ['suggestions']
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        return jsonResponse.suggestions || [];
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Generates concept art based on a prompt.
 */
export const generateConceptArt = async (prompt: string, aspectRatio: string): Promise<string> => {
    try {
        const ai = getAiClient();
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
 * Generates a visual storyboard from a prompt.
 */
export const generateStoryboard = async (prompt: string, aspectRatio: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        // 1. Break the prompt into 4 shots
        const systemInstruction = `You are a storyboard artist's assistant. Your task is to analyze a video prompt and break it down into 4 distinct, visually compelling keyframes or shots that tell a story. Describe each shot as a concise, single-sentence prompt suitable for an image generation model. Respond ONLY with a valid JSON object containing a single key "shots", which is an array of 4 strings.`;

        const textResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Analyze and break down this prompt: "${prompt}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        shots: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'A concise, single-sentence description of a visual keyframe.'
                            }
                        }
                    },
                    required: ['shots']
                }
            }
        });

        const { shots } = JSON.parse(textResponse.text);
        if (!shots || shots.length === 0) {
            throw new Error("Failed to break down prompt into storyboard shots.");
        }

        // 2. Generate an image for each shot
        const imagePromises = shots.slice(0, 4).map((shotPrompt: string) => 
            ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: shotPrompt, // Use the generated shot description
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
                },
            })
        );
        
        const imageResults = await Promise.all(imagePromises);

        // 3. Format results
        return imageResults.map(response => {
            const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
            if (!base64ImageBytes) {
                throw new Error('Storyboard image generation failed for one or more shots.');
            }
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        });

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
        const ai = getAiClient();
        const imagePart = {
            inlineData: { data: imageData, mimeType },
        };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const imageContent = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imageContent && imageContent.inlineData) {
            return {
                newImageBytes: imageContent.inlineData.data,
                newMimeType: imageContent.inlineData.mimeType,
            };
        }
        
        throw new Error('Image editing failed to return an image. The model may have refused the request.');
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Starts a video generation job using Veo 3.1.
 */
export const generateVideo = async (
  prompt: string,
  uploadedImage: { data: string; mimeType: string } | null,
  aspectRatio: string,
  resolution: '1080p' | '720p',
  veoModel: 'fast' | 'quality'
): Promise<any> => {
  try {
    const ai = getAiClient();
    const modelName = veoModel === 'fast' 
      ? 'veo-3.1-fast-generate-preview' 
      : 'veo-3.1-generate-preview';

    const request: any = {
      model: modelName,
      prompt,
      config: {
        numberOfVideos: 1,
        resolution,
        aspectRatio: aspectRatio as '16:9' | '9:16',
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
        const ai = getAiClient();
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
            throw response; // Throw the response object itself to be parsed
        }
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Combines multiple prompt variations into a single, refined prompt using an AI model.
 */
export const combinePromptVariations = async (
    variations: string[],
    language: 'en' | 'sv' | 'es' | 'fr' | 'de',
    model: string
): Promise<string> => {
    try {
        const ai = getAiClient();
        const systemInstruction = appUIStrings[language].combineSystemPrompt;
        const userContent = `Please combine the following prompt variations into a single, superior prompt:\n\n---\n${variations.join('\n---\n')}`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-pro',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        combinedPrompt: {
                            type: Type.STRING,
                            description: "The final, merged, and refined prompt."
                        }
                    },
                    required: ['combinedPrompt']
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        return jsonResponse.combinedPrompt || '';

    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Suggests character clothing and accessories based on archetype and environment.
 */
export const suggestCharacterDetails = async (
    archetype: string,
    environment: string,
    language: string,
    model: string
): Promise<{ clothingSuggestions: string[], accessorySuggestions: string[] }> => {
    try {
        const ai = getAiClient();
        const systemInstruction = `You are a creative assistant and stylist for film and video games. Your task is to suggest clothing and accessories for a character based on their archetype and the environment they are in.
Provide 5 creative and specific suggestions for clothing items and 5 for accessories. The suggestions should be detailed and help build the character's personality.
Respond ONLY with a valid JSON object.
Respond in the language with this ISO 639-1 code: ${language}.`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: `Suggest clothing and accessories for a '${archetype}' character in this environment: "${environment}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        clothingSuggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: "A creative and specific clothing item suggestion (e.g., 'a worn leather jacket with custom patches')."
                            }
                        },
                        accessorySuggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: "A creative and specific accessory suggestion (e.g., 'a pair of scratched aviator sunglasses')."
                            }
                        }
                    },
                    required: ['clothingSuggestions', 'accessorySuggestions']
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        return jsonResponse || { clothingSuggestions: [], accessorySuggestions: [] };
    } catch (error) {
        parseAndThrowApiError(error);
    }
};

/**
 * Creates a new Gemini Chat session instance.
 */
export const createChat = (): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: 'You are a friendly and helpful creative assistant for the Veo Prompt Architect app. Keep your answers concise and focused on helping the user with their video, image, or music creation process.',
        },
    });
};

/**
 * Sends a message to a chat session and returns a streaming response.
 */
export const sendMessageToChatStream = async (chat: Chat, message: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
    try {
        return chat.sendMessageStream({ message });
    } catch (error) {
        parseAndThrowApiError(error);
    }
};


/**
 * Analyzes a video file to extract information.
 * @param videoData - Base64 encoded video data.
 * @param mimeType - The MIME type of the video.
 * @param prompt - The user's question about the video.
 * @returns A text response from the model.
 */
export const analyzeVideo = async (videoData: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const videoPart = { inlineData: { data: videoData, mimeType } };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [videoPart, textPart] },
        });

        return response.text;
    } catch (error) {
        parseAndThrowApiError(error);
    }
};