/**
 * Audio services: speech synthesis, sound effects, transcription, and Suno music generation.
 * Split from the monolithic geminiService.ts for maintainability.
 * @module core/services/gemini/geminiAudioService
 */
import { Modality, GenerateContentResponse } from '@google/genai';
import { SunoPack, Caption, SunoSettings } from '@core/types';
import { parseAndThrowApiError } from '@core/utils/apiErrors';
import { retryOperation } from '@core/utils/retry';
import { getAiClientAsync, getPromptModel, cleanJson, resilientCall } from './aiClient';
import { resolveProviderModelId } from '@core/models/catalog';

const DEFAULT_TTS_MODEL = resolveProviderModelId('gemini-3.1-flash-tts');

// ---------------------------------------------------------------------------
// Speech & sound effects
// ---------------------------------------------------------------------------

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  const ai = await getAiClientAsync();
  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: DEFAULT_TTS_MODEL,
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
      { endpoint: 'gemini-audio', model: DEFAULT_TTS_MODEL },
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
  const ai = await getAiClientAsync();
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(audioBlob);
  });
  const base64 = await base64Promise;
  const modelName = getPromptModel();

  try {
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
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
      { endpoint: 'gemini-audio', model: modelName },
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
  const ai = await getAiClientAsync();
  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: getPromptModel(),
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
  const ai = await getAiClientAsync();
  const res = await retryOperation<GenerateContentResponse>(() =>
    ai.models.generateContent({
      model: getPromptModel(),
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

const FIDELITY_TOKENS = ['44.1kHz', 'Wide Stereo', 'Clean Mix'];

const STRUCTURE_GUIDE: Record<SunoSettings['structure'], string> = {
  Auto: 'Choose the most natural structure for the concept while keeping section labels explicit.',
  Standard: 'Use: [Intro] -> [Verse] -> [Chorus] -> [Verse 2] -> [Bridge] -> [Chorus] -> [Outro].',
  Pop: 'Use: [Intro] -> [Verse] -> [Pre-Chorus] -> [Chorus] -> [Verse 2] -> [Bridge] -> [Chorus] -> [Outro].',
  Rap: 'Use: [Intro] -> [Hook] -> [Verse] -> [Hook] -> [Verse 2] -> [Outro].',
  Ambient: 'Use a smooth linear flow with sparse sections and atmospheric progression.',
  Custom: 'Create a custom structure that fits the brief while keeping section labels explicit.',
};

const GENRE_INSTRUMENT_FALLBACK: Record<string, string[]> = {
  synthwave: ['Analog Synth', 'Gated Drums'],
  pop: ['Bright Synth', 'Punchy Drums'],
  rock: ['Electric Guitar', 'Live Drums'],
  rap: ['808 Bass', 'Trap Hats'],
  ambient: ['Atmospheric Pads', 'Soft Piano'],
  jazz: ['Upright Bass', 'Brush Drums'],
  hardstyle: ['Distorted Kick', 'Reese Bass'],
};

const DEFAULT_STYLE_INFLUENCE = 75;

const firstNonEmpty = (...values: string[]): string | null => {
  for (const value of values) {
    const candidate = value.trim();
    if (candidate) {
      return candidate;
    }
  }
  return null;
};

const dedupeTokens = (tokens: string[]): string[] => {
  const seen = new Set<string>();
  return tokens.reduce<string[]>((accumulator, token) => {
    const normalized = token.trim();
    if (!normalized) {
      return accumulator;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return accumulator;
    }

    seen.add(key);
    accumulator.push(normalized);
    return accumulator;
  }, []);
};

const parseManualInstruments = (instruments: string): string[] =>
  instruments
    .split(/[,/]/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 2);

const getFallbackInstruments = (genre: string): string[] => {
  const normalizedGenre = genre.trim().toLowerCase();

  for (const [key, fallback] of Object.entries(GENRE_INSTRUMENT_FALLBACK)) {
    if (normalizedGenre.includes(key)) {
      return fallback;
    }
  }

  return ['Core Drums', 'Core Bass'];
};

const inferEnergy = (tempo: string, mood: string): string => {
  const tempoText = tempo.toLowerCase();
  const bpm = Number(tempoText.match(/(\d{2,3})/)?.[1] ?? '0');
  const moodText = mood.toLowerCase();

  if ((bpm > 0 && bpm <= 85) || /(slow|downtempo|half-time)/.test(tempoText)) {
    return 'Low Energy';
  }

  if (bpm >= 145 || /(fast|driving|uptempo|double-time)/.test(tempoText)) {
    return 'High Energy';
  }

  if ((bpm >= 105 && bpm <= 130) || /(midtempo|groove)/.test(tempoText)) {
    return 'Driving Energy';
  }

  if (/(calm|sad|melancholic|dreamy|tender|moody)/.test(moodText)) {
    return 'Low Energy';
  }

  return 'Balanced Energy';
};

const describeStyleInfluence = (styleInfluence: number | null): string => {
  if (styleInfluence === null) {
    return 'Style influence: choose automatically based on the brief and genre.';
  }

  if (styleInfluence >= 85) {
    return `Style influence: ${styleInfluence}%. Follow the requested tags very strictly.`;
  }

  if (styleInfluence <= 40) {
    return `Style influence: ${styleInfluence}%. Allow tasteful genre blending around the requested tags.`;
  }

  return `Style influence: ${styleInfluence}%. Balance specificity with tasteful variation.`;
};

const normalizeStylePrompt = (rawStyle: string, settings: SunoSettings): string => {
  const rawTokens = rawStyle
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  const instruments =
    parseManualInstruments(settings.instruments).length > 0
      ? parseManualInstruments(settings.instruments)
      : getFallbackInstruments(settings.genre);
  const mood = firstNonEmpty(settings.mood, rawTokens[0] ?? '', 'Cinematic');
  const vocalIdentity =
    settings.isInstrumental || settings.voice === 'Instrumental'
      ? 'Instrumental Arrangement'
      : firstNonEmpty(settings.voice, 'Expressive Vocals');
  const languageToken =
    settings.isInstrumental || settings.voice === 'Instrumental'
      ? null
      : settings.language === 'English'
        ? 'English Lyrics'
        : `${settings.language} Lyrics`;
  const influenceToken =
    settings.styleInfluence === null
      ? null
      : settings.styleInfluence >= 85
        ? 'Style-Locked'
        : settings.styleInfluence <= 40
          ? 'Genre-Blended'
          : 'Guided Style';
  const leading = [
    mood,
    inferEnergy(settings.tempo, settings.mood),
    ...instruments,
    vocalIdentity,
    firstNonEmpty(settings.genre, 'Genre Fusion'),
    firstNonEmpty(settings.tempo, 'Balanced Tempo'),
    languageToken,
    influenceToken,
  ].filter(Boolean) as string[];

  const remaining = rawTokens.filter(
    (token) =>
      ![...leading, ...FIDELITY_TOKENS].some(
        (existingToken) => existingToken.toLowerCase() === token.toLowerCase(),
      ),
  );

  let ordered = dedupeTokens([...leading, ...remaining, ...FIDELITY_TOKENS]);
  let stylePrompt = ordered.join(', ');

  while (stylePrompt.length > 200 && remaining.length > 0) {
    remaining.pop();
    ordered = dedupeTokens([...leading, ...remaining, ...FIDELITY_TOKENS]);
    stylePrompt = ordered.join(', ');
  }

  if (stylePrompt.length > 200) {
    stylePrompt = dedupeTokens([...leading.slice(0, 5), ...FIDELITY_TOKENS]).join(', ');
  }

  return stylePrompt.slice(0, 200).replace(/,\s*$/, '');
};

const buildFallbackLyrics = (topic: string): string => {
  const hook = topic.trim() || 'Untitled Story';
  return `[Verse]\n${hook}\n\n[Chorus]\n${hook}`;
};

const normalizeLyrics = (lyrics: string, settings: SunoSettings): string => {
  if (settings.isInstrumental || settings.voice === 'Instrumental') {
    return '[Instrumental]';
  }

  const trimmed = lyrics.trim();
  if (!trimmed) {
    return buildFallbackLyrics(settings.topic);
  }

  return /\[[^\]]+\]/.test(trimmed) ? trimmed : `[Verse]\n${trimmed}`;
};

const normalizeTitle = (title: string, topic: string): string => {
  const trimmed = title.trim();
  if (trimmed) {
    return trimmed;
  }

  const fallbackTitle = topic
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return fallbackTitle || 'Untitled Song';
};

const normalizeExplanation = (
  explanation: string,
  settings: SunoSettings,
  style: string,
): string => {
  const trimmed = explanation.trim();
  if (trimmed) {
    return trimmed;
  }

  const genre = firstNonEmpty(settings.genre, 'genre-blended');
  const format =
    settings.isInstrumental || settings.voice === 'Instrumental'
      ? 'instrumental arrangement'
      : `${settings.language.toLowerCase()} lyric concept`;

  return `A ${genre} ${format} shaped around ${style.toLowerCase()}.`;
};

const normalizeSunoPack = (pack: Partial<SunoPack>, settings: SunoSettings): SunoPack => {
  const style = normalizeStylePrompt(pack.style ?? '', settings);
  return {
    title: normalizeTitle(pack.title ?? '', settings.topic),
    style,
    lyrics: normalizeLyrics(pack.lyrics ?? '', settings),
    explanation: normalizeExplanation(pack.explanation ?? '', settings, style),
  };
};

export const generateSunoPack = async (settings: SunoSettings): Promise<SunoPack> => {
  const ai = await getAiClientAsync();
  const effectiveStyleInfluence = settings.styleInfluence ?? DEFAULT_STYLE_INFLUENCE;
  const inputContext = [
    `Topic: "${settings.topic}"`,
    `Genre Base: "${settings.genre || 'Any'}"`,
    `Mood/Vibe: "${settings.mood || 'Any'}"`,
    `Voice: "${settings.voice}"`,
    `Tempo: "${settings.tempo || 'Any'}"`,
    `Structure: "${settings.structure}"`,
    `Language: "${settings.language}"`,
    `Requested Instruments: "${settings.instruments || 'Auto'}"`,
    `Instrumental: "${settings.isInstrumental || settings.voice === 'Instrumental' ? 'Yes' : 'No'}"`,
    `Style Influence: ${effectiveStyleInfluence}%`,
    `Target Profile: ${settings.targetProfile ?? 'suno-v5.5'} with Studio 1.2 handoff`,
    `Key / Time Signature: ${settings.key ?? 'Auto'} / ${settings.timeSignature ?? '4/4'}`,
    `Energy Curve: ${settings.energyCurve ?? 'Auto'}`,
    `Vocal Range: ${settings.vocalRange ?? 'Auto'}`,
    `Voice / Persona Notes: ${settings.voiceNotes ?? settings.personaNotes ?? 'None'}`,
    `Custom Model / Taste Guidance: ${settings.customModelNotes ?? settings.tasteGuidance ?? 'None'}`,
    `Structure Plan: ${STRUCTURE_GUIDE[settings.structure]}`,
    describeStyleInfluence(settings.styleInfluence),
  ].join('\n');

  const systemInstruction = `You are a senior Suno producer and lyricist.

    Return ONLY valid JSON with keys: title, style, lyrics, explanation.
    All values must be non-empty strings.

    Style Prompt Rules:
    - Use comma-separated tags, never full sentences.
    - Keep the style string at or below 200 characters.
    - Lead with Mood, Energy, two core instruments, Vocal identity, Genre, Tempo, then fidelity tokens.
    - Always include fidelity tokens: ${FIDELITY_TOKENS.join(', ')}.

    Lyrics Rules:
    - Use explicit Suno section tags like [Intro], [Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro], [Instrumental].
    - Keep lines singable, vivid, and emotionally specific.
    - Prefer concrete imagery and a memorable hook over exposition.
    - Respect the requested language and structure plan.
    - If instrumental is requested, do not write sung lyrics. Return [Instrumental] only.

    Explanation Rules:
    - Explain the creative direction in one concise sentence.
    - Mention what makes the style prompt suitable for Suno playback.`;

  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: getPromptModel(),
        contents: `Generate a song package based on: ${inputContext}`,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
        },
      }),
    );
    return normalizeSunoPack(JSON.parse(cleanJson(response.text)) as Partial<SunoPack>, settings);
  } catch (error) {
    parseAndThrowApiError(error);
    throw error;
  }
};

export const extendSunoLyrics = async (
  currentLyrics: string,
  topic: string,
  style: string,
  language: string = 'English',
): Promise<string> => {
  const ai = await getAiClientAsync();
  try {
    const response = await retryOperation<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: getPromptModel(),
        contents: `Extend these Suno-ready lyrics with one coherent new section.

            Current Lyrics:
            "${currentLyrics}"

            Context:
            Topic: ${topic}
            Style: ${style}
            Language: ${language}

            Rules:
            - Return ONLY the new lines with one section tag such as [Verse 2], [Bridge], or [Outro].
            - Keep the language consistent with the current lyrics.
            - Keep the phrasing singable, concrete, and compatible with the existing style.
            - Do not repeat any existing lyrics.`,
      }),
    );
    const extendedLyrics = response.text?.trim() || '';
    if (!extendedLyrics) {
      return '';
    }

    return /\[[^\]]+\]/.test(extendedLyrics) ? extendedLyrics : `[Verse 2]\n${extendedLyrics}`;
  } catch (error) {
    parseAndThrowApiError(error);
    return '';
  }
};
