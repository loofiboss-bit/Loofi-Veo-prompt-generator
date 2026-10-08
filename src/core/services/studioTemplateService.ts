import { get, update } from 'idb-keyval';
import type { PromptStudioDraftV1 } from '@core/types/promptStudioDraft';
import type { VideoPromptArtifactInput } from '@core/types/promptArtifact';
import type { StudioTemplateV1 } from '@core/types/studioTemplate';
import { getUserTemplatesStrict, type UserTemplate } from './templateManager';
import { logger } from './loggerService';

const LIBRARY_KEY = 'studio-templates-v1';

/** Remove project media, provider handles and file paths, including on template application. */
export function sanitizeStudioVideoInput(
  input: VideoPromptArtifactInput,
): VideoPromptArtifactInput {
  const {
    firstFrameAssetId: _first,
    lastFrameAssetId: _last,
    referenceAssetIds: _refs,
    extensionSourceTakeId: _take,
    extensionArtifact: _artifact,
    startFrame: _start,
    endFrame: _end,
    previousClip: _clip,
    ...reusable
  } = input;
  return structuredClone(reusable);
}

export function sanitizeStudioTemplate(template: StudioTemplateV1): StudioTemplateV1 {
  return template.kind === 'video'
    ? { ...template, input: sanitizeStudioVideoInput(template.input) }
    : structuredClone(template);
}

export function adaptLegacyStudioTemplate(template: UserTemplate): StudioTemplateV1 {
  const params = template.params;
  return {
    schemaVersion: 1,
    id: `legacy:${template.id}`,
    name: template.name,
    description: template.description,
    createdAt: new Date(template.createdAt).toISOString(),
    updatedAt: new Date(template.updatedAt).toISOString(),
    source: 'legacy',
    kind: 'video',
    input: {
      idea: params.idea ?? '',
      mode: 'text-to-video',
      target: params.targetModel === 'veo-api' ? 'veo-api' : 'flow-veo',
      aspectRatio: params.aspectRatio === '9:16' ? '9:16' : '16:9',
      durationSeconds: 8,
      subject: params.characterArchetype,
      action: params.characterActions,
      environment: params.environment,
      camera: params.cameraMovement,
      lighting: params.lightingStyle,
      style: params.customArtStyle || params.artStyle,
      audio: [params.voiceOver, params.ambientSound].filter(Boolean).join(', '),
      dialogue: params.voiceOver,
      negativePrompt: params.negativePrompt,
    },
  };
}

class StudioTemplateService {
  private static instance: StudioTemplateService;

  static getInstance(): StudioTemplateService {
    return (StudioTemplateService.instance ??= new StudioTemplateService());
  }

  async list(): Promise<StudioTemplateV1[]> {
    try {
      const [current, legacy] = await Promise.all([
        get<StudioTemplateV1[]>(LIBRARY_KEY),
        getUserTemplatesStrict(),
      ]);
      return [...(current ?? []), ...legacy.map(adaptLegacyStudioTemplate)]
        .map(sanitizeStudioTemplate)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (error) {
      logger.error('Failed to load Studio template library', error);
      throw error;
    }
  }

  private snapshot(
    name: string,
    description: string,
    draft: PromptStudioDraftV1,
  ): StudioTemplateV1 {
    if (!name.trim()) throw new Error('Template name is required');
    const now = new Date().toISOString();
    const base = {
      schemaVersion: 1 as const,
      id: `studio:${crypto.randomUUID()}`,
      name: name.trim(),
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
      source: 'studio' as const,
    };
    return draft.mode === 'video'
      ? { ...base, kind: 'video', input: sanitizeStudioVideoInput(draft.video) }
      : {
          ...base,
          kind: 'music',
          input: structuredClone(draft.music),
          lockedSections: [...draft.lockedSections],
        };
  }

  async create(
    name: string,
    description: string,
    draft: PromptStudioDraftV1,
  ): Promise<StudioTemplateV1> {
    const template = this.snapshot(name, description, draft);
    await this.mutate((templates) => [...templates, template]);
    return template;
  }

  async update(
    id: string,
    name: string,
    description: string,
    draft: PromptStudioDraftV1,
  ): Promise<StudioTemplateV1> {
    const snapshot = this.snapshot(name, description, draft);
    let saved = snapshot;
    await this.mutate((templates) => {
      const existing = templates.find((template) => template.id === id);
      if (!existing || existing.source !== 'studio') throw new Error('Studio template not found');
      if (existing.kind !== draft.mode) throw new Error('Template workspace mismatch');
      saved = { ...snapshot, id, createdAt: existing.createdAt };
      return templates.map((template) => (template.id === id ? saved : template));
    });
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.mutate((templates) => {
      if (!templates.some((template) => template.id === id && template.source === 'studio')) {
        throw new Error('Studio template not found');
      }
      return templates.filter((template) => template.id !== id);
    });
  }

  private async mutate(
    change: (templates: StudioTemplateV1[]) => StudioTemplateV1[],
  ): Promise<void> {
    try {
      // One atomic IndexedDB update prevents partially saved lists and concurrent-write loss.
      await update<StudioTemplateV1[]>(LIBRARY_KEY, (templates) => change(templates ?? []));
    } catch (error) {
      logger.error('Failed to update Studio template library', error);
      throw error;
    }
  }
}

export const studioTemplateService = StudioTemplateService.getInstance();
