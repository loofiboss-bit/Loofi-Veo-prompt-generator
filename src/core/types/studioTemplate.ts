import type { MusicPromptArtifactInput, VideoPromptArtifactInput } from './promptArtifact';

interface StudioTemplateBaseV1 {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  source: 'studio' | 'legacy';
}

/** Global reusable input only: generated artifacts and project media never travel with a template. */
export type StudioTemplateV1 = StudioTemplateBaseV1 &
  (
    | { kind: 'video'; input: VideoPromptArtifactInput }
    | { kind: 'music'; input: MusicPromptArtifactInput; lockedSections: string[] }
  );
