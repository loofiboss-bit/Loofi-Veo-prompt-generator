import type {
  MusicPromptArtifactInput,
  MusicPromptVariant,
  PromptArtifactProvenance,
  PromptArtifactV1,
  VideoPromptVariant,
} from '@core/types/promptArtifact';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { cleanJson, getAiClientAsync, getPromptModel, resilientCall } from './gemini/aiClient';
import { generatePromptWithOllama } from './ollamaProvider';
import { resolvePromptGenerationProvider } from './promptGenerationService';
import { editStudioVariant, preserveLockedLyricSections } from './promptStudioEditingService';

import { assertProtectedPromptTextPreserved, segmentPromptText } from './promptTextSegments';
import {
  haveMatchingLyricStructure,
  isLyricSectionLocked,
  LyricSectionError,
  parseLyricSections,
  transformLyricSections,
} from './lyricSectionService';

export type VideoVariantEditField = 'prompt' | 'negativePrompt';
export type VideoVariantEditPatch = Partial<Pick<VideoPromptVariant, VideoVariantEditField>>;

export interface VideoVariantEditResult {
  before: Pick<VideoPromptVariant, VideoVariantEditField>;
  patch: VideoVariantEditPatch;
  provenance: PromptArtifactProvenance;
}

export type MusicVariantEditField = 'styleOfMusic' | 'lyrics';
export type MusicVariantEditPatch = Partial<Pick<MusicPromptVariant, MusicVariantEditField>>;

export interface MusicVariantEditResult {
  before: Pick<MusicPromptVariant, MusicVariantEditField>;
  patch: MusicVariantEditPatch;
  provenance: PromptArtifactProvenance;
}

/** Ephemeral proposal, valid only for the exact editor revision that requested it. */
export interface MusicVariantEditProposal extends MusicVariantEditResult {
  projectId: string;
  revision: number;
  variantIndex: 0 | 1 | 2;
  token: number;
}

/** Ephemeral proposal, valid only for the exact editor revision that requested it. */
export interface VideoVariantEditProposal extends VideoVariantEditResult {
  projectId: string;
  revision: number;
  variantIndex: 0 | 1 | 2;
  token: number;
}

interface VideoVariantEditInput {
  artifact: PromptArtifactV1;
  variantIndex: 0 | 1 | 2;
  fields: VideoVariantEditField[];
  direction: string;
  allowDialogueRewrite?: boolean;
  signal?: AbortSignal;
}

export interface MusicVariantEditInput {
  artifact: PromptArtifactV1;
  variantIndex: 0 | 1 | 2;
  fields: MusicVariantEditField[];
  direction: string;
  lockedSections?: string[];
  signal?: AbortSignal;
}

const responseSchema = (fields: string[]) => ({
  type: 'object',
  properties: Object.fromEntries(fields.map((field) => [field, { type: 'string' }])),
  required: [...fields],
  additionalProperties: false,
});

/** Edit the selected copy, never regenerate the pack from its older brief. */
export async function proposeVideoVariantEdit({
  artifact,
  variantIndex,
  fields,
  direction,
  allowDialogueRewrite = false,
  signal,
}: VideoVariantEditInput): Promise<VideoVariantEditResult> {
  if (artifact.kind !== 'video') throw new Error('A video prompt artifact is required.');
  if (![0, 1, 2].includes(variantIndex)) throw new Error('Choose a valid video variant.');
  if (
    !fields.length ||
    fields.some((field) => !['prompt', 'negativePrompt'].includes(field)) ||
    new Set(fields).size !== fields.length
  )
    throw new Error('Choose the prompt, negative prompt, or both.');
  if (!direction.trim()) throw new Error('Describe the requested improvement.');
  if (signal?.aborted) throw new DOMException('AI request cancelled.', 'AbortError');

  fields = [...fields];
  const snapshot = structuredClone(artifact);
  const selected = [snapshot.primary, ...snapshot.alternatives][variantIndex] as VideoPromptVariant;
  const before = { prompt: selected.prompt, negativePrompt: selected.negativePrompt };
  const provider = resolvePromptGenerationProvider();
  const settings = useSettingsStore.getState();
  const instruction = [
    'Edit only the requested fields of the supplied current video prompt variant.',
    'The current variant contains deliberate manual edits. Use it as the source; the brief is context only.',
    allowDialogueRewrite
      ? 'Dialogue may be rewritten only when requested in the direction.'
      : 'Preserve every quoted line and supplied dialogue span exactly, including punctuation and order.',
    `Return ONLY a JSON object with exactly these string keys: ${fields.join(', ')}.`,
    'Do not return titles, settings, other variants, commentary, or unrequested fields.',
    'The prompt must not be empty. A negativePrompt may be an empty string when clearing it is requested.',
    `Input JSON: ${JSON.stringify({
      target: snapshot.target,
      brief: snapshot.input,
      currentVariant: before,
      fields: [...fields],
      direction: direction.trim(),
    })}`,
  ].join('\n');

  let raw: unknown;
  if (provider === 'ollama') {
    raw = await generatePromptWithOllama(instruction, {
      baseUrl: settings.localLlmEndpoint,
      model: settings.localLlmModel,
      signal,
      jsonSchema: responseSchema(fields),
    });
  } else {
    const ai = await getAiClientAsync();
    const model = getPromptModel();
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model,
          contents: instruction,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: responseSchema(fields),
            abortSignal: signal,
          },
        }),
      { endpoint: 'gemini-video-variant-edit', model, signal },
    );
    raw = response.text;
  }
  if (signal?.aborted) throw new DOMException('AI request cancelled.', 'AbortError');

  let parsed: unknown;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(cleanJson(raw)) : raw;
  } catch {
    throw new Error('The AI response must be a JSON object containing the requested fields.');
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    Object.keys(parsed).length !== fields.length ||
    Object.keys(parsed).some((key) => !fields.includes(key as VideoVariantEditField))
  )
    throw new Error('The AI response must contain only the requested video fields.');
  const values = parsed as Record<string, unknown>;
  const patch: VideoVariantEditPatch = {};
  for (const field of fields) {
    const value = values[field];
    if (typeof value !== 'string' || (field === 'prompt' && !value.trim()))
      throw new Error('The AI response contains a missing or invalid video field.');
    if (field === 'prompt' && !allowDialogueRewrite) {
      const input = snapshot.input as import('@core/types').VideoPromptArtifactInput;
      assertProtectedPromptTextPreserved(before.prompt, value, input.dialogue ?? '');
    }
    patch[field] = value;
  }
  return {
    before,
    patch,
    provenance: {
      ...snapshot.provenance,
      provider,
      source: 'optimizer',
      generatedAt: new Date().toISOString(),
    },
  };
}

/** Propose field-scoped edits to the current music copy without rebuilding its variants. */
export async function proposeMusicVariantEdit({
  artifact,
  variantIndex,
  fields,
  direction,
  lockedSections = [],
  signal,
}: MusicVariantEditInput): Promise<MusicVariantEditResult> {
  if (artifact.kind !== 'music') throw new Error('A music prompt artifact is required.');
  if (![0, 1, 2].includes(variantIndex)) throw new Error('Choose a valid music variant.');
  if (
    !fields.length ||
    fields.some((field) => !['styleOfMusic', 'lyrics'].includes(field)) ||
    new Set(fields).size !== fields.length
  )
    throw new Error('Choose the music style, lyrics, or both.');
  if (!direction.trim()) throw new Error('Describe the requested improvement.');
  if (signal?.aborted) throw new DOMException('AI request cancelled.', 'AbortError');

  fields = [...fields];
  lockedSections = [...lockedSections];

  const snapshot = structuredClone(artifact);
  const input = snapshot.input as MusicPromptArtifactInput;
  const selected = [snapshot.primary, ...snapshot.alternatives][variantIndex] as MusicPromptVariant;
  const before: Pick<MusicPromptVariant, MusicVariantEditField> = {
    styleOfMusic: selected.styleOfMusic,
    lyrics: selected.lyrics,
  };
  if (input.instrumental && fields.includes('lyrics'))
    throw new Error('Lyrics cannot be changed while instrumental mode is enabled.');
  if (
    fields.includes('lyrics') &&
    lockedSections.length &&
    !parseLyricSections(before.lyrics).some((section) =>
      isLyricSectionLocked(section, lockedSections),
    )
  )
    throw new LyricSectionError('missing');

  const instruction = [
    'Edit only the requested fields of the supplied current Suno music variant.',
    'The selected variant contains deliberate manual edits. Use it as the source; the brief is context only.',
    `Keep lyrics in ${input.language || 'the requested'} language and preserve section order and count.`,
    lockedSections.length
      ? 'Keep locked lyric sections byte-identical, including repeated occurrences.'
      : '',
    input.instrumental ? 'Keep instrumental mode and its [Instrumental] lyrics unchanged.' : '',
    'Keep styleOfMusic to 200 characters or fewer.',
    `Return ONLY a JSON object with exactly these string keys: ${fields.join(', ')}.`,
    'Do not return a title, other variants, commentary, or unrequested fields.',
    `Input JSON: ${JSON.stringify({
      brief: input,
      target: snapshot.target,
      currentVariant: before,
      fields,
      lockedSections: fields.includes('lyrics') ? lockedSections : [],
      direction: direction.trim(),
    })}`,
  ]
    .filter(Boolean)
    .join('\n');
  const schema = responseSchema(fields);
  const provider = resolvePromptGenerationProvider();
  const settings = useSettingsStore.getState();
  let raw: unknown;
  if (provider === 'ollama') {
    raw = await generatePromptWithOllama(instruction, {
      baseUrl: settings.localLlmEndpoint,
      model: settings.localLlmModel,
      signal,
      jsonSchema: schema,
    });
  } else {
    const ai = await getAiClientAsync();
    const model = getPromptModel();
    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model,
          contents: instruction,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            abortSignal: signal,
          },
        }),
      { endpoint: 'gemini-music-variant-edit', model, signal },
    );
    raw = response.text;
  }
  if (signal?.aborted) throw new DOMException('AI request cancelled.', 'AbortError');

  let parsed: unknown;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(cleanJson(raw)) : raw;
  } catch {
    throw new Error('The AI response must be a JSON object containing the requested fields.');
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    Object.keys(parsed).length !== fields.length ||
    Object.keys(parsed).some((key) => !fields.includes(key as MusicVariantEditField))
  )
    throw new Error('The AI response must contain only the requested music fields.');
  const values = parsed as Record<string, unknown>;
  const patch: MusicVariantEditPatch = {};
  for (const field of fields) {
    const value = values[field];
    if (typeof value !== 'string' || !value.trim())
      throw new Error('The AI response contains a missing or invalid music field.');
    if (field === 'styleOfMusic' && value.length > 200)
      throw new Error('The AI response returned a music style longer than 200 characters.');
    if (field === 'lyrics' && input.instrumental && value.trim() !== '[Instrumental]')
      throw new Error('The AI response changed the instrumental lyrics contract.');
    if (field === 'lyrics' && lockedSections.length) {
      const original = parseLyricSections(before.lyrics);
      const proposed = parseLyricSections(value);
      if (!haveMatchingLyricStructure(original, proposed)) throw new LyricSectionError('structure');
      patch.lyrics = preserveLockedLyricSections(before.lyrics, value, lockedSections);
    } else {
      patch[field] = value;
    }
  }
  return {
    before,
    patch,
    provenance: {
      ...snapshot.provenance,
      provider,
      source: 'optimizer',
      generatedAt: new Date().toISOString(),
    },
  };
}

export type LocalPromptTransformId = 'clean-compact' | 'sync-target-grammar' | 'harden-negative';
export type LocalMusicTransformId = 'normalize-sections' | 'clean-style' | 'strip-visual-terms';

export interface LocalTransformDefinition {
  id: LocalPromptTransformId;
  label: string;
  description: string;
}

export const LOCAL_TRANSFORMS: LocalTransformDefinition[] = [
  {
    id: 'clean-compact',
    label: 'Clean & Compact',
    description:
      'Removes redundant filler adjectives and collapses whitespace and duplicate punctuation.',
  },
  {
    id: 'sync-target-grammar',
    label: 'Sync Target Grammar',
    description: 'Adapts camera and motion syntax to the selected target model convention.',
  },
  {
    id: 'harden-negative',
    label: 'Harden Negative Prompt',
    description: 'Applies recommended artifact and distortion filters for the target engine.',
  },
];

export function hasVariantEditChanges(result: VideoVariantEditResult): boolean {
  return (Object.keys(result.patch) as VideoVariantEditField[]).some((field) => {
    const next = result.patch[field];
    return next !== undefined && next !== result.before[field];
  });
}

const TARGET_NEGATIVE_SUPPLEMENTS: Partial<Record<PromptArtifactV1['target'], string[]>> = {
  'flow-veo': ['unintended text', 'subtitles', 'logos', 'visual glitches'],
  'veo-api': ['unintended text', 'subtitles', 'logos', 'visual glitches'],
  kling: ['morphing', 'motion jitter', 'low quality'],
  'runway-gen3': ['motion smearing', 'stutter', 'oversaturated'],
  sora: ['unnatural physics', 'temporal discontinuity', 'clipping artifacts'],
  'luma-ray': ['frame warping', 'sudden camera jumps', 'geometry distortion'],
  'wan-video': ['deformed face', 'noisy', 'oversaturated'],
  'minimax-hailuo': ['jerky motion', 'morphing artifacts', 'distorted background'],
};

function formatTargetCameraGrammar(source: string, target: PromptArtifactV1['target']): string {
  let formatted = source;
  const cameraDirectiveRx = /\b(?:camera:?\s*|shot:?\s*)([a-zA-Z0-9\s-]+?)(?=[,.]|$)/i;
  const bracketCameraRx = /\[camera:\s*([^\]]+)\]/i;
  if (target === 'kling') {
    if (cameraDirectiveRx.test(formatted) && !bracketCameraRx.test(formatted)) {
      formatted = formatted.replace(
        cameraDirectiveRx,
        (_match, move: string) => `[camera: ${move.trim()}]`,
      );
    }
  } else {
    formatted = formatted.replace(
      bracketCameraRx,
      (_match, move: string) => `Camera: ${move.trim()}`,
    );
    if (target === 'runway-gen3') {
      formatted = formatted.replace(
        /\b(?:the camera is moving|camera moves|slowly panning)\b/gi,
        'Pan',
      );
      if (cameraDirectiveRx.test(formatted)) {
        formatted = formatted.replace(
          cameraDirectiveRx,
          (_match, move: string) => `Cinematic ${move.trim()}, fluid tracking`,
        );
      }
    } else if (target === 'sora') {
      if (cameraDirectiveRx.test(formatted)) {
        formatted = formatted.replace(
          cameraDirectiveRx,
          (_match, move: string) =>
            `Captured on 35mm motion picture camera with ${move.trim()}, realistic physical camera weight`,
        );
      }
    } else if (target === 'luma-ray') {
      if (cameraDirectiveRx.test(formatted)) {
        formatted = formatted.replace(
          cameraDirectiveRx,
          (_match, move: string) => `Smooth ${move.trim()} trajectory, consistent depth of field`,
        );
      }
    } else if (target === 'wan-video') {
      if (cameraDirectiveRx.test(formatted)) {
        formatted = formatted.replace(
          cameraDirectiveRx,
          (_match, move: string) =>
            `Deliberate ${move.trim()} cinematic move, rich optical volumetric depth, zero jitter`,
        );
      }
    } else if (target === 'minimax-hailuo') {
      if (cameraDirectiveRx.test(formatted)) {
        formatted = formatted.replace(
          cameraDirectiveRx,
          (_match, move: string) =>
            `Dynamic ${move.trim()} framing, smooth cinematic action cadence`,
        );
      }
    } else if (target === 'flow-veo' || target === 'veo-api') {
      formatted = formatted.replace(/\s{2,}/g, ' ').trim();
    }
  }
  return formatted;
}

function preserveSegmentBoundaryWhitespace(
  text: string,
  transform: (content: string) => string,
): string {
  const leading = text.match(/^\s*/)?.[0] ?? '';
  const trailing = text.match(/\s*$/)?.[0] ?? '';
  const contentEnd = text.length - trailing.length;
  const content = text.slice(leading.length, contentEnd);
  if (!content) return text;
  return `${leading}${transform(content)}${trailing}`;
}

function appendTargetCameraFallback(
  prompt: string,
  target: PromptArtifactV1['target'],
  editableText: string,
): string {
  const cameraDirectiveRx = /\b(?:camera:?\s*|shot:?\s*)\S+/i;
  const bracketCameraRx = /\[camera:\s*[^\]]+\]/i;
  if (cameraDirectiveRx.test(editableText) || bracketCameraRx.test(editableText)) return prompt;

  let addition = '';
  if (target === 'kling') {
    addition = '[camera: smooth dynamic tracking]';
  } else if (
    target === 'sora' &&
    !/35mm motion picture camera|physical camera weight/i.test(editableText)
  ) {
    addition = 'Captured on 35mm motion picture camera with realistic physical camera weight.';
  } else if (target === 'luma-ray' && !/trajectory|depth of field/i.test(editableText)) {
    addition = 'Consistent depth of field and fluid perspective shifts.';
  } else if (target === 'wan-video' && !/volumetric depth|zero jitter/i.test(editableText)) {
    addition = 'Rich optical volumetric depth, zero jitter.';
  } else if (
    target === 'minimax-hailuo' &&
    !/action cadence|spatial movement/i.test(editableText)
  ) {
    addition = 'Smooth cinematic action cadence and authentic spatial movement.';
  }
  if (!addition) return prompt;

  const trailing = prompt.match(/\s*$/)?.[0] ?? '';
  const content = prompt.slice(0, prompt.length - trailing.length);
  const separator = /[.!?]$/.test(content) ? ' ' : '. ';
  return `${content}${separator}${addition}${trailing}`;
}

export function applyLocalPromptTransform(
  artifact: PromptArtifactV1,
  variantIndex: 0 | 1 | 2,
  transformId: LocalPromptTransformId,
): VideoVariantEditResult {
  if (artifact.kind !== 'video') throw new Error('A video prompt artifact is required.');
  if (![0, 1, 2].includes(variantIndex)) throw new Error('Choose a valid video variant.');
  const snapshot = structuredClone(artifact);
  const selected = [snapshot.primary, ...snapshot.alternatives][variantIndex] as VideoPromptVariant;
  const before = { prompt: selected.prompt, negativePrompt: selected.negativePrompt };
  const patch: VideoVariantEditPatch = {};

  if (transformId === 'clean-compact') {
    const sourceDialogue = (snapshot.input as import('@core/types').VideoPromptArtifactInput)
      .dialogue;
    const segments = segmentPromptText(before.prompt, sourceDialogue);
    const cleaned = segments
      .map((segment, index) => {
        if (segment.protected) return segment.text;
        let text = segment.text
          .replace(
            /\b(?:highly detailed|hyperrealistic|photorealistic|trending on artstation|octane render|unreal engine 5|4k resolution|8k resolution)\b[,.]?/gi,
            '',
          )
          .replace(/\s*,\s*,+/g, ',')
          .replace(/,\s*\./g, '.')
          .replace(/,\s*$/g, '.')
          .replace(/\s{2,}/g, ' ');
        if (index === 0) text = text.trimStart();
        if (index === segments.length - 1) text = text.trimEnd();
        return text;
      })
      .join('');
    patch.prompt = cleaned || before.prompt;
  } else if (transformId === 'sync-target-grammar') {
    const sourceDialogue = (snapshot.input as import('@core/types').VideoPromptArtifactInput)
      .dialogue;
    const segments = segmentPromptText(before.prompt, sourceDialogue);
    const editableText = segments
      .filter((segment) => !segment.protected)
      .map((segment) => segment.text)
      .join('');
    const formatted = segments
      .map((segment) =>
        segment.protected
          ? segment.text
          : preserveSegmentBoundaryWhitespace(segment.text, (content) =>
              formatTargetCameraGrammar(content, snapshot.target),
            ),
      )
      .join('');
    patch.prompt = appendTargetCameraFallback(formatted, snapshot.target, editableText);
  } else if (transformId === 'harden-negative') {
    const baseNegatives = [
      'distorted anatomy',
      'deformed hands',
      'bad proportions',
      'floating elements',
      'jitter',
      'flickering',
      'plastic skin texture',
      'watermark',
      'text overlay',
    ];
    const targetSupplement = TARGET_NEGATIVE_SUPPLEMENTS[snapshot.target] ?? [];
    const recommendedNegatives = Array.from(new Set([...baseNegatives, ...targetSupplement]));
    const existing = new Set(
      before.negativePrompt
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    const added = recommendedNegatives.filter((neg) => !existing.has(neg));
    patch.negativePrompt = before.negativePrompt
      ? added.length
        ? `${before.negativePrompt}, ${added.join(', ')}`
        : before.negativePrompt
      : added.join(', ');
  }

  return {
    before,
    patch,
    provenance: {
      ...snapshot.provenance,
      provider: 'local',
      source: 'optimizer',
      generatedAt: new Date().toISOString(),
    },
  };
}

export function applyBatchLocalPromptTransform(
  artifact: PromptArtifactV1,
  transformId: LocalPromptTransformId,
): { artifact: PromptArtifactV1; changed: boolean } {
  if (artifact.kind !== 'video') throw new Error('A video prompt artifact is required.');
  let current = structuredClone(artifact);
  let changed = false;
  for (const idx of [0, 1, 2] as const) {
    const step = applyLocalPromptTransform(current, idx, transformId);
    if (hasVariantEditChanges(step)) {
      changed = true;
      current = editStudioVariant(current, idx, step.patch);
      current.provenance = step.provenance;
    }
  }
  return { artifact: current, changed };
}

const VISUAL_DIFFUSION_TERMS_RX =
  /\b(?:4k resolution|8k resolution|4k|8k|photorealistic|hyperrealistic|octane render|unreal engine 5|cinematic lighting|ray tracing|trending on artstation)\b[,.]?/gi;

export function applyLocalMusicTransform(
  artifact: PromptArtifactV1,
  variantIndex: 0 | 1 | 2,
  transformId: LocalMusicTransformId,
  lockedSections: string[] = [],
): { artifact: PromptArtifactV1; changed: boolean } {
  if (artifact.kind !== 'music') throw new Error('A music prompt artifact is required.');
  if (![0, 1, 2].includes(variantIndex)) throw new Error('Choose a valid music variant.');
  const snapshot = structuredClone(artifact);
  const selected = [snapshot.primary, ...snapshot.alternatives][variantIndex] as MusicPromptVariant;
  const input = snapshot.input as MusicPromptArtifactInput;
  let nextLyrics = selected.lyrics;
  let nextStyle = selected.styleOfMusic;

  if (transformId === 'normalize-sections') {
    const normalizeText = (text: string) =>
      text
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          const bracketMatch = /^\[([^\]]+)\]$/.exec(trimmed);
          if (bracketMatch) {
            const inner = bracketMatch[1]
              .trim()
              .replace(/\b([a-z])/gi, (m, c: string, offset: number) =>
                offset === 0 ||
                bracketMatch[1][offset - 1] === ' ' ||
                bracketMatch[1][offset - 1] === '-'
                  ? c.toUpperCase()
                  : c.toLowerCase(),
              );
            return `[${inner}]`;
          }
          const headerMatch =
            /^(verse|chorus|pre-chorus|bridge|intro|outro|hook|instrumental)(?:\s+(\d+))?\s*[:-]?$/i.exec(
              trimmed,
            );
          if (headerMatch) {
            const name = headerMatch[1]
              .split('-')
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
              .join('-');
            return `[${name}${headerMatch[2] ? ` ${headerMatch[2]}` : ''}]`;
          }
          return line;
        })
        .join('\n');
    const sections = parseLyricSections(selected.lyrics);
    let candidate = sections.length
      ? normalizeText(selected.lyrics.slice(0, sections[0].start)) +
        transformLyricSections(selected.lyrics, (section) =>
          isLyricSectionLocked(section, lockedSections) ? section.raw : normalizeText(section.raw),
        ).slice(sections[0].start)
      : normalizeText(selected.lyrics);
    if (!lockedSections.length) candidate = candidate.trim();
    if (candidate && !/\[[^\]]+\]/.test(candidate)) {
      candidate = `${input.instrumental ? '[Instrumental]' : '[Verse 1]'}\n${candidate}`;
    }
    nextLyrics = candidate;
  } else if (transformId === 'clean-style') {
    const stripped = selected.styleOfMusic.replace(VISUAL_DIFFUSION_TERMS_RX, '');
    const seen = new Set<string>();
    const tags = stripped
      .split(',')
      .map((tag) => tag.replace(/\s{2,}/g, ' ').trim())
      .filter((tag) => {
        if (!tag) return false;
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    let compact = tags.join(', ');
    if (compact.length > 200) {
      const slice = compact.slice(0, 200);
      const lastComma = slice.lastIndexOf(',');
      compact = (lastComma > 80 ? slice.slice(0, lastComma) : slice).trim();
    }
    nextStyle = compact || selected.styleOfMusic.slice(0, 200).trim();
  } else if (transformId === 'strip-visual-terms') {
    nextStyle = selected.styleOfMusic
      .replace(VISUAL_DIFFUSION_TERMS_RX, '')
      .replace(/\s*,\s*,+/g, ',')
      .replace(/^[,\s]+|[,\s]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const cleanText = (text: string) =>
      text.replace(VISUAL_DIFFUSION_TERMS_RX, '').replace(/[ \t]{2,}/g, ' ');
    const sections = parseLyricSections(selected.lyrics);
    nextLyrics = sections.length
      ? cleanText(selected.lyrics.slice(0, sections[0].start)) +
        transformLyricSections(selected.lyrics, (section) =>
          isLyricSectionLocked(section, lockedSections) ? section.raw : cleanText(section.raw),
        ).slice(sections[0].start)
      : cleanText(selected.lyrics);
  }

  const changed = nextLyrics !== selected.lyrics || nextStyle !== selected.styleOfMusic;
  const updated = editStudioVariant(snapshot, variantIndex, {
    lyrics: nextLyrics,
    styleOfMusic: nextStyle,
  });
  updated.provenance = {
    ...snapshot.provenance,
    provider: 'local',
    source: 'optimizer',
    generatedAt: new Date().toISOString(),
  };
  return { artifact: updated, changed };
}

export function applyBatchLocalMusicTransform(
  artifact: PromptArtifactV1,
  transformId: LocalMusicTransformId,
  lockedSections: string[] = [],
): { artifact: PromptArtifactV1; changed: boolean } {
  if (artifact.kind !== 'music') throw new Error('A music prompt artifact is required.');
  let current = structuredClone(artifact);
  let changed = false;
  for (const idx of [0, 1, 2] as const) {
    const step = applyLocalMusicTransform(current, idx, transformId, lockedSections);
    if (step.changed) {
      changed = true;
      current = step.artifact;
    }
  }
  return { artifact: current, changed };
}
