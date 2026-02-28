/**
 * Audio services: speech synthesis, sound effects, transcription, and Suno music generation.
 * Split from the monolithic geminiService.ts for maintainability.
 * @module core/services/gemini/geminiAudioService
 */
import { Modality, GenerateContentResponse } from '@google/genai';
import { SunoPack, Caption, SunoSettings } from '@core/types';
import { parseAndThrowApiError } from '@core/utils/apiErrors';
import { retryOperation } from '@core/utils/retry';
import { getAiClient, cleanJson, resilientCall } from './aiClient';

// ---------------------------------------------------------------------------
// Speech & sound effects
// ---------------------------------------------------------------------------

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
      { endpoint: 'gemini-audio', model: 'gemini-2.5-flash-preview-tts' },
    );

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error('No audio generated');
    return audioData;
  } catch (error) {
    parseAndThrowApiError(error);
    return '';
  }
};

export const generateSoundEffect = async (description: string): Promise<string> => {
  // For now, we reuse TTS logic but prompt it to "Perform sound: X".
  return generateSpeech(`(Sound Effect) ${description}`, 'Fenrir');
};

// ---------------------------------------------------------------------------
// Transcription & audio analysis
// ---------------------------------------------------------------------------

export const transcribeAudio = async (audioBlob: Blob): Promise<Caption[]> => {
  const ai = getAiClient();
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(audioBlob);
  });
  const base64 = await base64Promise;

  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: {
            parts: [
              { inlineData: { mimeType: audioBlob.type, data: base64 } },
              {
                text: 'Transcribe this audio. Return JSON: [{text: string, startTime: number, endTime: number}]',
              },
            ],
          },
          config: { responseMimeType: 'application/json' },
        }),
      { endpoint: 'gemini-audio', model: 'gemini-3.1-pro-preview' },
    );

    const raw = JSON.parse(cleanJson(response.text));
    interface RawCaptionEntry {
      text: string;
      startTime: number;
      endTime: number;
    }
    return raw.map((c: RawCaptionEntry, i: number) => ({
      id: `cap_${i}`,
      text: c.text,
      startTime: c.startTime,
      endTime: c.endTime,
      style: 'pop',
    }));
  } catch (error) {
    parseAndThrowApiError(error);
    return [];
  }
};

export const analyzeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Audio } },
            {
              text: 'Describe the background ambience and soundscape of this audio in one sentence.',
            },
          ],
        },
      }),
    );
    return response.text || '';
  } catch (error) {
    parseAndThrowApiError(error);
    return '';
  }
};

// ---------------------------------------------------------------------------
// Ambience
// ---------------------------------------------------------------------------

export const generateAmbiencePrompt = async (location: string): Promise<string> => {
  const ai = getAiClient();
  const res = await retryOperation<GenerateContentResponse>(() =>
    ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Describe the background soundscape/ambience for: "${location}". Return string.`,
    }),
  );
  return res.text || '';
};

export const generateAmbienceAudio = async (description: string): Promise<string> => {
  return generateSpeech(`(Ambience) ${description}`, 'Fenrir');
};

// ---------------------------------------------------------------------------
// Suno music generation
// ---------------------------------------------------------------------------

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
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Generate a song package based on: ${inputContext}`,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
        },
      }),
    );
    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    parseAndThrowApiError(error);
    throw error;
  }
};

export const extendSunoLyrics = async (
  currentLyrics: string,
  topic: string,
  style: string,
): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Extend these song lyrics with a new section (e.g. Verse 2, Bridge, or Outro) that fits the flow.

            Current Lyrics:
            "${currentLyrics}"

            Context:
            Topic: ${topic}
            Style: ${style}

            Return ONLY the new added lines with their [Tags]. Do not repeat existing lyrics.`,
      }),
    );
    return response.text?.trim() || '';
  } catch (error) {
    parseAndThrowApiError(error);
    return '';
  }
};
