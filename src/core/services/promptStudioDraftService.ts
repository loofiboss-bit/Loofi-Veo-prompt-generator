import type { PromptStudioDraftV1 } from '@core/types';
import { projectDocumentService } from './projectDocumentService';

export function createPromptStudioDraft(projectId: string): PromptStudioDraftV1 {
  return {
    schemaVersion: 1,
    projectId,
    mode: 'video',
    video: {
      idea: '',
      mode: 'text-to-video',
      target: 'flow-veo',
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
      targetProfile: 'suno-v5.5',
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

  async save(draft: PromptStudioDraftV1): Promise<void> {
    await projectDocumentService.update(draft.projectId, async (existing) => {
      let project = existing;
      if (!project) {
        const { createEmptyProjectDocument } = await import('@core/store/editorSessionAdapters');
        project = createEmptyProjectDocument({
          id: draft.projectId,
          name: draft.projectId === 'default' ? 'My project' : draft.projectId,
        });
      }
      return { ...project, studioDraft: draft, lastModified: Date.now() };
    });
  }
}

export const promptStudioDraftService = PromptStudioDraftService.getInstance();
