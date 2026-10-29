import type {
  MusicPromptArtifactInput,
  VideoPromptArtifactInput,
} from '@core/types/promptArtifact';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { cleanJson, getAiClientAsync, getPromptModel, resilientCall } from './gemini/aiClient';
import { resolvePromptGenerationProvider } from './promptGenerationService';
import { generatePromptWithOllama } from './ollamaProvider';

export interface ExpandVideoSceneOptions {
  model?: string;
  stylePreset?: string;
  language?: 'en' | 'sv';
  overwriteAll?: boolean;
  signal?: AbortSignal;
}

export interface VideoSceneExpansionResult {
  subject: string;
  action: string;
  environment: string;
  camera: string;
  lighting: string;
  style: string;
  audio: string;
  dialogue?: string;
  negativePrompt: string;
}

export interface ExpandMusicOptions {
  model?: string;
  stylePreset?: string;
  language?: string;
  overwriteAll?: boolean;
  signal?: AbortSignal;
}

export interface MusicExpansionResult {
  genre: string;
  mood: string;
  voice: string;
  tempo: string;
  instruments: string;
  structure: 'Auto' | 'Standard' | 'Pop' | 'Rap' | 'Ambient' | 'Custom';
  lyrics: string;
  mixNotes?: string;
}

export interface OptimizeVideoPackOptions {
  model?: string;
  stylePreset?: string;
  language?: 'en' | 'sv';
  signal?: AbortSignal;
}

export interface VideoPackOptimizationResult {
  primary: string;
  cinematic: string;
  controlFocused: string;
  negativePrompt: string;
}

const VIDEO_EXPANSION_SCHEMA = {
  type: 'object',
  properties: {
    subject: {
      type: 'string',
      description: 'The physical subject(s), character description, appearance, and placement.',
    },
    action: {
      type: 'string',
      description: 'Concrete physical actions, explicit motion trajectories, speed, and behavior.',
    },
    environment: {
      type: 'string',
      description: 'Physical location, architectural details, weather, depth, and spatial anchors.',
    },
    camera: {
      type: 'string',
      description: 'Camera framing, lens focal length, depth of field, and explicit camera motion.',
    },
    lighting: {
      type: 'string',
      description: 'Light sources, direction, color temperature, and atmospheric density.',
    },
    style: {
      type: 'string',
      description: 'Visual texture, film stock/sensor look, color grading, and aesthetic mood.',
    },
    audio: {
      type: 'string',
      description: 'Foley sound effects, ambient background audio, and acoustic atmosphere.',
    },
    dialogue: {
      type: 'string',
      description: 'Short spoken line of dialogue if applicable, or empty string.',
    },
    negativePrompt: {
      type: 'string',
      description: 'Unwanted visual elements or artifacts to avoid.',
    },
  },
  required: [
    'subject',
    'action',
    'environment',
    'camera',
    'lighting',
    'style',
    'audio',
    'negativePrompt',
  ],
};

const MUSIC_EXPANSION_SCHEMA = {
  type: 'object',
  properties: {
    genre: { type: 'string', description: 'Music genre tags under 50 characters.' },
    mood: { type: 'string', description: 'Emotional mood tags.' },
    voice: { type: 'string', description: 'Vocal delivery and style.' },
    tempo: { type: 'string', description: 'Tempo description, e.g. 120 bpm, upbeat, slow.' },
    instruments: { type: 'string', description: 'Key instruments and production elements.' },
    structure: {
      type: 'string',
      enum: ['Auto', 'Standard', 'Pop', 'Rap', 'Ambient', 'Custom'],
      description: 'Song structure.',
    },
    lyrics: {
      type: 'string',
      description:
        'Complete song lyrics with bracketed tags [Intro], [Verse], [Chorus], [Bridge], [Outro] in requested language.',
    },
    mixNotes: { type: 'string', description: 'Mix and arrangement guidance.' },
  },
  required: ['genre', 'mood', 'voice', 'tempo', 'instruments', 'structure', 'lyrics'],
};

const VIDEO_PACK_OPTIMIZATION_SCHEMA = {
  type: 'object',
  properties: {
    primary: {
      type: 'string',
      description:
        'Balanced, high-fidelity production-ready prompt using 5-pillar cinematic architecture.',
    },
    cinematic: {
      type: 'string',
      description:
        'Texture-focused cinematic variant with rich optical detail, atmospheric lighting, and lens aesthetics.',
    },
    controlFocused: {
      type: 'string',
      description:
        'Motion-stabilized variant prioritizing physical realism, temporal continuity, and bounded duration.',
    },
    negativePrompt: {
      type: 'string',
      description: 'Targeted negative prompt avoiding modern video generation defects.',
    },
  },
  required: ['primary', 'cinematic', 'controlFocused', 'negativePrompt'],
};

/**
 * Expand a core video idea into complete, structured scene details using Gemini.
 * Supports smart merging: keeps user-written fields and only fills blanks unless overwriteAll=true.
 */
export async function expandVideoSceneDetails(
  input: VideoPromptArtifactInput,
  options: ExpandVideoSceneOptions = {},
): Promise<VideoPromptArtifactInput> {
  const provider = resolvePromptGenerationProvider();
  const settings = useSettingsStore.getState();
  const targetLanguage = options.language ?? 'en';
  const stylePreset = options.stylePreset ?? 'cinematic';
  const signal = options.signal;

  const existingFields: Record<string, string> = {
    subject: input.subject || '',
    action: input.action || '',
    environment: input.environment || '',
    camera: input.camera || '',
    lighting: input.lighting || '',
    style: input.style || '',
    audio: input.audio || '',
    dialogue: input.dialogue || '',
    negativePrompt: input.negativePrompt || '',
  };

  const hasManualFields = Object.values(existingFields).some(Boolean);

  const prompt = [
    `You are a world-class cinematic director and prompt specialist for Google Flow and Veo 3.1 video workflows.`,
    `Break down the following core idea into structured scene components.`,
    ``,
    `Core Idea: "${input.idea}"`,
    `Target Model / Service: ${input.target}`,
    `Aspect Ratio: ${input.aspectRatio}`,
    `Duration: ${input.durationSeconds} seconds`,
    `Mode: ${input.mode}`,
    `Style Preset: ${stylePreset}`,
    `Target Language for Scene Details: ${targetLanguage === 'sv' ? 'Swedish' : 'English'} (cinematic terms are best in English for Veo compatibility).`,
    ``,
    hasManualFields && !options.overwriteAll
      ? `Existing user-specified fields (respect and incorporate these into the scene breakdown):\n${JSON.stringify(
          existingFields,
          null,
          2,
        )}`
      : `Generate a fresh, breathtaking cinematic scene breakdown.`,
    ``,
    `Requirements:`,
    `1. Subject: Vivid, anatomically consistent description of the subject/characters.`,
    `2. Action: Specific physical blocking, trajectory, speed, and continuous motion flow.`,
    `3. Environment: Concrete architectural/spatial details, depth, textures, and atmosphere.`,
    `4. Camera: Precise camera movement (dolly, tilt, track, boom), lens framing (e.g. 35mm f/2.0), and depth of field.`,
    `5. Lighting: Explicit lighting direction, key/fill, color temperature, practical light sources.`,
    `6. Style: Film stock/sensor look, color grading, fine grain, and natural cinematic texture.`,
    `7. Audio: Native synchronized Foley, ambient acoustic soundscape, and environmental room tone.`,
    `8. Dialogue: Keep dialogue concise and enclosed in quotation marks if present.`,
    `9. Negative Prompt: Avoid buzzwords, blur, jitter, deformities, bad anatomy, jump cuts.`,
    `Return ONLY a valid JSON object matching the requested schema.`,
  ].join('\n');

  let raw: unknown;
  if (provider === 'ollama') {
    raw = await generatePromptWithOllama(prompt, {
      baseUrl: settings.localLlmEndpoint,
      model: settings.localLlmModel,
      signal,
      jsonSchema: VIDEO_EXPANSION_SCHEMA,
    });
  } else {
    const ai = await getAiClientAsync();
    const model = getPromptModel(options.model);
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: VIDEO_EXPANSION_SCHEMA,
            abortSignal: signal,
          },
        }),
      { endpoint: 'gemini-scene-expansion', model, signal },
    );
    raw = response.text;
  }

  if (signal?.aborted) throw new DOMException('AI scene expansion cancelled.', 'AbortError');

  let parsed: VideoSceneExpansionResult;
  try {
    parsed = (
      typeof raw === 'string' ? JSON.parse(cleanJson(raw)) : raw
    ) as VideoSceneExpansionResult;
  } catch {
    throw new Error('Failed to parse AI scene breakdown JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI scene breakdown returned an empty response.');
  }

  const result: VideoPromptArtifactInput = { ...input };
  const keys: (keyof VideoSceneExpansionResult)[] = [
    'subject',
    'action',
    'environment',
    'camera',
    'lighting',
    'style',
    'audio',
    'dialogue',
    'negativePrompt',
  ];

  for (const key of keys) {
    const aiVal = (parsed[key] || '').trim();
    if (!aiVal) continue;
    if (options.overwriteAll) {
      result[key] = aiVal;
    } else {
      // Smart merge: retain user's existing non-empty value, fill empty
      result[key] = (input[key] || '').trim() || aiVal;
    }
  }

  return result;
}

/**
 * Expand a music topic/idea into complete Suno settings and structured lyrics using Gemini.
 */
export async function expandMusicDetails(
  input: MusicPromptArtifactInput,
  options: ExpandMusicOptions = {},
): Promise<MusicPromptArtifactInput> {
  const provider = resolvePromptGenerationProvider();
  const settings = useSettingsStore.getState();
  const songLanguage = options.language ?? input.language ?? 'English';
  const signal = options.signal;

  const existingFields: Record<string, string> = {
    genre: input.genre || '',
    mood: input.mood || '',
    voice: input.voice || '',
    tempo: input.tempo || '',
    instruments: input.instruments || '',
    structure: input.structure || '',
    lyrics: input.lyrics || '',
  };

  const hasManualFields = Object.values(existingFields).some(Boolean);

  const prompt = [
    `You are an award-winning music producer and lyricist specializing in Suno v4 / v5 Custom Mode production.`,
    `Expand the following song idea into production-grade Suno parameters and structured lyrics.`,
    ``,
    `Song Topic / Story: "${input.topic}"`,
    `Lyrics Language: ${songLanguage}`,
    `Instrumental: ${input.instrumental ? 'Yes' : 'No'}`,
    ``,
    hasManualFields && !options.overwriteAll
      ? `Existing user-specified preferences:\n${JSON.stringify(existingFields, null, 2)}`
      : `Generate a fresh, original musical concept.`,
    ``,
    `Guidelines:`,
    `- Genre: Under 50 characters of concise style tags.`,
    `- Lyrics: Use explicit section headers like [Intro], [Verse 1], [Chorus], [Verse 2], [Chorus], [Bridge], [Outro].`,
    `- If instrumental mode is true, set lyrics to "[Instrumental]".`,
    `- Rhyme scheme, rhythm, and lyrical meter should be punchy, evocative, and natural in ${songLanguage}.`,
    `Return ONLY a valid JSON object matching the requested schema.`,
  ].join('\n');

  let raw: unknown;
  if (provider === 'ollama') {
    raw = await generatePromptWithOllama(prompt, {
      baseUrl: settings.localLlmEndpoint,
      model: settings.localLlmModel,
      signal,
      jsonSchema: MUSIC_EXPANSION_SCHEMA,
    });
  } else {
    const ai = await getAiClientAsync();
    const model = getPromptModel(options.model);
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: MUSIC_EXPANSION_SCHEMA,
            abortSignal: signal,
          },
        }),
      { endpoint: 'gemini-music-expansion', model, signal },
    );
    raw = response.text;
  }

  if (signal?.aborted) throw new DOMException('AI music expansion cancelled.', 'AbortError');

  let parsed: MusicExpansionResult;
  try {
    parsed = (typeof raw === 'string' ? JSON.parse(cleanJson(raw)) : raw) as MusicExpansionResult;
  } catch {
    throw new Error('Failed to parse AI music expansion JSON.');
  }

  const result: MusicPromptArtifactInput = { ...input };
  const keys: (keyof MusicExpansionResult)[] = [
    'genre',
    'mood',
    'voice',
    'tempo',
    'instruments',
    'structure',
    'lyrics',
    'mixNotes',
  ];

  for (const key of keys) {
    const aiVal = (parsed[key] || '').trim();
    if (!aiVal) continue;
    if (options.overwriteAll) {
      if (key === 'structure') {
        result.structure = aiVal as MusicPromptArtifactInput['structure'];
      } else {
        result[key] = aiVal;
      }
    } else {
      if (key === 'structure') {
        result.structure = (input.structure || aiVal) as MusicPromptArtifactInput['structure'];
      } else {
        result[key] = (input[key] || '').trim() || aiVal;
      }
    }
  }

  return result;
}

/**
 * Generate all 3 cinematic prompt variants (Primary, Cinematic, Control-focused)
 * using DeepMind's 5-Pillar Architecture in a single optimized Gemini call.
 */
export async function optimizeFullVideoPack(
  input: VideoPromptArtifactInput,
  options: OptimizeVideoPackOptions = {},
): Promise<VideoPackOptimizationResult> {
  const provider = resolvePromptGenerationProvider();
  const settings = useSettingsStore.getState();
  const targetLanguage = options.language ?? 'en';
  const stylePreset = options.stylePreset ?? 'cinematic';
  const signal = options.signal;

  const prompt = [
    `You are the lead cinematic prompt architect for Google Flow, Veo 3.1, and generative video systems.`,
    `Transform the following scene input into 3 distinct, production-ready cinematic prompt variants.`,
    ``,
    `Input Scene Details:`,
    `- Core Idea: "${input.idea}"`,
    `- Mode: ${input.mode}`,
    `- Duration: ${input.durationSeconds}s`,
    `- Aspect Ratio: ${input.aspectRatio}`,
    input.subject ? `- Subject: ${input.subject}` : '',
    input.action ? `- Action & Dynamics: ${input.action}` : '',
    input.environment ? `- Environment & Space: ${input.environment}` : '',
    input.camera ? `- Camera & Optics: ${input.camera}` : '',
    input.lighting ? `- Lighting & Atmosphere: ${input.lighting}` : '',
    input.style ? `- Visual Style: ${input.style}` : '',
    input.audio ? `- Soundscape & Foley: ${input.audio}` : '',
    input.dialogue ? `- Dialogue (preserve strictly): "${input.dialogue}"` : '',
    `- Style Preset: ${stylePreset}`,
    `- Output Prompt Language: ${targetLanguage === 'sv' ? 'Swedish' : 'English (recommended for Veo 3.1 / Flow model adherence)'}.`,
    ``,
    `Architectural Rules:`,
    `1. Primary ("Recommended handoff"): Balanced, filmic narrative prompt integrating the 5 pillars (Anchor Space, Subject Blocking, Temporal Progression, Optics/Framing, Light/Sound). Continuous single-shot flow under 180 words.`,
    `2. Cinematic ("Texture & Optics"): Rich film texture, specific focal length, anamorphic bokeh, volumetric light, natural rim highlights, deliberate cinematic rhythm.`,
    `3. Control-focused ("Physical Coherence"): Strict physical motion adherence, locked trajectory, smooth temporal continuity for exactly ${input.durationSeconds} seconds, no sudden jump cuts or deformities.`,
    `4. Negative Prompt: Concise comma-separated list of visual artifacts to avoid (e.g. morphing, unnatural jitter, bad anatomy, blown out highlights).`,
    `5. If dialogue is present, preserve it intact within the prompt: 'The character says: "[dialogue]"'.`,
    `Return ONLY a valid JSON object matching the requested schema.`,
  ]
    .filter(Boolean)
    .join('\n');

  let raw: unknown;
  if (provider === 'ollama') {
    raw = await generatePromptWithOllama(prompt, {
      baseUrl: settings.localLlmEndpoint,
      model: settings.localLlmModel,
      signal,
      jsonSchema: VIDEO_PACK_OPTIMIZATION_SCHEMA,
    });
  } else {
    const ai = await getAiClientAsync();
    const model = getPromptModel(options.model);
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: VIDEO_PACK_OPTIMIZATION_SCHEMA,
            abortSignal: signal,
          },
        }),
      { endpoint: 'gemini-video-pack-optimize', model, signal },
    );
    raw = response.text;
  }

  if (signal?.aborted) throw new DOMException('Prompt optimization cancelled.', 'AbortError');

  let parsed: VideoPackOptimizationResult;
  try {
    parsed = (
      typeof raw === 'string' ? JSON.parse(cleanJson(raw)) : raw
    ) as VideoPackOptimizationResult;
  } catch {
    throw new Error('Failed to parse AI prompt optimization JSON.');
  }

  if (!parsed || !parsed.primary || !parsed.cinematic || !parsed.controlFocused) {
    throw new Error('AI prompt optimization returned incomplete prompt variants.');
  }

  return {
    primary: parsed.primary.trim(),
    cinematic: parsed.cinematic.trim(),
    controlFocused: parsed.controlFocused.trim(),
    negativePrompt: (parsed.negativePrompt || '').trim(),
  };
}
