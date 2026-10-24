import type {
  PromptArtifactProvenance,
  PromptArtifactV1,
  VideoPromptVariant,
} from '@core/types/promptArtifact';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { cleanJson, getAiClientAsync, getPromptModel, resilientCall } from './gemini/aiClient';
import { generatePromptWithOllama } from './ollamaProvider';
import { resolvePromptGenerationProvider } from './promptGenerationService';

export type VideoVariantEditField = 'prompt' | 'negativePrompt';
export type VideoVariantEditPatch = Partial<Pick<VideoPromptVariant, VideoVariantEditField>>;

export interface VideoVariantEditResult {
  before: Pick<VideoPromptVariant, VideoVariantEditField>;
  patch: VideoVariantEditPatch;
  provenance: PromptArtifactProvenance;
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
}

/** Edit the selected copy, never regenerate the pack from its older brief. */
export async function proposeVideoVariantEdit({
  artifact,
  variantIndex,
  fields,
  direction,
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

  fields = [...fields];
  const snapshot = structuredClone(artifact);
  const selected = [snapshot.primary, ...snapshot.alternatives][variantIndex] as VideoPromptVariant;
  const before = { prompt: selected.prompt, negativePrompt: selected.negativePrompt };
  const provider = resolvePromptGenerationProvider();
  const settings = useSettingsStore.getState();
  const instruction = [
    'Edit only the requested fields of the supplied current video prompt variant.',
    'The current variant contains deliberate manual edits. Use it as the source; the brief is context only.',
    'Preserve quoted dialogue and facts unless the requested improvement explicitly changes them.',
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
            responseJsonSchema: {
              type: 'object',
              properties: Object.fromEntries(fields.map((field) => [field, { type: 'string' }])),
              required: [...fields],
              additionalProperties: false,
            },
          },
        }),
      { endpoint: 'gemini-video-variant-edit', model },
    );
    raw = response.text;
  }

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

export type LocalPromptTransformId = 'clean-compact' | 'sync-target-grammar' | 'harden-negative';

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
    const cleaned = before.prompt
      .replace(
        /\b(?:highly detailed|hyperrealistic|photorealistic|trending on artstation|octane render|unreal engine 5|4k resolution|8k resolution)\b[,.]?/gi,
        '',
      )
      .replace(/\s*,\s*,+/g, ',')
      .replace(/,\s*\./g, '.')
      .replace(/\s{2,}/g, ' ')
      .trim();
    patch.prompt = cleaned || before.prompt;
  } else if (transformId === 'sync-target-grammar') {
    let formatted = before.prompt;
    if (snapshot.target === 'kling') {
      formatted = formatted.replace(
        /\b(?:camera:?\s*|shot:?\s*)([a-zA-Z0-9\s-]+?)(?=[,.]|$)/i,
        (_match, move: string) => `[camera: ${move.trim()}]`,
      );
    } else if (snapshot.target === 'runway-gen3') {
      formatted = formatted.replace(
        /\b(?:the camera is moving|camera moves|slowly panning)\b/gi,
        'Pan',
      );
    }
    patch.prompt = formatted;
  } else if (transformId === 'harden-negative') {
    const recommendedNegatives = [
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
    const existing = new Set(
      before.negativePrompt
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    const added = recommendedNegatives.filter((neg) => !existing.has(neg));
    patch.negativePrompt = before.negativePrompt
      ? `${before.negativePrompt}, ${added.join(', ')}`
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
