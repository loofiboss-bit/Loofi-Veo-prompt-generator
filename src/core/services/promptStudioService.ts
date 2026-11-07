import type {
  HistoryEntry,
  MusicPromptArtifactInput,
  MusicPromptVariant,
  PromptArtifactProvider,
  PromptArtifactV1,
  VideoPromptArtifactInput,
  VideoPromptVariant,
} from '@core/types';
import { INITIAL_STATE } from '@core/constants';
import type { PromptState, SunoPack, SunoSettings } from '@core/types';
import { resolvePromptGenerationProvider } from './promptGenerationService';
import { generateSunoPack } from './gemini/geminiAudioService';
import { generatePromptWithOllama } from './ollamaProvider';
import { getTargetProfile, transpilePrompt } from './modelTranspilerService';
import { validateStudioVideo, validateStudioMusic } from './studioValidationService';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { DEFAULT_PROMPT_MODEL } from './gemini/aiClient';
import { legacyCreativeDetails, legacySubjectDescription } from './studioLegacyAdapter';
import { assertProtectedPromptTextPreserved } from './promptTextSegments';
import {
  expandVideoSceneDetails,
  expandMusicDetails,
  optimizeFullVideoPack,
  generateVideoSceneAndPack,
  type VideoPackOptimizationResult,
} from './geminiSceneExpansionService';

export {
  expandVideoSceneDetails,
  expandMusicDetails,
  optimizeFullVideoPack,
  generateVideoSceneAndPack,
};

import {
  isLyricSectionLocked,
  LyricSectionError,
  parseLyricSections,
  replaceLyricSectionContent,
  resolveLyricSection,
  transformLyricSections,
} from './lyricSectionService';

const trim = (value: string | undefined): string => value?.trim() ?? '';

const optionalTrim = (value: string | undefined): string | undefined => {
  const normalized = trim(value);
  return normalized || undefined;
};

const optionalSourceText = (value: string | undefined): string | undefined =>
  value?.trim() ? value : undefined;

/** Preserve authored text; formatting belongs to the target compiler. */
export const normalizeVideoPromptInput = (
  input: VideoPromptArtifactInput,
): VideoPromptArtifactInput => ({
  idea: input.idea,
  mode: input.mode,
  target: input.target,
  profileId: input.profileId,
  creativeDetails: input.creativeDetails ? structuredClone(input.creativeDetails) : undefined,
  aspectRatio: input.aspectRatio,
  durationSeconds: input.durationSeconds,
  subject: optionalSourceText(input.subject),
  action: optionalSourceText(input.action),
  environment: optionalSourceText(input.environment),
  camera: optionalSourceText(input.camera),
  spatialCamera: input.spatialCamera,
  lighting: optionalSourceText(input.lighting),
  style: optionalSourceText(input.style),
  audio: optionalSourceText(input.audio),
  dialogue: optionalSourceText(input.dialogue),
  negativePrompt: optionalSourceText(input.negativePrompt),
  startFrame: optionalSourceText(input.startFrame),
  endFrame: optionalSourceText(input.endFrame),
  previousClip: optionalSourceText(input.previousClip),
  referenceRoles: optionalSourceText(input.referenceRoles),
  firstFrameAssetId: optionalSourceText(input.firstFrameAssetId),
  lastFrameAssetId: optionalSourceText(input.lastFrameAssetId),
  referenceAssetIds: input.referenceAssetIds ? [...input.referenceAssetIds] : undefined,
  extensionSourceTakeId: optionalSourceText(input.extensionSourceTakeId),
  extensionArtifact: input.extensionArtifact ? structuredClone(input.extensionArtifact) : undefined,
});

/** Normalize Suno-compatible input while retaining manual handoff notes. */
export const normalizeMusicPromptInput = (
  input: MusicPromptArtifactInput,
): MusicPromptArtifactInput => ({
  topic: trim(input.topic),
  language: trim(input.language) || 'English',
  genre: optionalTrim(input.genre),
  mood: optionalTrim(input.mood),
  voice: optionalTrim(input.voice) ?? 'Any',
  tempo: optionalTrim(input.tempo) ?? 'Any',
  instruments: optionalTrim(input.instruments),
  structure: input.structure ?? 'Auto',
  lyrics: optionalTrim(input.lyrics),
  instrumental: Boolean(input.instrumental),
  styleInfluence: input.styleInfluence ?? null,
  targetProfile: input.targetProfile ?? 'suno-v6',
  key: optionalTrim(input.key),
  timeSignature: optionalTrim(input.timeSignature),
  energyCurve: optionalTrim(input.energyCurve),
  vocalRange: optionalTrim(input.vocalRange),
  voiceNotes: optionalTrim(input.voiceNotes),
  customModelNotes: optionalTrim(input.customModelNotes),
  personaNotes: optionalTrim(input.personaNotes),
  tasteGuidance: optionalTrim(input.tasteGuidance),
  mixNotes: optionalTrim(input.mixNotes),
  rightsChecklist: {
    ownsOrLicensedLyrics: Boolean(input.rightsChecklist?.ownsOrLicensedLyrics),
    hasVoiceConsent: Boolean(input.rightsChecklist?.hasVoiceConsent),
    hasTrainingReferenceRights: Boolean(input.rightsChecklist?.hasTrainingReferenceRights),
    avoidsArtistImitation: input.rightsChecklist?.avoidsArtistImitation ?? true,
  },
});

/** Compatibility adapter for compact history entries used by v5-v10. */
export const adaptVideoHistoryEntry = (entry: HistoryEntry): VideoPromptArtifactInput => {
  const params = entry.params;
  return normalizeVideoPromptInput({
    idea: trim(params.idea || entry.prompt),
    mode: 'text-to-video',
    target: params.targetModel === 'veo-api' ? 'veo-api' : 'flow-veo',
    aspectRatio: params.aspectRatio === '9:16' ? '9:16' : '16:9',
    durationSeconds: 8,
    subject: optionalTrim(legacySubjectDescription(params)),
    action: [params.characterActions, params.characterObjectInteraction]
      .map(trim)
      .filter(Boolean)
      .join('. '),
    environment: optionalTrim(params.environment),
    camera: optionalTrim(params.cameraMovement),
    spatialCamera: params.spatialCamera,
    lighting: optionalTrim(params.lightingStyle),
    style: optionalTrim(params.customArtStyle || params.artStyle),
    audio: optionalTrim(params.ambientSound),
    dialogue: optionalTrim(params.voiceOver),
    negativePrompt: optionalTrim(params.negativePrompt),
    creativeDetails: legacyCreativeDetails(params),
  });
};

/** Compatibility adapter for the legacy SunoPack returned by the old modal. */
export const adaptSunoPackToMusicInput = (
  pack: SunoPack,
  overrides: Partial<MusicPromptArtifactInput> = {},
): MusicPromptArtifactInput =>
  normalizeMusicPromptInput({
    topic: overrides.topic ?? pack.title,
    language: overrides.language ?? 'English',
    genre: overrides.genre,
    mood: overrides.mood,
    voice: overrides.voice,
    tempo: overrides.tempo,
    instruments: overrides.instruments,
    structure: overrides.structure,
    lyrics: overrides.lyrics ?? pack.lyrics,
    instrumental: overrides.instrumental,
    voiceNotes: overrides.voiceNotes,
    customModelNotes: overrides.customModelNotes,
    targetProfile: overrides.targetProfile,
    styleInfluence: overrides.styleInfluence,
    key: overrides.key,
    timeSignature: overrides.timeSignature,
    energyCurve: overrides.energyCurve,
    vocalRange: overrides.vocalRange,
    personaNotes: overrides.personaNotes,
    tasteGuidance: overrides.tasteGuidance,
    mixNotes: overrides.mixNotes,
    rightsChecklist: overrides.rightsChecklist,
  });

export const compileVideoHistoryArtifact = (entry: HistoryEntry): PromptArtifactV1 => {
  const input = adaptVideoHistoryEntry(entry);
  // History is an existing saved result, including targets that can no longer generate.
  // Reopening it must not rewrite authored output through a newer target compiler.
  const prompt = entry.prompt;
  const negativePrompt = input.negativePrompt ?? '';
  const settingsChecklist = [
    `Archived target: ${getTargetProfile(input.target, input.profileId).displayName}`,
  ];
  const copySettingsChecklist = settingsChecklist.join('\n');
  const variant = (label: VideoPromptVariant['label']): VideoPromptVariant => ({
    label,
    title: 'Saved history result',
    prompt,
    negativePrompt,
    settingsChecklist,
    copyPrompt: prompt,
    copyNegativePrompt: negativePrompt,
    copySettingsChecklist,
    copyAll: composeVideoCopyAll(prompt, negativePrompt, copySettingsChecklist),
  });
  const primary = variant('Primary');
  const alternatives: [VideoPromptVariant, VideoPromptVariant] = [
    variant('Cinematic'),
    variant('Control-focused'),
  ];
  return {
    schemaVersion: 1,
    kind: 'video',
    target: input.target,
    input,
    primary,
    alternatives,
    validation: videoValidation(input, [primary, ...alternatives]),
    ...createProvenance('video', input, 'local', 'compiler'),
  };
};

export const compileSunoPackArtifact = (
  pack: SunoPack,
  overrides?: Partial<MusicPromptArtifactInput>,
): PromptArtifactV1 => compileMusicPromptArtifact(adaptSunoPackToMusicInput(pack, overrides));

const slugHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const artifactId = (kind: 'video' | 'music', inputHash: string): string =>
  `prompt-${kind}-${inputHash}`;

export interface PromptArtifactOptimizer {
  optimizeVideo(input: VideoPromptArtifactInput, signal?: AbortSignal): Promise<unknown>;
  optimizeMusic(input: MusicPromptArtifactInput, signal?: AbortSignal): Promise<unknown>;
}

const parseStructuredJson = <T>(value: unknown, label: string): T => {
  const parsed =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            throw new Error(`The ${label} returned malformed JSON.`);
          }
        })()
      : value;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`The ${label} returned a non-object response.`);
  }
  return parsed as T;
};

const defaultOptimizer: PromptArtifactOptimizer = {
  async optimizeVideo(input, signal) {
    return optimizeFullVideoPack(input, { signal });
  },
  async optimizeMusic(input, signal) {
    if (resolvePromptGenerationProvider() === 'ollama') {
      const settings = useSettingsStore.getState();
      return generatePromptWithOllama(
        [
          'You are a senior Suno Custom Mode producer and lyricist.',
          'Return ONLY valid JSON with non-empty string keys title, style, lyrics, explanation.',
          'Style should be concise, relevant comma-separated English tags.',
          'Lyrics must use explicit section tags and follow the requested language.',
          input.instrumental ? 'For instrumental mode return [Instrumental] only.' : '',
          `Input JSON: ${JSON.stringify(normalizeMusicPromptInput(input))}`,
        ]
          .filter(Boolean)
          .join('\n'),
        {
          baseUrl: settings.localLlmEndpoint,
          model: settings.localLlmModel,
          signal,
        },
      );
    }
    return generateSunoPack(toSunoSettings(input), signal);
  },
};

const composeVideoCopyAll = (prompt: string, negativePrompt: string, settings: string): string =>
  [prompt, negativePrompt ? `Negative prompt: ${negativePrompt}` : '', settings]
    .filter(Boolean)
    .join('\n\n');

const videoValidation = validateStudioVideo;

const FALLBACK_LYRICS: Record<
  string,
  { verse: string; chorus: string; bridge: string; outro: string }
> = {
  english: {
    verse: 'The quiet pulse becomes a light',
    chorus: 'We keep moving, we keep the fire',
    bridge: 'Let the silence make room to breathe',
    outro: 'There is more than we can see',
  },
  swedish: {
    verse: 'En stilla puls blir till ett ljus',
    chorus: 'Vi fortsätter, vi bär vår glöd',
    bridge: 'Låt tystnaden få plats att andas',
    outro: 'Det finns mer än det vi ser',
  },
  spanish: {
    verse: 'Un pulso tranquilo se vuelve luz',
    chorus: 'Seguimos andando, guardamos el fuego',
    bridge: 'Deja al silencio volver a respirar',
    outro: 'Hay mucho más de lo que vemos',
  },
  french: {
    verse: 'Une pulsation calme devient lumière',
    chorus: 'On avance encore, on garde le feu',
    bridge: 'Laisse le silence enfin respirer',
    outro: 'Il y a plus que ce que l’on voit',
  },
  german: {
    verse: 'Ein leiser Puls wird zu Licht',
    chorus: 'Wir gehen weiter, wir tragen das Feuer',
    bridge: 'Lass die Stille wieder atmen',
    outro: 'Es gibt mehr als wir sehen',
  },
  italian: {
    verse: 'Un battito quieto diventa luce',
    chorus: 'Andiamo avanti, portiamo il fuoco',
    bridge: 'Lascia respirare il silenzio',
    outro: 'C’è più di quello che vediamo',
  },
  portuguese: {
    verse: 'Um pulso calmo se torna luz',
    chorus: 'Seguimos em frente, guardamos o fogo',
    bridge: 'Deixa o silêncio respirar',
    outro: 'Há mais do que podemos ver',
  },
  japanese: {
    verse: '静かな鼓動が光になる',
    chorus: '歩き続ける、炎を抱いて',
    bridge: '静けさに息をする場所を',
    outro: '見えるものの先へ',
  },
  korean: {
    verse: '고요한 맥박이 빛이 되어',
    chorus: '계속 걸어가, 불꽃을 안고',
    bridge: '고요가 다시 숨 쉬게 해',
    outro: '보이는 것 너머에 더 있어',
  },
  arabic: {
    verse: 'نبض هادئ يصير نوراً',
    chorus: 'نمضي إلى الأمام ونحمل النار',
    bridge: 'دع الصمت يجد مكاناً ليتنفس',
    outro: 'هناك أكثر مما نراه',
  },
};

const normalizeLyrics = (
  lyrics: string,
  topic: string,
  language: string,
  instrumental: boolean,
): string => {
  if (instrumental) return '[Instrumental]';
  const source = trim(lyrics);
  if (!source) {
    const seed = topic || 'a new beginning';
    const localized = FALLBACK_LYRICS[language.trim().toLowerCase()] ?? FALLBACK_LYRICS.english;
    return `[Intro]\n${seed}\n\n[Verse]\n${seed}\n${localized.verse}\n\n[Chorus]\n${localized.chorus}\n${localized.verse}\n\n[Bridge]\n${localized.bridge}\n${localized.outro}\n\n[Outro]\n${seed}`;
  }
  if (/\[[^\]]+\]/.test(source)) return source;
  return `[Verse]\n${source}`;
};

const normalizeStyle = (input: MusicPromptArtifactInput, moodOverride?: string): string => {
  const tags = [
    moodOverride || trim(input.mood) || 'cinematic',
    trim(input.genre) || 'modern pop',
    trim(input.instruments) || 'warm synths, live drums',
    trim(input.voice) && input.voice !== 'Any'
      ? `${trim(input.voice)} vocals`
      : 'expressive vocals',
    trim(input.tempo) && input.tempo !== 'Any' ? trim(input.tempo) : 'mid-tempo',
    'clear mix',
    'dynamic arrangement',
  ].filter(Boolean);
  return tags.join(', ');
};

const musicNotes = (
  input: MusicPromptArtifactInput,
  variant: MusicPromptVariant['label'],
): string[] =>
  [
    `Lyrics language: ${input.language}`,
    `Structure: ${input.structure ?? 'Auto'}`,
    `Target profile: ${input.targetProfile ?? 'suno-v6'}`,
    input.styleInfluence === null || input.styleInfluence === undefined
      ? 'Style influence: Auto'
      : `Style influence: ${input.styleInfluence}%`,
    input.key ? `Key: ${input.key}` : '',
    input.timeSignature ? `Time signature: ${input.timeSignature}` : '',
    input.energyCurve ? `Energy curve: ${input.energyCurve}` : '',
    input.vocalRange ? `Vocal range: ${input.vocalRange}` : '',
    input.instrumental
      ? 'Instrumental mode: do not add sung lyrics.'
      : 'Use section tags and a memorable hook.',
    variant === 'Hook-forward'
      ? 'Bring the chorus hook in early and repeat it with variation.'
      : variant === 'Atmospheric'
        ? 'Leave space between sections and let the arrangement breathe.'
        : 'Keep the arrangement coherent from intro to outro.',
    trim(input.voiceNotes)
      ? `Voice notes: ${trim(input.voiceNotes)}`
      : 'Avoid naming real artists or cloning a real voice.',
    trim(input.customModelNotes) ? `Custom model notes: ${trim(input.customModelNotes)}` : '',
    trim(input.personaNotes) ? `Persona notes: ${trim(input.personaNotes)}` : '',
    trim(input.tasteGuidance) ? `Taste guidance: ${trim(input.tasteGuidance)}` : '',
    trim(input.mixNotes) ? `Mix notes: ${trim(input.mixNotes)}` : '',
    input.rightsChecklist?.ownsOrLicensedLyrics
      ? 'Rights check: lyrics ownership/licence confirmed.'
      : 'Rights check: confirm lyrics are original or licensed before publishing.',
    input.rightsChecklist?.hasVoiceConsent
      ? 'Rights check: voice consent confirmed.'
      : 'Rights check: confirm consent for any voice reference.',
    input.rightsChecklist?.hasTrainingReferenceRights
      ? 'Rights check: custom-model reference rights confirmed.'
      : 'Rights check: confirm rights for custom-model references.',
    input.rightsChecklist?.avoidsArtistImitation !== false
      ? 'Rights check: avoid real-artist imitation.'
      : 'Rights warning: remove real-artist imitation before handoff.',
  ].filter(Boolean);

const composeMusicCopyAll = (variant: {
  title: string;
  styleOfMusic: string;
  lyrics: string;
  productionNotes: string[];
}): string =>
  `Title: ${variant.title}\n\nStyle of Music:\n${variant.styleOfMusic}\n\nLyrics:\n${variant.lyrics}\n\nProduction notes:\n${variant.productionNotes.join('\n')}`;

const createMusicVariant = (
  input: MusicPromptArtifactInput,
  label: MusicPromptVariant['label'],
): MusicPromptVariant => {
  const title =
    label === 'Primary'
      ? trim(input.topic) || 'Untitled song'
      : label === 'Hook-forward'
        ? `${trim(input.topic) || 'Song'} — hook-forward`
        : `${trim(input.topic) || 'Song'} — atmospheric`;
  const styleOfMusic = normalizeStyle(
    input,
    label === 'Atmospheric' ? `${trim(input.mood) || 'cinematic'} atmospheric` : undefined,
  );
  const lyrics = normalizeLyrics(
    input.lyrics ?? '',
    input.topic,
    input.language,
    Boolean(input.instrumental),
  );
  const productionNotes = musicNotes(input, label);
  return {
    label,
    title,
    styleOfMusic,
    lyrics,
    productionNotes,
    copyStyle: styleOfMusic,
    copyLyrics: lyrics,
    copyAll: composeMusicCopyAll({ title, styleOfMusic, lyrics, productionNotes }),
  };
};

const createProvenance = (
  kind: 'video' | 'music',
  input: VideoPromptArtifactInput | MusicPromptArtifactInput,
  provider: PromptArtifactProvider,
  source: 'compiler' | 'optimizer',
): { id: string; provenance: PromptArtifactV1['provenance']; createdAt: string } => {
  const serialized = JSON.stringify(input);
  const inputHash = slugHash(serialized);
  const createdAt = new Date().toISOString();
  return {
    id: artifactId(kind, inputHash),
    createdAt,
    provenance: { provider, source, generatedAt: createdAt, inputHash },
  };
};

export const validatePromptArtifact = (artifact: PromptArtifactV1): string[] => {
  const errors: string[] = [];
  if (artifact.schemaVersion !== 1) errors.push('Unsupported prompt artifact schema.');
  if (!artifact.primary) errors.push('Primary variant is missing.');
  if (!Array.isArray(artifact.alternatives) || artifact.alternatives.length !== 2) {
    errors.push('Prompt artifacts must contain exactly two alternatives.');
  }
  if (artifact.kind === 'video') {
    const variants = [
      artifact.primary,
      ...(Array.isArray(artifact.alternatives) ? artifact.alternatives : []),
    ].filter(
      (variant): variant is VideoPromptVariant => Boolean(variant) && typeof variant === 'object',
    );
    if (variants.some((variant) => typeof variant.prompt !== 'string' || !trim(variant.prompt)))
      errors.push('Every video variant needs prompt text.');
    if (variants.some((variant) => typeof variant.negativePrompt !== 'string'))
      errors.push('Every video variant needs a negative prompt string, which may be empty.');
    if (
      variants.some(
        (variant) =>
          typeof variant.prompt !== 'string' ||
          typeof variant.negativePrompt !== 'string' ||
          !Array.isArray(variant.settingsChecklist) ||
          typeof variant.copyPrompt !== 'string' ||
          typeof variant.copyNegativePrompt !== 'string' ||
          typeof variant.copySettingsChecklist !== 'string' ||
          typeof variant.copyAll !== 'string' ||
          variant.copyPrompt !== variant.prompt ||
          variant.copyNegativePrompt !== variant.negativePrompt ||
          variant.copySettingsChecklist !== variant.settingsChecklist.join('\n') ||
          variant.copyAll !==
            composeVideoCopyAll(
              variant.prompt,
              variant.negativePrompt,
              variant.copySettingsChecklist,
            ),
      )
    )
      errors.push('Video copy fields must match the visible variant text.');
  } else {
    const variants = [
      artifact.primary,
      ...(Array.isArray(artifact.alternatives) ? artifact.alternatives : []),
    ].filter(
      (variant): variant is MusicPromptVariant => Boolean(variant) && typeof variant === 'object',
    );
    if (
      variants.some(
        (variant) =>
          typeof variant.styleOfMusic !== 'string' ||
          typeof variant.lyrics !== 'string' ||
          !trim(variant.styleOfMusic) ||
          !trim(variant.lyrics),
      )
    )
      errors.push('Every music variant needs Style of Music and Lyrics.');
    if (
      variants.some(
        (variant) =>
          typeof variant.lyrics !== 'string' ||
          (!/\[[^\]]+\]/.test(variant.lyrics) &&
            !/^\[Instrumental\]$/i.test(variant.lyrics.trim())),
      )
    ) {
      errors.push('Lyrics must use Suno section tags or an explicit [Instrumental] marker.');
    }
    if (
      variants.some(
        (variant) =>
          typeof variant.styleOfMusic !== 'string' ||
          typeof variant.lyrics !== 'string' ||
          !Array.isArray(variant.productionNotes) ||
          typeof variant.copyStyle !== 'string' ||
          typeof variant.copyLyrics !== 'string' ||
          typeof variant.copyAll !== 'string' ||
          variant.copyStyle !== variant.styleOfMusic ||
          variant.copyLyrics !== variant.lyrics ||
          variant.copyAll !== composeMusicCopyAll(variant),
      )
    )
      errors.push('Music copy fields must match the visible variant text.');
  }
  return errors;
};

export const compileVideoPromptArtifact = (
  input: VideoPromptArtifactInput,
  provider: PromptArtifactProvider = 'local',
  source: 'compiler' | 'optimizer' = 'compiler',
): PromptArtifactV1 => {
  const normalizedInput = normalizeVideoPromptInput(input);
  const variants = transpilePrompt(normalizedInput, normalizedInput.target).variants;
  const primary = variants[0];
  const alternatives: [VideoPromptVariant, VideoPromptVariant] = [variants[1], variants[2]];
  const { id, provenance, createdAt } = createProvenance(
    'video',
    normalizedInput,
    provider,
    source,
  );
  return {
    schemaVersion: 1,
    id,
    kind: 'video',
    target: input.target,
    input: normalizedInput,
    primary,
    alternatives,
    validation: videoValidation(normalizedInput, [primary, ...alternatives]),
    provenance,
    createdAt,
  };
};

export const compileMusicPromptArtifact = (
  input: MusicPromptArtifactInput,
  provider: PromptArtifactProvider = 'local',
  source: 'compiler' | 'optimizer' = 'compiler',
): PromptArtifactV1 => {
  const normalizedInput = normalizeMusicPromptInput(input);
  const primary = createMusicVariant(normalizedInput, 'Primary');
  const alternatives = [
    createMusicVariant(normalizedInput, 'Hook-forward'),
    createMusicVariant(normalizedInput, 'Atmospheric'),
  ] as [MusicPromptVariant, MusicPromptVariant];
  const { id, provenance, createdAt } = createProvenance(
    'music',
    normalizedInput,
    provider,
    source,
  );
  const validation = validateStudioMusic(normalizedInput, [primary, ...alternatives]);
  return {
    schemaVersion: 1,
    id,
    kind: 'music',
    target: 'suno',
    input: normalizedInput,
    primary,
    alternatives,
    validation,
    provenance,
    createdAt,
  };
};

export const updateLyricsSection = (
  lyrics: string,
  section: string,
  replacement: string,
  lockedSections: string[] = [],
): string => {
  const selected = resolveLyricSection(lyrics, section);
  if (selected) {
    if (isLyricSectionLocked(selected, lockedSections)) return lyrics;
    return (
      lyrics.slice(0, selected.start) +
      replaceLyricSectionContent(selected, replacement) +
      lyrics.slice(selected.end)
    );
  }
  if (/#[0-9]+$/.test(section)) throw new LyricSectionError('missing');
  const tag = section.startsWith('[') ? section : `[${section}]`;
  if (lockedSections.some((lock) => lock.toLowerCase() === tag.toLowerCase())) return lyrics;
  return `${trim(lyrics)}\n\n${tag}\n${trim(replacement)}`.trim();
};

export const getLyricSections = (lyrics: string): string[] => {
  const sections = parseLyricSections(lyrics);
  return sections.map((section) =>
    sections.filter((item) => item.name === section.name).length > 1 ? section.id : section.tag,
  );
};

/** Shorten unlocked sections while keeping their tags and locked text byte-identical. */
export const shortenLyrics = (lyrics: string, lockedSections: string[] = []): string => {
  if (!parseLyricSections(lyrics).length) return lyrics;
  return transformLyricSections(lyrics, (section) => {
    if (isLyricSectionLocked(section, lockedSections)) return section.raw;
    const lines = section.content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const shortened = lines.slice(0, Math.max(1, Math.ceil(lines.length / 2))).join('\n');
    return replaceLyricSectionContent(section, shortened);
  });
};

/** Regenerate unlocked lyric sections locally; locked sections are preserved exactly. */
export const regenerateLyrics = (
  lyrics: string,
  topic: string,
  language: string,
  lockedSections: string[] = [],
): string => {
  if (!parseLyricSections(lyrics).length) return normalizeLyrics('', topic, language, false);
  const localized = FALLBACK_LYRICS[language.trim().toLowerCase()] ?? FALLBACK_LYRICS.english;
  const seed = trim(topic) || 'a new beginning';
  return transformLyricSections(lyrics, (section) => {
    if (isLyricSectionLocked(section, lockedSections)) return section.raw;
    const replacement =
      section.name === 'chorus' || section.name === 'refrain'
        ? `${localized.chorus}\n${seed}`
        : section.name === 'bridge'
          ? `${localized.bridge}\n${localized.outro}`
          : section.name === 'outro'
            ? localized.outro
            : section.name === 'intro'
              ? seed
              : `${seed}\n${localized.verse}`;
    return replaceLyricSectionContent(section, replacement);
  });
};

export const toVideoPromptState = (input: VideoPromptArtifactInput): PromptState => ({
  ...INITIAL_STATE,
  ...input.creativeDetails,
  model: DEFAULT_PROMPT_MODEL,
  idea: input.idea,
  environment: input.environment ?? '',
  characterArchetype: input.subject ?? '',
  characterActions: input.action ?? '',
  cameraMovement: input.camera ?? '',
  lightingStyle: input.lighting ?? '',
  artStyle: input.style ?? '',
  voiceOver: input.dialogue ?? '',
  ambientSound: input.audio ?? input.creativeDetails?.ambientSound ?? '',
  negativePrompt: input.negativePrompt ?? '',
  aspectRatio: input.aspectRatio,
  targetModel: input.target === 'veo-api' ? 'veo-api' : 'flow-veo',
  flowVeoOutputMode: input.mode === 'text-to-video' ? 'single-prompt' : 'flow-scene-pack',
  optimizeFor8Seconds: input.durationSeconds === 8,
  resolution: '720p',
});

/** Map a Prompt Studio video brief into the existing production-run contract. */
export const promptArtifactToProductionState = (input: VideoPromptArtifactInput): PromptState => {
  if (input.target !== 'veo-api') throw new Error('This model uses a manual copy handoff.');
  return toVideoPromptState(input);
};

const toSunoSettings = (input: MusicPromptArtifactInput): SunoSettings => ({
  topic: input.topic,
  genre: input.genre ?? '',
  mood: input.mood ?? '',
  voice: input.voice ?? 'Any',
  tempo: input.tempo ?? 'Any',
  structure: input.structure ?? 'Auto',
  language: input.language,
  instruments: input.instruments ?? '',
  isInstrumental: Boolean(input.instrumental),
  styleInfluence: input.styleInfluence ?? null,
  targetProfile: input.targetProfile ?? 'suno-v6',
  key: input.key,
  timeSignature: input.timeSignature,
  energyCurve: input.energyCurve,
  vocalRange: input.vocalRange,
  voiceNotes: input.voiceNotes,
  customModelNotes: input.customModelNotes,
  personaNotes: input.personaNotes,
  tasteGuidance: input.tasteGuidance,
  mixNotes: input.mixNotes,
  rightsChecklist: input.rightsChecklist,
});

const applySunoPack = (
  artifact: PromptArtifactV1,
  pack: SunoPack,
  provider: PromptArtifactProvider,
): PromptArtifactV1 => {
  if (artifact.kind !== 'music') return artifact;
  const primary = artifact.primary as MusicPromptVariant;
  const optimized: MusicPromptVariant = {
    ...primary,
    title: pack.title || primary.title,
    styleOfMusic: pack.style || primary.styleOfMusic,
    lyrics: pack.lyrics || primary.lyrics,
    productionNotes: [...primary.productionNotes, pack.explanation].filter(Boolean),
    copyStyle: pack.style || primary.styleOfMusic,
    copyLyrics: pack.lyrics || primary.lyrics,
    copyAll: '',
  };
  optimized.copyAll = composeMusicCopyAll(optimized);
  return {
    ...artifact,
    primary: optimized,
    provenance: {
      ...artifact.provenance,
      provider,
      source: 'optimizer',
      generatedAt: new Date().toISOString(),
    },
  };
};

/**
 * Provider-aware optimization. The deterministic compiler is always built
 * first; an optimizer may replace only the primary copy after the response
 * has passed the artifact shape checks. Alternatives remain local and fully
 * usable when an optimizer is unavailable.
 */
export const optimizeVideoPromptArtifact = async (
  input: VideoPromptArtifactInput,
  optimizer: PromptArtifactOptimizer = defaultOptimizer,
  signal?: AbortSignal,
): Promise<PromptArtifactV1> => {
  const provider = resolvePromptGenerationProvider();
  const local = compileVideoPromptArtifact(input);
  if (provider === 'gemini' || provider === 'ollama') {
    const rawResult = await optimizer.optimizeVideo(input, signal);
    const result = parseStructuredJson<{
      prompt?: unknown;
      primary?: unknown;
      cinematic?: unknown;
      controlFocused?: unknown;
      negativePrompt?: unknown;
    }>(rawResult, 'video optimizer');

    const primaryText =
      typeof result.primary === 'string'
        ? result.primary
        : typeof result.prompt === 'string'
          ? result.prompt
          : null;

    if (typeof primaryText !== 'string') {
      throw new Error('The video optimizer returned JSON without a prompt string.');
    }
    if (!trim(primaryText)) throw new Error('The video optimizer returned an empty prompt.');
    const primary = local.primary as VideoPromptVariant;
    assertProtectedPromptTextPreserved(
      primary.prompt,
      primaryText,
      getTargetProfile(input.target, input.profileId).audioPolicy === 'native'
        ? ((local.input as VideoPromptArtifactInput).dialogue ?? '')
        : '',
    );

    const hasPackVariants =
      typeof result.cinematic === 'string' &&
      trim(result.cinematic) &&
      typeof result.controlFocused === 'string' &&
      trim(result.controlFocused);

    const globalNegative =
      getTargetProfile(input.target, input.profileId).negativePolicy !== 'unsupported'
        ? typeof result.negativePrompt === 'string'
          ? trim(result.negativePrompt)
          : primary.negativePrompt
        : '';

    const alternatives = (
      hasPackVariants
        ? [
            (() => {
              const p = (result.cinematic as string).trim();
              assertProtectedPromptTextPreserved(
                primary.prompt,
                p,
                getTargetProfile(input.target, input.profileId).audioPolicy === 'native'
                  ? ((local.input as VideoPromptArtifactInput).dialogue ?? '')
                  : '',
              );
              const alt = local.alternatives[0] as VideoPromptVariant;
              return {
                ...alt,
                prompt: p,
                negativePrompt: globalNegative,
                copyPrompt: p,
                copyNegativePrompt: globalNegative,
                copyAll: composeVideoCopyAll(p, globalNegative, alt.copySettingsChecklist),
              };
            })(),
            (() => {
              const p = (result.controlFocused as string).trim();
              assertProtectedPromptTextPreserved(
                primary.prompt,
                p,
                getTargetProfile(input.target, input.profileId).audioPolicy === 'native'
                  ? ((local.input as VideoPromptArtifactInput).dialogue ?? '')
                  : '',
              );
              const alt = local.alternatives[1] as VideoPromptVariant;
              return {
                ...alt,
                prompt: p,
                negativePrompt: globalNegative,
                copyPrompt: p,
                copyNegativePrompt: globalNegative,
                copyAll: composeVideoCopyAll(p, globalNegative, alt.copySettingsChecklist),
              };
            })(),
          ]
        : local.alternatives
    ) as [VideoPromptVariant, VideoPromptVariant];

    const optimized: PromptArtifactV1 = {
      ...local,
      primary: (() => {
        const prompt = primaryText.trim();
        const copySettingsChecklist = primary.copySettingsChecklist;
        return {
          ...primary,
          prompt,
          label: 'Primary',
          negativePrompt: globalNegative,
          copyPrompt: prompt,
          copyNegativePrompt: globalNegative,
          copyAll: composeVideoCopyAll(prompt, globalNegative, copySettingsChecklist),
        };
      })(),
      alternatives,
      provenance: {
        ...local.provenance,
        provider,
        source: 'optimizer',
        generatedAt: new Date().toISOString(),
      },
    };
    optimized.validation = videoValidation(
      local.input as VideoPromptArtifactInput,
      [optimized.primary as VideoPromptVariant, ...optimized.alternatives] as VideoPromptVariant[],
    );
    const validationErrors = validatePromptArtifact(optimized);
    if (validationErrors.length) {
      throw new Error(
        `The video optimizer returned an invalid artifact: ${validationErrors.join(' ')}`,
      );
    }
    return revalidatePromptArtifact(optimized);
  }
  return local;
};

/** Build a generated pack through the existing artifact validation without another AI request. */
export const createGeneratedVideoArtifact = async (
  input: VideoPromptArtifactInput,
  pack: VideoPackOptimizationResult,
  modelId: string,
  recommendations: string[] = [],
): Promise<PromptArtifactV1> => {
  if (!Array.isArray(recommendations) || recommendations.some((value) => typeof value !== 'string'))
    throw new Error('AI recommendations must be an array of strings.');
  const artifact = await optimizeVideoPromptArtifact(input, {
    optimizeVideo: async () => pack,
    optimizeMusic: async () => {
      throw new Error('A video pack cannot generate music.');
    },
  });
  const suggestions = [
    ...new Set(recommendations.map((value) => value.trim()).filter(Boolean)),
  ].map((value) => `AI suggestion: ${value}`);
  const withSuggestions = (value: VideoPromptVariant): VideoPromptVariant => {
    const settingsChecklist = [...value.settingsChecklist, ...suggestions];
    const copySettingsChecklist = settingsChecklist.join('\n');
    return {
      ...value,
      settingsChecklist,
      copySettingsChecklist,
      copyAll: composeVideoCopyAll(value.prompt, value.negativePrompt, copySettingsChecklist),
    };
  };
  return revalidatePromptArtifact({
    ...artifact,
    input: structuredClone(input),
    primary: withSuggestions(artifact.primary as VideoPromptVariant),
    alternatives: artifact.alternatives.map((value) =>
      withSuggestions(value as VideoPromptVariant),
    ) as [VideoPromptVariant, VideoPromptVariant],
    provenance: { ...artifact.provenance, modelId },
  });
};

export const optimizeMusicPromptArtifact = async (
  input: MusicPromptArtifactInput,
  optimizer: PromptArtifactOptimizer = defaultOptimizer,
  signal?: AbortSignal,
): Promise<PromptArtifactV1> => {
  const local = compileMusicPromptArtifact(input);
  const provider = resolvePromptGenerationProvider();
  if (provider === 'ollama' || provider === 'gemini') {
    const pack = parseStructuredJson<{
      title?: unknown;
      style?: unknown;
      lyrics?: unknown;
      explanation?: unknown;
    }>(await optimizer.optimizeMusic(input, signal), 'music optimizer');
    if (
      typeof pack.style !== 'string' ||
      typeof pack.lyrics !== 'string' ||
      !pack.style.trim() ||
      !pack.lyrics.trim()
    ) {
      throw new Error('The music optimizer returned an incomplete Suno pack.');
    }
    const optimized = applySunoPack(
      local,
      {
        title: typeof pack.title === 'string' ? pack.title : '',
        style: pack.style,
        lyrics: pack.lyrics,
        explanation: typeof pack.explanation === 'string' ? pack.explanation : '',
      },
      provider,
    );
    const validationErrors = validatePromptArtifact(optimized);
    if (validationErrors.length) {
      throw new Error(
        `The music optimizer returned an invalid artifact: ${validationErrors.join(' ')}`,
      );
    }
    return revalidatePromptArtifact(optimized);
  }
  return local;
};

/** Recalculate guidance from the current text, including every edited alternative. */
export const revalidatePromptArtifact = (artifact: PromptArtifactV1): PromptArtifactV1 => {
  if (artifact.kind === 'video') {
    return {
      ...artifact,
      validation: validateStudioVideo(
        artifact.input as VideoPromptArtifactInput,
        [artifact.primary, ...artifact.alternatives] as VideoPromptVariant[],
      ),
    };
  }
  return {
    ...artifact,
    validation: validateStudioMusic(
      artifact.input as MusicPromptArtifactInput,
      [artifact.primary, ...artifact.alternatives] as MusicPromptVariant[],
    ),
  };
};
