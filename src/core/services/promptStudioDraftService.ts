import type { PromptStudioDraftV1 } from '@core/types';
import { projectDocumentService } from './projectDocumentService';

export function createPromptStudioDraft(projectId: string): PromptStudioDraftV1 {
  return {
    schemaVersion: 1,
    aiSettings: { model: 'gemini-3.8-flash', stylePreset: 'auto', language: 'en' },
    fieldOrigins: {},
    lockedFields: [],
    projectId,
    mode: 'video',
    video: {
      idea: '',
      mode: 'text-to-video',
      target: 'flow-veo',
      profileId: 'flow-veo-3.1-lite',
      aspectRatio: '16:9',
      durationSeconds: 8,
      subject: '',
      action: '',
      environment: '',
      camera: '',
      lighting: '',
      style: '',
      audio: '',
      dialogue: '',
      negativePrompt: '',
      startFrame: '',
      endFrame: '',
      previousClip: '',
      referenceRoles: '',
    },
    music: {
      topic: '',
      language: 'English',
      genre: '',
      mood: '',
      voice: 'Any',
      tempo: 'Any',
      instruments: '',
      structure: 'Auto',
      lyrics: '',
      instrumental: false,
      styleInfluence: null,
      targetProfile: 'suno-v6',
      key: '',
      timeSignature: '',
      energyCurve: '',
      vocalRange: '',
      voiceNotes: '',
      customModelNotes: '',
      personaNotes: '',
      tasteGuidance: '',
      mixNotes: '',
      rightsChecklist: {
        ownsOrLicensedLyrics: false,
        hasVoiceConsent: false,
        hasTrainingReferenceRights: false,
        avoidsArtistImitation: true,
      },
    },
    artifact: null,
    selectedVariant: 0,
    lockedSections: [],
    revision: 0,
    updatedAt: new Date().toISOString(),
  };
}

class PromptStudioDraftService {
  private static instance: PromptStudioDraftService;
  static getInstance(): PromptStudioDraftService {
    return (this.instance ??= new PromptStudioDraftService());
  }

  async load(projectId: string): Promise<PromptStudioDraftV1> {
    const project = await projectDocumentService.load(projectId);
    const saved = project?.studioDraft;
    if (saved?.schemaVersion === 1 && saved.projectId === projectId) return saved;
    return createPromptStudioDraft(projectId);
  }

  async save(draft: PromptStudioDraftV1, documentRevision?: number): Promise<void> {
    await projectDocumentService.update(draft.projectId, async (existing) => {
      let project = existing;
      if (!project) {
        const { createEmptyProjectDocument } = await import('@core/store/editorSessionAdapters');
        project = createEmptyProjectDocument({
          id: draft.projectId,
          name: draft.projectId === 'default' ? 'My project' : draft.projectId,
        });
      }
      return {
        ...project,
        documentRevision: documentRevision ?? project.documentRevision,
        studioDraft: draft,
        lastModified: Date.now(),
      };
    });
  }
}

export const promptStudioDraftService = PromptStudioDraftService.getInstance();
