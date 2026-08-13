import type {
  HistoryEntry,
  MusicPromptArtifactInput,
  MusicPromptVariant,
  PromptArtifactProvider,
  PromptArtifactV1,
  PromptValidationCheck,
  VideoPromptArtifactInput,
  VideoPromptVariant,
  VideoPromptMode,
} from '@core/types';
import { INITIAL_STATE } from '@core/constants';
import type { PromptState, SunoPack, SunoSettings } from '@core/types';
import {
  generatePromptWithCurrentProvider,
  resolvePromptGenerationProvider,
} from './promptGenerationService';
import { generateSunoPack } from './gemini/geminiAudioService';
import { generatePromptWithOllama } from './ollamaProvider';
import { useSettingsStore } from '@core/store/useSettingsStore';

const DEFAULT_NEGATIVE =
  'unintended text, subtitles, logos, watermarks, extra limbs, visual glitches';

const trim = (value: string | undefined): string => value?.trim() ?? '';

const optionalTrim = (value: string | undefined): string | undefined => {
  const normalized = trim(value);
  return normalized || undefined;
};

/** Normalize legacy/editor input once so every artifact is reproducible. */
export const normalizeVideoPromptInput = (
  input: VideoPromptArtifactInput,
): VideoPromptArtifactInput => ({
  idea: trim(input.idea),
  mode: input.mode,
  target: input.target,
  aspectRatio: input.aspectRatio,
  durationSeconds: input.durationSeconds,
  subject: optionalTrim(input.subject),
  action: optionalTrim(input.action),
  environment: optionalTrim(input.environment),
  camera: optionalTrim(input.camera),
  lighting: optionalTrim(input.lighting),
  style: optionalTrim(input.style),
  audio: optionalTrim(input.audio),
  dialogue: optionalTrim(input.dialogue),
  negativePrompt: optionalTrim(input.negativePrompt),
  startFrame: optionalTrim(input.startFrame),
  endFrame: optionalTrim(input.endFrame),
  previousClip: optionalTrim(input.previousClip),
  referenceRoles: optionalTrim(input.referenceRoles),
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
  targetProfile: input.targetProfile ?? 'suno-v5.5',
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

/** Compatibility adapter for the compact history entries used by v5-v10. */
export const adaptVideoHistoryEntry = (entry: HistoryEntry): VideoPromptArtifactInput => {
  const params = entry.params;
  return normalizeVideoPromptInput({
    idea: params.idea || entry.prompt,
    mode: params.flowVeoOutputMode === 'single-prompt' ? 'text-to-video' : 'text-to-video',
    target: params.targetModel === 'veo-api' ? 'veo-api' : 'flow-veo',
    aspectRatio: params.aspectRatio === '9:16' ? '9:16' : '16:9',
    durationSeconds: 8,
    subject: params.characterArchetype || params.characterObjectInteraction,
    action: params.characterActions,
    environment: params.environment,
    camera: params.cameraMovement,
    lighting: params.lightingStyle,
    style: params.artStyle || params.customArtStyle,
    audio: [params.voiceOver, params.ambientSound].filter(Boolean).join(', '),
    dialogue: params.voiceOver,
    negativePrompt: params.negativePrompt,
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

export const compileVideoHistoryArtifact = (entry: HistoryEntry): PromptArtifactV1 =>
  compileVideoPromptArtifact(adaptVideoHistoryEntry(entry));

export const compileSunoPackArtifact = (
  pack: SunoPack,
  overrides?: Partial<MusicPromptArtifactInput>,
): PromptArtifactV1 => compileMusicPromptArtifact(adaptSunoPackToMusicInput(pack, overrides));

const sentence = (value: string | undefined): string => {
  const normalized = trim(value);
  if (!normalized) return '';
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
};

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
  optimizeVideo(input: VideoPromptArtifactInput): Promise<unknown>;
  optimizeMusic(input: MusicPromptArtifactInput): Promise<unknown>;
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
  async optimizeVideo(input) {
    return generatePromptWithCurrentProvider(toVideoPromptState(input));
  },
  async optimizeMusic(input) {
    if (resolvePromptGenerationProvider() === 'ollama') {
      const settings = useSettingsStore.getState();
      return generatePromptWithOllama(
        [
          'You are a senior Suno Custom Mode producer and lyricist.',
          'Return ONLY valid JSON with non-empty string keys title, style, lyrics, explanation.',
          'Style must be concise comma-separated English tags under 200 characters.',
          'Lyrics must use explicit section tags and follow the requested language.',
          input.instrumental ? 'For instrumental mode return [Instrumental] only.' : '',
          `Input JSON: ${JSON.stringify(normalizeMusicPromptInput(input))}`,
        ]
          .filter(Boolean)
          .join('\n'),
        {
          baseUrl: settings.localLlmEndpoint,
          model: settings.localLlmModel,
        },
      );
    }
    return generateSunoPack(toSunoSettings(input));
  },
};

const withoutQuotes = (value: string): string => value.replace(/[“”"]+/g, '').trim();

const normalizeMode = (mode: VideoPromptMode): VideoPromptMode => mode;

const formatModeInstruction = (input: VideoPromptArtifactInput): string => {
  switch (normalizeMode(input.mode)) {
    case 'image-to-video':
      return 'Use the supplied image as the source. Describe motion only; do not re-describe the subject, scene, or lighting already visible in the image.';
    case 'first-last-frames':
      return `Create a controlled transition from the start frame (${trim(input.startFrame) || 'provided start frame'}) to the end frame (${trim(input.endFrame) || 'provided end frame'}).`;
    case 'ingredients':
      return `Use the supplied ingredients as named references. Reference roles: ${trim(input.referenceRoles) || 'keep each supplied reference distinct and consistent'}.`;
    case 'extend':
      return `Continue seamlessly from the previous clip (${trim(input.previousClip) || 'the supplied previous clip'}), preserving subject identity, camera direction, lighting, and motion continuity.`;
    case 'text-to-video':
    default:
      return 'Keep this as one focused, continuous scene with one primary action.';
  }
};

const buildVideoPrompt = (
  input: VideoPromptArtifactInput,
  variant: VideoPromptVariant['label'],
): string => {
  const subject = sentence(input.subject || input.idea);
  const action = sentence(input.action);
  const environment = sentence(input.environment);
  const camera = sentence(input.camera);
  const lighting = sentence(input.lighting);
  const style = sentence(input.style);
  const audio = sentence(input.audio);
  const dialogue = withoutQuotes(trim(input.dialogue));
  const instruction = formatModeInstruction(input);

  if (input.mode === 'image-to-video') {
    const motion = [
      action ? `Subject motion: ${action}` : '',
      camera ? `Camera motion: ${camera}` : '',
      environment ? `Environment motion: ${environment}` : '',
      audio ? `Audio: ${audio}` : '',
    ]
      .filter(Boolean)
      .join(' ');
    return [
      instruction,
      motion || 'Animate the subject with subtle, natural movement and a steady camera.',
      variant === 'Cinematic'
        ? 'Use a restrained cinematic pace, natural motion blur, and a deliberate visual rhythm.'
        : variant === 'Control-focused'
          ? `Keep the motion physically coherent for ${input.durationSeconds} seconds in ${input.aspectRatio}.`
          : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  const parts = [instruction, subject, action, environment, camera, lighting, style];
  if (dialogue) parts.push(`Dialogue: the speaker says: ${dialogue}.`);
  if (audio) parts.push(`Audio: ${audio}`);
  if (variant === 'Cinematic') {
    parts.push('Use purposeful composition, tactile detail, and a natural cinematic progression.');
  }
  if (variant === 'Control-focused') {
    parts.push(
      `Keep the clip to one readable action, ${input.durationSeconds} seconds, ${input.aspectRatio}, with no unrequested cuts.`,
    );
  }
  return parts.filter(Boolean).join(' ');
};

const buildVideoChecklist = (input: VideoPromptArtifactInput): string[] => [
  `Target: ${input.target === 'flow-veo' ? 'Google Flow / Veo' : 'Veo API'}`,
  `Mode: ${input.mode}`,
  `Aspect ratio: ${input.aspectRatio}`,
  `Duration: ${input.durationSeconds}s`,
  input.mode === 'image-to-video'
    ? 'Prompt motion only; rely on the source image for identity and look.'
    : 'Keep one primary scene and action.',
  input.mode === 'ingredients'
    ? `Reference roles: ${trim(input.referenceRoles) || 'assign each ingredient a clear role'}`
    : 'Use references only when they add a stable visual anchor.',
];

const composeVideoCopyAll = (prompt: string, negativePrompt: string, settings: string): string =>
  `${prompt}\n\nNegative prompt: ${negativePrompt}\n\n${settings}`;

const videoValidation = (
  input: VideoPromptArtifactInput,
  variants: VideoPromptVariant[],
): PromptValidationCheck[] => {
  const prompt = variants[0]?.prompt ?? '';
  const hasIdea = Boolean(trim(input.idea));
  const hasSingleSceneSignal = !/\bthen\b|\bafter that\b|\bfinally\b/i.test(prompt);
  const hasDialogueFormat = !/[“”"]/.test(prompt);
  const hasModeContext =
    input.mode !== 'first-last-frames' || Boolean(trim(input.startFrame) && trim(input.endFrame));
  const hasReferences = input.mode !== 'ingredients' || Boolean(trim(input.referenceRoles));
  const hasAudioDirection = Boolean(trim(input.audio) || trim(input.dialogue));
  const isMotionOnly =
    input.mode !== 'image-to-video' ||
    /\b(subject|camera|environment) motion:/i.test(prompt) ||
    /motion only/i.test(prompt);

  return [
    {
      id: 'clarity',
      label: 'Clear idea',
      status: hasIdea ? 'pass' : 'blocked',
      detail: hasIdea
        ? 'The prompt has a concrete creative starting point.'
        : 'Add a scene or outcome before optimizing.',
    },
    {
      id: 'single-scene',
      label: 'One scene per clip',
      status: hasSingleSceneSignal ? 'pass' : 'warning',
      detail: hasSingleSceneSignal
        ? 'The output stays focused on one clip-sized moment.'
        : 'Split chained events into separate clips for more reliable results.',
    },
    {
      id: 'dialogue',
      label: 'Dialogue format',
      status: hasDialogueFormat ? 'pass' : 'blocked',
      detail: hasDialogueFormat
        ? 'Dialogue uses colon-based direction instead of quotation marks.'
        : 'Remove quotation marks so the model is less likely to render text on screen.',
    },
    {
      id: 'mode',
      label: 'Mode recipe',
      status: hasModeContext ? 'pass' : 'warning',
      detail: hasModeContext
        ? 'The mode has the context needed for a useful handoff.'
        : 'Add both a start and end frame to describe the intended transition.',
    },
    {
      id: 'references',
      label: 'Reference roles',
      status: hasReferences ? 'pass' : 'warning',
      detail: hasReferences
        ? 'Reference usage is explicit.'
        : 'Name the role of each ingredient so references do not conflict.',
    },
    {
      id: 'target-compatibility',
      label: 'Target compatibility',
      status: input.target === 'flow-veo' || input.target === 'veo-api' ? 'pass' : 'warning',
      detail:
        input.target === 'flow-veo'
          ? 'The handoff uses Flow/Veo-compatible scene language.'
          : 'The handoff is labeled for the Veo API; confirm model-specific limits before running.',
    },
    {
      id: 'audio',
      label: 'Audio / dialogue',
      status: hasAudioDirection ? 'pass' : 'warning',
      detail: hasAudioDirection
        ? 'Audio or dialogue is separated from visual direction.'
        : 'Add audio or dialogue when the soundscape matters to the shot.',
    },
    {
      id: 'motion-recipe',
      label: 'Motion-only recipe',
      status: isMotionOnly ? 'pass' : 'blocked',
      detail: isMotionOnly
        ? 'The selected recipe is explicit about motion.'
        : 'Image-to-video must describe camera, subject, or environment motion only.',
    },
    {
      id: 'length',
      label: 'Length compatibility',
      status: input.durationSeconds === 10 && input.target === 'veo-api' ? 'warning' : 'pass',
      detail:
        input.durationSeconds === 10 && input.target === 'veo-api'
          ? 'Confirm that the selected Veo API model supports a 10-second clip.'
          : `${input.durationSeconds}s is represented explicitly in the handoff checklist.`,
    },
  ];
};

const createVideoVariant = (
  input: VideoPromptArtifactInput,
  label: VideoPromptVariant['label'],
): VideoPromptVariant => {
  const prompt = buildVideoPrompt(input, label);
  const negativePrompt = [trim(input.negativePrompt), DEFAULT_NEGATIVE].filter(Boolean).join(', ');
  const settingsChecklist = buildVideoChecklist(input);
  const copySettingsChecklist = settingsChecklist.join('\n');
  return {
    label,
    title:
      label === 'Primary'
        ? 'Recommended handoff'
        : label === 'Cinematic'
          ? 'Cinematic texture'
          : 'Control-focused',
    prompt,
    negativePrompt,
    settingsChecklist,
    copyPrompt: prompt,
    copyNegativePrompt: negativePrompt,
    copySettingsChecklist,
    copyAll: composeVideoCopyAll(prompt, negativePrompt, copySettingsChecklist),
  };
};

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
  return tags.join(', ').slice(0, 200);
};

const musicNotes = (
  input: MusicPromptArtifactInput,
  variant: MusicPromptVariant['label'],
): string[] =>
  [
    `Lyrics language: ${input.language}`,
    `Structure: ${input.structure ?? 'Auto'}`,
    `Target profile: ${input.targetProfile ?? 'suno-v5.5'}`,
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
    if (
      variants.some(
        (variant) => typeof variant.negativePrompt !== 'string' || !trim(variant.negativePrompt),
      )
    )
      errors.push('Every video variant needs a negative prompt.');
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
    if (
      variants.some((variant) => typeof variant.prompt === 'string' && /[“”"]/.test(variant.prompt))
    ) {
      errors.push('Video dialogue must use colon-based direction without quotation marks.');
    }
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
        (variant) => typeof variant.styleOfMusic === 'string' && variant.styleOfMusic.length > 200,
      )
    ) {
      errors.push('Style of Music must stay at or below 200 characters.');
    }
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
  const primary = createVideoVariant(normalizedInput, 'Primary');
  const alternatives = [
    createVideoVariant(normalizedInput, 'Cinematic'),
    createVideoVariant(normalizedInput, 'Control-focused'),
  ] as [VideoPromptVariant, VideoPromptVariant];
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
  const hasTopic = Boolean(trim(normalizedInput.topic));
  const validation: PromptValidationCheck[] = [
    {
      id: 'topic',
      label: 'Song idea',
      status: hasTopic ? 'pass' : 'blocked',
      detail: hasTopic
        ? 'The song has a concrete emotional or narrative seed.'
        : 'Add a song idea before generating lyrics.',
    },
    {
      id: 'sections',
      label: 'Section tags',
      status:
        normalizedInput.instrumental || /\[[^\]]+\]/.test(primary.lyrics) ? 'pass' : 'warning',
      detail: normalizedInput.instrumental
        ? 'Instrumental output is explicitly marked.'
        : 'Suno receives explicit section tags for arrangement control.',
    },
    {
      id: 'language',
      label: 'Lyrics language',
      status: trim(normalizedInput.language) ? 'pass' : 'warning',
      detail: trim(normalizedInput.language)
        ? `Lyrics follow ${normalizedInput.language}.`
        : 'Choose the language for the lyrics.',
    },
    {
      id: 'style-separation',
      label: 'Style / Lyrics separation',
      status: primary.styleOfMusic.length <= 200 ? 'pass' : 'warning',
      detail: 'Style of Music stays concise and tag-oriented while lyrics carry narrative detail.',
    },
    {
      id: 'rights',
      label: 'Rights-safe handoff',
      status:
        normalizedInput.rightsChecklist?.avoidsArtistImitation === false
          ? 'blocked'
          : normalizedInput.instrumental || normalizedInput.rightsChecklist?.ownsOrLicensedLyrics
            ? 'pass'
            : 'warning',
      detail:
        normalizedInput.rightsChecklist?.avoidsArtistImitation === false
          ? 'Remove real-artist imitation before using this handoff.'
          : normalizedInput.instrumental || normalizedInput.rightsChecklist?.ownsOrLicensedLyrics
            ? 'Use original/licensed lyrics and descriptive terms instead of real artist imitation.'
            : 'Confirm that lyrics are original or licensed before publishing.',
    },
  ];
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
  const normalizedSection = section
    .replace(/^\[|\]$/g, '')
    .trim()
    .toLowerCase();
  if (
    lockedSections.some(
      (locked) =>
        locked
          .replace(/^\[|\]$/g, '')
          .trim()
          .toLowerCase() === normalizedSection,
    )
  ) {
    return lyrics;
  }
  const escapedSection = normalizedSection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionPattern = new RegExp(
    `(\\[${escapedSection}\\])([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)`,
    'i',
  );
  const tag = section.startsWith('[') ? section : `[${section}]`;
  const content = trim(replacement);
  if (sectionPattern.test(lyrics)) return lyrics.replace(sectionPattern, `${tag}\n${content}`);
  return `${trim(lyrics)}\n\n${tag}\n${content}`.trim();
};

export const getLyricSections = (lyrics: string): string[] =>
  Array.from(lyrics.matchAll(/\[([^\]]+)\]/g), (match) => `[${match[1]}]`);

const normalizeSectionName = (section: string): string =>
  section
    .replace(/^\[|\]$/g, '')
    .trim()
    .toLowerCase();

const splitLyricSections = (lyrics: string): Array<{ tag: string; content: string }> => {
  const chunks = lyrics.match(/\[[^\]]+\][\s\S]*?(?=\n\[[^\]]+\]|$)/g) ?? [];
  return chunks.map((chunk) => {
    const tagMatch = chunk.match(/^\[[^\]]+\]/);
    const tag = tagMatch?.[0] ?? '[Verse]';
    return {
      tag,
      content: trim(chunk.slice(tag.length)),
    };
  });
};

const isLockedSection = (tag: string, lockedSections: string[]): boolean => {
  const normalized = normalizeSectionName(tag);
  return lockedSections.some((section) => normalizeSectionName(section) === normalized);
};

/** Shorten unlocked sections while keeping their tags and locked text byte-identical. */
export const shortenLyrics = (lyrics: string, lockedSections: string[] = []): string => {
  const sections = splitLyricSections(lyrics);
  if (!sections.length) return trim(lyrics);
  return sections
    .map(({ tag, content }) => {
      if (isLockedSection(tag, lockedSections)) return `${tag}\n${content}`.trim();
      const lines = content
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const shortened = lines.slice(0, Math.max(1, Math.ceil(lines.length / 2))).join('\n');
      return `${tag}\n${shortened}`.trim();
    })
    .join('\n\n');
};

/** Regenerate unlocked lyric sections locally; locked sections are preserved exactly. */
export const regenerateLyrics = (
  lyrics: string,
  topic: string,
  language: string,
  lockedSections: string[] = [],
): string => {
  const sections = splitLyricSections(lyrics);
  if (!sections.length) return normalizeLyrics('', topic, language, false);
  const localized = FALLBACK_LYRICS[language.trim().toLowerCase()] ?? FALLBACK_LYRICS.english;
  const seed = trim(topic) || 'a new beginning';
  return sections
    .map(({ tag, content }) => {
      if (isLockedSection(tag, lockedSections)) return `${tag}\n${content}`.trim();
      const name = normalizeSectionName(tag);
      const replacement =
        name === 'chorus' || name === 'refrain'
          ? `${localized.chorus}\n${seed}`
          : name === 'bridge'
            ? `${localized.bridge}\n${localized.outro}`
            : name === 'outro'
              ? localized.outro
              : name === 'intro'
                ? seed
                : `${seed}\n${localized.verse}`;
      return `${tag}\n${replacement}`.trim();
    })
    .join('\n\n');
};

const toVideoPromptState = (input: VideoPromptArtifactInput): PromptState => ({
  ...INITIAL_STATE,
  idea: input.idea,
  environment: input.environment ?? '',
  characterActions: input.action ?? '',
  cameraMovement: input.camera ?? '',
  lightingStyle: input.lighting ?? '',
  artStyle: input.style ?? '',
  voiceOver: input.dialogue ?? '',
  ambientSound: input.audio ?? '',
  negativePrompt: input.negativePrompt ?? '',
  aspectRatio: input.aspectRatio,
  targetModel: input.target,
  flowVeoOutputMode: input.mode === 'text-to-video' ? 'single-prompt' : 'flow-scene-pack',
  optimizeFor8Seconds: input.durationSeconds === 8,
});

/** Map a Prompt Studio video brief into the existing production-run contract. */
export const promptArtifactToProductionState = (input: VideoPromptArtifactInput): PromptState =>
  toVideoPromptState(input);

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
  targetProfile: input.targetProfile ?? 'suno-v5.5',
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
): Promise<PromptArtifactV1> => {
  const provider = resolvePromptGenerationProvider();
  const local = compileVideoPromptArtifact(input);
  if (provider === 'gemini' || provider === 'ollama') {
    const result = parseStructuredJson<{ prompt?: unknown }>(
      await optimizer.optimizeVideo(input),
      'video optimizer',
    );
    if (typeof result.prompt !== 'string') {
      throw new Error('The video optimizer returned JSON without a prompt string.');
    }
    if (!trim(result.prompt)) throw new Error('The video optimizer returned an empty prompt.');
    const primary = local.primary as VideoPromptVariant;
    const optimized: PromptArtifactV1 = {
      ...local,
      primary: (() => {
        const prompt = withoutQuotes(result.prompt.trim());
        const copySettingsChecklist = primary.copySettingsChecklist;
        return {
          ...primary,
          prompt,
          label: 'Primary',
          copyPrompt: prompt,
          copyAll: composeVideoCopyAll(prompt, primary.negativePrompt, copySettingsChecklist),
        };
      })(),
      provenance: {
        ...local.provenance,
        provider,
        source: 'optimizer',
        generatedAt: new Date().toISOString(),
      },
    };
    optimized.validation = videoValidation(input, [
      optimized.primary as VideoPromptVariant,
      ...optimized.alternatives,
    ] as VideoPromptVariant[]);
    const validationErrors = validatePromptArtifact(optimized);
    if (validationErrors.length) {
      throw new Error(
        `The video optimizer returned an invalid artifact: ${validationErrors.join(' ')}`,
      );
    }
    return optimized;
  }
  return local;
};

export const optimizeMusicPromptArtifact = async (
  input: MusicPromptArtifactInput,
  optimizer: PromptArtifactOptimizer = defaultOptimizer,
): Promise<PromptArtifactV1> => {
  const local = compileMusicPromptArtifact(input);
  const provider = resolvePromptGenerationProvider();
  if (provider === 'ollama' || provider === 'gemini') {
    const pack = parseStructuredJson<{
      title?: unknown;
      style?: unknown;
      lyrics?: unknown;
      explanation?: unknown;
    }>(await optimizer.optimizeMusic(input), 'music optimizer');
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
    return optimized;
  }
  return local;
};
