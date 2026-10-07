import type {
  MusicPromptArtifactInput,
  PromptArtifactV1,
  VideoPromptArtifactInput,
} from './promptArtifact';

/** Versioned, project-owned Studio input and editable output. */
export interface PromptStudioDraftV1 {
  schemaVersion: 1;
  projectId: string;
  mode: 'video' | 'music';
  video: VideoPromptArtifactInput;
  music: MusicPromptArtifactInput;
  artifact: PromptArtifactV1 | null;
  artifacts?: Partial<Record<'video' | 'music', PromptArtifactV1 | null>>;
  selectedVariants?: Partial<Record<'video' | 'music', 0 | 1 | 2>>;
  selectedVariant: 0 | 1 | 2;
  lockedSections: string[];
  revision: number;
  updatedAt: string;
}
