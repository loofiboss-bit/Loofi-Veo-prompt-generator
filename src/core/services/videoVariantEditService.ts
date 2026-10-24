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
