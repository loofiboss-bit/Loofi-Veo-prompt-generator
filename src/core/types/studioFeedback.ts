import type { PromptArtifactTarget } from './promptArtifact';

/** Ephemeral text-only context used to refine the current Studio variant from a reviewed result. */
export interface StudioFeedbackNavigationState {
  kind: 'studio-feedback';
  source: {
    projectId: string;
    sourceKind: 'external-result' | 'production-take';
    sourceId: string;
    artifactId?: string;
    variantIndex: 0 | 1 | 2;
    target: PromptArtifactTarget;
    prompt: string;
    negativePrompt: string;
    settings: string;
    notes: string;
  };
}
